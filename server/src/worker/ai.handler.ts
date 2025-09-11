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
    // Logic to split content into chunks, similar to original AIService
    // ...
    return [`\n\n---\n\n${fileContents.join('\n\n---\n\n')}\n\n---\n\n`]; // Simplified for now
}

// --- Job Processors ---

export async function handleAnalyzeCAs(job: BullJob) {
    const { caData, comparisonData, libraryId } = job.data;
    await updateJobProgress(job, 10, 'Starting CA analysis...');

    const knowledgeContexts = await getKnowledgeContext(libraryId, job);
    await updateJobProgress(job, 30, 'Knowledge base loaded.');

    const prompt = `... your detailed analysis prompt using caData, comparisonData, and knowledgeContexts[0] ...`;

    // ... (logic from AIService.analyzeCAs adapted for backend)
    // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    // const result = await model.generateContent(prompt);
    // const response = await result.response;
    // const analysisHtml = response.text();

    await updateJobProgress(job, 90, 'Generating final report...');
    const analysisHtml = "<html>... analysis report ...</html>"; // Placeholder for actual Gemini call

    return analysisHtml;
}

export async function handleSuggestConversion(job: BullJob) {
    // ... Similar logic to handleAnalyzeCAs
    return "<html>... conversion suggestion ...</html>";
}

export async function handleFindSimilar(job: BullJob) {
    // ... Similar logic
    return { similarity: "results" };
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
