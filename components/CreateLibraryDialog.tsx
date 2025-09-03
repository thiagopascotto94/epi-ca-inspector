import React, { useState } from 'react';

interface CreateLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, url: string) => void;
    isLoading: boolean;
}

const CreateLibraryDialog: React.FC<CreateLibraryDialogProps> = ({ isOpen, onClose, onCreate, isLoading }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, url);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Criar Nova Biblioteca</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="library-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Biblioteca</label>
                        <input
                            id="library-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="library-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL para Importar</label>
                        <input
                            id="library-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="https://exemplo.com/documento.txt"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400" disabled={isLoading}>
                            {isLoading ? 'Criando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLibraryDialog;
