import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { User } from 'firebase/auth';
import { LibraryFile } from '../types';
import { LibraryService } from '../services/libraryService';
import { AIService } from '../services/aiService';
import MarkdownEditor from '../components/MarkdownEditor';
import ReactMarkdown from 'react-markdown';
import { useIsRootUser } from '../hooks/useIsRootUser';

type Tab = 'editor' | 'preview';

const EditFilePage: React.FC = () => {
    const { libraryId, fileId } = useParams<{ libraryId: string; fileId: string }>();
    const { user } = useOutletContext<{ user: User | null }>();
    const navigate = useNavigate();
    const isRootUser = useIsRootUser(user);

    const [file, setFile] = useState<LibraryFile | null>(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('editor');

    const [ocrFiles, setOcrFiles] = useState<File[]>([]);
    const [ocrProgress, setOcrProgress] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const ocrFileInputRef = useRef<HTMLInputElement>(null);


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
                    navigate(`/library/${libraryId}`);
                }
            } catch (error) {
                console.error("Failed to fetch file:", error);
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

    const handleOcrFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const selectedFiles = Array.from(event.target.files);
            if (selectedFiles.length > 10) {
                alert("Você pode selecionar no máximo 10 arquivos.");
                return;
            }
            setOcrFiles(selectedFiles);
        }
    };

    const handleExtract = async () => {
        if (ocrFiles.length === 0) return;

        setIsExtracting(true);
        setOcrProgress('Iniciando extração...');
        try {
            const extractedTexts = await AIService.extractTextFromFiles(ocrFiles, (progressMessage) => {
                setOcrProgress(progressMessage);
            });
            setContent(prev => `${prev}${extractedTexts.join('')}`);
            setOcrFiles([]);
            if(ocrFileInputRef.current) {
                ocrFileInputRef.current.value = '';
            }
        } catch (error) {
            console.error("Failed to extract text with AI:", error);
            alert("Ocorreu um erro ao extrair o texto dos arquivos.");
        } finally {
            setIsExtracting(false);
            setOcrProgress('');
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
            <main className="flex-grow flex flex-col p-4 overflow-hidden">
                <div className="mb-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <nav className="-mb-px flex gap-4">
                        <button onClick={() => setActiveTab('editor')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'editor' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Editor</button>
                        <button onClick={() => setActiveTab('preview')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'preview' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Preview</button>
                    </nav>
                </div>

                <div className="flex-grow overflow-auto">
                    {activeTab === 'editor' ? (
                        <div className="h-full">
                            <MarkdownEditor value={content} onChange={setContent} />
                        </div>
                    ) : (
                        <div className="prose dark:prose-invert p-4 border border-slate-300 dark:border-slate-600 rounded-md h-full bg-slate-50 dark:bg-slate-900">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {isRootUser && (
                    <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Extrair Conteúdo com IA (OCR)</h3>
                        <div className="flex gap-2 mb-2">
                            <label htmlFor="ocr-file-upload" className="w-full text-center px-4 py-2 bg-indigo-200 dark:bg-indigo-800 rounded cursor-pointer block">
                                {ocrFiles.length > 0 ? `${ocrFiles.length} arquivo(s) selecionado(s)` : 'Selecionar Imagens ou PDFs (até 10)'}
                            </label>
                            <input
                                id="ocr-file-upload"
                                ref={ocrFileInputRef}
                                type="file"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={handleOcrFileSelect}
                                className="hidden"
                                disabled={isExtracting}
                            />
                            <button onClick={handleExtract} disabled={isExtracting || ocrFiles.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
                                {isExtracting ? 'Extraindo...' : 'Extrair e Adicionar'}
                            </button>
                        </div>
                        {ocrProgress && <p className="text-sm text-slate-500 dark:text-slate-400">{ocrProgress}</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default EditFilePage;
