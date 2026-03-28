'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

interface ToastContextType {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside Toaster');
  return ctx;
}

// Global toast function for use outside React tree
let globalToast: ToastContextType['toast'] | null = null;
export function toast(t: Omit<Toast, 'id'>) {
  globalToast?.(t);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set global reference
  globalToast = addToast;

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, dismiss }}>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up rounded-xl px-4 py-3 shadow-warm-lg border ${
              t.variant === 'error'
                ? 'bg-error/10 border-error/30 text-error'
                : t.variant === 'success'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-surface border-border text-text'
            }`}
            onClick={() => dismiss(t.id)}
          >
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="text-xs mt-1 opacity-80">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
