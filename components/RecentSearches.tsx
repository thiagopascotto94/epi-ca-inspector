import React from 'react';

interface RecentSearchesProps {
    searchHistory: string[];
    handleFetchAndParse: (caNumber: string, target: 'primary' | 'secondary') => void;
    handleClearHistory: () => void;
    setCaNumberInput: (value: string) => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({ searchHistory, handleFetchAndParse, handleClearHistory, setCaNumberInput }) => {
    if (searchHistory.length === 0) {
        return null;
    }

    return (
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
    );
};
