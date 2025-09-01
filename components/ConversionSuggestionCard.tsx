import React, { useState } from 'react';
import { ClipboardDocumentIcon, CheckCircleIcon, ArrowPathIcon } from './Icon';

interface ConversionSuggestionCardProps {
  result: string | null;
  isLoading: boolean;
  error: string | null;
  loadingMessage?: string;
}

const parseMarkdown = (text: string): string => {
  // This parser handles the specific markdown format from the conversion suggestion AI.
  let html = text
    // 1. **Title:** content
    .replace(/^\s*\d\.\s+\*\*(.*?):\*\*(.*)$/gm, (match, title, content) => {
        return `<h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-6 mb-2">${title.trim()}</h3><p class="text-slate-700 dark:text-slate-300">${content.trim()}</p>`;
    })
    // - bullet point
    .replace(/^- (.*?)$/gm, '<ul class="list-disc list-inside mt-2"><li class="mb-1">$1</li></ul>')
    // **bold**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // newlines
    .replace(/\n/g, '<br />');

  // Clean up extra line breaks and merge adjacent lists
  html = html
    .replace(/(<br \/>\s*)+/g, '<br />')
    .replace(/<\/ul><br \/><ul>/g, '');

  return html;
};


export const ConversionSuggestionCard: React.FC<ConversionSuggestionCardProps> = ({ result, isLoading, error, loadingMessage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy text: ', err));
    }
  };

  if (isLoading) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-500"></div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{loadingMessage || 'Analisando para conversão...'}</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Aguarde um momento enquanto a inteligência artificial busca um produto compatível em sua base de conhecimento.</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mt-8" role="alert">
            <p><strong>Erro na Sugestão de Conversão:</strong> {error}</p>
        </div>
    );
  }
  
  if (!result) {
    return null;
  }

  const formattedHtml = parseMarkdown(result);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="w-8 h-8 text-teal-500"/>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sugestão de Conversão</h2>
          </div>
          <button 
             onClick={handleCopy}
             className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
             disabled={copied}
          >
            {copied ? (
                <>
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    Copiado!
                </>
            ) : (
                <>
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    Copiar
                </>
            )}
          </button>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
    </div>
  );
};