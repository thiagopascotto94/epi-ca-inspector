import { CAData } from '../types';
import { parseCAHtml } from './caScraperService';

export class CaFetchingService {
    static async fetchAndParse(caNumber: string, onProgress: (message: string) => void): Promise<CAData> {
        if (!caNumber || !/^\d+$/.test(caNumber)) {
            throw new Error("Por favor, insira um número de CA válido.");
        }

        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                onProgress(`Buscando... (Tentativa ${attempt}/${MAX_RETRIES})`);
                
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://consultaca.com/${caNumber}`)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    throw new Error(`Falha ao buscar dados (CA: ${caNumber}). O serviço pode estar indisponível. Status: ${response.statusText}`);
                }

                const htmlContent = await response.text();
                const parsedData = parseCAHtml(htmlContent);

                if (parsedData) {
                    return parsedData;
                } else {
                    lastError = new Error("Falha ao analisar o HTML. O CA pode não existir ou a página pode ter uma estrutura inesperada.");
                    // Break here because retrying won't help if parsing fails
                    break;
                }
            } catch (e) {
                lastError = e as Error;
                console.warn(`Attempt ${attempt} failed:`, e);
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (lastError && lastError.message.includes("Falha ao analisar o HTML")) {
            throw lastError;
        }
        
        throw new Error(`Após ${MAX_RETRIES} tentativas, não foi possível buscar o CA. Último erro: ${lastError?.message}`);
    }
}
