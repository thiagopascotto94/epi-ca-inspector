import React, { useState, useEffect } from 'react';

interface CreateLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, isSystemModel: boolean) => void;
    isLoading: boolean;
    isRootUser: boolean;
}

const CreateLibraryDialog: React.FC<CreateLibraryDialogProps> = ({ isOpen, onClose, onCreate, isLoading, isRootUser }) => {
    const [name, setName] = useState('');
    const [isSystemModel, setIsSystemModel] = useState(false);

    useEffect(() => {
        // Reset state when dialog opens
        if (isOpen) {
            setName('');
            setIsSystemModel(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, isSystemModel);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                    {isRootUser ? 'Criar Novo Modelo' : 'Criar Nova Biblioteca'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="library-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {isRootUser ? 'Nome do Modelo' : 'Nome da Biblioteca'}
                        </label>
                        <input
                            id="library-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-sky-500 focus:border-sky-500"
                            required
                        />
                    </div>

                    {isRootUser && (
                        <div className="mb-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isSystemModel}
                                    onChange={(e) => setIsSystemModel(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">É um modelo do sistema?</span>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400 transition-colors" disabled={isLoading || !name.trim()}>
                            {isLoading ? 'Criando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLibraryDialog;
