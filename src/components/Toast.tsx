import React, { useEffect } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastData; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start justify-between gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        isSuccess
          ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
          : isError
          ? 'bg-rose-950/90 text-rose-100 border-rose-500/40'
          : 'bg-zinc-900/90 text-zinc-100 border-zinc-700/80'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <p className="text-xs font-medium leading-relaxed break-words">{toast.message}</p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-zinc-400 hover:text-white transition-colors shrink-0 p-0.5 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

