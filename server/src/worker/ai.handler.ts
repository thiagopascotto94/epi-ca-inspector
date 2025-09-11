import { Job as BullJob } from 'bullmq';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { Library, LibraryFile, Job, CA } from '../models';
import { CAData } from '../types/types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { convert } from 'pdf-poppler';

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY!);

// --- Helper Functions ---

async function updateJobProgress(job: BullJob, progress: number, message: string) {
    await job.updateProgress(progress);
    await Job.update({ progress, progressMessage: message }, { where: { id: job.id } });
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const chunk = text.substring(i, i + chunkSize);
        chunks.push(chunk);
        i += chunkSize - overlap;
    }
    return chunks;
}

async function getKnowledgeContext(libraryId: string, job: BullJob): Promise<string[]> {
    const library = await Library.findByPk(libraryId, { include: [LibraryFile] });
    if (!library || !library.files || library.files.length === 0) {
        throw new Error(`Library ${libraryId} not found or is empty.`);
    }

    const fileContents: string[] = [];
    for (let i = 0; i < library.files.length; i++) {
        const file = library.files[i];
        await updateJobProgress(job, (i / library.files.length) * 20, `Loading knowledge file: ${file.name}`);
        // Assuming file content is already extracted and stored in the DB
        if (file.content) {
            fileContents.push(file.content);
        }
    }
    const allContent = fileContents.join('\n\n---\n\n');
    const chunks = chunkText(allContent, 1000, 100);
    return chunks;
}

// --- Job Processors ---

export async function handleAnalyzeCAs(job: BullJob) {
    const { caData, comparisonData, libraryId } = job.data;
    await updateJobProgress(job, 10, 'Starting CA analysis...');

    const knowledgeContexts = await getKnowledgeContext(libraryId, job);
    await updateJobProgress(job, 30, 'Knowledge base loaded.');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const individualAnalysisResults: string[] = [];
    const totalChunks = knowledgeContexts.length;

    for (let i = 0; i < totalChunks; i++) {
        const currentKnowledgeContext = knowledgeContexts[i];
        const progress = 30 + (i / totalChunks) * 50;
        await updateJobProgress(job, progress, `Analyzing part ${i + 1} of ${totalChunks} of the knowledge base...`);

        const prompt = `
        --- INÍCIO DA BASE DE CONHECIMENTO (PARTE ${i + 1}/${totalChunks}) ---
        ${currentKnowledgeContext}
        --- FIM DA BASE DE CONHECIMENTO ---

        Análise Comparativa de Equipamentos de Proteção Individual (EPIs)

        Com base nos dados JSON a seguir e na base de conhecimento fornecida acima, forneça uma análise comparativa detalhada entre os dois EPIs.

        **EPI 1 (CA ${caData.caNumber}):**
        \`\`\`json
        ${JSON.stringify(caData, null, 2)}
        \`\`\`

        **EPI 2 (CA ${comparisonData.caNumber}):**
        \`\`\`json
        ${JSON.stringify(comparisonData, null, 2)}
        \`\`\`

        **Formato da Resposta (HTML Infográfico com Tailwind CSS):**
        Você é um especialista em segurança do trabalho. Elabore um infográfico comparativo em HTML, utilizando classes do Tailwind CSS para estilização. O HTML deve ser completo e autocontido.

        **Estrutura do Infográfico:**
        Retorne APENAS o código HTML, sem qualquer texto adicional, formatação Markdown (como \`\`\`html) ou comentários.
        O infográfico deve conter seções para:
        1.  Principais Diferenças
        2.  Indicações de Uso (para cada EPI)
        3.  Contraindicações (para cada EPI)
        4.  Conclusão e Recomendação
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            individualAnalysisResults.push(response.text());
        } catch (e) {
            console.error(`AI Analysis Error for chunk ${i + 1}:`, e);
            individualAnalysisResults.push(`[ERRO] Falha na análise da parte ${i + 1} da base de conhecimento.`);
        }
    }

    if (individualAnalysisResults.length === 0) {
        throw new Error("Nenhum resultado de análise foi gerado.");
    }

    if (individualAnalysisResults.length === 1) {
        await updateJobProgress(job, 90, 'Generating final report...');
        return individualAnalysisResults[0];
    }

    await updateJobProgress(job, 85, 'Synthesizing analysis results...');

    const synthesisPrompt = `
        Você é um especialista em segurança do trabalho. Consolide os seguintes fragmentos de HTML, que são análises comparativas de EPIs, em um único infográfico HTML coeso e objetivo em português do Brasil. Utilize as classes do Tailwind CSS para manter a identidade visual.

        **Fragmentos HTML Individuais:**
        ${individualAnalysisResults.join('\n\n<!-- --- -->\n\n')}

        **Instruções:**
        - Combine as informações de todos os fragmentos, removendo redundâncias e garantindo que o HTML resultante seja válido e bem estruturado.
        - Mantenha a estrutura de seções: "Principais Diferenças", "Indicações de Uso", "Contraindicações", "Conclusão e Recomendação".
        - O infográfico final deve ser claro, conciso, fácil de entender e visualmente atraente.
        - Retorne APENAS o código HTML final, sem qualquer texto adicional ou comentários.
    `;

    try {
        const finalResult = await model.generateContent(synthesisPrompt);
        const finalResponse = await finalResult.response;
        await updateJobProgress(job, 95, 'Final report generated.');
        return finalResponse.text();
    } catch (e) {
        console.error("AI Synthesis Error:", e);
        throw new Error("Ocorreu um erro ao sintetizar os resultados da análise.");
    }
}

export async function handleSuggestConversion(job: BullJob) {
    // ... Similar logic to handleAnalyzeCAs
    return "<html>... conversion suggestion ...</html>";
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }

    let magnitudeA = 0;
    for (let i = 0; i < vecA.length; i++) {
        magnitudeA += vecA[i] * vecA[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);

    let magnitudeB = 0;
    for (let i = 0; i < vecB.length; i++) {
        magnitudeB += vecB[i] * vecB[i];
    }
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

export async function handleFindSimilar(job: BullJob) {
    const { caData, description, libraryId } = job.data;
    await updateJobProgress(job, 10, 'Starting similarity search...');

    const knowledgeChunks = await getKnowledgeContext(libraryId, job);
    await updateJobProgress(job, 30, 'Knowledge base loaded and chunked.');

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const query = `CA: ${caData.caNumber} - ${caData.equipmentName}. Description: ${description}`;

    await updateJobProgress(job, 40, 'Generating embedding for query...');
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    await updateJobProgress(job, 50, 'Generating embeddings for knowledge base...');
    const chunkEmbeddings = await model.batchEmbedContents({
        requests: knowledgeChunks.map(chunk => ({ content: chunk }))
    });

    const similarities = chunkEmbeddings.embeddings.map((embedding, index) => {
        const similarity = cosineSimilarity(queryEmbedding, embedding.values);
        return { index, similarity };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);

    const topN = 5;
    const topChunks = similarities.slice(0, topN).map(sim => ({
        content: knowledgeChunks[sim.index],
        similarity: sim.similarity
    }));

    await updateJobProgress(job, 90, 'Similarity search complete.');

    return { results: topChunks };
}

export async function handleExtractText(job: BullJob) {
    const { fileId } = job.data;
    const fileRecord = await LibraryFile.findByPk(fileId);
    if (!fileRecord) throw new Error(`File with id ${fileId} not found.`);

    await updateJobProgress(job, 10, `Downloading file: ${fileRecord.name}`);

    // This is a simplified example. In a real-world scenario, you'd download
    // the file from a storage service (like S3 or Firebase Storage) using fileRecord.url
    const tempFilePath = path.join(os.tmpdir(), fileRecord.name);
    // await downloadFile(fileRecord.url, tempFilePath); // Placeholder for download logic

    let extractedText = '';

    // For now, let's assume a simple text file for demonstration
    // extractedText = await fs.readFile(tempFilePath, 'utf-8');

    // Example for PDF
    if (path.extname(fileRecord.name).toLowerCase() === '.pdf') {
        await updateJobProgress(job, 30, `Converting PDF to images...`);

        // pdf-poppler options
        const opts = {
            format: 'jpeg',
            out_dir: os.tmpdir(),
            out_prefix: path.basename(fileRecord.name, '.pdf'),
            page: null // all pages
        }

        // In a real implementation, you need to handle the downloaded file path
        // await convert('path_to_downloaded.pdf', opts);

        // Then, you would loop through the generated images, read them as base64,
        // and send them to Gemini for text extraction, similar to the original aiService.

        await updateJobProgress(job, 70, `Extracting text with AI...`);
        extractedText = "Text extracted from PDF by AI."; // Placeholder
    } else {
        // Handle other file types (images, etc.)
        extractedText = "Text extracted from other file type."; // Placeholder
    }

    await LibraryFile.update({ content: extractedText }, { where: { id: fileId } });
    await updateJobProgress(job, 90, `Saving extracted text...`);

    return `Successfully extracted and saved content for ${fileRecord.name}.`;
}
