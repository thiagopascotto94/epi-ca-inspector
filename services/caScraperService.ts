
import { CAData } from '../types';

// Helper function to safely query and extract text
const queryText = (scope: Document | Element, selector: string): string => {
  const element = scope.querySelector(selector);
  return element?.textContent?.trim() || 'N/A';
};

// Helper to extract text following a <strong> tag
const queryTextAfterStrong = (scope: Document | Element, strongText: string): string => {
    const strongs = Array.from(scope.querySelectorAll('strong'));
    const targetStrong = strongs.find(s => s.textContent?.trim() === strongText);
    if (targetStrong && targetStrong.nextSibling) {
        return targetStrong.nextSibling.textContent?.trim() || 'N/A';
    }
    // Fallback for cases where text is in parent after a <br>
    if(targetStrong && targetStrong.parentElement?.textContent) {
        const fullText = targetStrong.parentElement.textContent;
        return fullText.replace(strongText, '').trim();
    }
    return 'N/A';
};

// Helper to extract text from a p tag that contains a specific strong tag
const queryParentText = (scope: Document | Element, strongText: string): string => {
    const strongs = Array.from(scope.querySelectorAll('strong'));
    const targetStrong = strongs.find(s => s.textContent?.trim() === strongText);
    if (targetStrong && targetStrong.parentElement) {
      return targetStrong.parentElement.textContent?.replace(strongText, '').trim() || 'N/A';
    }
    return 'N/A';
};

export const parseCAHtml = (htmlContent: string): CAData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const equipmentName = queryText(doc, '#titulo-equipamento h1');
    if (equipmentName === 'N/A' || !doc.querySelector('.num_ca span')) {
        // A basic check to see if the page has the expected structure
        return null;
    }
    
    const manufacturerDiv = Array.from(doc.querySelectorAll('.grupo_result_ca h3')).find(h3 => h3.textContent?.trim() === 'Fabricante')?.parentElement;

    const data: CAData = {
      equipmentName,
      equipmentType: queryText(doc, '#titulo-equipamento .grupo-epi-desc'),
      caNumber: queryText(doc, '.num_ca span'),
      status: queryText(doc, 'p > span[style*="color:#090"]'),
      validity: queryText(doc, '.validade_ca.regular'),
      daysRemaining: queryText(doc, '.validade_ca_dias strong').replace('dias', '').trim(),
      processNumber: queryParentText(doc, 'N° Processo:'),
      nature: queryParentText(doc, 'Natureza:'),
      description: queryText(doc, '.grupo_result_ca h3:first-of-type + p.info'),
      approvedFor: queryParentText(doc, 'Aprovado Para:'),
      restrictions: queryParentText(doc, 'Restrições:'),
      observations: queryParentText(doc, 'Observação:'),
      markings: queryParentText(doc, 'Marcação:'),
      references: queryParentText(doc, 'Referências:'),
      manufacturer: {
        name: manufacturerDiv ? queryText(manufacturerDiv, 'p.info a[href*="/fabricantes/"]') : 'N/A',
        cnpj: manufacturerDiv ? queryParentText(manufacturerDiv, 'CNPJ:') : 'N/A',
        site: manufacturerDiv?.querySelector('p.info a[href*="/redir/"]')?.getAttribute('href') || '#',
        address: manufacturerDiv ? queryParentText(manufacturerDiv, 'Cidade/UF:') : 'N/A',
      },
      photos: Array.from(doc.querySelectorAll('ul.fotos-ca li a img')).map(img => (img as HTMLImageElement).src),
      history: Array.from(doc.querySelectorAll('.tabela-interna tbody tr')).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          date: cells[0]?.textContent?.trim() || 'N/A',
          event: cells[1]?.textContent?.trim() || 'N/A',
        };
      }),
      norms: Array.from(doc.querySelectorAll('ul.lista-normas li')).map(li => li.textContent?.trim() || ''),
    };

    return data;
  } catch (error) {
    console.error("Failed to parse HTML:", error);
    return null;
  }
};
