import { GoogleGenAI } from "@google/genai";
import { CAData, Library, SimilarityJob } from '../types';
import { fetchUrlAsText, generateContentWithRetry } from './apiService';
import { IS_DEV_MODE } from '../config';
import { FIXED_LIBRARIES } from './fixedData';
import * as idb from './idbService';

export class AIService {

    static async getKnowledgeContext(libraryId: string, libraries: Library[]): Promise<string> {
        let selectedLibrary: Library | undefined;

        if (IS_DEV_MODE) {
            selectedLibrary = libraries.find(lib => lib.id === libraryId);
        } else {
            selectedLibrary = FIXED_LIBRARIES[0];
        }

        if (selectedLibrary && selectedLibrary.files.length > 0) {
            try {
                const fileContents = await Promise.all(selectedLibrary.files.map(file => fetchUrlAsText(file.url)));
                return `
--- INÍCIO DA BASE DE CONHECIMENTO ---
As informações a seguir foram extraídas de documentos fornecidos e devem ser usadas como contexto principal para a análise.
${fileContents.join(`

---

`)}
--- FIM DA BASE DE CONHECIMENTO ---
`;
            } catch (e) {
                console.error("Error fetching library files:", e);
                throw new Error("Falha ao carregar um ou mais arquivos da biblioteca. A análise prosseguirá sem esse contexto.");
            }
        }
        return '';
    }

    static async analyzeCAs(
        caData: CAData, 
        comparisonData: CAData, 
        libraryId: string, 
        libraries: Library[],
        onProgress: (message: string) => void
    ): Promise<string> {
        let knowledgeContext = '';
        try {
            knowledgeContext = await this.getKnowledgeContext(libraryId, libraries);
        } catch (e) {
            // The error is already logged, and we can proceed without context.
        }

        const ai = new GoogleGenAI(process.env.API_KEY!);

        const prompt = `
            ${knowledgeContext}
            Análise Comparativa de Equipamentos de Proteção Individual (EPIs)

            Com base nos dados JSON a seguir${knowledgeContext ? ' e na base de conhecimento fornecida acima' : ''}, forneça uma análise comparativa detalhada entre os dois EPIs.

            **EPI 1 (CA ${caData.caNumber}):**
            \`\`\`json
            ${JSON.stringify(caData, null, 2)}
            \`\`\`

            **EPI 2 (CA ${comparisonData.caNumber}):**
            \`\`\`json
            ${JSON.stringify(comparisonData, null, 2)}
            \`\`\`

            **Formato da Resposta:**

            Você é um especialista em segurança do trabalho. Elabore um relatório claro e objetivo em português do Brasil, usando Markdown, com as seguintes seções:

            ### Principais Diferenças
            Liste em tópicos os pontos-chave que distinguem os dois EPIs (material, tipo de proteção, normas, etc.).

            ### Indicações de Uso
            - **EPI 1 (CA ${caData.caNumber}):** Descreva os cenários ideais para seu uso.
            - **EPI 2 (CA ${comparisonData.caNumber}):** Descreva os cenários ideais para seu uso.

            ### Contraindicações
            - **EPI 1 (CA ${caData.caNumber}):** Onde este EPI **não** deve ser utilizado.
            - **EPI 2 (CA ${comparisonData.caNumber}):** Onde este EPI **não** deve ser utilizado.

            ### Conclusão e Recomendação
            Um resumo conciso para ajudar na escolha entre os dois, baseado nos dados fornecidos.
        `;

        try {
            const response = await generateContentWithRetry(
                ai,
                { model: 'gemini-1.5-flash', contents: [{role: 'user', parts: [{text: prompt}]}] },
                3,
                (attempt) => onProgress(`Analisando... (Tentativa ${attempt}/3)`)
            );
            return response.candidates[0].content.parts[0].text;
        } catch (e) {
            console.error("AI Analysis Error after retries:", e);
            throw new Error("Ocorreu um erro ao conectar com o serviço de IA após múltiplas tentativas. Verifique sua chave de API e tente novamente.");
        }
    }

    static async suggestConversion(
        caData: CAData,
        libraryId: string,
        libraries: Library[],
        onProgress: (message: string) => void
    ): Promise<string> {
        const selectedLibrary = IS_DEV_MODE ? libraries.find(lib => lib.id === libraryId) : FIXED_LIBRARIES[0];
        
        if (!selectedLibrary) {
            const message = IS_DEV_MODE ? "Por favor, selecione uma biblioteca de conhecimento para a conversão." : "Biblioteca de produção não encontrada.";
            throw new Error(message);
        }

        if (selectedLibrary.files.length === 0) {
            throw new Error("A biblioteca selecionada está vazia.");
        }

        let knowledgeBaseContent = '';
        try {
            onProgress('Carregando arquivos da biblioteca...');
            const fileContents = await Promise.all(selectedLibrary.files.map(file => fetchUrlAsText(file.url)));
            knowledgeBaseContent = fileContents.join(`

---

`);
        } catch (e) {
            console.error("Error fetching library files for conversion:", e);
            throw new Error("Falha ao carregar um ou mais arquivos da biblioteca. A análise não pode prosseguir.");
        }

        const ai = new GoogleGenAI(process.env.API_KEY!);

        const prompt = `
            Você é um especialista em Certificados de Aprovação (CAs) e fichas técnicas de Equipamentos de Proteção Individual (EPIs) para calçados. Sua principal tarefa é analisar as informações de um CA de concorrente e, com base em um conjunto de dados de referência (sua base de conhecimento), identificar e sugerir o produto da nossa linha que melhor corresponde a ele.

            **Base de Conhecimento (Nossos Produtos):**
            ---
            ${knowledgeBaseContent}
            ---

            **CA do Concorrente para Análise:**
            \`\`\`json
            ${JSON.stringify(caData, null, 2)}
            \`\`\`

            **Formato da Resposta:**

            Sua resposta deve ser estruturada em três seções:

            1.  **Sugestão de Conversão:** A recomendação mais provável do nosso produto e seu respectivo CA.
            2.  **Análise de Correspondência:** Uma breve análise que justifique a sugestão, destacando as características que se alinham (material, tipo de biqueira, palmilha, etc.) e as que podem ser diferentes.
            3.  **Pontos de Atenção:** Qualquer diferença crítica (ex: sapato vs. bota, proteção S1 vs. S2, etc.) que o operador deve verificar manualmente.
        `;

        try {
            const response = await generateContentWithRetry(
                ai,
                { model: 'gemini-1.5-flash', contents: [{role: 'user', parts: [{text: prompt}]}] },
                3,
                (attempt) => onProgress(`Analisando... (Tentativa ${attempt}/3)`)
            );
            return response.candidates[0].content.parts[0].text;
        } catch (e) {
            console.error("Conversion suggestion error after retries:", e);
            throw new Error("Ocorreu um erro ao conectar com o serviço de IA após múltiplas tentativas. Verifique sua chave de API e tente novamente.");
        }
    }

    static async findSimilar(
        caData: CAData,
        libraryId: string,
        description: string,
        libraries: Library[]
    ): Promise<SimilarityJob> {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            throw new Error("Service Worker não está ativo. A busca em segundo plano não pode ser iniciada.");
        }
        if (!process.env.API_KEY) {
            throw new Error("A chave de API não foi configurada.");
        }
        
        const selectedLibrary = IS_DEV_MODE ? libraries.find(lib => lib.id === libraryId) : FIXED_LIBRARIES[0];
        
        if (!selectedLibrary) {
            const message = IS_DEV_MODE ? "Por favor, selecione uma biblioteca." : "Biblioteca de produção não configurada.";
            throw new Error(message);
        }
        
        if (selectedLibrary.files.length === 0) {
            throw new Error("A biblioteca selecionada está vazia.");
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert("A permissão para notificações é necessária para avisar quando a busca terminar.");
        }

        const newJob: SimilarityJob = {
            id: crypto.randomUUID(),
            caData: caData,
            libraryFiles: selectedLibrary.files,
            libraryName: selectedLibrary.name,
            description: description,
            status: 'pending',
            createdAt: Date.now(),
        };

        await idb.addJob(newJob);
        
        navigator.serviceWorker.controller.postMessage({
            type: 'START_SIMILARITY_JOB',
            payload: {
                jobId: newJob.id,
                apiKey: process.env.API_KEY
            }
        });

        return newJob;
    }
}
