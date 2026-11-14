import { useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * Hook léger de gestion des messages de retour utilisateur (succès, erreur, avertissement).
 */
export function useToast(autoHideMs = 4000) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      setToast({
        id: `toast-${Date.now()}`,
        message,
        type,
      });
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, autoHideMs);
    },
    [autoHideMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    toast,
    showToast,
    dismissToast,
  };
}
