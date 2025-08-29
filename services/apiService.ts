
import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export const fetchUrlAsText = async (url: string): Promise<string> => {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.statusText}`);
            return `[Erro ao buscar conteúdo de ${url}]`;
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return doc.body.innerText || `[Não foi possível extrair texto de ${url}]`;
        }
        return await response.text();
    } catch (e) {
        console.warn(`Exception while fetching ${url}:`, e);
        return `[Erro ao buscar conteúdo de ${url}]`;
    }
};

export const generateContentWithRetry = async (
    ai: GoogleGenAI,
    params: GenerateContentParameters,
    maxRetries: number = 3,
    onAttempt?: (attempt: number) => void
): Promise<GenerateContentResponse> => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (onAttempt) {
                onAttempt(attempt);
            }
            const response = await ai.models.generateContent(params);
            return response; // Success
        } catch (e) {
            lastError = e as Error;
            console.warn(`AI call attempt ${attempt} failed:`, e);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Wait with jitter
            }
        }
    }
    throw lastError!;
};
