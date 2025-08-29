import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { parseCAHtml } from './services/caScraperService';
import { CAData, Library, SimilarityJob } from './types';
import * as idb from './services/idbService';
import { fetchUrlAsText, generateContentWithRetry } from './services/apiService';

import CADetailCard from './components/CADetailCard';
import { DocumentTextIcon, SparklesIcon, Cog6ToothIcon, MagnifyingGlassIcon } from './components/Icon';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { SettingsModal } from './components/SettingsModal';
import { FindSimilarCard } from './components/FindSimilarCard';
import { BackgroundJobsCard } from './components/BackgroundJobsCard';


const App: React.FC = () => {
    const [caNumberInput, setCaNumberInput] = useState<string>('');
    const [caData, setCaData] = useState<CAData | null>(null);
    const [comparisonCaNumberInput, setComparisonCaNumberInput] = useState<string>('');
    const [comparisonData, setComparisonData] = useState<CAData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingTarget, setLoadingTarget] = useState<'primary' | 'secondary' | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState<boolean>(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // AI Comparison state
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisLoadingMessage, setAnalysisLoadingMessage] = useState<string>('');
    
    // Find Similar state (now for UI controls and displaying results)
    const [showFindSimilarUI, setShowFindSimilarUI] = useState<boolean>(false);
    const [findSimilarLibraryId, setFindSimilarLibraryId] = useState<string>('none');
    const [findSimilarDescription, setFindSimilarDescription] = useState<string>('');
    const [viewingJobResult, setViewingJobResult] = useState<SimilarityJob | null>(null);
    const [toastMessage, setToastMessage] = useState<string>('');

    // Background Jobs State
    const [jobs, setJobs] = useState<SimilarityJob[]>([]);

    // Library/Settings states
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [selectedLibraryId, setSelectedLibraryId] = useState<string>('none');
    
    // Load initial data from localStorage and IndexedDB
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('caSearchHistory');
            if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
            
            const storedLibraries = localStorage.getItem('caLibraries');
            if (storedLibraries) setLibraries(JSON.parse(storedLibraries));
        } catch (e) {
            console.error("Failed to load data from localStorage", e);
        }
        
        idb.getAllJobs().then(setJobs).catch(err => console.error("Failed to load jobs from IDB", err));
    }, []);

    // Effect to listen for updates from the Service Worker
    useEffect(() => {
        const handleServiceWorkerMessage = async (event: MessageEvent) => {
            if (event.data.type === 'JOB_UPDATED') {
                console.log("Job update received from SW:", event.data.payload.jobId);
                const updatedJobs = await idb.getAllJobs();
                setJobs(updatedJobs);
            }
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

            return () => {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            };
        }
    }, []);

    // Effect to manage toast messages
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const updateSearchHistory = useCallback((caNumber: string) => {
        setSearchHistory(prevHistory => {
            const newHistory = [caNumber, ...prevHistory.filter(item => item !== caNumber)].slice(0, 10);
            try {
                localStorage.setItem('caSearchHistory', JSON.stringify(newHistory));
            } catch (e) {
                 console.error("Failed to save search history to localStorage", e);
            }
            return newHistory;
        });
    }, []);

    const handleFetchAndParse = useCallback(async (caNumber: string, target: 'primary' | 'secondary') => {
        if (!caNumber || !/^\d+$/.test(caNumber)) {
            setError("Por favor, insira um número de CA válido.");
            return;
        }

        setIsLoading(true);
        setLoadingTarget(target);
        setError(null);
        setAnalysisResult(null); 
        setAnalysisError(null);
        setShowFindSimilarUI(false);
        setViewingJobResult(null);

        if (target === 'primary') setCaData(null);
        else setComparisonData(null);
        
        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                setLoadingMessage(`Buscando... (Tentativa ${attempt}/${MAX_RETRIES})`);
                
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://consultaca.com/${caNumber}`)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    throw new Error(`Falha ao buscar dados (CA: ${caNumber}). O serviço pode estar indisponível. Status: ${response.statusText}`);
                }

                const htmlContent = await response.text();
                const parsedData = parseCAHtml(htmlContent);

                if (parsedData) {
                    if (target === 'primary') {
                        setCaData(parsedData);
                    } else {
                        setComparisonData(parsedData);
                    }
                    updateSearchHistory(caNumber);
                    lastError = null;
                    break; 
                } else {
                    lastError = new Error("Falha ao analisar o HTML. O CA pode não existir ou a página pode ter uma estrutura inesperada.");
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
        
        if (lastError) {
             if (lastError.message.includes("Falha ao analisar o HTML")) {
                 setError(lastError.message);
            } else {
                setError(`Após ${MAX_RETRIES} tentativas, não foi possível buscar o CA. Último erro: ${lastError.message}`);
            }
        }

        setIsLoading(false);
        setLoadingTarget(null);
        setLoadingMessage('');

    }, [updateSearchHistory]);

    const handleSaveLibrary = useCallback((library: Library) => {
        setLibraries(prev => {
            const index = prev.findIndex(lib => lib.id === library.id);
            const newLibraries = [...prev];
            if (index > -1) newLibraries[index] = library;
            else newLibraries.push(library);
            
            try {
                localStorage.setItem('caLibraries', JSON.stringify(newLibraries));
            } catch (e) {
                console.error("Failed to save libraries to localStorage", e);
            }
            return newLibraries;
        });
    }, []);

    const handleDeleteLibrary = useCallback((libraryId: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta biblioteca?")) {
             setLibraries(prev => {
                const newLibraries = prev.filter(lib => lib.id !== libraryId);
                try {
                    localStorage.setItem('caLibraries', JSON.stringify(newLibraries));
                } catch (e) {
                    console.error("Failed to save libraries to localStorage", e);
                }
                if (selectedLibraryId === libraryId) setSelectedLibraryId('none');
                if(findSimilarLibraryId === libraryId) setFindSimilarLibraryId('none');
                return newLibraries;
            });
        }
    }, [selectedLibraryId, findSimilarLibraryId]);

    const handleImportLibraries = useCallback((importedLibraries: Library[]) => {
        if (!Array.isArray(importedLibraries)) {
            console.error("Import failed: data is not an array.");
            return;
        }
        setLibraries(importedLibraries);
        try {
            localStorage.setItem('caLibraries', JSON.stringify(importedLibraries));
            if (!importedLibraries.some(lib => lib.id === selectedLibraryId)) setSelectedLibraryId('none');
            if (!importedLibraries.some(lib => lib.id === findSimilarLibraryId)) setFindSimilarLibraryId('none');
        } catch (e) {
            console.error("Failed to save imported libraries to localStorage", e);
        }
    }, [selectedLibraryId, findSimilarLibraryId]);
    
    const handleAiAnalysis = async () => {
        if (!caData || !comparisonData) {
            setAnalysisError("É necessário ter os dados de dois CAs para fazer a análise.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisLoadingMessage('');

        let knowledgeContext = '';
        const selectedLibrary = libraries.find(lib => lib.id === selectedLibraryId);

        if (selectedLibrary && selectedLibrary.files.length > 0) {
            try {
                const fileContents = await Promise.all(selectedLibrary.files.map(file => fetchUrlAsText(file.url)));
                knowledgeContext = `
--- INÍCIO DA BASE DE CONHECIMENTO ---
As informações a seguir foram extraídas de documentos fornecidos e devem ser usadas como contexto principal para a análise.
${fileContents.join('\n\n---\n\n')}
--- FIM DA BASE DE CONHECIMENTO ---
`;
            } catch (e) {
                console.error("Error fetching library files:", e);
                setAnalysisError("Falha ao carregar um ou mais arquivos da biblioteca. A análise prosseguirá sem esse contexto.");
            }
        }

        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

            const prompt = `
                ${knowledgeContext}
                Análise Comparativa de Equipamentos de Proteção Individual (EPIs)

                Com base nos dados JSON a seguir${knowledgeContext ? ' e na base de conhecimento fornecida acima' : ''}, forneça uma análise comparativa detalhada entre os dois EPIs.

                **EPI 1 (CA ${caData.caNumber}):**
                \`\`\`json
                ${JSON.stringify(caData, null, 2)}
                \`\`\`

                **EPI 2 (CA ${comparisonData.caNumber}):**
                \`\`\`json
                ${JSON.stringify(comparisonData, null, 2)}
                \`\`\`

                **Formato da Resposta:**

                Você é um especialista em segurança do trabalho. Elabore um relatório claro e objetivo em português do Brasil, usando Markdown, com as seguintes seções:

                ### Principais Diferenças
                Liste em tópicos os pontos-chave que distinguem os dois EPIs (material, tipo de proteção, normas, etc.).

                ### Indicações de Uso
                - **EPI 1 (CA ${caData.caNumber}):** Descreva os cenários ideais para seu uso.
                - **EPI 2 (CA ${comparisonData.caNumber}):** Descreva os cenários ideais para seu uso.

                ### Contraindicações
                - **EPI 1 (CA ${caData.caNumber}):** Onde este EPI **não** deve ser utilizado.
                - **EPI 2 (CA ${comparisonData.caNumber}):** Onde este EPI **não** deve ser utilizado.

                ### Conclusão e Recomendação
                Um resumo conciso para ajudar na escolha entre os dois, baseado nos dados fornecidos.
            `;

            const response = await generateContentWithRetry(
                ai,
                { model: 'gemini-2.5-flash', contents: prompt },
                3,
                (attempt) => setAnalysisLoadingMessage(`Analisando... (Tentativa ${attempt}/3)`)
            );

            setAnalysisResult(response.text);

        } catch (e) {
            console.error("AI Analysis Error after retries:", e);
            setAnalysisError("Ocorreu um erro ao conectar com o serviço de IA após múltiplas tentativas. Verifique sua chave de API e tente novamente.");
        } finally {
            setIsAnalyzing(false);
            setAnalysisLoadingMessage('');
        }
    };
    
    const handleFindSimilar = async () => {
        if (!caData) return alert("Dados do CA principal não encontrados.");
        if (findSimilarLibraryId === 'none') return alert("Por favor, selecione uma biblioteca.");
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return alert("Service Worker não está ativo. A busca em segundo plano não pode ser iniciada.");
        if (!process.env.API_KEY) return alert("A chave de API não foi configurada.");
        
        const selectedLibrary = libraries.find(lib => lib.id === findSimilarLibraryId);
        if (!selectedLibrary || selectedLibrary.files.length === 0) return alert("A biblioteca selecionada está vazia.");

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert("A permissão para notificações é necessária para avisar quando a busca terminar.");
            }

            const newJob: SimilarityJob = {
                id: crypto.randomUUID(),
                caData: caData,
                libraryFiles: selectedLibrary.files,
                libraryName: selectedLibrary.name,
                description: findSimilarDescription,
                status: 'pending',
                createdAt: Date.now(),
            };

            await idb.addJob(newJob);
            setJobs(prevJobs => [newJob, ...prevJobs]);
            
            navigator.serviceWorker.controller.postMessage({
                type: 'START_SIMILARITY_JOB',
                payload: {
                    jobId: newJob.id,
                    apiKey: process.env.API_KEY
                }
            });

            setToastMessage("Busca de similaridade iniciada em segundo plano!");
            setShowFindSimilarUI(false);
            setFindSimilarDescription('');

        } catch (err) {
            console.error("Failed to start similarity job:", err);
            alert("Ocorreu um erro ao iniciar a busca em segundo plano.");
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        const confirmationMessage = (job.status === 'processing' || job.status === 'pending')
            ? "Esta busca está na fila ou em andamento. Deseja cancelá-la e excluí-la?"
            : "Tem certeza que deseja excluir o resultado desta busca?";
        
        if (window.confirm(confirmationMessage)) {
            // If job is processing or pending, tell SW to cancel/ignore it
            if ((job.status === 'processing' || job.status === 'pending') && navigator.serviceWorker.controller) {
                 navigator.serviceWorker.controller.postMessage({
                    type: 'CANCEL_SIMILARITY_JOB',
                    payload: { jobId }
                });
            }
            
            await idb.deleteJob(jobId);
            setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId));
            if (viewingJobResult?.id === jobId) {
                setViewingJobResult(null);
            }
        }
    };

    const handleClear = () => {
        setCaNumberInput('');
        setCaData(null);
        setComparisonCaNumberInput('');
        setComparisonData(null);
        setShowComparison(false);
        setError(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        setShowFindSimilarUI(false);
        setViewingJobResult(null);
        setFindSimilarLibraryId('none');
        setFindSimilarDescription('');
    };
    
    const handleClearHistory = () => {
        setSearchHistory([]);
        try {
            localStorage.removeItem('caSearchHistory');
        } catch (e) {
            console.error("Failed to clear search history from localStorage", e);
        }
    };

    const isComparing = showComparison && !!comparisonData;

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            {toastMessage && (
                <div className="fixed top-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-bounce">
                    {toastMessage}
                </div>
            )}
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-sky-600"/>
                        <h1 className="text-2xl font-bold text-slate-700">EPI CA Inspector</h1>
                    </div>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" aria-label="Configurações">
                        <Cog6ToothIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-4">
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-semibold mb-2">Consultar Certificado de Aprovação (CA)</h2>
                    <p className="text-slate-600 mb-4">
                        Digite o número de um CA para buscar os detalhes diretamente do site <a href="https://consultaca.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">consultaca.com</a>.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="ca-input" className="block text-sm font-medium text-slate-700 mb-2">CA Principal</label>
                            <div className="flex gap-2">
                                <input
                                    id="ca-input"
                                    type="text"
                                    value={caNumberInput}
                                    onChange={(e) => setCaNumberInput(e.target.value)}
                                    placeholder="Digite o número do CA"
                                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition"
                                    onKeyDown={(e) => e.key === 'Enter' && handleFetchAndParse(caNumberInput, 'primary')}
                                />
                                <button onClick={() => handleFetchAndParse(caNumberInput, 'primary')} disabled={!caNumberInput || isLoading} className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-md hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                    {isLoading && loadingTarget === 'primary' ? loadingMessage.replace('Buscando...', 'Buscar') : 'Buscar CA'}
                                </button>
                            </div>
                        </div>
                        <div>
                             <div className="flex items-center mb-2 h-7">
                                <input type="checkbox" id="compare-toggle" checked={showComparison} onChange={() => setShowComparison(!showComparison)} className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"/>
                                <label htmlFor="compare-toggle" className="ml-2 block text-sm font-medium text-slate-700">Comparar com outro CA</label>
                            </div>
                            {showComparison && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={comparisonCaNumberInput}
                                        onChange={(e) => setComparisonCaNumberInput(e.target.value)}
                                        placeholder="Digite o segundo CA"
                                        className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition"
                                        onKeyDown={(e) => e.key === 'Enter' && handleFetchAndParse(comparisonCaNumberInput, 'secondary')}
                                    />
                                    <button onClick={() => handleFetchAndParse(comparisonCaNumberInput, 'secondary')} disabled={!comparisonCaNumberInput || isLoading} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                        {isLoading && loadingTarget === 'secondary' ? loadingMessage.replace('Buscando...', 'Buscar') : 'Buscar'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="mt-4 flex flex-wrap items-end gap-6">
                        <button onClick={handleClear} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                            Limpar Tudo
                        </button>

                        {caData && !showComparison && (
                           <div className="border-l border-slate-200 pl-6">
                                <button 
                                    onClick={() => setShowFindSimilarUI(!showFindSimilarUI)} 
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <MagnifyingGlassIcon className="w-5 h-5"/>
                                    Localizar Similar em Segundo Plano
                                </button>
                                {showFindSimilarUI && (
                                    <div className="mt-4 flex flex-col gap-4 p-4 bg-slate-50 rounded-md border border-slate-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="find-similar-library-select" className="block text-sm font-medium text-slate-700 mb-1">Pesquisar na Biblioteca</label>
                                                <select 
                                                    id="find-similar-library-select" 
                                                    value={findSimilarLibraryId} 
                                                    onChange={e => setFindSimilarLibraryId(e.target.value)}
                                                    disabled={libraries.length === 0}
                                                    className="h-10 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="none">Selecione uma biblioteca</option>
                                                    {libraries.map(lib => (
                                                        <option key={lib.id} value={lib.id}>{lib.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="find-similar-description" className="block text-sm font-medium text-slate-700 mb-1">Descrição Adicional (Opcional)</label>
                                                <textarea
                                                    id="find-similar-description"
                                                    value={findSimilarDescription}
                                                    onChange={(e) => setFindSimilarDescription(e.target.value)}
                                                    placeholder="Ex: luva resistente a cortes para manuseio de vidros"
                                                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                         <div className="flex justify-end">
                                             <button 
                                                onClick={handleFindSimilar} 
                                                disabled={findSimilarLibraryId === 'none'} 
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                            >
                                                <SparklesIcon className="w-5 h-5"/>
                                                Iniciar Busca
                                            </button>
                                        </div>
                                    </div>
                                )}
                           </div>
                        )}

                        {caData && comparisonData && (
                            <div className="flex items-end gap-4 border-l border-slate-200 pl-6">
                                <button 
                                    onClick={handleAiAnalysis} 
                                    disabled={isAnalyzing || isLoading} 
                                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                                >
                                    <SparklesIcon className="w-5 h-5"/>
                                    {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                                </button>
                                <div className="relative">
                                    <label htmlFor="library-select" className="block text-sm font-medium text-slate-700 mb-1">Biblioteca de Conhecimento</label>
                                    <select 
                                        id="library-select" 
                                        value={selectedLibraryId} 
                                        onChange={e => setSelectedLibraryId(e.target.value)}
                                        disabled={libraries.length === 0 || isAnalyzing || isLoading}
                                        className="h-10 w-48 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="none">Nenhuma</option>
                                        {libraries.map(lib => (
                                            <option key={lib.id} value={lib.id}>{lib.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {searchHistory.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-md font-semibold text-slate-600">Buscas Recentes</h3>
                                <button onClick={handleClearHistory} className="text-sm text-slate-500 hover:text-slate-800 hover:underline transition-colors">
                                    Limpar histórico
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((ca) => (
                                    <button
                                        key={ca}
                                        onClick={() => {
                                            setCaNumberInput(ca);
                                            handleFetchAndParse(ca, 'primary');
                                        }}
                                        className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 transition"
                                        title={`Buscar CA ${ca}`}
                                    >
                                        {ca}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {isLoading && (
                     <div className="flex flex-col justify-center items-center p-10 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
                        {loadingMessage && <p className="text-slate-600 font-semibold">{loadingMessage}</p>}
                     </div>
                )}
                
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mb-6" role="alert"><p><strong>Erro:</strong> {error}</p></div>}
                
                <div className={isComparing ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
                    {caData && <CADetailCard data={caData} />}
                    {showComparison && comparisonData && <CADetailCard data={comparisonData} />}
                </div>

                <BackgroundJobsCard jobs={jobs} onViewResult={setViewingJobResult} onDeleteJob={handleDeleteJob} />

                {viewingJobResult && (
                    <div className="mt-8">
                        <FindSimilarCard
                            isLoading={false}
                            result={viewingJobResult.result ?? null}
                            error={viewingJobResult.error ?? null}
                            progress={0}
                            totalFiles={0}
                        />
                    </div>
                )}
                
                {(isAnalyzing || analysisResult || analysisError) && (
                    <AIAnalysisCard isLoading={isAnalyzing} analysis={analysisResult} error={analysisError} loadingMessage={analysisLoadingMessage} />
                )}
            </main>
            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                libraries={libraries}
                onSaveLibrary={handleSaveLibrary}
                onDeleteLibrary={handleDeleteLibrary}
                onImportLibraries={handleImportLibraries}
            />
        </div>
    );
};

export default App;