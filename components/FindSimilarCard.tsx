import React, { useState } from 'react';
import { MagnifyingGlassIcon, ClipboardDocumentIcon, CheckCircleIcon } from './Icon';

interface FindSimilarCardProps {
  result: string | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  totalFiles: number;
  progressMessage?: string;
}

const parseMarkdown = (text: string): string => {
    // This regex-based parser is designed to format the specific AI output structure.
    return text
        // ### 1. Equipment Name
        .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-semibold text-slate-800 mt-6 mb-2">$1</h3>')
        // **Key:** Value
        .replace(/^\*\*(Confiança da Similaridade|Justificativa|Equipamento Similar):\*\* (.*)$/gm, (match, key, value) => {
            if (key === 'Confiança da Similaridade') {
                return `<p><strong class="text-slate-600">${key}:</strong> <span class="font-bold text-indigo-600 text-lg">${value.trim()}</span></p>`;
            }
            return `<p class="mt-1"><strong class="text-slate-600">${key}:</strong> ${value}</p>`;
        })
        // General paragraphs not matching the above
        .replace(/^(?!<|###|\*\*|\s*$|\n).+$/gm, p => `<p class="text-slate-700">${p}</p>`);
};


export const FindSimilarCard: React.FC<FindSimilarCardProps> = ({ result, isLoading, error, progress, totalFiles, progressMessage }) => {
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

  const progressPercentage = totalFiles > 0 ? (progress / (totalFiles + 1)) * 100 : 0;

  const defaultProgressMessage = progress <= totalFiles && totalFiles > 0
    ? `Analisando arquivo ${progress} de ${totalFiles}...` 
    : 'Realizando análise final...';
  
  if (isLoading) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <h2 className="text-xl font-semibold text-slate-700">Buscando EPI similar...</h2>
            </div>
            <p className="text-slate-500 mt-4">
              {progressMessage || defaultProgressMessage}
              <br/>
              Isso pode levar algum tempo, por favor aguarde.
            </p>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}>
              </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mt-8" role="alert">
            <p><strong>Erro na Busca por Similar:</strong> {error}</p>
        </div>
    );
  }
  
  if (!result) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="w-8 h-8 text-indigo-500"/>
            <h2 className="text-2xl font-bold text-slate-800">Resultado da Busca por Similaridade</h2>
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
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: parseMarkdown(result) }} />
    </div>
  );
};