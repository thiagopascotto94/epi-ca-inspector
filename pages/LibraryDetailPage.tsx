import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Library, LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import { get_encoding } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import AddFileDialog from '../components/AddFileDialog';
import EditFileDialog from '../components/EditFileDialog';
import SearchResults from '../components/SearchResults';
import { fetchUrlAsText } from '../services/apiService';
import { useIsRootUser } from '../hooks/useIsRootUser';

interface Source {
    type: 'url' | 'file';
    value: string | File;
}

interface SearchResult {
    file: LibraryFile;
    snippet: string;
}

const LibraryDetailPage: React.FC = () => {
    const { libraryId } = useParams<{ libraryId: string }>();
    const { user } = useOutletContext<{ user: User | null }>();
    const navigate = useNavigate();
    const [library, setLibrary] = useState<Library | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
    const [isEditFileDialogOpen, setIsEditFileDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const isRootUser = useIsRootUser(user);

    const fetchData = async () => {
        if (!user || !libraryId) return;

        setIsLoading(true);
        let fetchedLibrary: Library | null = null;

        if (isRootUser) {
            fetchedLibrary = await LibraryService.getLibraryTemplate(libraryId);
        } else {
            fetchedLibrary = await LibraryService.getLibrary(user.uid, libraryId);
            if (fetchedLibrary?.systemModelId) {
                navigate('/library');
                return;
            }
        }

        setLibrary(fetchedLibrary);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user, libraryId, navigate]);

    const handleAddFiles = async (sources: Source[]) => {
        if (!user || !libraryId || !library) return;
        if (library.files.length + sources.length > 10) {
            alert("Você só pode adicionar no máximo 10 arquivos por biblioteca.");
            return;
        }
        setIsLoading(true);
        try {
            const enc = get_encoding("cl100k_base");
            for (const source of sources) {
                let content = '';
                let url = '';
                if (source.type === 'url') {
                    content = await fetchUrlAsText(source.value as string);
                    url = source.value as string;
                } else {
                    content = await (source.value as File).text();
                    url = (source.value as File).name;
                }
                const tokens = enc.encode(content).length;
                const bytes = new TextEncoder().encode(content).length;
                if (bytes > 1 * 1024 * 1024 || tokens > 900 * 1000) {
                    alert(`O arquivo ${url} excede o limite de 1MB ou 900k tokens.`);
                    continue;
                }
                const newFile: LibraryFile = { id: uuidv4(), url, content };
                if (isRootUser) {
                    await LibraryService.addFileToTemplate(libraryId, newFile);
                } else {
                    await LibraryService.addFileToLibrary(user.uid, libraryId, newFile);
                }
            }
            await fetchData();
            setIsAddFileDialogOpen(false);
        } catch (error) {
            console.error("Failed to add files:", error);
            alert("Ocorreu um erro ao adicionar os arquivos.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditFile = (file: LibraryFile) => {
        setSelectedFile(file);
        setIsEditFileDialogOpen(true);
    };

    const handleSaveFile = async (updatedFile: LibraryFile) => {
        if (!user || !libraryId) return;
        const enc = get_encoding("cl100k_base");
        const tokens = enc.encode(updatedFile.content || '').length;
        const bytes = new TextEncoder().encode(updatedFile.content || '').length;
        if (bytes > 1 * 1024 * 1024 || tokens > 900 * 1000) {
            alert(`O arquivo excede o limite de 1MB ou 900k tokens.`);
            return;
        }
        setIsLoading(true);
        try {
            if (isRootUser) {
                await LibraryService.updateFileInTemplate(libraryId, updatedFile);
            } else {
                await LibraryService.updateFileInLibrary(user.uid, libraryId, updatedFile);
            }
            await fetchData();
            setIsEditFileDialogOpen(false);
        } catch (error) {
            console.error("Failed to save file:", error);
            alert("Ocorreu um erro ao salvar o arquivo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!user || !libraryId) return;
        if (window.confirm("Tem certeza que deseja excluir este arquivo?")) {
            try {
                if (isRootUser) {
                    await LibraryService.deleteFileFromTemplate(libraryId, fileId);
                } else {
                    await LibraryService.deleteFileFromLibrary(user.uid, libraryId, fileId);
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
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{file.url}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{enc.encode(file.content || '').length} tokens</p>
                    </div>
                    <div className="flex gap-2">
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
                <button onClick={() => setIsAddFileDialogOpen(true)} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors" disabled={library.files.length >= 10}>Adicionar Arquivo</button>
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

            <AddFileDialog isOpen={isAddFileDialogOpen} onClose={() => setIsAddFileDialogOpen(false)} onAdd={handleAddFiles} isLoading={isLoading} />
            <EditFileDialog isOpen={isEditFileDialogOpen} onClose={() => setIsEditFileDialogOpen(false)} onSave={handleSaveFile} file={selectedFile} isLoading={isLoading} />
        </div>
    );
};

export default LibraryDetailPage;
