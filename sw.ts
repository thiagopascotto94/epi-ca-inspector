/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & { geminiApiKey?: string };

import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from './services/apiService';
import { SimilarityJob } from './types';

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:8000/api';

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
        headers: Object.fromEntries(config.headers.entries()),
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

        if (!job) {
            throw new Error(`Job ${jobId} not found via API.`);
        }

        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} was cancelled before starting.`);
            cleanup();
            return;
        }

        await updateJob(jobId, token, {
            status: 'processing',
            progress: 0,
            progressMessage: 'Iniciando análise...'
        });
        await postJobUpdateToClients(jobId);

        const ai = new GoogleGenAI(self.geminiApiKey || "");
        const { inputData } = job;
        const { caData, libraryFiles, description, libraryName } = inputData;

        const totalFiles = libraryFiles.length;
        await updateJob(jobId, token, { totalFiles: totalFiles });

        for (let i = 0; i < totalFiles; i++) {
            if (cancelledJobIds.has(jobId)) {
                console.log(`Job ${jobId} cancelled during file validation.`);
                cleanup();
                return;
            }
            const file = libraryFiles[i];
            if (!file.content) {
                throw new Error(`O conteúdo do arquivo ${file.url} não foi encontrado nos dados do trabalho.`);
            }
            await updateJob(jobId, token, {
                progress: i + 1,
                progressMessage: `Verificando arquivo ${i + 1}/${totalFiles}: ${file.url}`
            });
            await postJobUpdateToClients(jobId);
        }

        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} cancelled before final synthesis.`);
            cleanup();
            return;
        }

        const synthesisPrompt = `Você é um especialista em segurança do trabalho. Sua tarefa é consolidar várias análises de documentos e apresentar os EPIs mais similares a um EPI de referência, retornando a resposta em formato JSON.

        **EPI de Referência (CA ${caData.caNumber}):**
        \`\`\`json
        ${JSON.stringify(caData, null, 2)}
        \`\`\`
        ${description.trim() ? `
        **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
        ${description.trim()}
        ` : ''}
        **Resultados das Análises Individuais dos Documentos:**
        ---
        ${libraryFiles.map(file => `Análise do documento ${file.url}:
        ${file.content || '[Conteúdo não disponível]'}`).join(`

        ---

        `)}            ---

        **Instruções Finais:**
        1.  Com base nos resultados individuais, identifique até **10 EPIs mais similares** ao de referência. A prioridade é encontrar produtos com **100% de familiaridade** ou o mais próximo possível disso que atendam rigorosamente as especificações porem que tendam a ser mais baratas.
        2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
        3.  Ordene-os do mais similar para o menos similar na sua resposta final.
        4.  Para cada sugestão, preencha todos os campos do schema JSON solicitado:
            - **justification**: Uma frase **curta e direta** resumindo o motivo da similaridade. Ex: "Ambos são calçados de segurança S3 com biqueira de composite."
            - **detailedJustification**: Uma análise mais completa em **Markdown**, explicando os prós e contras, comparando materiais, normas e indicações de uso. Use listas para clareza.
        5.  **Tente extrair a URL completa de uma imagem do produto se houver uma claramente associada a ele nos documentos.** Se não encontrar, deixe o campo em branco.
        6.  Se nenhum equipamento similar relevante foi encontrado em todas as análises, retorne um array JSON vazio.
        `;

        const finalResponse = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0,
            },
        }, 3, (attempt) => {
            updateJob(jobId, token, { progressMessage: `Realizando síntese final (Tentativa ${attempt}/3)...` });
            postJobUpdateToClients(jobId);
        });

        const resultText = finalResponse.candidates[0].content.parts[0].text;

        await updateJob(jobId, token, {
            status: 'completed',
            result: resultText,
            completedAt: Date.now(),
            progress: totalFiles,
            progressMessage: "Finalizado"
        });

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