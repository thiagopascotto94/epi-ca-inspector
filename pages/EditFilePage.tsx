import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { User } from 'firebase/auth';
import { LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import MarkdownEditor from '../components/MarkdownEditor';
import ReactMarkdown from 'react-markdown';
import { useIsRootUser } from '../hooks/useIsRootUser';

const EditFilePage: React.FC = () => {
    const { libraryId, fileId } = useParams<{ libraryId: string; fileId: string }>();
    const { user } = useOutletContext<{ user: User | null }>();
    const navigate = useNavigate();
    const isRootUser = useIsRootUser(user);

    const [file, setFile] = useState<LibraryFile | null>(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user || !libraryId || !fileId) return;

        const fetchFile = async () => {
            setIsLoading(true);
            try {
                let library;
                if (isRootUser) {
                    library = await LibraryService.getLibraryTemplate(libraryId);
                } else {
                    library = await LibraryService.getLibrary(user.uid, libraryId);
                }

                const foundFile = library?.files.find(f => f.id === fileId);
                if (foundFile) {
                    setFile(foundFile);
                    setContent(foundFile.content || '');
                } else {
                    // Handle file not found
                    navigate(`/library/${libraryId}`);
                }
            } catch (error) {
                console.error("Failed to fetch file:", error);
                // Handle error
                navigate(`/library/${libraryId}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFile();
    }, [user, libraryId, fileId, isRootUser, navigate]);

    const handleSave = async () => {
        if (!user || !libraryId || !file) return;

        setIsSaving(true);
        try {
            const updatedFile = { ...file, content };
            if (isRootUser) {
                await LibraryService.updateFileInTemplate(libraryId, updatedFile);
            } else {
                await LibraryService.updateFileInLibrary(user.uid, libraryId, updatedFile);
            }
            navigate(`/library/${libraryId}`);
        } catch (error) {
            console.error("Failed to save file:", error);
            alert("Ocorreu um erro ao salvar o arquivo.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Carregando...</div>;
    }

    if (!file) {
        return <div className="text-center p-8">Arquivo não encontrado.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
            <header className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 shadow-md">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Editando: {file.url}</h1>
                    <div className="flex gap-4">
                        <button onClick={() => navigate(`/library/${libraryId}`)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                            Voltar
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
                <div className="flex flex-col h-full">
                    <h2 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Editor</h2>
                    <div className="flex-grow relative">
                        <MarkdownEditor value={content} onChange={setContent} />
                    </div>
                </div>
                <div className="flex flex-col h-full">
                    <h2 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Preview</h2>
                    <div className="prose dark:prose-invert p-4 border border-slate-300 dark:border-slate-600 rounded-md h-full overflow-auto bg-slate-50 dark:bg-slate-900">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditFilePage;
