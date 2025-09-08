import axios from 'axios';
import * as cheerio from 'cheerio';
import { CAData } from '../types/types';

// Helper function to safely query and extract text
const queryText = ($: cheerio.CheerioAPI, selector: string): string => {
    return $(selector).text().trim() || 'N/A';
};

// Helper to extract text from a p tag that contains a specific strong tag
const queryParentText = (context: any, strongText: string): string => {
    let text = 'N/A';
    const strongTag = context.find('strong').filter((i: number, el: cheerio.Element) => {
        // @ts-ignore
        return cheerio.load(el).text().trim() === strongText; // NOSONAR
    });

    if (strongTag.length > 0) {
        text = strongTag.parent().text().replace(strongText, '').trim() || 'N/A';
    }
    return text;
};

const parseCAHtml = (htmlContent: string): CAData | null => {
    try {
        const $ = cheerio.load(htmlContent);

        const equipmentName = $('#titulo-equipamento h1').text().trim();
        if (!equipmentName || $('.num_ca span').length === 0) {
            return null; // Basic validation to check if it's a valid CA page
        }

        const manufacturerDiv = $('.grupo_result_ca h3').filter((i: number, el: cheerio.Element) => $(el).text().trim() === 'Fabricante').parent();

        const data: CAData = {
            equipmentName,
            equipmentType: $('#titulo-equipamento .grupo-epi-desc').text().trim(),
            caNumber: $('.num_ca span').text().trim(),
            status: $('p > span[style*="color:#090"]').text().trim(),
            validity: $('.validade_ca.regular').text().trim(),
            daysRemaining: $('.validade_ca_dias strong').text().replace('dias', '').trim(),
            processNumber: queryParentText($('body'), 'N° Processo:'),
            nature: queryParentText($('body'), 'Natureza:'),
            description: $('.grupo_result_ca h3:first-of-type').next('p.info').text().trim(),
            approvedFor: queryParentText($('body'), 'Aprovado Para:'),
            restrictions: queryParentText($('body'), 'Restrições:'),
            observations: queryParentText($('body'), 'Observação:'),
            markings: queryParentText($('body'), 'Marcação:'),
            references: queryParentText($('body'), 'Referências:'),
            manufacturer: {
                name: manufacturerDiv.find('p.info a[href*="/fabricantes/"]').text().trim(),
                cnpj: queryParentText(manufacturerDiv, 'CNPJ:'),
                site: manufacturerDiv.find('p.info a[href*="/redir/"]').attr('href') || '#',
                address: queryParentText(manufacturerDiv, 'Cidade/UF:'),
            },
            photos: $('ul.fotos-ca li a img').map((i: number, el: cheerio.Element) => $(el).attr('src')).get(),
            history: $('.tabela-interna tbody tr').slice(1).map((i: number, row: cheerio.Element) => {
                const cells = $(row).find('td');
                return {
                    date: $(cells[0]).text().trim(),
                    event: $(cells[1]).text().trim(),
                };
            }).get(),
            norms: $('ul.lista-normas li').map((i: number, el: cheerio.Element) => $(el).text().trim()).get(),
        };

        return data;
    } catch (error) {
        console.error("Failed to parse HTML with Cheerio:", error);
        return null;
    }
};

export const fetchNewCaData = async (caNumber: string): Promise<CAData> => {
    const url = `https://consultaca.com/${caNumber}`;
    try {
        const { data: htmlContent } = await axios.get<string>(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const parsedData = parseCAHtml(htmlContent);

        if (!parsedData) {
            throw new Error(`Could not parse CA data for CA #${caNumber}. The page layout may have changed.`);
        }

        return parsedData;
    } catch (error: any) {
        // @ts-ignore
        if (axios.isAxiosError(error) && error.response?.status === 404) { // NOSONAR
            throw new Error(`CA #${caNumber} not found on consultaca.com.`);
        }
        // To be safe, we wrap the original error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching and parsing CA ${caNumber}:`, errorMessage);
        throw new Error(`Failed to process CA #${caNumber}: ${errorMessage}`);
    }
};
