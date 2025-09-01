import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, KeyIcon } from './Icon';

interface PasswordPromptProps {
  isOpen: boolean;
  title: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({ isOpen, title, onConfirm, onCancel }) => {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      // Focus the input when the modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <KeyIcon className="w-6 h-6 text-yellow-500" />
              {title}
            </h2>
            <button type="button" onClick={onCancel} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fechar">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </header>
          <main className="p-6">
            <label htmlFor="password-prompt-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Senha
            </label>
            <input
              ref={inputRef}
              id="password-prompt-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </main>
          <footer className="flex justify-end items-center p-4 border-t dark:border-slate-700 gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-white font-semibold rounded-md transition-colors bg-sky-600 hover:bg-sky-700">
              Confirmar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};