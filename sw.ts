
/// <reference lib="webworker" />

// We need to declare self as a ServiceWorkerGlobalScope to access its methods
declare const self: ServiceWorkerGlobalScope;

import { GoogleGenAI } from "@google/genai";
import * as idb from './services/idbService';
import { fetchUrlAsText, generateContentWithRetry } from './services/apiService';

// SW Lifecycle: Install
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

// SW Lifecycle: Activate
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(self.clients.claim()); // Become available to all pages
});

// Listen for messages from the main application
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'START_SIMILARITY_JOB') {
        const { jobId, apiKey } = event.data.payload;
        console.log(`Service Worker: Received job ${jobId}`);
        // Use event.waitUntil to keep the service worker alive while processing
        event.waitUntil(runSimilarityJob(jobId, apiKey));
    }
});

const postJobUpdate = async (jobId: string) => {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage({ type: 'JOB_UPDATED', payload: { jobId } });
    }
}

async function runSimilarityJob(jobId: string, apiKey: string) {
    let job = await idb.getJob(jobId);
    if (!job) {
        console.error(`Job ${jobId} not found in IDB.`);
        return;
    }

    try {
        // 1. Set status to processing
        job.status = 'processing';
        job.progress = 0;
        job.progressMessage = 'Iniciando análise...';
        await idb.updateJob(job);
        await postJobUpdate(job.id);

        const ai = new GoogleGenAI({ apiKey });
        const { caData, libraryFiles, description, libraryName } = job;
        const individualResults: string[] = [];
        
        const totalFiles = libraryFiles.length;
        job.totalFiles = totalFiles;
        await idb.updateJob(job);

        // 2. Analyze each file
        for (let i = 0; i < totalFiles; i++) {
            const file = libraryFiles[i];
            const fileContent = await fetchUrlAsText(file.url);
            
            const perFilePrompt = `
                Você é um especialista em EPIs. Analise o conteúdo do documento a seguir para encontrar um EPI similar ao EPI de Referência.
                
                **EPI de Referência (CA ${caData.caNumber}):**
                \`\`\`json
                ${JSON.stringify({ name: caData.equipmentName, approvedFor: caData.approvedFor, description: caData.description }, null, 2)}
                \`\`\`
                ${description.trim() ? `
                **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
                ${description.trim()}
                ` : ''}
                **Conteúdo do Documento (Fonte: ${file.url}):**
                ---
                ${fileContent}
                ---
                
                **Sua Tarefa:**
                Se encontrar um EPI similar no documento, descreva-o sucintamente, incluindo seu nome/identificador e a principal razão da similaridade. Dê forte preferência à "Descrição Adicional" se ela for fornecida.
                Se nenhum similar for encontrado, responda "Nenhum EPI similar encontrado neste documento.".
                Seja breve e objetivo.
            `;
            
            try {
                const response = await generateContentWithRetry(ai, { model: 'gemini-2.5-flash', contents: perFilePrompt }, 3, (attempt) => {
                    job.progressMessage = `Analisando arquivo ${i + 1}/${totalFiles} (Tentativa ${attempt}/3)...`;
                    idb.updateJob(job); // Fire-and-forget update
                });
                individualResults.push(`Análise do documento ${file.url}:\n${response.text}`);
            } catch (fileError) {
                console.error(`Failed to analyze file ${file.url} after retries:`, fileError);
                individualResults.push(`[ERRO] A análise do documento ${file.url} falhou após múltiplas tentativas.`);
            }
            
            job.progress = i + 1;
            await idb.updateJob(job);
            await postJobUpdate(job.id);
        }

        // 3. Final synthesis
        const synthesisPrompt = `
            Você é um especialista em segurança do trabalho. Sua tarefa é consolidar várias análises de documentos e apresentar os EPIs mais similares a um EPI de referência.

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
            ${individualResults.join('\n\n---\n\n')}
            ---

            **Instruções Finais:**
            1.  Com base nos resultados individuais, identifique até **3 EPIs mais similares** ao de referência.
            2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
            3.  Ordene-os do mais similar para o menos similar.
            4.  Para cada sugestão, forneça:
                - **Equipamento Similar:** O nome, CA, ou identificador claro.
                - **Confiança da Similaridade:** Uma estimativa em porcentagem (ex: 95%) de quão confiante você está na correspondência.
                - **Justificativa:** Uma explicação detalhada e consolidada do porquê o item é similar, citando as características principais e como ele atende à descrição adicional.
            5.  Formate a resposta final em Markdown. Comece cada item com '###' seguido do número e nome do equipamento (ex: ### 1. Luva Pro-Safety Max).
            6.  Se nenhum equipamento similar relevante foi encontrado em todas as análises, responda apenas: "Nenhum equipamento similar foi encontrado na base de conhecimento fornecida."
        `;
        
        const finalResponse = await generateContentWithRetry(ai, { model: 'gemini-2.5-flash', contents: synthesisPrompt }, 3, (attempt) => {
            job.progressMessage = `Realizando síntese final (Tentativa ${attempt}/3)...`;
            idb.updateJob(job);
        });
        
        // 4. Update job as completed
        job.status = 'completed';
        job.result = finalResponse.text;
        job.completedAt = Date.now();
        job.progress = job.totalFiles;
        job.progressMessage = "Finalizado";
        await idb.updateJob(job);

        // 5. Show notification
        await self.registration.showNotification('Busca de Similaridade Concluída', {
            body: `A busca para o CA ${caData.caNumber} na biblioteca '${libraryName}' foi finalizada.`,
            icon: '/favicon.ico', // A default icon
        });

    } catch (e) {
        console.error(`Error processing job ${jobId}:`, e);
        job.status = 'failed';
        job.error = (e as Error).message || 'Ocorreu um erro desconhecido.';
        job.completedAt = Date.now();
        await idb.updateJob(job);
        await self.registration.showNotification('Busca de Similaridade Falhou', {
            body: `A busca para o CA ${job.caData.caNumber} encontrou um erro.`,
            icon: '/favicon.ico',
        });
    } finally {
        await postJobUpdate(job.id);
    }
}
