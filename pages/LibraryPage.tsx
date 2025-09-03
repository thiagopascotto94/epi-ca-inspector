import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Library, LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import { UsageService } from '../services/usageService';
import { fetchUrlAsText } from '../services/apiService';
import CreateLibraryDialog from '../components/CreateLibraryDialog';
import EditLibraryDialog from '../components/EditLibraryDialog';
import { encode } from 'gpt-3-encoder';
import { v4 as uuidv4 } from 'uuid';

const LibraryPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User | null }>();
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchLibraries = async () => {
            if (user) {
                const userLibraries = await LibraryService.getLibraries(user.uid);
                setLibraries(userLibraries);
            }
        };

        fetchLibraries();
    }, [user]);

    const handleCreateLibrary = async (name: string, url: string) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const content = await fetchUrlAsText(url);
            const tokens = encode(content).length;
            const bytes = new TextEncoder().encode(content).length;
            const hasEnoughSpace = await UsageService.hasEnoughSpace(user.uid, bytes, tokens);
            if (!hasEnoughSpace) {
                alert('Você não tem espaço suficiente para adicionar esta biblioteca. O limite é de 1MB ou 900k tokens.');
                setIsLoading(false);
                return;
            }
            const newFile: LibraryFile = { id: uuidv4(), url, content };
            const newLibrary: Library = { id: uuidv4(), name, files: [newFile] };
            const currentUsage = await UsageService.getUsage(user.uid);
            const updatedUsage = {
                bytes: currentUsage.bytes + bytes,
                tokens: currentUsage.tokens + tokens,
            };
            await LibraryService.createLibrary(user.uid, newLibrary, updatedUsage);
            setLibraries(await LibraryService.getLibraries(user.uid));
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to create library:", error);
            alert("Ocorreu um erro ao criar a biblioteca. Por favor, tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (library: Library) => {
        setSelectedLibrary(library);
        setIsEditModalOpen(true);
    };

    const handleSaveLibrary = async (library: Library, newContent: string) => {
        if (!user) return;
        setIsLoading(true);

        try {
            const oldContent = library.files[0].content || '';
            const oldTokens = encode(oldContent).length;
            const oldBytes = new TextEncoder().encode(oldContent).length;

            const newTokens = encode(newContent).length;
            const newBytes = new TextEncoder().encode(newContent).length;

            const currentUsage = await UsageService.getUsage(user.uid);

            const updatedUsage = {
                bytes: currentUsage.bytes - oldBytes + newBytes,
                tokens: currentUsage.tokens - oldTokens + newTokens,
            };

            if (updatedUsage.bytes > 1 * 1024 * 1024 || updatedUsage.tokens > 900 * 1000) {
                alert('Você não tem espaço suficiente para salvar as alterações. O limite é de 1MB ou 900k tokens.');
                setIsLoading(false);
                return;
            }

            const updatedLibrary: Library = {
                ...library,
                files: [{ ...library.files[0], content: newContent }],
            };

            await LibraryService.updateLibrary(user.uid, updatedLibrary, updatedUsage);

            setLibraries(await LibraryService.getLibraries(user.uid));
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to save library:", error);
            alert("Ocorreu um erro ao salvar a biblioteca. Por favor, tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (library: Library) => {
        if (!user) return;
        if (window.confirm(`Tem certeza que deseja excluir a biblioteca "${library.name}"?`)) {
            try {
                await LibraryService.deleteLibrary(user.uid, library);
                setLibraries(await LibraryService.getLibraries(user.uid));
            } catch (error) {
                console.error("Failed to delete library:", error);
                alert("Ocorreu um erro ao excluir a biblioteca. Por favor, tente novamente.");
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bibliotecas de Conhecimento</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors"
                >
                    Criar Nova Biblioteca
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <ul className="space-y-4">
                    {libraries.map((lib) => (
                        <li key={lib.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{lib.name}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(lib)}
                                    className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(lib)}
                                    className="px-3 py-1 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors"
                                >
                                    Excluir
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                {libraries.length === 0 && (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhuma biblioteca encontrada.</p>
                )}
            </div>

            <CreateLibraryDialog
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateLibrary}
                isLoading={isLoading}
            />

            <EditLibraryDialog
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveLibrary}
                library={selectedLibrary}
                isLoading={isLoading}
            />
        </div>
    );
};

export default LibraryPage;
