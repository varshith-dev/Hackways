import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import "../mobile/mobile-console.css";

export default function MobileDedicatedLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50 md:bg-zinc-200/50 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-white md:shadow-2xl md:border-x md:border-zinc-200/80 flex flex-col">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
