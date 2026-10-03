"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateUsername } from "@/lib/userFormat";

const ROLE_LABELS: Record<string, string> = {
  attendee: "Attendee",
  organizer: "Organizer",
  admin: "Admin",
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isLoading, logout, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?redirect=%2Fsettings%2Faccount");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username || "");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Full name cannot be empty.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUsername) {
      setError("Username cannot be empty.");
      return;
    }

    const valResult = validateUsername(cleanUsername);
    if (!valResult.valid) {
      setError(valResult.error || "Invalid username format.");
      return;
    }

    setError("");
    setSaved(false);
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, username: cleanUsername }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't update your account.");
        return;
      }
      await refreshUser();
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <AppHeader />
        <main className="mx-auto w-full max-w-xl px-6 py-16">
          <PageSkeleton rows={3} />
        </main>
      </div>
    );
  }

  const currentCleanUser = (user.username || "").toLowerCase().replace(/^@/, "");
  const inputCleanUser = username.trim().toLowerCase().replace(/^@/, "");
  const isUnchanged = name.trim() === user.name && inputCleanUser === currentCleanUser;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Account settings
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Manage your organizer handle, display name, and profile details.
        </p>

        <form onSubmit={handleSave} className="mt-10 space-y-6 border-t border-zinc-200 pt-8">
          <div>
            <label htmlFor="account-username" className="text-xs font-semibold text-zinc-700 block mb-1.5">
              Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-0 text-sm font-semibold text-zinc-400 select-none">@</span>
              <input
                id="account-username"
                type="text"
                required
                maxLength={30}
                value={username.replace(/^@/, "")}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                className="w-full border-b border-zinc-200 bg-transparent pl-4 pr-0 py-2.5 text-sm font-mono text-zinc-900 focus:border-zinc-900 focus:outline-none transition"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">
              Your unique handle on Hackways. Auto-allotted and displayed on your events and dashboard.
            </p>
          </div>

          <div>
            <label htmlFor="account-name" className="text-xs font-semibold text-zinc-700 block mb-1.5">
              Full name
            </label>
            <input
              id="account-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-b border-zinc-200 bg-transparent px-0 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Email address</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full border-b border-zinc-200 bg-transparent px-0 py-2.5 text-sm text-zinc-500"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">Changing your email isn&apos;t supported yet.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1.5">Role</label>
            <p className="text-sm text-zinc-700">{ROLE_LABELS[user.role] || user.role}</p>
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-red-600 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}
          {saved && !error && (
            <p role="status" className="border-l-2 border-green-600 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
              Saved.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || isUnchanged}
            className="rounded-full bg-zinc-950 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-8">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Sign out</h2>
            <p className="mt-1 text-xs text-zinc-500">End your session on this device.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-zinc-300 px-5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
          >
            Sign out
          </button>
        </div>

        <Link href="/home" className="mt-8 inline-block text-xs font-medium text-zinc-500 hover:text-zinc-950 transition">
          ← Back to Discover
        </Link>
      </main>
    </div>
  );
}
