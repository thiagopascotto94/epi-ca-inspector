import React from 'react';
import { MagnifyingGlassIcon, SparklesIcon, ArrowPathIcon } from './Icon';
import { CAData, Library } from '../types';
import { IS_DEV_MODE } from '../config';

interface SearchFormProps {
    caNumberInput: string;
    setCaNumberInput: (value: string) => void;
    handleFetchAndParse: (caNumber: string, target: 'primary' | 'secondary') => void;
    isLoading: boolean;
    loadingTarget: 'primary' | 'secondary' | null;
    loadingMessage: string;
    showComparison: boolean;
    setShowComparison: (value: boolean) => void;
    comparisonCaNumberInput: string;
    setComparisonCaNumberInput: (value: string) => void;
    handleClear: () => void;
    caData: CAData | null;
    comparisonData: CAData | null;
    handleAiAnalysis: () => void;
    isAnalyzing: boolean;
    libraries: Library[];
    selectedLibraryId: string;
    setSelectedLibraryId: (value: string) => void;
    showFindSimilarUI: boolean;
    setShowFindSimilarUI: (value: boolean) => void;
    findSimilarLibraryId: string;
    setFindSimilarLibraryId: (value: string) => void;
    findSimilarDescription: string;
    setFindSimilarDescription: (value: string) => void;
    handleFindSimilar: () => void;
    showConversionUI: boolean;
    setShowConversionUI: (value: boolean) => void;
    conversionLibraryId: string;
    setConversionLibraryId: (value: string) => void;
    handleConversionSuggestion: () => void;
    isConverting: boolean;
    isCreatingJob: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = (props) => {
    const {
        caNumberInput, setCaNumberInput, handleFetchAndParse, isLoading, loadingTarget, loadingMessage,
        showComparison, setShowComparison, comparisonCaNumberInput, setComparisonCaNumberInput,
        handleClear, caData, comparisonData, handleAiAnalysis, isAnalyzing, libraries,
        selectedLibraryId, setSelectedLibraryId, showFindSimilarUI, setShowFindSimilarUI,
        findSimilarLibraryId, setFindSimilarLibraryId, findSimilarDescription, setFindSimilarDescription,
        handleFindSimilar, showConversionUI, setShowConversionUI, conversionLibraryId,
        setConversionLibraryId, handleConversionSuggestion, isConverting, isCreatingJob
    } = props;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Consultar Certificado de Aprovação (CA)</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
                Digite o número de um CA para buscar os detalhes diretamente do site <a href="https://consultaca.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-500 hover:underline">consultaca.com</a>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="ca-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">CA Principal</label>
                    <div className="flex gap-2">
                        <input
                            id="ca-input"
                            type="text"
                            value={caNumberInput}
                            onChange={(e) => setCaNumberInput(e.target.value)}
                            placeholder="Digite o número do CA"
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 dark:placeholder-slate-400 text-slate-900 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleFetchAndParse(caNumberInput, 'primary')}
                        />
                        <button onClick={() => handleFetchAndParse(caNumberInput, 'primary')} disabled={!caNumberInput || isLoading} className="px-4 py-2 bg-slate-800 dark:bg-sky-600 text-white font-semibold rounded-md hover:bg-slate-900 dark:hover:bg-sky-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                            {isLoading && loadingTarget === 'primary' ? loadingMessage.replace('Buscando...', 'Buscar') : 'Buscar CA'}
                        </button>
                    </div>
                </div>
                <div>
                     <div className="flex items-center mb-2 h-7">
                        <input type="checkbox" id="compare-toggle" checked={showComparison} onChange={() => setShowComparison(!showComparison)} className="h-4 w-4 text-sky-600 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500 bg-slate-100 dark:bg-slate-700"/>
                        <label htmlFor="compare-toggle" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Comparar com outro CA</label>
                    </div>
                    {showComparison && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={comparisonCaNumberInput}
                                onChange={(e) => setComparisonCaNumberInput(e.target.value)}
                                placeholder="Digite o segundo CA"
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 dark:placeholder-slate-400 text-slate-900 dark:text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchAndParse(comparisonCaNumberInput, 'secondary')}
                            />
                            <button onClick={() => handleFetchAndParse(comparisonCaNumberInput, 'secondary')} disabled={!comparisonCaNumberInput || isLoading} className="px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white font-semibold rounded-md hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                {isLoading && loadingTarget === 'secondary' ? loadingMessage.replace('Buscando...', 'Buscar') : 'Buscar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
             <div className="mt-4 flex flex-wrap items-end gap-6">
                <button onClick={handleClear} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                    Limpar Tudo
                </button>

                {caData && !showComparison && (
                   <div className="border-l border-slate-200 dark:border-slate-700 pl-6 flex flex-col gap-4">
                        <div>
                            <button 
                                onClick={() => setShowFindSimilarUI(!showFindSimilarUI)} 
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <MagnifyingGlassIcon className="w-5 h-5"/>
                                Localizar Similar em Segundo Plano
                            </button>
                            {showFindSimilarUI && (
                                <div className="mt-4 flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {IS_DEV_MODE && (
                                        <div>
                                            <label htmlFor="find-similar-library-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pesquisar na Biblioteca</label>
                                            <select 
                                                id="find-similar-library-select" 
                                                value={findSimilarLibraryId} 
                                                onChange={e => setFindSimilarLibraryId(e.target.value)}
                                                disabled={libraries.length === 0}
                                                className="h-10 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                                            >
                                                <option value="none">Selecione uma biblioteca</option>
                                                {libraries.map(lib => (
                                                    <option key={lib.id} value={lib.id}>{lib.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        )}
                                        <div className={!IS_DEV_MODE ? 'md:col-span-2' : ''}>
                                            <label htmlFor="find-similar-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição Adicional (Opcional)</label>
                                            <textarea
                                                id="find-similar-description"
                                                value={findSimilarDescription}
                                                onChange={(e) => setFindSimilarDescription(e.target.value)}
                                                placeholder="Ex: luva resistente a cortes para manuseio de vidros"
                                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 dark:placeholder-slate-400 text-slate-900 dark:text-white"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleFindSimilar}
                                            disabled={(IS_DEV_MODE && findSimilarLibraryId === 'none') || isCreatingJob}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap w-48"
                                        >
                                            {isCreatingJob ? (
                                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <SparklesIcon className="w-5 h-5" />
                                            )}
                                            {isCreatingJob ? 'Criando Job...' : 'Iniciar Busca'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <button 
                                onClick={() => setShowConversionUI(!showConversionUI)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Sugerir Conversão de Produto
                            </button>
                            {showConversionUI && (
                                <div className="mt-4 flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    {IS_DEV_MODE && (
                                        <div>
                                            <label htmlFor="conversion-library-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base de Conhecimento (Nossos Produtos)</label>
                                            <select 
                                                id="conversion-library-select" 
                                                value={conversionLibraryId} 
                                                onChange={e => setConversionLibraryId(e.target.value)}
                                                disabled={libraries.length === 0}
                                                className="h-10 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                                            >
                                                <option value="none">Selecione uma biblioteca</option>
                                                {libraries.map(lib => (
                                                    <option key={lib.id} value={lib.id}>{lib.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleConversionSuggestion} 
                                            disabled={(IS_DEV_MODE && conversionLibraryId === 'none') || isConverting} 
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                        >
                                            <SparklesIcon className="w-5 h-5"/>
                                            {isConverting ? 'Analisando...' : 'Analisar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                   </div>
                )}

                {caData && comparisonData && (
                    <div className="flex items-end gap-4 border-l border-slate-200 dark:border-slate-700 pl-6">
                        <button
                            id="ai-analysis-button"
                            onClick={handleAiAnalysis} 
                            disabled={isAnalyzing || isLoading} 
                            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                        >
                            <SparklesIcon className="w-5 h-5"/>
                            {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                        </button>
                        {IS_DEV_MODE && (
                            <div className="relative">
                                <label htmlFor="library-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Biblioteca de Conhecimento</label>
                                <select 
                                    id="library-select" 
                                    value={selectedLibraryId} 
                                    onChange={e => setSelectedLibraryId(e.target.value)}
                                    disabled={libraries.length === 0 || isAnalyzing || isLoading}
                                    className="h-10 w-48 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                                >
                                    <option value="none">Nenhuma</option>
                                    {libraries.map(lib => (
                                        <option key={lib.id} value={lib.id}>{lib.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
