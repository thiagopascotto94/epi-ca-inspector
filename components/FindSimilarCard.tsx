import React, { useState, useEffect, useMemo } from 'react';
import { ParsedSimilarityResult } from '../types';
import { MagnifyingGlassIcon, ClipboardDocumentIcon, CheckCircleIcon, Squares2x2Icon, TableCellsIcon, ChevronDownIcon, ChevronUpIcon, PhotoIcon, InformationCircleIcon, XMarkIcon } from './Icon';

interface FindSimilarCardProps {
  result: string | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  totalFiles: number;
  progressMessage?: string;
}

type ViewMode = 'grid' | 'table';
type SortableKeys = 'productName' | 'confidence';

// Simple markdown parser for the modal content
const parseDetailedMarkdown = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/^### (.*?)$/gm, '<h4 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*?)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
        .replace(/\n/g, '<br />')
        .replace(/(<br \/>\s*)+/g, '<br />')
        .replace(/<\/ul><br \/><ul>/g, '')
        .replace(/<br \/>(<li)/g, '$1')
        .replace(/(<\/li>)<br \/>/g, '$1');
};

export const FindSimilarCard: React.FC<FindSimilarCardProps> = ({ result, isLoading, error, progress, totalFiles, progressMessage }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [parsedResult, setParsedResult] = useState<ParsedSimilarityResult[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'confidence', direction: 'descending' });
  const [selectedItem, setSelectedItem] = useState<ParsedSimilarityResult | null>(null);

  useEffect(() => {
    if (result) {
      try {
        const data = JSON.parse(result);
        if (Array.isArray(data)) {
          setParsedResult(data);
        } else {
           console.error("Parsed result is not an array:", data);
           setParsedResult([]);
        }
      } catch (e) {
        console.error("Failed to parse similarity result JSON:", e);
        setParsedResult([]);
      }
    } else {
        setParsedResult([]);
    }
  }, [result]);

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
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    let sortableItems = [...parsedResult];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [parsedResult, sortConfig]);

  const progressPercentage = totalFiles > 0 ? (progress / (totalFiles + 1)) * 100 : 0;

  const defaultProgressMessage = progress <= totalFiles && totalFiles > 0
    ? `Analisando arquivo ${progress} de ${totalFiles}...` 
    : 'Realizando análise final...';
  
  if (isLoading) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-500"></div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Buscando EPI similar...</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-4">
              {progressMessage || defaultProgressMessage}
              <br/>
              Isso pode levar algum tempo, por favor aguarde.
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-3">
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
  
  const SortIndicator = ({ columnKey }: { columnKey: SortableKeys }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />;
  };

  const NoResults = () => (
    <div className="text-center py-10 px-4">
        <MagnifyingGlassIcon className="mx-auto w-12 h-12 text-slate-400" />
        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum equipamento similar foi encontrado</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A busca na base de conhecimento fornecida não retornou resultados relevantes.</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="w-8 h-8 text-indigo-500"/>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Resultado da Busca por Similaridade</h2>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} aria-label="Grid View">
                    <Squares2x2Icon className="w-5 h-5"/>
                </button>
                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`} aria-label="Table View">
                    <TableCellsIcon className="w-5 h-5"/>
                </button>
            </div>
             {/* Copy Button */}
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                disabled={copied}
                title="Copiar JSON original"
            >
                {copied ? ( <CheckCircleIcon className="w-5 h-5 text-green-500" /> ) : ( <ClipboardDocumentIcon className="w-5 h-5" /> )}
                <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
      </div>
        {sortedResults.length === 0 ? <NoResults/> : (
            <div>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedResults.map((item, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.productName} className="w-full h-48 object-cover" />
                                ) : (
                                    <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <PhotoIcon className="w-16 h-16 text-slate-400 dark:text-slate-500"/>
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-grow">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">CA: {item.caNumber || 'N/A'}</p>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{item.productName}</h3>
                                    <p className="font-semibold text-indigo-600 dark:text-indigo-400 my-1">Confiança: {item.confidence}%</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 flex-grow">{item.justification}</p>
                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                                    >
                                        <InformationCircleIcon className="w-5 h-5" />
                                        Ver Detalhes
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3 w-16"></th>
                                    <th scope="col" className="px-6 py-3">
                                         <button onClick={() => requestSort('productName')} className="flex items-center gap-1 group">
                                            Produto <SortIndicator columnKey="productName" />
                                        </button>
                                    </th>
                                    <th scope="col" className="px-6 py-3">Justificativa</th>
                                    <th scope="col" className="px-6 py-3">
                                        <button onClick={() => requestSort('confidence')} className="flex items-center gap-1 group">
                                            Confiança <SortIndicator columnKey="confidence" />
                                        </button>
                                    </th>
                                    <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedResults.map((item, index) => (
                                    <tr key={index} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-2">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-cover rounded-md" />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded-md">
                                                    <PhotoIcon className="w-6 h-6 text-slate-400 dark:text-slate-500"/>
                                                </div>
                                            )}
                                        </td>
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {item.productName}
                                            <p className="font-normal text-slate-500 dark:text-slate-400">CA: {item.caNumber || 'N/A'}</p>
                                        </th>
                                        <td className="px-6 py-4">{item.justification}</td>
                                        <td className="px-6 py-4 text-lg font-bold text-indigo-600 dark:text-indigo-400">{item.confidence}%</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
        {selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={() => setSelectedItem(null)} aria-modal="true" role="dialog">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-4 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedItem.productName}</h3>
                        <button onClick={() => setSelectedItem(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fechar">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </header>
                    <main className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                {selectedItem.imageUrl ? (
                                    <img src={selectedItem.imageUrl} alt={selectedItem.productName} className="w-full h-auto object-cover rounded-lg border dark:border-slate-700" />
                                ) : (
                                    <div className="w-full aspect-square bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded-lg">
                                        <PhotoIcon className="w-16 h-16 text-slate-400 dark:text-slate-500"/>
                                    </div>
                                )}
                                <div className="mt-4 text-sm text-slate-700 dark:text-slate-300 space-y-2">
                                     <p><strong>CA:</strong> {selectedItem.caNumber || 'N/A'}</p>
                                     <p><strong>Confiança:</strong> <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{selectedItem.confidence}%</span></p>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-2 mb-3">Análise Detalhada</h4>
                                <div
                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: parseDetailedMarkdown(selectedItem.detailedJustification) }}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        )}
    </div>
  );
};
