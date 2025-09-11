/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & { geminiApiKey?: string };

import { Type } from "@google/genai";
import { SimilarityJob } from './types';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/core/vectorstores";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:3001/api';

// --- State for Queue and Cancellation ---
let isJobRunning = false;
const cancelledJobIds = new Set<string>();


// SW Lifecycle: Install
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(self.skipWaiting());
});

// SW Lifecycle: Activate
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(self.clients.claim());
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});

// Listen for messages from the main application
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'START_SIMILARITY_JOB') {
        const { jobId, token, geminiApiKey } = event.data.payload;
        console.log(`Service Worker: Received job ${jobId}.`);

        if (isJobRunning) {
            console.warn(`Service Worker: A job is already in progress. Job ${jobId} will not be started.`);
            return;
        }

        self.geminiApiKey = geminiApiKey;

        isJobRunning = true;
        runSimilarityJob(jobId, token)
            .catch(err => {
                console.error(`SW: Unhandled error in runSimilarityJob for ${jobId}`, err);
            })
            .finally(() => {
                isJobRunning = false;
                console.log(`SW: Finished job processing for ${jobId}.`);
            });

    } else if (event.data && event.data.type === 'CANCEL_SIMILARITY_JOB') {
        const { jobId } = event.data.payload;
        console.log(`Service Worker: Received cancellation request for job ${jobId}.`);
        cancelledJobIds.add(jobId);
    }
});

// --- Local API Helpers ---
async function apiRequest<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[SW] Making API request to: ${url}`);

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.append('Content-Type', 'application/json');
    }

    const config: RequestInit = { ...options, headers };
    console.log('[SW] Request config:', {
        method: config.method,
        headers: Object.fromEntries((config.headers as Headers).entries()),
    });

    try {
        const response = await fetch(url, config);

        console.log(`[SW] Received response for ${url} with status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`[SW] API request failed with status ${response.status}:`, errorData);
            throw new Error(errorData.message || 'An unknown API error occurred');
        }

        if (response.status === 204) {
            return null as T;
        }

        return response.json() as T;
    } catch (error) {
        console.error(`[SW] Fetch failed for URL: ${url}. Error:`, error);
        // Re-throw the error so the calling function can handle it
        throw error;
    }
}

async function getJob(jobId: string, token: string): Promise<SimilarityJob> {
    return apiRequest<SimilarityJob>(`/jobs/${jobId}`, token, { method: 'GET' });
}

async function updateJob(jobId: string, token: string, updates: Partial<SimilarityJob>): Promise<SimilarityJob> {
    // The 'inputData' is not a real column in the database, so we can't update it directly.
    // We need to send only the top-level fields.
    const validUpdates: { [key: string]: any } = {};
    for (const key in updates) {
        if (key !== 'inputData' && key !== 'id' && key !== 'type' && key !== 'createdAt') {
            validUpdates[key] = (updates as any)[key];
        }
    }

    return apiRequest<SimilarityJob>(`/jobs/${jobId}`, token, {
        method: 'PUT',
        body: JSON.stringify(validUpdates),
    });
}

const postJobUpdateToClients = async (jobId: string) => {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage({ type: 'JOB_UPDATED', payload: { jobId } });
    }
}

async function runSimilarityJob(jobId: string, token: string) {
    const cleanup = () => {
        cancelledJobIds.delete(jobId);
    };

    let job: SimilarityJob | null = null;

    try {
        job = await getJob(jobId, token);
        if (!job) throw new Error(`Job ${jobId} not found via API.`);
        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} was cancelled before starting.`);
            cleanup();
            return;
        }

        await updateJob(jobId, token, { status: 'processing', progress: 0, progressMessage: 'Iniciando análise...' });
        await postJobUpdateToClients(jobId);

        const { inputData } = job;
        const { caData, libraryFiles, description, libraryName } = inputData;

        // --- RAG Pipeline with LangChain ---

        // 1. Chunking & Embeddings
        await updateJob(jobId, token, { progress: 10, progressMessage: 'Dividindo documentos e criando embeddings...' });
        await postJobUpdateToClients(jobId);

        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100 });
        const documents = await textSplitter.createDocuments(libraryFiles.map(file => file.content || ''));

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: self.geminiApiKey,
            model: "models/embedding-001"
        });
        const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

        const retriever = vectorStore.asRetriever({
            searchType: "similarity_score_threshold",
            searchKwargs: { scoreThreshold: 0.3, k: 4 }
        });

        // 2. Retrieval
        const query = `CA: ${caData.caNumber} - ${caData.equipmentName}. Descrição: ${description}`;
        await updateJob(jobId, token, { progress: 60, progressMessage: 'Buscando documentos relevantes...' });
        await postJobUpdateToClients(jobId);
        const relevantDocs = await retriever.invoke(query);

        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} cancelled after retrieval.`);
            cleanup();
            return;
        }

        // 3. Final Prompt Generation
        await updateJob(jobId, token, { progress: 80, progressMessage: 'Gerando relatório final...' });
        await postJobUpdateToClients(jobId);

        const context = relevantDocs.map(doc => doc.pageContent).join('\n\n---\n\n');
        const template = `Você é um especialista em segurança do trabalho. Sua tarefa é analisar um EPI de referência e, usando o CONTEXTO FORNECIDO, apresentar os EPIs mais similares, retornando a resposta em formato JSON.

        **EPI de Referência (CA ${caData.caNumber}):**
        Link Pagina do CA: "https://consultaca.com/${caData.caNumber}"
        \`\`\`json
        ${JSON.stringify(caData, null, 2)}
        \`\`\`
        ${description.trim() ? `
        **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
        {description}
        ` : ''}

        ---
        **CONTEXTO FORNECIDO (Use APENAS esta informação para basear sua resposta):**
        {context}
        ---

        **Instruções Finais:**
        1.  IMPORTANTE: Com base no CONTEXTO FORNECIDO, identifique até **10 EPIs mais similares** ao de referência.
        2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
        3.  Ordene-os do mais similar para o menos similar na sua resposta final.
        4.  Para cada sugestão, preencha todos os campos do schema JSON solicitado.
        5.  **Tente extrair a URL completa de uma imagem do produto se houver uma claramente associada a ele no CONTEXTO.** Se não encontrar, deixe o campo em branco.
        6.  Se nenhum equipamento similar relevante foi encontrado no CONTEXTO, retorne um array JSON vazio.
        `;

        const prompt = PromptTemplate.fromTemplate(template);

        const model = new ChatGoogleGenerativeAI({
            apiKey: self.geminiApiKey,
            model: "gemini-1.5-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.05,
            }
        });

        const chain = RunnableSequence.from([prompt, model, new StringOutputParser()]);

        let resultText = "";
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await updateJob(jobId, token, { progressMessage: `Realizando síntese final (Tentativa ${i + 1}/${maxRetries})...` });
                await postJobUpdateToClients(jobId);

                resultText = await chain.invoke({
                    description: description.trim(),
                    context: context
                });
                break; // Success, exit the loop
            } catch (e) {
                console.error(`Attempt ${i + 1} failed:`, e);
                if (i === maxRetries - 1) {
                    throw e; // Rethrow the last error
                }
            }
        }

        await updateJob(jobId, token, {
            status: 'completed',
            result: resultText,
            completedAt: Date.now(),
            progress: 100,
            progressMessage: "Finalizado"
        });
        await postJobUpdateToClients(jobId);

        await self.registration.showNotification('Busca de Similaridade Concluída', {
            body: `A busca para o CA ${caData.caNumber} na biblioteca '${libraryName}' foi finalizada. Clique para ver.`,
            icon: '/favicon.ico',
            tag: jobId,
        });

    } catch (e) {
        console.error(`Error processing job ${jobId}:`, e);
        if (job) {
            await updateJob(jobId, token, {
                status: 'failed',
                error: (e as Error).message || 'Ocorreu um erro desconhecido.',
                completedAt: Date.now()
            });
            await postJobUpdateToClients(jobId);
            await self.registration.showNotification('Busca de Similaridade Falhou', {
                body: `A busca para o CA ${job.inputData.caData.caNumber} encontrou um erro.`,
                icon: '/favicon.ico',
                tag: jobId,
            });
        }
    } finally {
        await postJobUpdateToClients(jobId);
        cleanup();
    }
}