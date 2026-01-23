import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    setLoading(false);

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setLoading(true);
    resolvePromise?.(true);
    // Don't close immediately - let the caller close after async action
  }, [resolvePromise]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
    resolvePromise?.(false);
  }, [resolvePromise]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
  }, []);

  return {
    isOpen,
    loading,
    options,
    confirm,
    handleConfirm,
    handleClose,
    closeDialog,
  };
}
