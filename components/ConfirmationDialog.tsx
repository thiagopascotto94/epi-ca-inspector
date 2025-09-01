import React from 'react';
import { ExclamationCircleIcon, XMarkIcon } from './Icon';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  confirmButtonColor = 'bg-red-600 hover:bg-red-700',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ExclamationCircleIcon className="w-6 h-6 text-yellow-500" />
            {title}
          </h2>
          <button onClick={onCancel} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fechar">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6">
          <p className="text-slate-600 dark:text-slate-300">{message}</p>
        </main>
        <footer className="flex justify-end items-center p-4 border-t dark:border-slate-700 gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
          <button onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
            {cancelButtonText}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white font-semibold rounded-md transition-colors ${confirmButtonColor}`}>
            {confirmButtonText}
          </button>
        </footer>
      </div>
    </div>
  );
};