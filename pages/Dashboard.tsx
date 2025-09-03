
import React, { useState, useEffect } from 'react';
import { SearchForm } from '../components/SearchForm';
import { CADetailCard } from '../components/CADetailCard';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import { RecentSearches } from '../components/RecentSearches';
import { BackgroundJobsCard } from '../components/BackgroundJobsCard';
import { FindSimilarCard } from '../components/FindSimilarCard';
import { ConversionSuggestionCard } from '../components/ConversionSuggestionCard';
import { CAData, Library, SimilarityJob } from '../types';
import { CAScraperService } from '../services/caScraperService';
import { HistoryService } from '../services/historyService';
import { AIService } from '../services/aiService';
import { JobService } from '../services/jobService';
import { LibraryService } from '../services/libraryService';
import { auth } from '../firebase'; // Import auth to get current user's UID

interface DashboardProps {
    uid: string;
}

export default function Dashboard({ uid }: DashboardProps) {
    // Search and CA data state
    const [caNumberInput, setCaNumberInput] = useState('');
    const [comparisonCaNumberInput, setComparisonCaNumberInput] = useState('');
    const [caData, setCaData] = useState<CAData | null>(null);
    const [comparisonData, setComparisonData] = useState<CAData | null>(null);
    const [showComparison, setShowComparison] = useState(false);

    // Loading and message state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTarget, setLoadingTarget] = useState<'primary' | 'secondary' | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');

    // AI Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisLoadingMessage, setAnalysisLoadingMessage] = useState('');

    // Search History
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // Background Jobs
    const [jobs, setJobs] = useState<SimilarityJob[]>([]);
    const [findSimilarResult, setFindSimilarResult] = useState<string | null>(null);
    const [isFindingSimilar, setIsFindingSimilar] = useState(false);
    const [findSimilarError, setFindSimilarError] = useState<string | null>(null);
    const [findSimilarProgress, setFindSimilarProgress] = useState(0);
    const [findSimilarTotalFiles, setFindSimilarTotalFiles] = useState(0);
    const [findSimilarProgressMessage, setFindSimilarProgressMessage] = useState('');


    // Conversion Suggestion
    const [isConverting, setIsConverting] = useState(false);
    const [conversionResult, setConversionResult] = useState<string | null>(null);
    const [conversionError, setConversionError] = useState<string | null>(null);
    const [conversionLoadingMessage, setConversionLoadingMessage] = useState('');

    // UI Toggles
    const [showFindSimilarUI, setShowFindSimilarUI] = useState(false);
    const [showConversionUI, setShowConversionUI] = useState(false);

    // Libraries and settings
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [selectedLibraryId, setSelectedLibraryId] = useState('none');
    const [findSimilarLibraryId, setFindSimilarLibraryId] = useState('none');
    const [conversionLibraryId, setConversionLibraryId] = useState('none');
    const [findSimilarDescription, setFindSimilarDescription] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            if (uid) {
                setSearchHistory(await HistoryService.getSearchHistory(uid));
                setJobs(await JobService.getAllJobs(uid));
                setLibraries(await LibraryService.getLibraries(uid));
            }
        };
        loadInitialData();
    }, [uid]);

    const handleFetchAndParse = async (caNumber: string, target: 'primary' | 'secondary') => {
        if (!caNumber) return;

        setIsLoading(true);
        setLoadingTarget(target);
        setLoadingMessage('Buscando...');
        if (target === 'primary') setCaData(null);
        if (target === 'secondary') setComparisonData(null);

        try {
            const data = await CAScraperService.fetchAndParse(caNumber, (message) => setLoadingMessage(message));
            if (target === 'primary') {
                setCaData(data);
                await HistoryService.addSearchHistory(uid, caNumber);
                setSearchHistory(await HistoryService.getSearchHistory(uid));
            } else {
                setComparisonData(data);
            }
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setLoadingTarget(null);
            setLoadingMessage('');
        }
    };

    const handleClear = () => {
        setCaNumberInput('');
        setComparisonCaNumberInput('');
        setCaData(null);
        setComparisonData(null);
        setShowComparison(false);
        setAnalysisResult(null);
        setAnalysisError(null);
        setFindSimilarResult(null);
        setConversionResult(null);
    };

    const handleAiAnalysis = async () => {
        if (!caData || !comparisonData) return;

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        try {
            const result = await AIService.analyzeCAs(caData, comparisonData, selectedLibraryId, libraries, setAnalysisLoadingMessage);
            setAnalysisResult(result);
        } catch (error: any) {
            setAnalysisError(error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFindSimilar = async () => {
        if (!caData) return;
        
        try {
            const jobData = await AIService.findSimilar(caData, findSimilarLibraryId, findSimilarDescription, libraries);
            const newJob = await JobService.createJob(uid, jobData);
            setJobs(await JobService.getAllJobs(uid));
            setShowFindSimilarUI(false);

            // Notify service worker to start processing the job
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'START_SIMILARITY_JOB',
                    payload: {
                        jobId: newJob.id,
                        apiKey: process.env.VITE_FIREBASE_API_KEY, // Use VITE_ prefix for Vite env vars
                        uid: uid
                    }
                });
            }

        } catch (error: any) {
            setFindSimilarError(error.message);
        }
    };
    
    const handleConversionSuggestion = async () => {
        if (!caData) return;
        setIsConverting(true);
        setConversionResult(null);
        setConversionError(null);
        try {
            const result = await AIService.suggestConversion(caData, conversionLibraryId, libraries, setConversionLoadingMessage);
            setConversionResult(result);
        } catch (error: any) {
            setConversionError(error.message);
        } finally {
            setIsConverting(false);
        }
    };
    
    const handleDeleteJob = async (jobId: string) => {
        await JobService.deleteJob(uid, jobId);
        setJobs(await JobService.getAllJobs(uid));
    };

    return (
        <div className="space-y-8">
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

            <RecentSearches searchHistory={searchHistory} handleFetchAndParse={handleFetchAndParse} handleClearHistory={async () => { await HistoryService.clearSearchHistory(uid); setSearchHistory([]); }} setCaNumberInput={setCaNumberInput} />

            <div className={`grid grid-cols-1 gap-8 ${caData && !comparisonData ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
                {caData && <div><CADetailCard data={caData} /></div>}
                {comparisonData && <div><CADetailCard data={comparisonData} /></div>}
            </div>

            {isAnalyzing || analysisResult || analysisError ? (
                <AIAnalysisCard analysis={analysisResult} isLoading={isAnalyzing} error={analysisError} loadingMessage={analysisLoadingMessage} />
            ) : null}
            
            {isFindingSimilar || findSimilarResult || findSimilarError ? (
                <FindSimilarCard result={findSimilarResult} isLoading={isFindingSimilar} error={findSimilarError} progress={findSimilarProgress} totalFiles={findSimilarTotalFiles} progressMessage={findSimilarProgressMessage} />
            ) : null}

            {isConverting || conversionResult || conversionError ? (
                <ConversionSuggestionCard result={conversionResult} isLoading={isConverting} error={conversionError} loadingMessage={conversionLoadingMessage} />
            ) : null}

            <BackgroundJobsCard jobs={jobs} onViewResult={(job) => setFindSimilarResult(job.result || null)} onDeleteJob={handleDeleteJob} />
        </div>
    );
}
