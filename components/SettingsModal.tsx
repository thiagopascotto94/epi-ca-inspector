import React, { useState, useEffect, useRef } from 'react';
import { Library, LibraryFile } from '../types';
import { TrashIcon, XMarkIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from './Icon';
import { PasswordPrompt } from './PasswordPrompt';
import { encryptData, decryptData } from '../services/cryptoService';
import { PromptDialog } from './PromptDialog';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraries: Library[];
  onSaveLibrary: (library: Library) => void;
  onDeleteLibrary: (libraryId: string) => void;
  onImportLibraries: (libraries: Library[]) => void;
  onShowConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; color?: string }
  ) => void;
}

const emptyLibrary: Omit<Library, 'id'> = { name: '', files: [] };

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, libraries, onSaveLibrary, onDeleteLibrary, onImportLibraries, onShowConfirmation }) => {
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [editingLibrary, setEditingLibrary] = useState<Library | Omit<Library, 'id'>>(emptyLibrary);
  const [fileUrlInput, setFileUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [passwordPromptConfig, setPasswordPromptConfig] = useState<{ title: string; onConfirm: (password: string) => void; }>({ title: '', onConfirm: () => {} });
  const [fileContentToImport, setFileContentToImport] = useState<string | null>(null);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{ message: string; onConfirm: (value: string) => void; onCancel: () => void; }>({ message: '', onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    if (isOpen) {
      setCurrentView('list');
      setEditingLibrary(emptyLibrary);
      setFileUrlInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const prompt = (message: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptConfig({
        message,
        onConfirm: (value: string) => {
          setIsPromptOpen(false);
          resolve(value);
        },
        onCancel: () => {
          setIsPromptOpen(false);
          resolve(null);
        },
      });
      setIsPromptOpen(true);
    });
  };

  const handleEdit = (library: Library) => {
    setEditingLibrary(library);
    setCurrentView('form');
  };

  const handleAddNew = async () => {
    const libraryName = await prompt('Qual o nome da nova biblioteca?');
    if (libraryName) {
      setEditingLibrary({ name: libraryName, files: [] });
      setCurrentView('form');
    }
  };

  const handleBackToList = () => {
    setEditingLibrary(emptyLibrary);
    setFileUrlInput('');
    setCurrentView('list');
  };

  const handleSave = () => {
    const libraryToSave: Library = 'id' in editingLibrary
      ? editingLibrary
      : { ...editingLibrary, id: crypto.randomUUID() };
      
    onSaveLibrary(libraryToSave);
    handleBackToList();
  };
  
  const handleAddFile = () => {
    if (fileUrlInput.trim() === '') return;
    try {
        new URL(fileUrlInput); // Validate URL
        const newFile: LibraryFile = { id: crypto.randomUUID(), url: fileUrlInput.trim() };
        setEditingLibrary(prev => ({...prev, files: [...prev.files, newFile]}));
        setFileUrlInput('');
    } catch (e) {
        alert('Por favor, insira uma URL válida.');
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setEditingLibrary(prev => ({...prev, files: prev.files.filter(file => file.id !== fileId)}));
  };

    const handleExport = () => {
        if (libraries.length === 0) {
            alert("Nenhuma biblioteca para exportar.");
            return;
        }
        setPasswordPromptConfig({
            title: 'Definir Senha para Exportação',
            onConfirm: (password) => {
                if (!password) {
                    alert('A senha não pode ser vazia.');
                    return;
                }
                const dataStr = JSON.stringify(libraries, null, 2);
                const encryptedData = encryptData(dataStr, password);
                const blob = new Blob([encryptedData], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const linkElement = document.createElement('a');
                linkElement.href = url;
                linkElement.download = 'bibliotecas-epi-inspector.json.enc';
                document.body.appendChild(linkElement);
                linkElement.click();
                document.body.removeChild(linkElement);
                URL.revokeObjectURL(url);
                setIsPasswordPromptOpen(false);
            }
        });
        setIsPasswordPromptOpen(true);
    };

    const handleTriggerImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                alert("Falha ao ler o arquivo.");
                return;
            }
            
            setFileContentToImport(text);
            setPasswordPromptConfig({
                title: 'Informar Senha do Arquivo',
                onConfirm: (password) => {
                    if (!password) {
                        alert('Por favor, insira a senha.');
                        return;
                    }
                    try {
                        const decryptedData = decryptData(text, password);
                        if (!decryptedData) {
                            alert('Senha incorreta ou arquivo corrompido.');
                            setIsPasswordPromptOpen(false);
                            return;
                        }

                        const importedLibraries = JSON.parse(decryptedData);

                        if (!Array.isArray(importedLibraries) || (importedLibraries.length > 0 && (typeof importedLibraries[0].id !== 'string' || typeof importedLibraries[0].name !== 'string' || !Array.isArray(importedLibraries[0].files)))) {
                           throw new Error("O arquivo não parece ser um arquivo de bibliotecas válido.");
                        }
                        
                        onShowConfirmation(
                            'Confirmar Importação',
                            'Isso substituirá todas as suas bibliotecas atuais. Deseja continuar?',
                            () => {
                                onImportLibraries(importedLibraries);
                                alert(`${importedLibraries.length} biblioteca(s) importada(s) com sucesso!`);
                            },
                            { confirmText: 'Continuar', color: 'bg-sky-600 hover:bg-sky-700' }
                        );
                    } catch (error) {
                        console.error("Erro ao importar arquivo:", error);
                        alert(`Falha ao importar. O arquivo pode estar corrompido ou não é um arquivo de bibliotecas válido. Erro: ${(error as Error).message}`);
                    } finally {
                        setIsPasswordPromptOpen(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        setFileContentToImport(null);
                    }
                }
            });
            setIsPasswordPromptOpen(true);
        };
        reader.readAsText(file);
    };

    const closePasswordPrompt = () => {
        setIsPasswordPromptOpen(false);
        setFileContentToImport(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

  return (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentView === 'list' ? 'Gerenciar Bibliotecas' : ('id' in editingLibrary ? 'Editar Biblioteca' : 'Nova Biblioteca')}
            </h2>
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fechar">
                <XMarkIcon className="w-6 h-6" />
            </button>
            </header>

            <main className="p-6 overflow-y-auto">
            {currentView === 'list' ? (
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={handleAddNew} className="flex-grow sm:flex-grow-0 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-colors">
                            Criar Nova Biblioteca
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 flex-grow sm:flex-grow-0 px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50" disabled={libraries.length === 0}>
                            <ArrowUpTrayIcon className="w-5 h-5" />
                            Exportar (Criptografado)
                        </button>
                        <button onClick={handleTriggerImport} className="flex items-center gap-2 flex-grow sm:flex-grow-0 px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700 transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Importar
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json,.enc,application/json,text/plain"
                            className="hidden"
                        />
                    </div>
                <ul className="space-y-2">
                    {libraries.length > 0 ? libraries.map(lib => (
                    <li key={lib.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{lib.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{lib.files.length} arquivo(s)</p>
                        </div>
                        <div className="flex gap-2">
                        <button onClick={() => handleEdit(lib)} className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-500">Editar</button>
                        <button onClick={() => onDeleteLibrary(lib.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md" aria-label={`Excluir ${lib.name}`}>
                            <TrashIcon className="w-5 h-5" />
                        </button>
                        </div>
                    </li>
                    )) : <p className="text-slate-500 dark:text-slate-400">Nenhuma biblioteca criada ainda.</p>}
                </ul>
                </div>
            ) : (
                <div className="space-y-4">
                <div>
                    <label htmlFor="lib-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Biblioteca</label>
                    <input
                    id="lib-name"
                    type="text"
                    value={editingLibrary.name}
                    onChange={(e) => setEditingLibrary(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Normas de Segurança XYZ"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                </div>
                <div>
                    <label htmlFor="file-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adicionar Link de Arquivo</label>
                    <div className="flex gap-2">
                    <input
                        id="file-url"
                        type="url"
                        value={fileUrlInput}
                        onChange={(e) => setFileUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/documento.txt"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
                    />
                    <button onClick={handleAddFile} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700 whitespace-nowrap">Adicionar</button>
                    </div>
                </div>
                <div>
                    <h4 className="text-md font-semibold text-slate-600 dark:text-slate-300 mb-2">Arquivos na Biblioteca:</h4>
                    <ul className="space-y-2 max-h-60 overflow-y-auto border dark:border-slate-700 rounded-md p-2 bg-slate-50 dark:bg-slate-900/50">
                        {editingLibrary.files.length > 0 ? editingLibrary.files.map(file => (
                            <li key={file.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded">
                                <span className="text-sm text-slate-800 dark:text-slate-200 truncate" title={file.url}>{file.url}</span>
                                <button onClick={() => handleRemoveFile(file.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full" aria-label={`Remover ${file.url}`}>
                                    <XMarkIcon className="w-4 h-4"/>
                                </button>
                            </li>
                        )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center p-2">Nenhum arquivo adicionado.</p>}
                    </ul>
                </div>
                </div>
            )}
            </main>

            <footer className="flex justify-end items-center p-4 border-t dark:border-slate-700 gap-3">
            {currentView === 'form' && (
                <button onClick={handleBackToList} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                Voltar
                </button>
            )}
            <button onClick={currentView === 'form' ? handleSave : onClose} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700">
                {currentView === 'form' ? 'Salvar' : 'Fechar'}
            </button>
            </footer>
        </div>
        </div>
        <PasswordPrompt
            isOpen={isPasswordPromptOpen}
            title={passwordPromptConfig.title}
            onConfirm={passwordPromptConfig.onConfirm}
            onCancel={closePasswordPrompt}
        />
        <PromptDialog
            isOpen={isPromptOpen}
            message={promptConfig.message}
            onConfirm={promptConfig.onConfirm}
            onCancel={promptConfig.onCancel}
        />
    </>
  );
};