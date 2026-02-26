'use client';

import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

let toastListeners: Array<(toast: Toast) => void> = [];
let toastId = 0;

export function toast(opts: { title: string; description?: string; variant?: ToastVariant }) {
  const t: Toast = {
    id: String(++toastId),
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? 'default',
  };
  toastListeners.forEach((fn) => fn(t));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  const subscribe = useCallback(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, subscribe, dismiss };
}
