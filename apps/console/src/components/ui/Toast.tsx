"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircleIcon, XIcon } from "@/components/icons/hugeicons";

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  const showToast = useCallback((message: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToastMessage(message);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setToastMessage(null);
    }, 3200);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-zinc-900 text-zinc-50 border border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.18)] px-4 py-2.5 rounded-md text-xs font-heading font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircleIcon size={15} className="text-emerald-400 shrink-0" />
          <span className="tracking-tight">{toastMessage}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="ml-1.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
