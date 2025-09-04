import React, { useState, useEffect } from 'react';
import { LibraryFile } from '../types';
import ReactMarkdown from 'react-markdown';
import { fetchUrlAsText } from '../services/apiService';
import MarkdownEditor from './MarkdownEditor';

interface EditFileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (file: LibraryFile) => void;
    file: LibraryFile | null;
    isLoading: boolean;
}

const EditFileDialog: React.FC<EditFileDialogProps> = ({ isOpen, onClose, onSave, file, isLoading }) => {
    const [content, setContent] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [isAddingContent, setIsAddingContent] = useState(false);

    useEffect(() => {
        if (file) {
            setContent(file.content || '');
        }
    }, [file]);

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

    if (!isOpen || !file) return null;

    const handleSave = () => {
        onSave({ ...file, content });
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex-shrink-0">Editar Arquivo: {file.url}</h2>

                <div className="flex-grow grid grid-cols-2 gap-4 min-h-0">
                    <div className="flex flex-col h-full">
                        <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Editor</h3>
                        <div className="flex-grow relative">
                           <MarkdownEditor value={content} onChange={setContent} />
                        </div>
                    </div>
                    <div className="flex flex-col h-full">
                        <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Preview</h3>
                        <div className="prose dark:prose-invert p-4 border border-slate-300 dark:border-slate-600 rounded-md h-full overflow-auto bg-slate-50 dark:bg-slate-900">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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

                <div className="flex-shrink-0 flex justify-end gap-4 mt-4">
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

export default EditFileDialog;
