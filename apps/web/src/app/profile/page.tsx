"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  LoaderCircle,
  Pencil,
  Ticket,
  Users,
  X,
  ExternalLink,
  Shield,
  Clock,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { getChannels, getUserTickets, UserTicket, cancelRSVP } from "@/lib/api";
import { Channel } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

const ROLE_LABELS = { organizer: "Organizer", attendee: "Attendee", admin: "Administrator" } as const;

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"passes" | "profile" | "communities">("passes");
  const [passFilter, setPassFilter] = useState<"all" | "active" | "blocked" | "cancelled">("all");

  const [communities, setCommunities] = useState<Channel[]>([]);
  const [tickets, setTickets] = useState<UserTicket[]>([]);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Avatar upload
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTickets(user ? getUserTickets(user.email) : []);
    getChannels().then(setCommunities).catch(() => setCommunities([]));
    const handler = () => setTickets(user ? getUserTickets(user.email) : []);
    window.addEventListener("hackways_tickets_updated", handler);
    return () => window.removeEventListener("hackways_tickets_updated", handler);
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("Avatar image must be smaller than 10MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/v1/uploads", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload image.");
      }

      const avatarUrl = uploadData.url;

      const patchRes = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!patchRes.ok) {
        throw new Error("Failed to save avatar to profile.");
      }

      await refreshUser();
      showToast("Profile avatar updated successfully.");
    } catch (err: any) {
      showToast(err?.message || "Failed to upload avatar. Try again.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || savingName) return;
    setSavingName(true);
    setNameError("");
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(typeof data.error === "string" ? data.error : "Your name couldn't be saved.");
        return;
      }
      await refreshUser();
      setEditingName(false);
      showToast("Name updated.");
    } catch {
      setNameError("Network error. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  const handleCancelTicket = async (e: React.MouseEvent, ticketCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await cancelRSVP(ticketCode, user?.email);
      setTickets(user ? getUserTickets(user.email) : []);
      showToast("Cancellation requested. Your pass is now blocked pending host review.");
    } catch {
      showToast("Couldn't submit cancellation request. Try again.");
    }
  };

  const initials = (user?.name || "G").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const filteredTickets = tickets.filter((tkt) => {
    if (passFilter === "active") return tkt.status === "CONFIRMED" || tkt.status === "CHECKED_IN";
    if (passFilter === "blocked") return tkt.status === "BLOCKED";
    if (passFilter === "cancelled") return tkt.status === "CANCELLED";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-body text-zinc-900">
      <AppHeader eventNavigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {!user ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-bold font-heading text-zinc-950">Account Access</h1>
            <p className="text-xs text-zinc-500 font-body">Sign in to view your profile, manage passes, and explore your communities.</p>
            <Link
              href="/login?redirect=%2Fprofile"
              className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Top User Card */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                {/* Avatar with Upload Overlay */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 text-lg sm:text-xl font-bold font-heading">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer backdrop-blur-2xs"
                    aria-label="Upload profile picture"
                    title="Change profile avatar"
                  >
                    {isUploadingAvatar ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Camera size={16} />
                        <span className="text-[9px] font-semibold mt-0.5">Edit</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* User Identity Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold font-heading text-zinc-950">{user.name}</h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase tracking-wider">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-body">{user.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start sm:self-center">
                {(user.role === "organizer" || user.role === "admin") && (
                  <a
                    href="https://console.hackways.me/console"
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition active:scale-[0.98]"
                  >
                    <span>Console</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="h-9 px-4 rounded-xl text-xs font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition active:scale-[0.98]"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-px overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("passes")}
                className={`inline-flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap cursor-pointer ${
                  activeTab === "passes"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Ticket size={14} />
                <span>My Passes</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600">
                  {tickets.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`inline-flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap cursor-pointer ${
                  activeTab === "profile"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Shield size={14} />
                <span>Account & Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("communities")}
                className={`inline-flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap cursor-pointer ${
                  activeTab === "communities"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Users size={14} />
                <span>Communities</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600">
                  {communities.length}
                </span>
              </button>
            </div>

            {/* TAB 1: PASSES */}
            {activeTab === "passes" && (
              <div className="space-y-4">
                {/* Subfilter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {(["all", "active", "blocked", "cancelled"] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setPassFilter(filterKey)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition capitalize cursor-pointer whitespace-nowrap ${
                        passFilter === filterKey
                          ? "bg-zinc-950 text-white font-semibold"
                          : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {filterKey === "blocked" ? "Cancellation Pending" : filterKey}
                    </button>
                  ))}
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-12 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto">
                      <Ticket size={20} />
                    </div>
                    <p className="text-sm font-semibold font-heading text-zinc-950">No Passes Found</p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      {passFilter === "all"
                        ? "You have not registered for any events yet."
                        : `No passes match the "${passFilter}" status filter.`}
                    </p>
                    <Link
                      href="/home"
                      className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
                    >
                      Discover Events
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredTickets.map((tkt) => {
                      const isBlocked = tkt.status === "BLOCKED";
                      const isCancelled = tkt.status === "CANCELLED";
                      const isConfirmed = tkt.status === "CONFIRMED" || tkt.status === "CHECKED_IN";

                      return (
                        <div
                          key={tkt.id}
                          className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-300 transition"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/events/${encodeURIComponent(tkt.event_slug || tkt.event_id)}`}
                                className="font-heading font-bold text-sm sm:text-base text-zinc-950 hover:underline truncate"
                              >
                                {tkt.event_title}
                              </Link>
                              {isBlocked && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Cancellation Pending Review
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Confirmed Pass
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                                  Cancelled
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-500 font-body">
                              {[tkt.event_time_display || "Upcoming", tkt.event_city, tkt.tier_name, tkt.price_cents > 0 ? `₹${(tkt.price_cents / 100).toLocaleString()}` : "Free"]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>

                            <div className="pt-0.5 flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded">
                                {tkt.ticket_code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-start sm:self-center">
                            <Link
                              href={`/events/${encodeURIComponent(tkt.event_slug || tkt.event_id)}/rsvp`}
                              className="h-8.5 px-3.5 rounded-lg text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center justify-center"
                            >
                              View Pass
                            </Link>

                            {isConfirmed && (
                              <button
                                type="button"
                                onClick={(e) => handleCancelTicket(e, tkt.ticket_code)}
                                className="h-8.5 px-3 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 bg-white transition cursor-pointer"
                                title="Request cancellation"
                              >
                                Request Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROFILE & IDENTITY */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
                <div className="p-5 sm:p-6 space-y-4">
                  <h2 className="text-sm font-bold font-heading text-zinc-950">Identity & Personal Details</h2>

                  {/* Name Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-500 font-medium">Display Name</span>
                    {editingName ? (
                      <form onSubmit={saveName} className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setNameError("");
                          }}
                          maxLength={255}
                          autoFocus
                          disabled={savingName}
                          className="h-8 px-3 rounded-lg border border-zinc-300 focus:outline-none focus:border-zinc-900 text-xs font-medium"
                        />
                        <button
                          type="submit"
                          disabled={savingName || !name.trim()}
                          className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
                        >
                          {savingName ? <LoaderCircle size={14} className="animate-spin" /> : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(false);
                            setName(user.name);
                            setNameError("");
                          }}
                          className="h-8 px-2.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setName(user.name);
                            setEditingName(true);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 transition p-1"
                          title="Edit name"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {nameError && <p className="text-xs text-rose-600">{nameError}</p>}

                  {/* Email Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-2">
                    <span className="text-zinc-500 font-medium">Email Address</span>
                    <span className="font-mono text-zinc-900 font-semibold">{user.email}</span>
                  </div>

                  {/* Role Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-2">
                    <span className="text-zinc-500 font-medium">Account Role</span>
                    <span className="font-semibold text-zinc-900 capitalize">{ROLE_LABELS[user.role] || user.role}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COMMUNITIES */}
            {activeTab === "communities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold font-heading text-zinc-950">Joined Communities</h2>
                    <p className="text-xs text-zinc-500">Communities and channels you are subscribed to.</p>
                  </div>
                  <Link
                    href="/channels/create"
                    className="h-8.5 px-3.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition inline-flex items-center"
                  >
                    Launch Community
                  </Link>
                </div>

                {communities.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-12 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto">
                      <Users size={20} />
                    </div>
                    <p className="text-sm font-semibold font-heading text-zinc-950">No Communities Yet</p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Join community channels or start your own to gather event audiences.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {communities.map((comm) => (
                      <Link
                        key={comm.id}
                        href={`/channels/${comm.slug}`}
                        className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-4 flex items-center gap-3.5 hover:border-zinc-300 transition"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 font-bold shrink-0">
                          {comm.avatar_url ? (
                            <img src={comm.avatar_url} alt={comm.name} className="w-full h-full object-cover" />
                          ) : (
                            comm.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading font-bold text-sm text-zinc-950 truncate">{comm.name}</h3>
                          {comm.description && (
                            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{comm.description}</p>
                          )}
                        </div>
                        <ExternalLink size={14} className="text-zinc-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
