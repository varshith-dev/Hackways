"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import form from "@/components/forms/CreationForm.module.css";

export default function ConsoleStartPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login?redirect=%2Fconsole%2Fstart");
      return;
    }
    // Console already enabled — never show the opt-in screen again.
    if (user.role === "organizer" || user.role === "admin") {
      router.replace("/console");
    }
  }, [isLoading, user, router]);

  async function enableConsole() {
    setError("");
    setIsEnabling(true);
    try {
      const res = await fetch("/api/v1/users/me/organizer", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't enable the console. Please try again.");
      await refreshUser();
      router.push("/console");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't enable the console. Please try again.");
      setIsEnabling(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className={form.page}>
        <AppHeader />
        <main className={form.main}><PageSkeleton rows={2} /></main>
      </div>
    );
  }

  return (
    <div className={form.page}>
      <AppHeader />
      <main className={form.main}>
        <header className={form.heading}>
          <h1>Host on Hackways</h1>
          <p>
            The console is where you manage events, communities, attendees, and sales. Enable it
            once and it stays on for your account — no need to create something first.
          </p>
        </header>

        {error && (
          <p role="alert" className="mb-6 border-l-2 border-red-600 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className={form.actions} style={{ justifyContent: "flex-start" }}>
          <button type="button" className={form.submit} onClick={enableConsole} disabled={isEnabling}>
            {isEnabling ? "Enabling…" : "Enable the console"}
            <ArrowRight size={15} />
          </button>
          <Link href="/home" className={form.cancel}>
            Not now
          </Link>
        </div>
      </main>
    </div>
  );
}
