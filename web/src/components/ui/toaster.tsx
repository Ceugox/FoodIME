'use client';

import { useEffect } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { useToast, type ToastVariant } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-white border-gray-200 text-gray-900',
  success: 'bg-green-50 border-green-300 text-green-900',
  error: 'bg-red-50 border-red-300 text-red-900',
};

export function Toaster() {
  const { toasts, subscribe, dismiss } = useToast();

  useEffect(() => subscribe(), [subscribe]);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          className={cn(
            'rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-right-full',
            variantStyles[t.variant],
          )}
        >
          <div className="flex-1">
            <ToastPrimitive.Title className="font-semibold text-sm">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs mt-1 opacity-80">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="shrink-0 mt-0.5">
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]" />
    </ToastPrimitive.Provider>
  );
}
