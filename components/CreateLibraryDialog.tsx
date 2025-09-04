import React, { useState } from 'react';

interface Source {
    type: 'url' | 'file';
    value: string | File;
}

interface CreateLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, sources: Source[], isSystemModel: boolean) => void;
    isLoading: boolean;
    isRootUser: boolean;
}

const CreateLibraryDialog: React.FC<CreateLibraryDialogProps> = ({ isOpen, onClose, onCreate, isLoading, isRootUser }) => {
    const [name, setName] = useState('');
    const [sources, setSources] = useState<Source[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [isSystemModel, setIsSystemModel] = useState(false);

    if (!isOpen) return null;

    const handleAddUrl = () => {
        if (urlInput.trim() !== '') {
            setSources([...sources, { type: 'url', value: urlInput.trim() }]);
            setUrlInput('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({ type: 'file', value: file } as Source));
            setSources([...sources, ...newFiles]);
        }
    };

    const handleRemoveSource = (index: number) => {
        setSources(sources.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, sources, isSystemModel);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                    {isRootUser ? 'Criar Novo Modelo' : 'Criar Nova Biblioteca'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="library-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {isRootUser ? 'Nome do Modelo' : 'Nome da Biblioteca'}
                        </label>
                        <input
                            id="library-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    {isRootUser && (
                        <div className="mb-4">
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

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adicionar Fontes</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://exemplo.com/documento.txt"
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                            <button type="button" onClick={handleAddUrl} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                                Add URL
                            </button>
                        </div>
                        <div>
                            <label htmlFor="file-upload" className="w-full text-center px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer block">
                                Selecionar Arquivos
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Fontes Adicionadas</h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {sources.map((source, index) => (
                                <li key={index} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
                                        {typeof source.value === 'string' ? source.value : (source.value as File).name}
                                    </span>
                                    <button type="button" onClick={() => handleRemoveSource(index)} className="text-red-500 hover:text-red-700">
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {sources.length === 0 && <p className="text-slate-500 dark:text-slate-400">Nenhuma fonte adicionada.</p>}
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400" disabled={isLoading || sources.length === 0}>
                            {isLoading ? 'Criando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLibraryDialog;
