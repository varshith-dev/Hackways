"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";
import { SearchIcon, ChevronRightIcon } from "@/components/icons/hugeicons";

interface FAQItem {
  id: string;
  category: "all" | "general" | "hosts" | "attendees";
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "1": true,
  });

  const faqs: FAQItem[] = [
    {
      id: "1",
      category: "general",
      question: "How does Hackways prevent overselling during flash drops?",
      answer:
        "Hackways uses atomic decrements in a dedicated Go core at the database layer. When thousands of people register at once, requests are processed in strict serialized sequence. Once capacity reaches zero, additional requests are automatically placed on the waitlist. Capacity can never drop below zero.",
    },
    {
      id: "2",
      category: "general",
      question: "How does real-time seat availability work?",
      answer:
        "A lightweight Server-Sent Events (SSE) connection pushes remaining ticket numbers directly to your browser the millisecond someone claims or releases a spot. You do not need to refresh the page.",
    },
    {
      id: "3",
      category: "attendees",
      question: "Do attendees need an account to claim a pass?",
      answer:
        "No. Attendees enter their name and email, and their ticket pass is issued immediately with a unique QR code saved directly to their browser.",
    },
    {
      id: "4",
      category: "attendees",
      question: "How do I retrieve a lost ticket pass?",
      answer:
        "Re-enter the email you registered with on the event drop page or explore directory, and your pass will be loaded instantly.",
    },
    {
      id: "5",
      category: "hosts",
      question: "How does gate check-in work on event day?",
      answer:
        "Hosts open the host console in any mobile or desktop browser to scan attendee QR passes using their device camera. Each ticket features a cryptographic signature to verify admission even with poor internet.",
    },
    {
      id: "6",
      category: "hosts",
      question: "Can I set up multiple ticket tiers with different caps?",
      answer:
        "Yes. You can add separate tiers (e.g. General, VIP, Speaker) with independent capacity limits, titles, and descriptions.",
    },
    {
      id: "7",
      category: "general",
      question: "Are free community events really free?",
      answer:
        "Yes. Hackways charges 0% platform fee and zero convenience charges for free events. We built Hackways to support hackathons and open developer gatherings.",
    },
    {
      id: "8",
      category: "hosts",
      question: "Can I export my attendee roster?",
      answer:
        "Yes. You can export clean CSV rosters of all confirmed attendees and waitlisted guests directly from your organizer console.",
    },
  ];

  const filtered = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PublicSiteLayout>
      <div className="py-20 sm:py-28 bg-white text-zinc-900">
        <div className="mx-auto max-w-2xl px-6">
          {/* Header with Halftone Help Asset */}
          <div className="mb-6">
            <img
              src="/help-png.png"
              alt="Help & FAQ"
              className="h-14 w-auto sm:h-16 object-contain select-none"
            />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Common questions about ticketing, capacity locks, and hosting on Hackways.
          </p>

          {/* Minimal Search Input */}
          <div className="mt-8 relative">
            <span className="absolute left-3.5 top-3 text-zinc-400">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Accordion list */}
          <div className="mt-10 divide-y divide-zinc-200/80 border-y border-zinc-200/80">
            {filtered.map((item) => {
              const isOpen = !!openIds[item.id];
              return (
                <div key={item.id} className="py-4">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <span className="text-sm sm:text-base font-semibold text-zinc-950">
                      {item.question}
                    </span>
                    <span
                      className={`text-zinc-400 transition-transform duration-150 shrink-0 ${
                        isOpen ? "rotate-90 text-zinc-950" : ""
                      }`}
                    >
                      <ChevronRightIcon size={16} />
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed pr-6">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center text-xs text-zinc-500">
            Still have questions?{" "}
            <Link href="/contact" className="text-zinc-900 underline font-medium">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}
