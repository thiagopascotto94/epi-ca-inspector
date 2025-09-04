import React from 'react';
import { LibraryFile } from '../types';

interface SearchResult {
    file: LibraryFile;
    snippet: string;
}

interface SearchResultsProps {
    results: SearchResult[];
    query: string;
    onEditFile: (file: LibraryFile) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onEditFile }) => {
    if (results.length === 0) {
        return <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum resultado encontrado para "{query}".</p>;
    }

    const highlight = (text: string, query: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-300 dark:bg-yellow-500">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    return (
        <div className="space-y-4">
            {results.map(({ file, snippet }) => (
                <div key={file.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{file.url}</h3>
                        <button
                            onClick={() => onEditFile(file)}
                            className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                        >
                            Editar
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        ...{highlight(snippet, query)}...
                    </p>
                </div>
            ))}
        </div>
    );
};

export default SearchResults;
