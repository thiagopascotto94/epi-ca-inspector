import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { parseCAHtml } from './services/caScraperService';
import { CAData, Library, SimilarityJob } from './types';
import * as idb from './services/idbService';
import { fetchUrlAsText, generateContentWithRetry } from './services/apiService';
import { IS_DEV_MODE } from './config';
import { FIXED_LIBRARIES } from './services/fixedData';

import CADetailCard from './components/CADetailCard';
import { DocumentTextIcon, SparklesIcon, Cog6ToothIcon, MagnifyingGlassIcon, ArrowPathIcon } from './components/Icon';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { SettingsModal } from './components/SettingsModal';
import { FindSimilarCard } from './components/FindSimilarCard';
import { BackgroundJobsCard } from './components/BackgroundJobsCard';
import { ConversionSuggestionCard } from './components/ConversionSuggestionCard';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { ThemeSwitcher } from './components/ThemeSwitcher';

type Theme = 'light' | 'dark';

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonColor?: string;
}

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
    
    // Find Similar state
    const [showFindSimilarUI, setShowFindSimilarUI] = useState<boolean>(false);
    const [findSimilarLibraryId, setFindSimilarLibraryId] = useState<string>('none');
    const [findSimilarDescription, setFindSimilarDescription] = useState<string>('');
    const [viewingJobResult, setViewingJobResult] = useState<SimilarityJob | null>(null);
    const [toastMessage, setToastMessage] = useState<string>('');

    // Conversion Suggestion state
    const [showConversionUI, setShowConversionUI] = useState<boolean>(false);
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [conversionResult, setConversionResult] = useState<string | null>(null);
    const [conversionError, setConversionError] = useState<string | null>(null);
    const [conversionLoadingMessage, setConversionLoadingMessage] = useState<string>('');
    const [conversionLibraryId, setConversionLibraryId] = useState<string>('none');

    // Background Jobs State
    const [jobs, setJobs] = useState<SimilarityJob[]>([]);

    // Library/Settings states
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [selectedLibraryId, setSelectedLibraryId] = useState<string>('none');
    
    // Confirmation Dialog State
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // Theme state
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme || (userPrefersDark ? 'dark' : 'light');
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const hideConfirmation = useCallback(() => {
        setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    }, []);

    const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void, options?: { confirmText?: string; color?: string }) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                hideConfirmation();
            },
            confirmButtonText: options?.confirmText,
            confirmButtonColor: options?.color,
        });
    }, [hideConfirmation]);

    // Load initial data from localStorage and IndexedDB
    useEffect(() => {
        if (IS_DEV_MODE) {
            try {
                const storedLibraries = localStorage.getItem('caLibraries');
                if (storedLibraries) setLibraries(JSON.parse(storedLibraries));
            } catch (e) {
                console.error("Failed to load libraries from localStorage", e);
            }
        }
        
        try {
            const storedHistory = localStorage.getItem('caSearchHistory');
            if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
        } catch (e) {
            console.error("Failed to load search history from localStorage", e);
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

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        return () => {
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        };
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
        setConversionResult(null);
        setConversionError(null);
        setShowConversionUI(false);

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
        showConfirmation(
            'Confirmar Exclusão',
            'Tem certeza que deseja excluir esta biblioteca? Esta ação não pode ser desfeita.',
            () => {
                 setLibraries(prev => {
                    const newLibraries = prev.filter(lib => lib.id !== libraryId);
                    try {
                        localStorage.setItem('caLibraries', JSON.stringify(newLibraries));
                    } catch (e) {
                        console.error("Failed to save libraries to localStorage", e);
                    }
                    if (selectedLibraryId === libraryId) setSelectedLibraryId('none');
                    if(findSimilarLibraryId === libraryId) setFindSimilarLibraryId('none');
                    if(conversionLibraryId === libraryId) setConversionLibraryId('none');
                    return newLibraries;
                });
            },
            { confirmText: 'Excluir', color: 'bg-red-600 hover:bg-red-700' }
        );
    }, [selectedLibraryId, findSimilarLibraryId, conversionLibraryId, showConfirmation]);

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
            if (!importedLibraries.some(lib => lib.id === conversionLibraryId)) setConversionLibraryId('none');
        } catch (e) {
            console.error("Failed to save imported libraries to localStorage", e);
        }
    }, [selectedLibraryId, findSimilarLibraryId, conversionLibraryId]);
    
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
        let selectedLibrary: Library | undefined;

        if (IS_DEV_MODE) {
            selectedLibrary = libraries.find(lib => lib.id === selectedLibraryId);
        } else {
            selectedLibrary = FIXED_LIBRARIES[0];
        }

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
    
    const handleConversionSuggestion = async () => {
        if (!caData) {
            setConversionError("Dados do CA principal não encontrados.");
            return;
        }

        const selectedLibrary = IS_DEV_MODE ? libraries.find(lib => lib.id === conversionLibraryId) : FIXED_LIBRARIES[0];
        
        if (!selectedLibrary) {
            const message = IS_DEV_MODE ? "Por favor, selecione uma biblioteca de conhecimento para a conversão." : "Biblioteca de produção não encontrada.";
            setConversionError(message);
            return;
        }

        setIsConverting(true);
        setConversionResult(null);
        setConversionError(null);
        setConversionLoadingMessage('');

        if (selectedLibrary.files.length === 0) {
            setConversionError("A biblioteca selecionada está vazia.");
            setIsConverting(false);
            return;
        }

        let knowledgeBaseContent = '';
        try {
            setConversionLoadingMessage('Carregando arquivos da biblioteca...');
            const fileContents = await Promise.all(selectedLibrary.files.map(file => fetchUrlAsText(file.url)));
            knowledgeBaseContent = fileContents.join('\n\n---\n\n');
        } catch (e) {
            console.error("Error fetching library files for conversion:", e);
            setConversionError("Falha ao carregar um ou mais arquivos da biblioteca. A análise não pode prosseguir.");
            setIsConverting(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

            const prompt = `
                Você é um especialista em Certificados de Aprovação (CAs) e fichas técnicas de Equipamentos de Proteção Individual (EPIs) para calçados. Sua principal tarefa é analisar as informações de um CA de concorrente e, com base em um conjunto de dados de referência (sua base de conhecimento), identificar e sugerir o produto da nossa linha que melhor corresponde a ele.

                **Base de Conhecimento (Nossos Produtos):**
                ---
                ${knowledgeBaseContent}
                ---

                **CA do Concorrente para Análise:**
                \`\`\`json
                ${JSON.stringify(caData, null, 2)}
                \`\`\`

                **Formato da Resposta:**

                Sua resposta deve ser estruturada em três seções:

                1.  **Sugestão de Conversão:** A recomendação mais provável do nosso produto e seu respectivo CA.
                2.  **Análise de Correspondência:** Uma breve análise que justifique a sugestão, destacando as características que se alinham (material, tipo de biqueira, palmilha, etc.) e as que podem ser diferentes.
                3.  **Pontos de Atenção:** Qualquer diferença crítica (ex: sapato vs. bota, proteção S1 vs. S2, etc.) que o operador deve verificar manualmente.
            `;

            const response = await generateContentWithRetry(
                ai,
                { model: 'gemini-2.5-flash', contents: prompt },
                3,
                (attempt) => setConversionLoadingMessage(`Analisando... (Tentativa ${attempt}/3)`)
            );

            setConversionResult(response.text);

        } catch (e) {
            console.error("Conversion suggestion error after retries:", e);
            setConversionError("Ocorreu um erro ao conectar com o serviço de IA após múltiplas tentativas. Verifique sua chave de API e tente novamente.");
        } finally {
            setIsConverting(false);
            setConversionLoadingMessage('');
        }
    };

    const handleFindSimilar = async () => {
        if (!caData) return alert("Dados do CA principal não encontrados.");
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return alert("Service Worker não está ativo. A busca em segundo plano não pode ser iniciada.");
        if (!process.env.API_KEY) return alert("A chave de API não foi configurada.");
        
        const selectedLibrary = IS_DEV_MODE ? libraries.find(lib => lib.id === findSimilarLibraryId) : FIXED_LIBRARIES[0];
        
        if (!selectedLibrary) {
            const message = IS_DEV_MODE ? "Por favor, selecione uma biblioteca." : "Biblioteca de produção não configurada.";
            return alert(message);
        }
        
        if (selectedLibrary.files.length === 0) return alert("A biblioteca selecionada está vazia.");

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
        
        showConfirmation(
            'Confirmar Exclusão',
            confirmationMessage,
            async () => {
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
            },
            { confirmText: 'Excluir', color: 'bg-red-600 hover:bg-red-700' }
        );
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
        setConversionResult(null);
        setConversionError(null);
        setConversionLibraryId('none');
        setShowConversionUI(false);
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
            {toastMessage && (
                <div className="fixed top-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-bounce">
                    {toastMessage}
                </div>
            )}
            <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md z-40 dark:border-b dark:border-slate-800">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-sky-600 dark:text-sky-500"/>
                        <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">EPI CA Inspector</h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
                        {IS_DEV_MODE && (
                            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors" aria-label="Configurações">
                                <Cog6ToothIcon className="w-6 h-6"/>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4">
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
                                                    disabled={IS_DEV_MODE && findSimilarLibraryId === 'none'} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                                >
                                                    <SparklesIcon className="w-5 h-5"/>
                                                    Iniciar Busca
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
                    
                    {searchHistory.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-md font-semibold text-slate-600 dark:text-slate-300">Buscas Recentes</h3>
                                <button onClick={handleClearHistory} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline transition-colors">
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
                                        className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition"
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 dark:border-sky-500"></div>
                        {loadingMessage && <p className="text-slate-600 dark:text-slate-400 font-semibold">{loadingMessage}</p>}
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

                {(isConverting || conversionResult || conversionError) && (
                    <ConversionSuggestionCard isLoading={isConverting} result={conversionResult} error={conversionError} loadingMessage={conversionLoadingMessage} />
                )}
            </main>
            {IS_DEV_MODE && (
                <SettingsModal 
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    libraries={libraries}
                    onSaveLibrary={handleSaveLibrary}
                    onDeleteLibrary={handleDeleteLibrary}
                    onImportLibraries={handleImportLibraries}
                    onShowConfirmation={showConfirmation}
                />
            )}
            <ConfirmationDialog 
                isOpen={confirmation.isOpen}
                title={confirmation.title}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
                onCancel={hideConfirmation}
                confirmButtonText={confirmation.confirmButtonText}
                confirmButtonColor={confirmation.confirmButtonColor}
            />
        </div>
    );
};

export default App;