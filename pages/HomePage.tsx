import React, { useState, useCallback, useEffect } from 'react';

import { CAData, Library, SimilarityJob, Theme, ConfirmationState } from '../types';
import { IS_DEV_MODE } from '../config';

import { ThemeService } from '../services/themeService';
import { HistoryService } from '../services/historyService';
import { LibraryService } from '../services/libraryService';
import { CaFetchingService } from '../services/caFetchingService';
import { AIService } from '../services/aiService';
import { JobService } from '../services/jobService';

import { Header } from '../components/Header';
import { SearchForm } from '../components/SearchForm';
import { RecentSearches } from '../components/RecentSearches';
import CADetailCard from '../components/CADetailCard';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import { FindSimilarCard } from '../components/FindSimilarCard';
import { BackgroundJobsCard } from '../components/BackgroundJobsCard';
import { ConversionSuggestionCard } from '../components/ConversionSuggestionCard';
import { SettingsModal } from '../components/SettingsModal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

const HomePage: React.FC = () => {
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
    const [theme, setTheme] = useState<Theme>(ThemeService.getInitialTheme);

    useEffect(() => {
        ThemeService.applyTheme(theme);
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

    // Load initial data
    useEffect(() => {
        if (IS_DEV_MODE) {
            setLibraries(LibraryService.getLibraries());
        }
        setSearchHistory(HistoryService.getSearchHistory());
        JobService.getAllJobs().then(setJobs).catch(err => console.error("Failed to load jobs from IDB", err));
    }, []);

    // Effect to listen for updates from the Service Worker
    useEffect(() => {
        const handleServiceWorkerMessage = async (event: MessageEvent) => {
            if (event.data.type === 'JOB_UPDATED') {
                console.log("Job update received from SW:", event.data.payload.jobId);
                const updatedJobs = await JobService.getAllJobs();
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

    const handleFetchAndParse = useCallback(async (caNumber: string, target: 'primary' | 'secondary') => {
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
        
        try {
            const parsedData = await CaFetchingService.fetchAndParse(caNumber, setLoadingMessage);
            if (target === 'primary') {
                setCaData(parsedData);
            } else {
                setComparisonData(parsedData);
            }
            setSearchHistory(prev => HistoryService.updateSearchHistory(caNumber, prev));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
            setLoadingTarget(null);
            setLoadingMessage('');
        }
    }, []);

    const handleSaveLibrary = useCallback((library: Library) => {
        setLibraries(prev => LibraryService.saveLibrary(library, prev));
    }, []);

    const handleDeleteLibrary = useCallback((libraryId: string) => {
        showConfirmation(
            'Confirmar Exclusão',
            'Tem certeza que deseja excluir esta biblioteca? Esta ação não pode ser desfeita.',
            () => {
                 setLibraries(prev => {
                    const newLibraries = LibraryService.deleteLibrary(libraryId, prev);
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
        const newLibraries = LibraryService.importLibraries(importedLibraries);
        setLibraries(newLibraries);
        if (!newLibraries.some(lib => lib.id === selectedLibraryId)) setSelectedLibraryId('none');
        if (!newLibraries.some(lib => lib.id === findSimilarLibraryId)) setFindSimilarLibraryId('none');
        if (!newLibraries.some(lib => lib.id === conversionLibraryId)) setConversionLibraryId('none');
    }, [selectedLibraryId, findSimilarLibraryId, conversionLibraryId]);
    
    const handleAiAnalysis = async () => {
        if (!caData || !comparisonData) {
            setAnalysisError("É necessário ter os dados de dois CAs para fazer a análise.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        
        try {
            const result = await AIService.analyzeCAs(caData, comparisonData, selectedLibraryId, libraries, setAnalysisLoadingMessage);
            setAnalysisResult(result);
        } catch (e: any) {
            setAnalysisError(e.message);
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

        setIsConverting(true);
        setConversionResult(null);
        setConversionError(null);

        try {
            const result = await AIService.suggestConversion(caData, conversionLibraryId, libraries, setConversionLoadingMessage);
            setConversionResult(result);
        } catch (e: any) {
            setConversionError(e.message);
        } finally {
            setIsConverting(false);
            setConversionLoadingMessage('');
        }
    };

    const handleFindSimilar = async () => {
        if (!caData) return alert("Dados do CA principal não encontrados.");
        
        try {
            const newJob = await AIService.findSimilar(caData, findSimilarLibraryId, findSimilarDescription, libraries);
            setJobs(prevJobs => [newJob, ...prevJobs]);
            setToastMessage("Busca de similaridade iniciada em segundo plano!");
            setShowFindSimilarUI(false);
            setFindSimilarDescription('');
        } catch (e: any) {
            alert(e.message);
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
                await JobService.deleteJob(jobId);
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
        HistoryService.clearSearchHistory();
        setSearchHistory([]);
    };

    const isComparing = showComparison && !!comparisonData;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
            {toastMessage && (
                <div className="fixed top-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-bounce">
                    {toastMessage}
                </div>
            )}
            <Header 
                theme={theme}
                toggleTheme={toggleTheme}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
            />

            <main className="container mx-auto p-4">
                <SearchForm 
                    caNumberInput={caNumberInput}
                    setCaNumberInput={setCaNumberInput}
                    handleFetchAndParse={handleFetchAndParse}
                    isLoading={isLoading}
                    loadingTarget={loadingTarget}
                    loadingMessage={loadingMessage}
                    showComparison={showComparison}
                    setShowComparison={setShowComparison}
                    comparisonCaNumberInput={comparisonCaNumberInput}
                    setComparisonCaNumberInput={setComparisonCaNumberInput}
                    handleClear={handleClear}
                    caData={caData}
                    comparisonData={comparisonData}
                    handleAiAnalysis={handleAiAnalysis}
                    isAnalyzing={isAnalyzing}
                    libraries={libraries}
                    selectedLibraryId={selectedLibraryId}
                    setSelectedLibraryId={setSelectedLibraryId}
                    showFindSimilarUI={showFindSimilarUI}
                    setShowFindSimilarUI={setShowFindSimilarUI}
                    findSimilarLibraryId={findSimilarLibraryId}
                    setFindSimilarLibraryId={setFindSimilarLibraryId}
                    findSimilarDescription={findSimilarDescription}
                    setFindSimilarDescription={setFindSimilarDescription}
                    handleFindSimilar={handleFindSimilar}
                    showConversionUI={showConversionUI}
                    setShowConversionUI={setShowConversionUI}
                    conversionLibraryId={conversionLibraryId}
                    setConversionLibraryId={setConversionLibraryId}
                    handleConversionSuggestion={handleConversionSuggestion}
                    isConverting={isConverting}
                />
                
                <RecentSearches 
                    searchHistory={searchHistory}
                    handleFetchAndParse={handleFetchAndParse}
                    handleClearHistory={handleClearHistory}
                    setCaNumberInput={setCaNumberInput}
                />

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

export default HomePage;
