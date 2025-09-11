/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
    geminiApiKey?: string;
    useModel?: any; // Universal Sentence Encoder model
};

import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from './services/apiService';
import { SimilarityJob } from './types';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

// --- AI/ML Model ---
// The model will be loaded on demand and cached here.
let useModelPromise: Promise<use.UniversalSentenceEncoder> | null = null;

function loadModel(): Promise<use.UniversalSentenceEncoder> {
    if (useModelPromise) {
        return useModelPromise;
    }
    console.log('Loading Universal Sentence Encoder model...');

    // Set backend and load model
    useModelPromise = (async () => {
        await tf.setBackend('cpu');
        console.log('TensorFlow.js backend set to CPU.');
        const model = await use.load();
        console.log('Model loaded successfully.');
        return model;
    })();

    useModelPromise.catch(err => {
        console.error('Failed to load USE model or set backend:', err);
        useModelPromise = null; // Reset on failure
    });

    return useModelPromise;
}


// SW Lifecycle: Install
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(self.skipWaiting());
});


// --- API Configuration ---
const API_BASE_URL = 'http://localhost:3001/api';

// --- State for Queue and Cancellation ---
let isJobRunning = false;
const cancelledJobIds = new Set<string>();


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

// --- Text Processing Helpers ---
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.substring(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

async function getEmbeddings(texts: string[]): Promise<tf.Tensor2D> {
    const model = await loadModel();
    console.log(`Generating embeddings for ${texts.length} texts...`);
    const embeddings = await model.embed(texts);
    console.log("Embeddings generated.");
    return embeddings;
}

async function calculateCosineSimilarity(tensorA: tf.Tensor, tensorB: tf.Tensor): Promise<number[]> {
    const a = tensorA.as2D(1, -1); // Ensure it's a 2D tensor
    const bNorm = tensorB.norm(2, 1, true);
    const bNormalized = tensorB.div(bNorm);
    const aNorm = a.norm(2, 1, true);
    const aNormalized = a.div(aNorm);

    const similarities = aNormalized.matMul(bNormalized.transpose());
    return Array.from(await similarities.data());
}

// --- Local API Helpers ---

async function fetchTextContent(url: string, token: string): Promise<string> {
    console.log(`[SW] Fetching text content from: ${url}`);
    const headers = new Headers();
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch content from ${url}. Status: ${response.status}`);
        }
        return response.text();
    } catch (error) {
        console.error(`[SW] Fetch failed for text content at URL: ${url}. Error:`, error);
        throw error;
    }
}


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

    try {
        const response = await fetch(url, config);

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
        throw error;
    }
}

async function getJob(jobId: string, token: string): Promise<SimilarityJob> {
    return apiRequest<SimilarityJob>(`/jobs/${jobId}`, token, { method: 'GET' });
}

async function updateJob(jobId: string, token: string, updates: Partial<SimilarityJob>): Promise<SimilarityJob> {
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

        await updateJob(jobId, token, { status: 'processing', progress: 0, progressMessage: 'Iniciando análise de similaridade...' });
        await postJobUpdateToClients(jobId);

        const { inputData } = job;
        const { caData, libraryFiles, description, libraryName } = inputData;
        const totalFiles = libraryFiles.length;
        await updateJob(jobId, token, { totalFiles });

        // Step 1: Create reference text and its embedding
        const referenceText = `CA: ${caData.caNumber}. ${caData.equipment}. ${caData.description}. ${description || ''}`.trim();
        const referenceEmbedding = await getEmbeddings([referenceText]);

        if (cancelledJobIds.has(jobId)) return;

        // Step 2: Collect all chunks from all library files
        await updateJob(jobId, token, { progress: 10, progressMessage: 'Coletando e processando textos...' });
        await postJobUpdateToClients(jobId);

        let allChunks: { source: string, content: string }[] = [];
        for (let i = 0; i < totalFiles; i++) {
            const file = libraryFiles[i];
             if (cancelledJobIds.has(jobId)) return; // Early exit if cancelled

            // Fetch content if it's missing
            if (!file.content) {
                try {
                    file.content = await fetchTextContent(file.url, token);
                } catch (e) {
                    console.warn(`Failed to fetch content for ${file.url}, skipping file.`, e);
                    continue; // Skip this file if fetching fails
                }
            }
            const chunks = chunkText(file.content, 1000, 100);
            for (const chunk of chunks) {
                allChunks.push({ source: file.url, content: chunk });
            }
        }

        if (cancelledJobIds.has(jobId)) return;

        // Step 3: Generate embeddings for all chunks in a single batch
        await updateJob(jobId, token, { progress: 50, progressMessage: `Gerando análise de similaridade para ${allChunks.length} trechos...` });
        await postJobUpdateToClients(jobId);

        const chunkContents = allChunks.map(c => c.content);
        const chunkEmbeddings = await getEmbeddings(chunkContents);

        // Step 4: Calculate similarities and find relevant chunks
        const similarities = await calculateCosineSimilarity(referenceEmbedding, chunkEmbeddings);
        tf.dispose([referenceEmbedding, chunkEmbeddings]); // Clean up tensors

        const SIMILARITY_THRESHOLD = 0.70;
        let relevantChunks: { source: string, content: string }[] = [];
        for (let i = 0; i < similarities.length; i++) {
            if (similarities[i] > SIMILARITY_THRESHOLD) {
                relevantChunks.push(allChunks[i]);
            }
        }

        if (cancelledJobIds.has(jobId)) return;

        if (relevantChunks.length === 0) {
            await updateJob(jobId, token, {
                status: 'completed',
                result: '[]', // Empty JSON array
                completedAt: Date.now(),
                progress: 100,
                progressMessage: "Nenhum conteúdo relevante encontrado nos documentos."
            });
            await postJobUpdateToClients(jobId);
            return;
        }

        await updateJob(jobId, token, { progress: 95, progressMessage: 'Consolidando informações relevantes...' });
        await postJobUpdateToClients(jobId);

        // Step 3: Synthesize results with GenAI using only relevant chunks
        const synthesisPrompt = `Você é um especialista em segurança do trabalho. Sua tarefa é consolidar trechos de documentos e apresentar os EPIs mais similares a um EPI de referência, retornando a resposta em formato JSON.

        **EPI de Referência (CA ${caData.caNumber}):**
        Link Pagina do CA: "https://consultaca.com/${caData.caNumber}"
        \`\`\`json
        ${JSON.stringify(caData, null, 2)}
        \`\`\`
        ${description.trim() ? `
        **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
        ${description.trim()}
        ` : ''}

        **Trechos Relevantes Encontrados nos Documentos (Similaridade > 70%):**
        ---
        ${relevantChunks.map(chunk => `Trecho do documento ${chunk.source}:
        "...${chunk.content}..."`).join(`\n\n---\n\n`)}
        ---

        **Instruções Finais:**
        1.  Com base **apenas nos trechos de documentos fornecidos**, identifique até **10 EPIs mais similares** ao de referência.
        2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
        3.  Ordene-os do mais similar para o menos similar.
        4.  Para cada sugestão, preencha todos os campos do schema JSON.
        5.  Se nenhum equipamento similar relevante for encontrado nos trechos, retorne um array JSON vazio.`;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    productName: { type: Type.STRING, description: 'O nome, modelo ou identificador claro do produto similar encontrado.' },
                    caNumber: { type: Type.STRING, description: 'O número do Certificado de Aprovação (CA) do produto, se disponível.' },
                    confidence: { type: Type.NUMBER, description: 'Uma estimativa em porcentagem (0-100) de quão confiante você está na correspondência.' },
                    justification: { type: Type.STRING, description: 'Uma explicação CURTA e direta (uma frase) do porquê o item é similar.' },
                    detailedJustification: { type: Type.STRING, description: 'Uma análise detalhada em formato Markdown comparando os produtos.' },
                    imageUrl: { type: Type.STRING, description: 'A URL completa de uma imagem do produto, se encontrada.' }
                },
                required: ["productName", "confidence", "justification", "detailedJustification"]
            }
        };

        const ai = new GoogleGenAI({ apiKey: self.geminiApiKey || "" });
        const finalResponse = await generateContentWithRetry(ai, {
            // @ts-ignore
            model: import.meta.env.VITE_GEMINI_FLASH_LITE_MODEL,
            contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }],
            config: {
                responseMimeType: "application/json",
                temperature: 0.05,
                responseSchema: responseSchema,
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