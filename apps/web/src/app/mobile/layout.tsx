import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import EventViewportBoundary from "./_components/EventViewportBoundary";
import "./mobile-console.css";

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <EventViewportBoundary mobile>
      <ToastProvider>{children}</ToastProvider>
    </EventViewportBoundary>
  );
}
