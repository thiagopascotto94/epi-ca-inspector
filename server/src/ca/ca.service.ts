import axios from 'axios';
import * as cheerio from 'cheerio';
import { CAData } from '../types/types';

// Helper function to safely query and extract text
const queryText = (scope: cheerio.Cheerio<cheerio.Element>, selector: string): string => {
    return scope.find(selector).text().trim() || 'N/A';
};

// Helper to extract text from a p tag that contains a specific strong tag
const queryParentText = (scope: cheerio.Cheerio<cheerio.Element>, strongText: string): string => {
    const strongTag = scope.find('strong').filter((i, el) => {
        return cheerio.load(el).text().trim() === strongText;
    });
    if (strongTag.length > 0) {
        return strongTag.parent().text().replace(strongText, '').trim() || 'N/A';
    }
    return 'N/A';
};

const parseCAHtml = (htmlContent: string): CAData | null => {
    try {
        const $ = cheerio.load(htmlContent);

        const equipmentName = $('#titulo-equipamento h1').text().trim();
        if (!equipmentName || $('.num_ca span').length === 0) {
            return null; // Basic validation to check if it's a valid CA page
        }

        const manufacturerDiv = $('.grupo_result_ca h3').filter((i, el) => $(el).text().trim() === 'Fabricante').parent();

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
            photos: $('ul.fotos-ca li a img').map((i, el) => $(el).attr('src')).get(),
            history: $('.tabela-interna tbody tr').slice(1).map((i, row) => {
                const cells = $(row).find('td');
                return {
                    date: $(cells[0]).text().trim(),
                    event: $(cells[1]).text().trim(),
                };
            }).get(),
            norms: $('ul.lista-normas li').map((i, el) => $(el).text().trim()).get(),
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
        const { data: htmlContent } = await axios.get(url, {
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
        console.error(`Error fetching and parsing CA ${caNumber}:`, error.message);
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new Error(`CA #${caNumber} not found on consultaca.com.`);
        }
        throw new Error(`Failed to process CA #${caNumber}: ${error.message}`);
    }
};
