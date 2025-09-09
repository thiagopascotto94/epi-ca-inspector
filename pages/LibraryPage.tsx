import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Library, LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import CreateLibraryDialog from '../components/CreateLibraryDialog';
import { get_encoding } from 'tiktoken';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { fetchUrlAsText } from '../services/apiService';
import { LibraryOnboardingJoyride } from '../components/LibraryOnboardingJoyride';

interface Source {
    type: 'url' | 'file';
    value: string | File;
}

const LibraryPage: React.FC = () => {
    const { user } = useAuth();
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [libraryTemplates, setLibraryTemplates] = useState<Library[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [runOnboarding, setRunOnboarding] = useState(false);
    const isRootUser = user?.role === 'ROOT';

    useEffect(() => {
        const fetchLibraries = async () => {
            if (user) {
                setIsLoading(true);
                try {
                    if (isRootUser) {
                        const templates = await LibraryService.getLibraryTemplates();
                        setLibraries(templates);
                    } else {
                        const [userLibraries, templates] = await Promise.all([
                            LibraryService.getLibraries(),
                            LibraryService.getLibraryTemplates()
                        ]);
                        setLibraries(userLibraries);
                        setLibraryTemplates(templates);

                        const hasSeenOnboarding = localStorage.getItem('hasSeenLibraryOnboarding');
                        if (!hasSeenOnboarding) {
                            setRunOnboarding(true);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch libraries:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchLibraries();
    }, [user, isRootUser]);

    const handleJoyrideCallback = (data: any) => {
        const { status } = data;
        const finishedStatuses = ['finished', 'skipped'];

        if (finishedStatuses.includes(status)) {
            setRunOnboarding(false);
            localStorage.setItem('hasSeenLibraryOnboarding', 'true');
        }
    };

    const handleCreateLibrary = async (name: string, isSystemModel: boolean) => {
        if (!user) return;

        if (!isRootUser && libraries.length >= 5) {
            alert("Você atingiu o limite de 5 bibliotecas por usuário.");
            return;
        }

        setIsLoading(true);

        try {
            const newLibraryData: Partial<Library> = { name, isSystemModel };

            if (isRootUser) {
                await LibraryService.createLibraryTemplate(newLibraryData);
                setLibraries(await LibraryService.getLibraryTemplates());
            } else {
                await LibraryService.createLibrary(newLibraryData);
                setLibraries(await LibraryService.getLibraries());
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
            setIsLoading(true);
            try {
                if (isRootUser) {
                    await LibraryService.deleteLibraryTemplate(library.id);
                    setLibraries(await LibraryService.getLibraryTemplates());
                } else {
                    await LibraryService.deleteLibrary(library.id);
                    setLibraries(await LibraryService.getLibraries());
                }
            } catch (error) {
                console.error("Failed to delete library:", error);
                alert("Ocorreu um erro ao excluir a biblioteca. Por favor, tente novamente.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleImportLibrary = async (template: Library) => {
        if (!user) return;
        setIsLoading(true);
        try {
            await LibraryService.importLibraryTemplate(template.id);
            setLibraries(await LibraryService.getLibraries());
            alert(`A biblioteca "${template.name}" foi importada com sucesso!`);
        } catch (error) {
            console.error("Failed to import library:", error);
            alert("Ocorreu um erro ao importar a biblioteca. Por favor, tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <LibraryOnboardingJoyride run={runOnboarding} callback={handleJoyrideCallback} />
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isRootUser ? 'Gerenciamento de Modelos' : 'Bibliotecas de Conhecimento'}
                </h1>
                <button
                    id="create-library-button"
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

            <div id="my-libraries-section" className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    {isRootUser ? 'Modelos de Biblioteca' : 'Minhas Bibliotecas'}
                </h2>
                <ul className="space-y-4">
                    {libraries.map((lib) => (
                        <li key={lib.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                            <div>
                                {isRootUser || !lib.systemModelId ? (
                                    <Link to={`/library/${lib.id}`} className="font-semibold text-sky-600 dark:text-sky-500 hover:underline">{lib.name}</Link>
                                ) : (
                                    <span className="font-semibold text-slate-900 dark:text-white">{lib.name}</span>
                                )}
                                <p className="text-sm text-slate-500 dark:text-slate-400">{lib.files.length} documento(s)</p>
                                {isRootUser && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        <span className="font-semibold">{lib.usageCount || 0}</span> usuário(s) utilizando
                                    </p>
                                )}
                                {lib.isSystemModel && <span className="text-xs text-blue-500 dark:text-blue-400 ml-2">(Modelo do Sistema)</span>}
                            </div>
                            <div className="flex gap-2">
                                {!isRootUser && !lib.systemModelId && (
                                    <Link to={`/library/${lib.id}`} className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                        Gerenciar
                                    </Link>
                                )}
                                <button
                                    onClick={() => handleDelete(lib)}
                                    className="px-3 py-1 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                                    disabled={isLoading}
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
                <div id="available-templates-section" className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Modelos Disponíveis</h2>
                    <ul className="space-y-4">
                        {libraryTemplates.map((template, index) => (
                            <li key={template.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{template.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{template.files.length} documento(s)</p>
                                </div>
                                <button
                                    id={index === 0 ? 'import-template-button' : undefined}
                                    onClick={() => handleImportLibrary(template)}
                                    className="px-3 py-1 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                                    disabled={isLoading}
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
