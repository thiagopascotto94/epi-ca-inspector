import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Library, LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import { get_encoding } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import SearchResults from '../components/SearchResults';

interface SearchResult {
    file: LibraryFile;
    snippet: string;
}

const LibraryDetailPage: React.FC = () => {
    const { libraryId } = useParams<{ libraryId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [library, setLibrary] = useState<Library | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isRootUser = user?.role === 'ROOT';

    const fetchData = async () => {
        if (!libraryId) return;

        setIsLoading(true);
        try {
            const fetchedLibrary = isRootUser
                ? await LibraryService.getLibraryTemplate(libraryId)
                : await LibraryService.getLibrary(libraryId);

            // Redirect regular users away if they somehow access a template-based library directly
            if (!isRootUser && fetchedLibrary?.isSystemModel) {
                 navigate('/library');
                 return;
            }

            setLibrary(fetchedLibrary);
        } catch (error) {
            console.error("Failed to fetch library:", error);
            setLibrary(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, libraryId, navigate, isRootUser]);

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!libraryId || !library) return;
        const files = event.target.files;
        if (!files) return;

        if (library.files.length + files.length > 10) {
            alert("Você só pode adicionar no máximo 10 arquivos por biblioteca.");
            return;
        }

        setIsLoading(true);
        try {
            for (const file of Array.from(files)) {
                // Basic validation, more can be added
                if (file.size > 5 * 1024 * 1024) { // 5MB limit per file
                    alert(`O arquivo ${file.name} é muito grande (limite de 5MB).`);
                    continue;
                }

                const newFileMetadata = { id: uuidv4(), name: file.name };

                if (isRootUser) {
                    await LibraryService.addFileToTemplate(libraryId, file, newFileMetadata);
                } else {
                    await LibraryService.addFileToLibrary(libraryId, file, newFileMetadata);
                }
            }
        } catch (error) {
            console.error("Failed to add files:", error);
            alert("Ocorreu um erro ao adicionar os arquivos.");
        } finally {
            // Refetch data to show the new files
            await fetchData();
            setIsLoading(false);
            // Reset file input
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleEditFile = (file: LibraryFile) => {
        if (!libraryId) return;
        navigate(`/library/${libraryId}/file/${file.id}/edit`);
    };

    const handleRenameFile = async (file: LibraryFile) => {
        const newName = prompt("Digite o novo nome para o arquivo:", file.name);
        if (newName && newName.trim() !== "" && libraryId) {
            const updatedFile = { ...file, name: newName.trim() };
            setIsLoading(true);
            try {
                if (isRootUser) {
                    await LibraryService.updateFileInTemplate(libraryId, file.id, updatedFile);
                } else {
                    await LibraryService.updateFileInLibrary(libraryId, file.id, updatedFile);
                }
                await fetchData();
            } catch (error) {
                console.error("Failed to rename file:", error);
                alert("Ocorreu um erro ao renomear o arquivo.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!libraryId) return;
        if (window.confirm("Tem certeza que deseja excluir este arquivo?")) {
            try {
                if (isRootUser) {
                    await LibraryService.deleteFileFromTemplate(libraryId, fileId);
                } else {
                    await LibraryService.deleteFileFromLibrary(libraryId, fileId);
                }
                await fetchData();
            } catch (error) {
                console.error("Failed to delete file:", error);
                alert("Ocorreu um erro ao excluir o arquivo.");
            }
        }
    };

    const searchResults = useMemo<SearchResult[]>(() => {
        if (!searchQuery || !library) return [];
        const results: SearchResult[] = [];
        const query = searchQuery.toLowerCase();
        for (const file of library.files) {
            const content = file.content || '';
            const matchIndex = content.toLowerCase().indexOf(query);
            if (matchIndex !== -1) {
                const start = Math.max(0, matchIndex - 50);
                const end = Math.min(content.length, matchIndex + query.length + 50);
                const snippet = content.substring(start, end);
                results.push({ file, snippet });
            }
        }
        return results;
    }, [searchQuery, library]);

    if (isLoading && !library) {
        return <div className="text-center p-8">Carregando...</div>;
    }

    if (!library) {
        return <div className="text-center p-8">Biblioteca não encontrada.</div>;
    }

    const enc = get_encoding("cl100k_base");

    const renderFileList = () => (
        <ul className="space-y-4">
            {library.files.map((file) => (
                <li key={file.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{file.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Origem: {file.url}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{enc.encode(file.content || '').length} tokens</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleRenameFile(file)} className="px-3 py-1 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 transition-colors">Renomear</button>
                        <button onClick={() => handleEditFile(file)} className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Editar</button>
                        <button onClick={() => handleDeleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors">Excluir</button>
                    </div>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="container mx-auto p-4">
            <Link to="/library" className="text-sky-600 dark:text-sky-500 hover:underline mb-4 inline-block">&larr; Voltar para Bibliotecas</Link>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{library.name}</h1>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors" disabled={library.files.length >= 10}>Importar Arquivos</button>
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={handleFileSelected}
                    className="hidden"
                />
            </div>
            {library.files.length >= 10 && <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">Você atingiu o limite de 10 arquivos nesta biblioteca.</p>}

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar nos arquivos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                {searchQuery ? (
                    <SearchResults results={searchResults} query={searchQuery} onEditFile={handleEditFile} />
                ) : (
                    <>
                        {renderFileList()}
                        {library.files.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum arquivo nesta biblioteca.</p>}
                    </>
                )}
            </div>

            <AddFileDialog isOpen={isAddFileDialogOpen} onClose={() => setIsAddFileDialogOpen(false)} onAdd={handleAddFiles} onAddBlank={handleAddBlank} isLoading={isLoading} />
        </div>
    );
};

export default LibraryDetailPage;
