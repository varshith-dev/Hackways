"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircleIcon } from "@/components/icons/hugeicons";

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    const timer = setTimeout(() => {
      setToastMessage((curr) => (curr === message ? null : curr));
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-zinc-900 text-zinc-50 border border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.18)] px-4 py-2.5 rounded-md text-xs font-heading font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircleIcon size={15} className="text-emerald-400 shrink-0" />
          <span className="tracking-tight">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-zinc-400 hover:text-white p-0.5 text-[11px] transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
