import React, { useState, useEffect } from 'react';
import { Library } from '../types';
import ReactMarkdown from 'react-markdown';
import { fetchUrlAsText } from '../services/apiService';

interface EditLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (library: Library, newContent: string) => void;
    library: Library | null;
    isLoading: boolean;
}

type Tab = 'editor' | 'preview';

const EditLibraryDialog: React.FC<EditLibraryDialogProps> = ({ isOpen, onClose, onSave, library, isLoading }) => {
    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('editor');
    const [newUrl, setNewUrl] = useState('');
    const [isAddingContent, setIsAddingContent] = useState(false);

    useEffect(() => {
        if (library && library.files.length > 0) {
            setContent(library.files.map(f => f.content || '').join('\n\n'));
        }
    }, [library]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !library) return null;

    const handleSave = () => {
        onSave(library, content);
    };

    const handleAddFromUrl = async () => {
        if (!newUrl) return;
        setIsAddingContent(true);
        try {
            const text = await fetchUrlAsText(newUrl);
            setContent(prev => `${prev}\n\n${text}`);
            setNewUrl('');
        } catch (error) {
            console.error("Failed to fetch from URL:", error);
            alert("Failed to fetch content from the URL.");
        } finally {
            setIsAddingContent(false);
        }
    };

    const handleAddFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        setIsAddingContent(true);
        try {
            const files = Array.from(event.target.files);
            const texts = await Promise.all(files.map(file => file.text()));
            setContent(prev => `${prev}\n\n${texts.join('\n\n')}`);
        } catch (error) {
            console.error("Failed to read files:", error);
            alert("Failed to read content from files.");
        } finally {
            setIsAddingContent(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Editar Biblioteca: {library.name}</h2>

                <div className="mb-4 border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex gap-4">
                        <button onClick={() => setActiveTab('editor')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'editor' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Editor</button>
                        <button onClick={() => setActiveTab('preview')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'preview' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Preview</button>
                    </nav>
                </div>

                <div className="flex-grow overflow-hidden">
                    {activeTab === 'editor' ? (
                        <textarea
                            id="markdown-editor"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                    ) : (
                        <div className="prose dark:prose-invert p-4 border border-slate-300 dark:border-slate-600 rounded-md h-full overflow-auto bg-slate-50 dark:bg-slate-900">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                <div className="mt-4 p-4 border-t border-slate-200 dark:border-slate-700">
                     <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Adicionar Conteúdo</h3>
                    <div className="flex gap-2 mb-2">
                        <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Adicionar de URL" className="w-full p-2 border rounded" />
                        <button onClick={handleAddFromUrl} disabled={isAddingContent} className="px-4 py-2 bg-slate-200 rounded disabled:opacity-50">
                            {isAddingContent ? 'Adicionando...' : 'Adicionar'}
                        </button>
                    </div>
                     <div>
                        <label htmlFor="add-file-upload" className="w-full text-center px-4 py-2 bg-slate-200 rounded cursor-pointer block">Selecionar Arquivos</label>
                        <input id="add-file-upload" type="file" multiple onChange={handleAddFromFile} className="hidden" disabled={isAddingContent} />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditLibraryDialog;
