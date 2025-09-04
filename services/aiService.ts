import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { CAData, Library, SimilarityJob } from '../types';
import { fetchUrlAsText, fetchUrlAsTextWithRetry, generateContentWithRetry } from './apiService';
import { IS_DEV_MODE } from '../config';
import { FIXED_LIBRARIES } from './fixedData';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// Set up the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();


async function fileToGenerativePart(file: File) {
    const base64EncodedData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: base64EncodedData, mimeType: file.type },
    };
}

export class AIService {

    static async extractTextFromFiles(
        files: File[],
        onProgress: (message: string) => void
    ): Promise<string[]> {
        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY! });
        const extractedTexts: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            onProgress(`Processando arquivo ${i + 1} de ${files.length}: ${file.name}...`);

            try {
                const parts: any[] = [];
                const prompt = `Extraia todo o texto do documento a seguir (que é uma ficha técnica de produto). Organize a informação de forma clara e estruturada, usando cabeçalhos, listas e parágrafos para manter a estrutura do documento original o máximo possível. O resultado deve ser em formato Markdown.`;

                if (file.type.startsWith('image/')) {
                    const imagePart = await fileToGenerativePart(file);
                    parts.push({ text: prompt }, imagePart);
                } else if (file.type === 'application/pdf') {
                    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
                    onProgress(`Processando ${pdf.numPages} páginas do PDF ${file.name}...`);
                    const imageParts = [];
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        if (context) {
                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
                            imageParts.push({ inlineData: { data: imageBase64, mimeType: 'image/jpeg' } });
                        }
                    }
                    parts.push({ text: prompt }, ...imageParts);
                } else {
                    continue; // Skip unsupported file types
                }

                const request = {
                    model: "gemini-1.5-flash-latest",
                    contents: [{ role: 'user', parts }],
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                };

                const response = await generateContentWithRetry(
                    ai,
                    request,
                    3,
                    (attempt) => onProgress(`Processando arquivo ${i + 1} de ${files.length}... (Tentativa ${attempt}/3)`)
                );

                const text = response.candidates[0].content.parts[0].text;
                extractedTexts.push(`\n\n---\n\n## Conteúdo de: ${file.name}\n\n${text}`);

            } catch (error) {
                console.error(`Erro ao processar o arquivo ${file.name}:`, error);
                extractedTexts.push(`\n\n---\n\n## Erro ao processar: ${file.name}\n\nNão foi possível extrair o conteúdo deste arquivo.`);
            }
        }

        return extractedTexts;
    }

    static async getKnowledgeContext(libraryId: string, libraries: Library[], onProgress: (message: string) => void): Promise<string[]> {
        let selectedLibrary: Library | undefined;

        if (IS_DEV_MODE) {
            selectedLibrary = libraries.find(lib => lib.id === libraryId);
        } else {
            selectedLibrary = FIXED_LIBRARIES[0];
        }

        if (selectedLibrary && selectedLibrary.files.length > 0) {
            try {
                const fileContents: string[] = [];
                const totalFiles = selectedLibrary.files.length;
                for (let i = 0; i < totalFiles; i++) {
                    const file = selectedLibrary.files[i];
                    onProgress(`Carregando arquivo ${i + 1} de ${totalFiles}: ${file.url}...`);
                    if (file.content) {
                        fileContents.push(file.content);
                    } else {
                        // Fallback or error, depending on desired behavior.
                        // For now, let's assume content is mandatory and throw an error if not found.
                        throw new Error(`O conteúdo do arquivo ${file.url} não foi encontrado no banco de dados.`);
                    }
                }

                // Define a maximum chunk size for the knowledge base
                const MAX_KNOWLEDGE_CHUNK_SIZE = 900000; // 900KB, leaving room for prompt and response

                const chunks = AIService.splitContentIntoChunks(fileContents, MAX_KNOWLEDGE_CHUNK_SIZE);

                return chunks.map(chunk => `
                    --- INÍCIO DA BASE DE CONHECIMENTO ---

                    As informações a seguir foram extraídas de documentos fornecidas e devem ser usadas como contexto principal para a análise.

                    ${chunk}

                    --- FIM DA BASE DE CONHECIMENTO ---
                `);

            } catch (e) {
                console.error("Error fetching library files:", e);
                throw new Error("Falha ao carregar um ou mais arquivos da biblioteca após múltiplas tentativas. A análise não pode prosseguir sem este contexto.");
            }
        }
        return ['']; // Return an array with an empty string if no library or files
    }

    static async analyzeCAs(
        caData: CAData,
        comparisonData: CAData,
        libraryId: string,
        libraries: Library[],
        onProgress: (message: string) => void
    ): Promise<string> {
        let knowledgeContexts: string[] = []; // Change to array
        try {
            knowledgeContexts = await this.getKnowledgeContext(libraryId, libraries, onProgress);
        } catch (e) {
            // The error is already logged, and we can proceed without context.
        }

        
        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY! });
        const individualAnalysisResults: string[] = [];
        const totalChunks = knowledgeContexts.length;

        for (let i = 0; i < totalChunks; i++) {
            const currentKnowledgeContext = knowledgeContexts[i];
            onProgress(`Analisando parte ${i + 1} de ${totalChunks} da base de conhecimento...`);

            const prompt =
                `${currentKnowledgeContext}
                Análise Comparativa de Equipamentos de Proteção Individual (EPIs)

                Com base nos dados JSON a seguir${currentKnowledgeContext ? ' e na base de conhecimento fornecida acima' : ''}, forneça uma análise comparativa detalhada entre os dois EPIs.

                **EPI 1 (CA ${caData.caNumber}):**
                \`\`\`json
                ${JSON.stringify(caData, null, 2)}
                \`\`\`

                **EPI 2 (CA ${comparisonData.caNumber}):**
                \`\`\`json
                ${JSON.stringify(comparisonData, null, 2)}
                \`\`\`

                **Formato da Resposta (HTML Infográfico com Tailwind CSS):**

                Você é um especialista em segurança do trabalho. Elabore um infográfico comparativo em HTML, utilizando classes do Tailwind CSS para estilização. O HTML deve ser completo e autocontido, sem necessidade de scripts externos ou folhas de estilo adicionais além do Tailwind.

                **Diretrizes de Estilo Tailwind:**
                - Use cores da paleta padrão do Tailwind (ex: 'bg-blue-100', 'text-blue-800', 'border-gray-300').
                - Utilize 'p-4', 'm-4', 'shadow-md', 'rounded-lg' para espaçamento, sombras e bordas arredondadas.
                - Para títulos, use classes como 'text-xl', 'text-2xl', 'font-bold', 'text-gray-800'.
                - Para o corpo do texto, use 'text-gray-700', 'leading-relaxed'.
                - Estruture o conteúdo em 'div's com classes flexbox ('flex', 'flex-col', 'items-center', 'justify-center') ou grid ('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6') para layout responsivo.
                - Use ícones ou emojis simples para visualização, se apropriado.

                **Estrutura do Infográfico:**
                Retorne APENAS o código HTML, sem qualquer texto adicional, formatação Markdown (como 
                \`\`\`html
                ) ou comentários.

                <div class="container mx-auto p-4 bg-white shadow-lg rounded-lg">
                    <h1 class="text-3xl font-bold text-center text-blue-700 mb-6">Análise Comparativa de EPIs</h1>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                            <h2 class="text-xl font-semibold text-blue-600 mb-2">EPI 1 (CA ${caData.caNumber})</h2>
                            <p class="text-gray-700">${caData.equipmentName || 'Nome não disponível'}</p>
                            <!-- Adicione mais detalhes do EPI 1 aqui -->
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                            <h2 class="text-xl font-semibold text-green-600 mb-2">EPI 2 (CA ${comparisonData.caNumber})</h2>
                            <p class="text-gray-700">${comparisonData.equipmentName || 'Nome não disponível'}</p>
                            <!-- Adicione mais detalhes do EPI 2 aqui -->
                        </div>
                    </div>

                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Principais Diferenças</h2>
                        <ul class="list-disc list-inside text-gray-700 space-y-2">
                            <li>[Diferença 1]</li>
                            <li>[Diferença 2]</li>
                        </ul>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">Indicações de Uso</h2>
                            <h3 class="text-xl font-semibold text-blue-600 mb-2">EPI 1 (CA ${caData.caNumber})</h3>
                            <p class="text-gray-700 leading-relaxed">[Cenários ideais para EPI 1]</p>
                            <h3 class="text-xl font-semibold text-green-600 mt-4 mb-2">EPI 2 (CA ${comparisonData.caNumber})</h3>
                            <p class="text-gray-700 leading-relaxed">[Cenários ideais para EPI 2]</p>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">Contraindicações</h2>
                            <h3 class="text-xl font-semibold text-blue-600 mb-2">EPI 1 (CA ${caData.caNumber})</h3>
                            <p class="text-gray-700 leading-relaxed">[Onde EPI 1 NÃO deve ser utilizado]</p>
                            <h3 class="text-xl font-semibold text-green-600 mt-4 mb-2">EPI 2 (CA ${comparisonData.caNumber})</h3>
                            <p class="text-gray-700 leading-relaxed">[Onde EPI 2 NÃO deve ser utilizado]</p>
                        </div>
                    </div>

                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Conclusão e Recomendação</h2>
                        <p class="text-gray-700 leading-relaxed">[Resumo conciso e recomendação]</p>
                    </div>
                </div>
            `

            try {
                const response = await generateContentWithRetry(
                    ai,
                    { model: 'gemini-2.0-flash-lite', contents: [{ role: 'user', parts: [{ text: prompt }] }] },
                    3,
                    (attempt) => onProgress(`Analisando parte ${i + 1} de ${totalChunks}... (Tentativa ${attempt}/3)`)
                );
                individualAnalysisResults.push(response.candidates[0].content.parts[0].text);
            } catch (e) {
                console.error(`AI Analysis Error for chunk ${i + 1} after retries:`, e);
                individualAnalysisResults.push('[ERRO] Falha na análise da parte ${i + 1} da base de conhecimento.');
            }
        }

        // Synthesize results if there are multiple chunks
        if (individualAnalysisResults.length > 1) {
            onProgress('Sintetizando resultados da análise...');
            const synthesisPrompt = `
                Você é um especialista em segurança do trabalho. Consolide os seguintes fragmentos de HTML, que são análises comparativas de EPIs, em um único infográfico HTML coeso e objetivo em português do Brasil. Utilize as classes do Tailwind CSS para manter a identidade visual.

                **Fragmentos HTML Individuais:**
                ${individualAnalysisResults.join('\n\n<!-- --- -->\n\n')}

                **Instruções:**
                - Combine as informações de todos os fragmentos, removendo redundâncias e garantindo que o HTML resultante seja válido e bem estruturado.
                - Mantenha a estrutura de seções: "Principais Diferenças", "Indicações de Uso", "Contraindicações", "Conclusão e Recomendação".
                - Certifique-se de que o infográfico final seja claro, conciso, fácil de entender e visualmente atraente, seguindo as diretrizes de estilo Tailwind fornecidas anteriormente.
                - O HTML final deve ser autocontido dentro de uma única div principal com classes Tailwind apropriadas (ex: container, mx-auto, p-4, bg-white, shadow-lg, rounded-lg).
                Retorne APENAS o código HTML, sem qualquer texto adicional, formatação Markdown (como 
                \`\`\`html) ou comentários.
            `;

            try {
                const finalResponse = await generateContentWithRetry(
                    ai,
                    { model: 'gemini-2.0-flash-lite', contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }] },
                    3,
                    (attempt) => onProgress(`Sintetizando resultados... (Tentativa ${attempt}/3)`)
                );
                return finalResponse.candidates[0].content.parts[0].text;
            } catch (e) {
                console.error("AI Synthesis Error after retries:", e);
                throw new Error("Ocorreu um erro ao sintetizar os resultados da análise após múltiplas tentativas.");
            }
        } else if (individualAnalysisResults.length === 1) {
            return individualAnalysisResults[0]; // Only one chunk, no synthesis needed
        } else {
            throw new Error("Nenhum resultado de análise foi gerado.");
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

        let knowledgeBaseContents: string[] = []; // Change to array
        try {
            // Use getKnowledgeContext to load files sequentially with progress
            knowledgeBaseContents = await this.getKnowledgeContext(libraryId, libraries, onProgress);
        } catch (e) {
            console.error("Error fetching library files for conversion:", e);
            throw new Error("Falha ao carregar um ou mais arquivos da biblioteca após múltiplas tentativas. A análise não pode prosseguir.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY! });
        const individualConversionSuggestions: string[] = [];
        const totalChunks = knowledgeBaseContents.length;

        for (let i = 0; i < totalChunks; i++) {
            const currentKnowledgeBaseContent = knowledgeBaseContents[i];
            onProgress(`Analisando parte ${i + 1} de ${totalChunks} da base de conhecimento para conversão...`);

            const prompt = 
            `Você é um especialista em Certificados de Aprovação (CAs) e fichas técnicas de Equipamentos de Proteção Individual (EPIs) para calçados. Sua principal tarefa é analisar as informações de um CA de concorrente e, com base em um conjunto de dados de referência (sua base de conhecimento), identificar e sugerir o produto da nossa linha que melhor corresponde a ele.

                **Base de Conhecimento (Nossos Produtos):**
                ---
                ${currentKnowledgeBaseContent}
                ---

                **CA do Concorrente para Análise:**
                
                ${JSON.stringify(caData, null, 2)}
                
                **Regras Críticas para Conversão (Prioridade Máxima):**
                A correspondência do campo 'approvedFor' (Aprovado Para) deve ser de 100%. Este é o critério mais importante. Se não houver um produto em nossa linha que corresponda EXATAMENTE a este campo, a conversão não é possível e você deve indicar isso claramente. Os outros campos (descrição, nome do equipamento, etc.) são secundários e devem ser usados para encontrar o produto mais próximo APÓS a correspondência de 'approvedFor' ser satisfeita.

                **Formato da Resposta (HTML Infográfico com Tailwind CSS):**

                Você é um especialista em segurança do trabalho. Elabore um infográfico de sugestão de conversão em HTML, utilizando classes do Tailwind CSS para estilização. O HTML deve ser completo e autocontido, sem necessidade de scripts externos ou folhas de estilo adicionais além do Tailwind.

                **Diretrizes de Estilo Tailwind:**
                - Use cores da paleta padrão do Tailwind (ex: 'bg-yellow-100', 'text-yellow-800', 'border-gray-300').
                - Utilize 'p-4', 'm-4', 'shadow-md', 'rounded-lg' para espaçamento, sombras e bordas arredondadas.
                - Para títulos, use classes como 'text-xl', 'text-2xl', 'font-bold', 'text-gray-800'.
                - Para o corpo do texto, use 'text-gray-700', 'leading-relaxed'.
                - Estruture o conteúdo em 'div's com classes flexbox ('flex', 'flex-col', 'items-center', 'justify-center') ou grid ('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6') para layout responsivo.
                - Use ícones ou emojis simples para visualização, se apropriado.

                **Estrutura do Infográfico:**
                Retorne APENAS o código HTML, sem qualquer texto adicional, formatação Markdown (como 
                \`\`\`html
                ) ou comentários.

                <div class="container mx-auto p-4 bg-white shadow-lg rounded-lg">
                    <h1 class="text-3xl font-bold text-center text-yellow-700 mb-6">Sugestão de Conversão de Produto</h1>

                    <div class="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200 mb-8">
                        <h2 class="text-xl font-semibold text-yellow-600 mb-2">CA do Concorrente (${caData.caNumber})</h2>
                        <p class="text-gray-700">${caData.equipmentName || 'Nome não disponível'}</p>
                        <!-- Adicione mais detalhes do CA do concorrente aqui -->
                    </div>

                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Sugestão de Conversão</h2>
                        <p class="text-gray-700 leading-relaxed">[Recomendação mais provável do nosso produto e seu respectivo CA]</p>
                    </div>

                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Análise de Correspondência</h2>
                        <p class="text-gray-700 leading-relaxed">[Análise que justifique a sugestão]</p>
                    </div>

                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Pontos de Atenção</h2>
                        <p class="text-gray-700 leading-relaxed">[Qualquer diferença crítica]</p>
                    </div>
                </div>
            
            `

            try {
                const response = await generateContentWithRetry(
                    ai,
                    { model: 'gemini-2.0-flash-lite', contents: [{ role: 'user', parts: [{ text: prompt }] }] },
                    3,
                    (attempt) => onProgress(`Analisando parte ${i + 1} de ${totalChunks}... (Tentativa ${attempt}/3)`)
                );
                individualConversionSuggestions.push(response.candidates[0].content.parts[0].text);
            } catch (e) {
                console.error(`Conversion suggestion error for chunk ${i + 1} after retries:`, e);
                individualConversionSuggestions.push(`[ERRO] Falha na sugestão de conversão da parte ${i + 1} da base de conhecimento.`);
            }
        }

        // Synthesize results if there are multiple chunks
        if (individualConversionSuggestions.length > 1) {
            onProgress('Sintetizando sugestões de conversão...');
            const synthesisPrompt = `
                Você é um especialista em Certificados de Aprovação (CAs) e fichas técnicas de Equipamentos de Proteção Individual (EPIs) para calçados. Consolide os seguintes fragmentos de HTML, que são sugestões de conversão, em um único infográfico HTML coeso e objetivo em português do Brasil. Utilize as classes do Tailwind CSS para manter a identidade visual.

                **Fragmentos HTML Individuais:**
                ${individualConversionSuggestions.join(`

                <!-- --- -->

                `)}

                                **Instruções:**
                                - Combine as informações de todos os fragmentos, removendo redundâncias e garantindo que o HTML resultante seja válido e bem estruturado.
                                - Mantenha a estrutura de seções: "Sugestão de Conversão", "Análise de Correspondência", "Pontos de Atenção".
                                - Certifique-se de que o infográfico final seja claro, conciso, fácil de entender e visualmente atraente, seguindo as diretrizes de estilo Tailwind fornecidas anteriormente.
                                - O HTML final deve ser autocontido dentro de uma única div principal com classes Tailwind apropriadas (ex: container, mx-auto, p-4, bg-white, shadow-lg, rounded-lg).
                                Retorne APENAS o código HTML, sem qualquer texto adicional, formatação Markdown (como 
                \`\`\`html) ou comentários.
            `;

            try {
                const finalResponse = await generateContentWithRetry(
                    ai,
                    { model: 'gemini-2.0-flash-lite', contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }] },
                    3,
                    (attempt) => onProgress(`Sintetizando sugestões... (Tentativa ${attempt}/3)`)
                );
                return finalResponse.candidates[0].content.parts[0].text;
            } catch (e) {
                console.error("AI Synthesis Error after retries:", e);
                throw new Error("Ocorreu um erro ao sintetizar as sugestões de conversão após múltiplas tentativas.");
            }
        } else if (individualConversionSuggestions.length === 1) {
            return individualConversionSuggestions[0]; // Only one chunk, no synthesis needed
        } else {
            throw new Error("Nenhuma sugestão de conversão foi gerada.");
        }
    }

    static async findSimilar(
        caData: CAData,
        libraryId: string,
        description: string,
        libraries: Library[]
    ): Promise<Omit<SimilarityJob, 'id' | 'createdAt' | 'status'>> {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            throw new Error("Service Worker não está ativo. A busca em segundo plano não pode ser iniciada.");
        }
        if (!process.env.VITE_GEMINI_API_KEY) {
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

        const jobData = {
            caData: caData,
            libraryFiles: selectedLibrary.files,
            libraryName: selectedLibrary.name,
            description: description,
        };

        // The job will be created in Firestore by JobService.createJob
        // The service worker will be notified by Dashboard.tsx after the job is created.

        return jobData;
    }

    static splitContentIntoChunks(fileContents: string[], maxChunkSize: number): string[] {
        const chunks: string[] = [];
        let currentChunk = '';

        for (const content of fileContents) {
            // Check if adding the next file content (plus separator) exceeds the maxChunkSize
            // The separator is `\n\n---\n\n` which has a length of 10 characters.
            if (currentChunk.length + content.length + 10 > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }

            if (currentChunk.length > 0) {
                currentChunk += `\n\n---\n\n`;
            }
            currentChunk += content;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }
}
