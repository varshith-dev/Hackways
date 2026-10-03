"use client";

import React, { useState } from "react";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";

const CONTACT_EMAIL = "team@hackways.io";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setError("");
    setIsSending(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't send your message. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PublicSiteLayout>
      <div className="py-20 sm:py-28 bg-white text-zinc-900">
        <div className="mx-auto max-w-xl px-6">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Contact
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Have a question about a drop or hosting an event? Reach out directly.
          </p>

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <div className="text-xs text-zinc-500 mb-6">
              You can also email us directly at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-zinc-950 underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </div>

            {submitted ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
                <h2 className="font-heading text-base font-bold text-zinc-950">
                  Message sent
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Thanks for reaching out. We&apos;ll get back to you at <strong>{email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setEmail("");
                    setMessage("");
                    setSubmitted(false);
                  }}
                  className="mt-4 rounded-full bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-medium text-zinc-900 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-900 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-900 mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you need..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-red-700">
                    {error}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-full bg-zinc-950 px-6 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    {isSending ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}
