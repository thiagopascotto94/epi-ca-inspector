/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & { geminiApiKey?: string };

import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { getAuth, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { generateContentWithRetry } from './services/apiService';
import { SimilarityJob } from './types';

// --- Firebase Initialization ---
let firebaseApp: any = null;
let db: any = null;
let auth: any = null;

function initializeFirebase(apiKey: string, uid: string) {
    if (firebaseApp) return;

    const firebaseConfig = {
        apiKey: 'AIzaSyBd_ODcBhUbiLkQ-GBgemIlDkGZDQ4IcFw',
        authDomain: "epi-ca-inspector.firebaseapp.com",
        projectId: "epi-ca-inspector",
        storageBucket: "epi-ca-inspector.appspot.com",
        messagingSenderId: "88060391632",
        appId: "1:88060391632:web:c54fdfc7fa5ae70dce6ed5"
    };

    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
}

// --- State for Queue and Cancellation ---
let isJobRunning = false;
let currentUid: string | null = null;
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
        const { jobId, apiKey, uid, idToken, geminiApiKey } = event.data.payload; // Added geminiApiKey
        console.log(`Service Worker: key ${geminiApiKey}.`);
        console.log(`Service Worker: Received job ${jobId}, adding to queue.`);
        initializeFirebase(apiKey, uid);
        currentUid = uid;
        self.geminiApiKey = geminiApiKey; // Store geminiApiKey in SW global scope

        if (auth && idToken) {
            try {
                await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
                console.log('Service Worker: Signed in with ID token.');
            } catch (error) {
                console.error('Service Worker: Error signing in with ID token:', error);
                return;
            }
        } else {
            console.warn('Service Worker: No auth instance or ID token provided. Firestore access might fail.');
        }
        processQueue();
    } else if (event.data && event.data.type === 'CANCEL_SIMILARITY_JOB') {
        const { jobId } = event.data.payload;
        console.log(`Service Worker: Received cancellation request for job ${jobId}.`);
        cancelledJobIds.add(jobId);
    }
});

async function processQueue() {
    if (isJobRunning) {
        console.log('SW: A job is already running. Queue will be processed after it completes.');
        return;
    }

    if (!db || !currentUid) {
        console.log('SW: Firebase or UID not available. Waiting for a job to be initiated from the client app.');
        return;
    }

    const jobsCollectionRef = collection(db, `users/${currentUid}/jobs`);
    const q = query(jobsCollectionRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    const allJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SimilarityJob));

    const nextJob = allJobs.find(j => j.status === 'pending');

    if (!nextJob) {
        console.log('SW: No pending jobs in the queue.');
        return;
    }

    if (cancelledJobIds.has(nextJob.id)) {
        console.log(`SW: Skipping cancelled pending job ${nextJob.id}`);
        cancelledJobIds.delete(nextJob.id);
        setTimeout(processQueue, 0);
        return;
    }
    
    isJobRunning = true;
    console.log(`SW: Starting job ${nextJob.id}`);

    runSimilarityJob(nextJob.id, currentUid)
        .catch(err => {
            console.error(`SW: Unhandled error in runSimilarityJob for ${nextJob.id}`, err);
        })
        .finally(() => {
            isJobRunning = false;
            console.log(`SW: Finished job processing for ${nextJob.id}. Checking for next job.`);
            setTimeout(processQueue, 100);
        });
}

const postJobUpdate = async (jobId: string) => {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage({ type: 'JOB_UPDATED', payload: { jobId } });
    }
}

async function runSimilarityJob(jobId: string, uid: string) {
    if (!db) {
        console.error("Firestore DB not initialized in Service Worker.");
        return;
    }

    const jobDocRef = doc(db, `users/${uid}/jobs`, jobId);
    let jobSnapshot = await getDoc(jobDocRef);
    let job = jobSnapshot.data() as SimilarityJob;

    if (!job) {
        console.error(`Job ${jobId} not found in Firestore.`);
        cancelledJobIds.delete(jobId);
        return;
    }

    const cleanup = () => {
        cancelledJobIds.delete(jobId);
    };

    try {
        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} was cancelled before starting.`);
            cleanup();
            return;
        }

        await updateDoc(jobDocRef, {
            status: 'processing',
            progress: 0,
            progressMessage: 'Iniciando análise...'
        });
        job.status = 'processing';
        job.progress = 0;
        job.progressMessage = 'Iniciando análise...';
        await postJobUpdate(job.id);

        const ai = new GoogleGenAI({ apiKey: self.geminiApiKey || firebaseApp.options.apiKey });
        const { caData, libraryFiles, description, libraryName } = job;
        
        const totalFiles = libraryFiles.length;
        await updateDoc(jobDocRef, { totalFiles: totalFiles });
        job.totalFiles = totalFiles;

        // 1. Validate that all files have content
        for (let i = 0; i < totalFiles; i++) {
            if (cancelledJobIds.has(jobId)) {
                console.log(`Job ${jobId} cancelled during file validation.`);
                cleanup();
                return;
            }
            const file = libraryFiles[i];
            if (!file.content) {
                console.error(`File content for ${file.url} is missing in the job data.`);
                await updateDoc(jobDocRef, {
                    status: 'failed',
                    error: `O conteúdo do arquivo ${file.url} não foi encontrado nos dados do trabalho. A análise não pode continuar.`,
                    completedAt: Date.now()
                });
                await postJobUpdate(job.id);
                cleanup();
                return;
            }
             // Update progress visually
            await updateDoc(jobDocRef, {
                progress: i + 1,
                progressMessage: `Verificando arquivo ${i + 1}/${totalFiles}: ${file.url}`
            });
            await postJobUpdate(job.id);
        }

        if (cancelledJobIds.has(jobId)) {
            console.log(`Job ${jobId} cancelled before final synthesis.`);
            cleanup();
            return;
        }

        // 3. Final synthesis with JSON response
        const synthesisPrompt = 
            `Você é um especialista em segurança do trabalho. Sua tarefa é consolidar várias análises de documentos e apresentar os EPIs mais similares a um EPI de referência, retornando a resposta em formato JSON.

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
            1.  Com base nos resultados individuais, identifique até **5 EPIs mais similares** ao de referência.
            2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
            3.  Ordene-os do mais similar para o menos similar na sua resposta final.
            4.  Para cada sugestão, preencha todos os campos do schema JSON solicitado:
                - **justification**: Uma frase **curta e direta** resumindo o motivo da similaridade. Ex: "Ambos são calçados de segurança S3 com biqueira de composite."
                - **detailedJustification**: Uma análise mais completa em **Markdown**, explicando os prós e contras, comparando materiais, normas e indicações de uso. Use listas para clareza.
            5.  **Tente extrair a URL completa de uma imagem do produto se houver uma claramente associada a ele nos documentos.** Se não encontrar, deixe o campo em branco.
            6.  Se nenhum equipamento similar relevante foi encontrado em todas as análises, retorne um array JSON vazio.
        `;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    productName: {
                        type: Type.STRING,
                        description: 'O nome, modelo ou identificador claro do produto similar encontrado.'
                    },
                    caNumber: {
                        type: Type.STRING,
                        description: 'O número do Certificado de Aprovação (CA) do produto, se disponível.'
                    },
                    confidence: {
                        type: Type.NUMBER,
                        description: 'Uma estimativa em porcentagem (0-100) de quão confiante você está na correspondência.'
                    },
                    justification: {
                        type: Type.STRING,
                        description: 'Uma explicação CURTA e direta (uma frase) do porquê o item é similar.'
                    },
                    detailedJustification: {
                        type: Type.STRING,
                        description: 'Uma análise detalhada em formato Markdown comparando os produtos, destacando prós, contras e diferenças.'
                    },
                    imageUrl: {
                        type: Type.STRING,
                        description: 'A URL completa de uma imagem do produto, se encontrada nos documentos.'
                    }
                },
                required: ["productName", "confidence", "justification", "detailedJustification"]
            }
        };
        
        const finalResponse = await generateContentWithRetry(ai, {
            model: 'gemini-2.0-flash-lite',
            contents: synthesisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        }, 3, (attempt) => {
            updateDoc(jobDocRef, { progressMessage: `Realizando síntese final (Tentativa ${attempt}/3)...` });
        });
        
        console.log('Final response object:', finalResponse);
        console.log('Final response text:', finalResponse.text);

        // 4. Update job as completed
        await updateDoc(jobDocRef, {
            status: 'completed',
            result: finalResponse.text,
            completedAt: Date.now(),
            progress: job.totalFiles,
            progressMessage: "Finalizado"
        });
        job.status = 'completed';
        job.result = finalResponse.text;
        job.completedAt = Date.now();
        job.progress = job.totalFiles;
        job.progressMessage = "Finalizado";

        // 5. Show notification
        await self.registration.showNotification('Busca de Similaridade Concluída', {
            body: `A busca para o CA ${caData.caNumber} na biblioteca '${libraryName}' foi finalizada. Clique para ver.`, 
            icon: '/favicon.ico',
            tag: jobId,
        });

    } catch (e) {
        console.error(`Error processing job ${jobId}:`, e);
        const currentJobSnapshot = await getDoc(jobDocRef);
        let currentJobState = currentJobSnapshot.data() as SimilarityJob;
        if (currentJobState) {
            await updateDoc(jobDocRef, {
                status: 'failed',
                error: (e as Error).message || 'Ocorreu um erro desconhecido.',
                completedAt: Date.now()
            });
            currentJobState.status = 'failed';
            currentJobState.error = (e as Error).message || 'Ocorreu um erro desconhecido.';
            currentJobState.completedAt = Date.now();
            await self.registration.showNotification('Busca de Similaridade Falhou', {
                body: `A busca para o CA ${job.caData.caNumber} encontrou um erro.`, 
                icon: '/favicon.ico',
                tag: jobId,
            });
        }
    } finally {
        const finalJobSnapshot = await getDoc(jobDocRef);
        if (finalJobSnapshot.exists()) {
            await postJobUpdate(jobId);
        }
        cleanup();
    }
}