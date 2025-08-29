import React, { useState } from 'react';
import { SparklesIcon, ClipboardDocumentIcon, CheckCircleIcon } from './Icon';

interface AIAnalysisCardProps {
  analysis: string | null;
  isLoading: boolean;
  error: string | null;
  loadingMessage?: string;
}

const parseMarkdown = (text: string): string => {
    // This simple parser handles the specific markdown format from the AI.
    return text
      .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-semibold text-slate-800 mt-6 mb-2">$1</h3>')
      .replace(/^- \*\*(.*?):\*\* (.*?)$/gm, '<ul><li class="ml-5 list-disc mb-1"><strong>$1:</strong> $2</li></ul>')
      .replace(/^- (.*?)$/gm, '<ul><li class="ml-5 list-disc mb-1">$1</li></ul>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
      .replace(/(<br \/>)+/g, '<br />')
      .replace(/<ul><br \/>/g, '<ul>')
      .replace(/<\/ul><br \/><ul>/g, '');
};


export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ analysis, isLoading, error, loadingMessage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (analysis) {
      navigator.clipboard.writeText(analysis)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy text: ', err));
    }
  };

  if (isLoading) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                <h2 className="text-xl font-semibold text-slate-700">{loadingMessage || 'Analisando com IA...'}</h2>
            </div>
            <p className="text-slate-500 mt-2">Aguarde um momento enquanto a inteligência artificial compara os dois equipamentos.</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mt-8" role="alert">
            <p><strong>Erro na Análise:</strong> {error}</p>
        </div>
    );
  }
  
  if (!analysis) {
    return null;
  }

  const formattedHtml = parseMarkdown(analysis);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-sky-500"/>
            <h2 className="text-2xl font-bold text-slate-800">Análise Comparativa por IA</h2>
          </div>
          <button 
             onClick={handleCopy}
             className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50"
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
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
    </div>
  );
};