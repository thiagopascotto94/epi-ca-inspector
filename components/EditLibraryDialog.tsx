import React, { useState, useEffect } from 'react';
import { Library } from '../types';
import ReactMarkdown from 'react-markdown';

interface EditLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (library: Library, newContent: string) => void;
    library: Library | null;
    isLoading: boolean;
}

const EditLibraryDialog: React.FC<EditLibraryDialogProps> = ({ isOpen, onClose, onSave, library, isLoading }) => {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (library && library.files.length > 0) {
            setContent(library.files[0].content || '');
        }
    }, [library]);

    if (!isOpen || !library) return null;

    const handleSave = () => {
        onSave(library, content);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Editar Biblioteca: {library.name}</h2>
                <div className="grid grid-cols-2 gap-4 flex-grow">
                    <div className="flex flex-col">
                        <label htmlFor="markdown-editor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Editor Markdown</label>
                        <textarea
                            id="markdown-editor"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white flex-grow"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preview</label>
                        <div className="prose dark:prose-invert p-2 border border-slate-300 dark:border-slate-600 rounded-md h-full overflow-auto bg-slate-50 dark:bg-slate-900">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
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
