import React, { useState } from 'react';

interface Source {
    type: 'url' | 'file';
    value: string | File;
}

interface AddFileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (sources: Source[]) => void;
    onAddBlank: (name: string) => void;
    isLoading: boolean;
}

const AddFileDialog: React.FC<AddFileDialogProps> = ({ isOpen, onClose, onAdd, onAddBlank, isLoading }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [urlInput, setUrlInput] = useState('');

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
        onAdd(sources);
    };

    const handleAddBlankClick = () => {
        const name = prompt("Digite o nome para o novo documento em branco:");
        if (name && name.trim() !== "") {
            onAddBlank(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Adicionar Novos Arquivos</h2>

                <div className="mb-4 p-4 border rounded-lg dark:border-slate-700">
                    <h3 className="font-semibold text-lg mb-2 text-slate-800 dark:text-slate-200">Opção 1: Adicionar de Fontes</h3>
                    <form onSubmit={handleSubmit}>
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
                            <label htmlFor="file-upload-add" className="w-full text-center px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer block">
                                Selecionar Arquivos Locais
                            </label>
                            <input
                                id="file-upload-add"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {sources.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Fontes a Adicionar</h3>
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
                                <button type="submit" className="w-full mt-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-sky-400" disabled={isLoading || sources.length === 0}>
                                    {isLoading ? 'Adicionando...' : `Adicionar ${sources.length} Fonte(s)`}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="mb-4 p-4 border rounded-lg dark:border-slate-700">
                    <h3 className="font-semibold text-lg mb-2 text-slate-800 dark:text-slate-200">Opção 2: Começar do Zero</h3>
                     <button type="button" onClick={handleAddBlankClick} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isLoading}>
                        Criar Documento em Branco
                    </button>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddFileDialog;
