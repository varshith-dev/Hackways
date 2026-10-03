"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, LoaderCircle, Pencil, Ticket, Users, X } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { getChannels, getUserTickets, UserTicket, cancelRSVP } from "@/lib/api";
import { Channel } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import form from "@/components/forms/CreationForm.module.css";
import styles from "./profile.module.css";

const ROLE_LABELS = { organizer: "Organizer", attendee: "Attendee", admin: "Admin" } as const;

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [communities, setCommunities] = useState<Channel[]>([]);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTickets(user ? getUserTickets(user.email) : []);
    getChannels().then(setCommunities).catch(() => setCommunities([]));
    const handler = () => setTickets(user ? getUserTickets(user.email) : []);
    window.addEventListener("hackways_tickets_updated", handler);
    return () => window.removeEventListener("hackways_tickets_updated", handler);
  }, [user]);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
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
      setSaving(false);
    }
  }

  const handleCancelTicket = async (e: React.MouseEvent, ticketCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await cancelRSVP(ticketCode, user?.email);
      setTickets(user ? getUserTickets(user.email) : []);
      showToast("Pass cancelled.");
    } catch {
      showToast("Couldn't cancel this pass. Try again.");
    }
  };

  const initials = (user?.name || "G").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={form.main}>
        <header className={form.heading}>
          <h1>Account</h1>
          <p>Your profile, passes, and communities.</p>
        </header>

        {!user ? (
          <section className={styles.empty} aria-label="Sign in">
            <p>Sign in to view your account, passes, and communities.</p>
            <Link href="/login?redirect=%2Fprofile" className={form.submit}>Sign in</Link>
          </section>
        ) : (
        <>
        {/* Identity */}
        <section className={styles.identity} aria-label="Profile">
          <div className={styles.avatar} aria-hidden="true">{initials}</div>
          <div className={styles.identityText}>
            <p className={styles.identityName}>{user.name}</p>
            <p className={styles.identityMeta}>{user.email}{` · ${ROLE_LABELS[user.role]}`}</p>
          </div>
          <button type="button" onClick={logout} className={styles.signOut}>Sign out</button>
        </section>

        {/* Account settings */}
        <section className={styles.section} aria-label="Account settings">
          <h2 className={styles.sectionTitle}>Settings</h2>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Name</span>
              {editingName ? (
                <form onSubmit={saveName} className={styles.nameForm}>
                  <label htmlFor="profile-name" className="sr-only">Your name</label>
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    maxLength={255}
                    autoFocus
                    disabled={saving}
                  />
                  <button type="submit" className={styles.iconAction} disabled={saving || !name.trim()} aria-label="Save name">
                    {saving ? <LoaderCircle size={15} className={form.spinner} /> : <Check size={15} />}
                  </button>
                  <button type="button" className={styles.iconAction} onClick={() => { setEditingName(false); setName(user?.name || ""); setNameError(""); }} aria-label="Cancel">
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <span className={styles.rowValue}>{user?.name}</span>
              )}
            </div>
            {!editingName && user && (
              <button type="button" className={styles.iconAction} onClick={() => { setName(user.name); setEditingName(true); }} aria-label="Edit name">
                <Pencil size={14} />
              </button>
            )}
          </div>
          {nameError && <p role="alert" className={form.error}>{nameError}</p>}
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{user?.email}</span>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Account type</span>
              <span className={styles.rowValue}>{user ? ROLE_LABELS[user.role] : "—"}</span>
            </div>
          </div>
        </section>

        {/* Passes */}
        <section className={styles.section} aria-label="Your passes">
          <h2 className={styles.sectionTitle}>Passes<span>{tickets.length}</span></h2>
          {tickets.length === 0 ? (
            <div className={styles.empty}>
              <Ticket size={22} strokeWidth={1.5} aria-hidden="true" />
              <p>No passes yet.</p>
              <Link href="/home" className={form.submit}>Discover events</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {tickets.map((tkt) => (
                <li key={tkt.id} className={styles.listRow}>
                  <Link href={`/events/${tkt.event_id}`} className={styles.listMain}>
                    <span className={styles.listTitle}>{tkt.event_title}</span>
                    <span className={styles.listMeta}>
                      {[tkt.event_time_display || "Upcoming", tkt.event_city, tkt.tier_name, tkt.price_cents > 0 ? `₹${(tkt.price_cents / 100).toLocaleString()}` : "Free"]
                        .filter(Boolean).join(" · ")}
                    </span>
                    <span className={styles.listCode}>{tkt.ticket_code}</span>
                  </Link>
                  <div className={styles.listActions}>
                    <span className={styles.status} data-tone={tkt.status.toLowerCase()}>
                      {tkt.status === "CHECKED_IN" ? "Checked in" : tkt.status === "CONFIRMED" ? "Confirmed" : tkt.status === "CANCELLED" ? "Cancelled" : tkt.status}
                    </span>
                    {tkt.status !== "CANCELLED" && (
                      <button type="button" onClick={(e) => handleCancelTicket(e, tkt.ticket_code)} className={styles.textAction}>
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Communities */}
        <section className={styles.section} aria-label="Your communities">
          <h2 className={styles.sectionTitle}>Communities<span>{communities.length}</span></h2>
          {communities.length === 0 ? (
            <div className={styles.empty}>
              <Users size={22} strokeWidth={1.5} aria-hidden="true" />
              <p>No communities yet.</p>
              <Link href="/channels/create" className={styles.textAction}>Create one</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {communities.map((comm) => (
                <li key={comm.id}>
                  <Link href={`/channels/${comm.slug}`} className={styles.communityRow}>
                    <span className={styles.communityAvatar} aria-hidden="true">
                      {comm.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={comm.avatar_url} alt="" />
                        : comm.name.charAt(0).toUpperCase()}
                    </span>
                    <span className={styles.listMain}>
                      <span className={styles.listTitle}>{comm.name}</span>
                      {comm.description && <span className={styles.listMeta}>{comm.description}</span>}
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" className={styles.rowArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}
      </main>
    </div>
  );
}
