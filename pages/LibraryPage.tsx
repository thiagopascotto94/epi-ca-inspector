import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Library, LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import CreateLibraryDialog from '../components/CreateLibraryDialog';
import { get_encoding } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../authService';
import { fetchUrlAsText } from '../services/apiService';

interface Source {
    type: 'url' | 'file';
    value: string | File;
}

const LibraryPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User | null }>();
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [libraryTemplates, setLibraryTemplates] = useState<Library[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isRootUser = user?.email === 'thiagopascotto94@gmail.com';

    useEffect(() => {
        const fetchLibraries = async () => {
            if (user) {
                if (isRootUser) {
                    const templates = await LibraryService.getLibraryTemplates();
                    setLibraries(templates);
                } else {
                    const userLibraries = await LibraryService.getLibraries(user.uid);
                    setLibraries(userLibraries);
                    const templates = await LibraryService.getLibraryTemplates();
                    setLibraryTemplates(templates);
                }
            }
        };

        fetchLibraries();
    }, [user, isRootUser]);

    const handleCreateLibrary = async (name: string, sources: Source[], isSystemModel: boolean) => {
        if (!user) return;

        if (!isRootUser && libraries.length >= 5) {
            alert("Você atingiu o limite de 5 bibliotecas por usuário.");
            return;
        }

        if (sources.length > 10) {
            alert("Você só pode adicionar no máximo 10 arquivos por biblioteca.");
            return;
        }

        setIsLoading(true);

        try {
            const newFiles: LibraryFile[] = [];
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
                    setIsLoading(false);
                    return;
                }

                newFiles.push({ id: uuidv4(), url, content });
            }

            const newLibrary: Library = { id: uuidv4(), name, files: newFiles, isSystemModel };

            await LibraryService.createLibrary(user.uid, newLibrary, isRootUser);

            if (isRootUser) {
                setLibraries(await LibraryService.getLibraryTemplates());
            } else {
                setLibraries(await LibraryService.getLibraries(user.uid));
            }
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to create library:", error);
            alert("Ocorreu um erro ao criar a biblioteca. Por favor, tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (library: Library) => {
        if (!user) return;
        if (window.confirm(`Tem certeza que deseja excluir a biblioteca "${library.name}"?`)) {
            try {
                if (isRootUser) {
                    await LibraryService.deleteLibraryTemplate(library.id);
                    setLibraries(await LibraryService.getLibraryTemplates());
                } else {
                    await LibraryService.deleteLibrary(user.uid, library);
                    setLibraries(await LibraryService.getLibraries(user.uid));
                }
            } catch (error) {
                console.error("Failed to delete library:", error);
                alert("Ocorreu um erro ao excluir a biblioteca. Por favor, tente novamente.");
            }
        }
    };

    const handleImportLibrary = async (template: Library) => {
        if (!user) return;
        try {
            await LibraryService.importLibraryTemplate(user.uid, template);
            setLibraries(await LibraryService.getLibraries(user.uid));
            alert(`A biblioteca "${template.name}" foi importada com sucesso!`);
        } catch (error) {
            console.error("Failed to import library:", error);
            alert("Ocorreu um erro ao importar a biblioteca. Por favor, tente novamente.");
        }
    };

    const handleUpdateLibrary = async (library: Library) => {
        if (!user) return;
        const template = libraryTemplates.find(t => t.id === library.systemModelId);
        if (!template) {
            alert("Não foi possível encontrar o modelo original para atualização.");
            return;
        }
        if (window.confirm(`Tem certeza que deseja atualizar a biblioteca "${library.name}" com o modelo "${template.name}"? As alterações locais serão perdidas.`)) {
            try {
                await LibraryService.updateLibraryFromTemplate(user.uid, library, template);
                setLibraries(await LibraryService.getLibraries(user.uid));
                alert(`A biblioteca "${library.name}" foi atualizada com sucesso!`);
            } catch (error) {
                console.error("Failed to update library:", error);
                alert("Ocorreu um erro ao atualizar a biblioteca. Por favor, tente novamente.");
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isRootUser ? 'Gerenciamento de Modelos' : 'Bibliotecas de Conhecimento'}
                </h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors"
                    disabled={!isRootUser && libraries.length >= 5}
                >
                    {isRootUser ? 'Criar Novo Modelo' : 'Criar Nova Biblioteca'}
                </button>
            </div>
            {!isRootUser && libraries.length >= 5 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">Você atingiu o limite de 5 bibliotecas.</p>
            )}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    {isRootUser ? 'Modelos de Biblioteca' : 'Minhas Bibliotecas'}
                </h2>
                <ul className="space-y-4">
                    {libraries.map((lib) => (
                        <li key={lib.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                            <div>
                                {isRootUser ? (
                                    <span className="font-semibold text-slate-900 dark:text-white">{lib.name}</span>
                                ) : (
                                    <Link to={`/library/${lib.id}`} className="font-semibold text-sky-600 dark:text-sky-500 hover:underline">{lib.name}</Link>
                                )}
                                <p className="text-sm text-slate-500 dark:text-slate-400">{lib.files.length} documento(s)</p>
                                {lib.isSystemModel && <span className="text-xs text-blue-500 dark:text-blue-400 ml-2">(Modelo do Sistema)</span>}
                            </div>
                            <div className="flex gap-2">
                                {!isRootUser && (
                                    <Link to={`/library/${lib.id}`} className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                        Gerenciar
                                    </Link>
                                )}
                                {lib.isSystemModel && !isRootUser && (
                                    <button
                                        onClick={() => handleUpdateLibrary(lib)}
                                        className="px-3 py-1 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                        Atualizar
                                    </button>
                                )}
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

            {!isRootUser && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Modelos Disponíveis</h2>
                    <ul className="space-y-4">
                        {libraryTemplates.map((template) => (
                            <li key={template.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{template.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{template.files.length} documento(s)</p>
                                </div>
                                <button
                                    onClick={() => handleImportLibrary(template)}
                                    className="px-3 py-1 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors"
                                >
                                    Importar
                                </button>
                            </li>
                        ))}
                    </ul>
                    {libraryTemplates.length === 0 && (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum modelo disponível.</p>
                    )}
                </div>
            )}

            <CreateLibraryDialog
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateLibrary}
                isLoading={isLoading}
                isRootUser={isRootUser}
            />
        </div>
    );
};

export default LibraryPage;
