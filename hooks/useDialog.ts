import { useState } from 'react';

interface DialogState {
  isOpen: boolean;
  message: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const prompt = (message: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        message,
        onConfirm: (value: string) => {
          setDialogState(null);
          resolve(value);
        },
        onCancel: () => {
          setDialogState(null);
          resolve(null);
        },
      });
    });
  };

  return { dialogState, prompt };
};
