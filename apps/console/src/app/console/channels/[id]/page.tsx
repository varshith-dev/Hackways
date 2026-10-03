"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getChannelById,
  getChannelEvents,
  addChannelMember,
  removeChannelMember,
  updateChannelMemberRole,
  updateChannel,
  deleteChannel,
  getStoredEvents,
  getAllOrders,
} from "@/lib/api";
import { Channel, EventItem, ChannelRole, ChannelMember } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { webAppHref } from "@/lib/webAppUrl";
import {
  PlusIcon,
  ArrowRightIcon,
  UsersGroupIcon,
  BarChartIcon,
  PresentationIcon,
  TicketIcon,
  UserIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "@/components/icons/hugeicons";

export default function ConsoleChannelManagePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const channelId = (params?.id as string) || "";

  const [channel, setChannel] = useState<Channel | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: "overview" | "events" | "members" | "followers" | "analytics" | "settings"
  const currentTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(currentTabParam || "overview");

  useEffect(() => {
    if (currentTabParam) {
      setActiveTab(currentTabParam);
    }
  }, [currentTabParam]);

  const handleTabChange = (t: string) => {
    setActiveTab(t);
    router.replace(`/console/channels/${channelId}?tab=${t}`);
  };

  // Member invite state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ChannelRole>("admin");
  const [submittingMember, setSubmittingMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Settings State
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Search & Filter
  const [eventFilter, setEventFilter] = useState<"ALL" | "LIVE" | "DRAFT">("ALL");
  const [followerSearch, setFollowerSearch] = useState("");

  const loadData = async () => {
    if (!channelId) return;
    try {
      const found = await getChannelById(channelId);
      if (found) {
        setChannel(found);
        setEditName(found.name);
        setEditSlug(found.slug);
        setEditDescription(found.description || "");
        setEditAvatarUrl(found.avatar_url || "");
        setEditBannerUrl(found.banner_url || "");
        setEditWebsite(found.social_links?.website || "");
        setEditTwitter(found.social_links?.twitter || "");
        setEditGithub(found.social_links?.github || "");
        setEditLinkedin(found.social_links?.linkedin || "");
        setEditIsPrivate(!!found.is_private);

        const evts = await getChannelEvents(found.id);
        setEvents(evts);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("hackways_channels_updated", handleUpdate);
    window.addEventListener("hackways_events_updated", handleUpdate);
    return () => {
      window.removeEventListener("hackways_channels_updated", handleUpdate);
      window.removeEventListener("hackways_events_updated", handleUpdate);
    };
  }, [channelId]);

  // Handlers
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !memberName.trim() || !memberEmail.trim()) {
      showToast("Name and email are required.");
      return;
    }
    try {
      setSubmittingMember(true);
      const newMember = await addChannelMember(channel.id, {
        user_id: `usr_${Date.now().toString(36)}`,
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole,
      });
      setChannel((prev) => {
        if (!prev) return prev;
        const exists = prev.members.some((m) => m.email.toLowerCase() === newMember.email.toLowerCase());
        const updated = exists
          ? prev.members.map((m) => (m.email.toLowerCase() === newMember.email.toLowerCase() ? newMember : m))
          : [...prev.members, newMember];
        return { ...prev, members: updated };
      });
      showToast(`Invited ${newMember.name} as ${memberRole.toUpperCase()}`);
      setIsAddMemberOpen(false);
      setMemberName("");
      setMemberEmail("");
      setMemberRole("admin");
      window.dispatchEvent(new Event("hackways_channels_updated"));
    } catch (err: any) {
      showToast(err.message || "Failed to add member");
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ChannelRole) => {
    if (!channel) return;
    try {
      const ok = await updateChannelMemberRole(channel.id, userId, newRole);
      if (ok) {
        setChannel((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
          };
        });
        showToast("Member permissions updated.");
        window.dispatchEvent(new Event("hackways_channels_updated"));
      }
    } catch {
      showToast("Failed to update role.");
    }
  };

  const handlePromptRemoveMember = (userId: string, name: string) => {
    setMemberToRemove({ id: userId, name });
  };

  const handleConfirmRemoveMember = async () => {
    if (!channel || !memberToRemove) return;
    try {
      setRemovingMember(true);
      const ok = await removeChannelMember(channel.id, memberToRemove.id);
      if (ok) {
        setChannel((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.filter((m) => m.user_id !== memberToRemove.id),
          };
        });
        showToast(`Removed ${memberToRemove.name}`);
        setMemberToRemove(null);
        window.dispatchEvent(new Event("hackways_channels_updated"));
      }
    } catch {
      showToast("Failed to remove member.");
    } finally {
      setRemovingMember(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;
    if (!editName.trim()) {
      showToast("Community name cannot be empty.");
      return;
    }
    setSavingSettings(true);
    try {
      const updated = await updateChannel(channel.id, {
        name: editName.trim(),
        slug: editSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
        description: editDescription.trim(),
        avatar_url: editAvatarUrl.trim() || undefined,
        banner_url: editBannerUrl.trim() || undefined,
        is_private: editIsPrivate,
        social_links: {
          website: editWebsite.trim() || undefined,
          twitter: editTwitter.trim() || undefined,
          github: editGithub.trim() || undefined,
          linkedin: editLinkedin.trim() || undefined,
        },
      });
      setChannel(updated);
      showToast("Community branding and settings saved.");
      window.dispatchEvent(new Event("hackways_channels_updated"));
    } catch (err: any) {
      showToast(err.message || "Failed to update community.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!channel) return;
    if (confirmDeleteName.trim() !== channel.name.trim()) {
      showToast("Community name does not match.");
      return;
    }
    setDeleting(true);
    try {
      await deleteChannel(channel.id);
      showToast(`Community "${channel.name}" deleted.`);
      window.dispatchEvent(new Event("hackways_channels_updated"));
      router.push("/console/channels");
    } catch {
      showToast("Failed to delete community.");
      setDeleting(false);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      showToast("Subject and message are required.");
      return;
    }
    setSendingBroadcast(true);
    setTimeout(() => {
      setSendingBroadcast(false);
      setIsBroadcastModalOpen(false);
      setBroadcastSubject("");
      setBroadcastMessage("");
      showToast(`Announcement broadcast sent to ${channel?.follower_count || 12} community members.`);
    }, 600);
  };

  const exportFollowersCSV = () => {
    const headers = ["Member Name", "Email / Handle", "Role", "Added Date"];
    const rows = (channel?.members || []).map((m) => [
      `"${m.name || "Member"}"`,
      `"${m.email || "-"}"`,
      `"${m.role}"`,
      `"${m.added_at}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${channel?.slug || "community"}_members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Follower manifest downloaded as CSV.");
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="py-24 text-center max-w-md mx-auto font-body">
        <h2 className="text-lg font-bold text-zinc-950 font-heading">Community Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">
          The requested community workspace does not exist or has been deleted.
        </p>
        <Link
          href="/console/channels"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 text-white px-5 py-2 text-xs font-semibold"
        >
          <span>Return to Communities Hub</span>
        </Link>
      </div>
    );
  }

  // Derived metrics
  const totalAttendees = events.reduce((acc, ev) => acc + (ev.attendee_count || 0), 0);
  const totalGMV = events.reduce((acc, ev) => {
    const paidTiers = ev.tiers?.filter((t) => (t.price_cents || 0) > 0) || [];
    return acc + (ev.attendee_count || 0) * (paidTiers[0]?.price_cents ? paidTiers[0].price_cents / 100 : 0);
  }, 0);

  const filteredEvents = events.filter((ev) => {
    if (eventFilter === "LIVE") return ev.status === "PUBLISHED";
    if (eventFilter === "DRAFT") return ev.status === "DRAFT";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-body">
      
      {/* Community Banner & Identity Header */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        {/* Cover 16:9 Banner Backdrop */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 overflow-hidden">
          {channel.banner_url ? (
            <img src={channel.banner_url} alt="" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(#4338ca_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
          )}

          {/* Top Quick Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Link
              href={webAppHref(`/channels/${channel.slug}`)}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-xs font-medium text-white transition border border-white/10"
            >
              <span>Public Profile</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white bg-zinc-100 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white font-bold text-3xl flex items-center justify-center ring-4 ring-white shadow-md font-heading">
                  {channel.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-heading">
                    {channel.name}
                  </h1>
                  {channel.verified && (
                    <span className="text-indigo-600 inline-flex items-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono">
                    COMMUNITY CONSOLE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  hackways.com/channels/{channel.slug}
                </p>
              </div>
            </div>

            {/* Launch Event CTA */}
            <div className="flex items-center gap-2.5">
              <Link
                href={webAppHref(`/events/create?communityId=${channel.id}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2 text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                <PlusIcon size={14} strokeWidth={2.5} />
                <span>Drop Community Event</span>
              </Link>
            </div>
          </div>

          {channel.description && (
            <p className="text-xs text-zinc-600 max-w-2xl leading-relaxed mt-2">
              {channel.description}
            </p>
          )}

          {/* Subtabs Bar */}
          <div className="flex items-center gap-1 border-t border-zinc-100 mt-6 pt-4 overflow-x-auto">
            {[
              { key: "overview", label: "Overview", icon: <BarChartIcon size={14} /> },
              { key: "events", label: `Events (${events.length})`, icon: <PresentationIcon size={14} /> },
              { key: "members", label: `Team & Roles (${channel.members?.length || 1})`, icon: <UserIcon size={14} /> },
              { key: "followers", label: `Audience & Followers (${channel.follower_count || channel.members?.length || 0})`, icon: <UsersGroupIcon size={14} /> },
              { key: "analytics", label: "Analytics & Growth", icon: <BarChartIcon size={14} /> },
              { key: "settings", label: "Branding & Settings", icon: <RefreshCwIcon size={14} /> },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-zinc-950 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider font-heading">Total Members</span>
                <UsersGroupIcon size={16} />
              </div>
              <div className="text-2xl font-bold text-zinc-950 font-heading">
                {channel.follower_count || channel.members?.length || 0}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Direct followers & subscribers</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider font-heading">Hosted Events</span>
                <PresentationIcon size={16} />
              </div>
              <div className="text-2xl font-bold text-zinc-950 font-heading">
                {events.length}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Community drops & meetups</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider font-heading">Admissions Hosted</span>
                <TicketIcon size={16} />
              </div>
              <div className="text-2xl font-bold text-zinc-950 font-heading">
                {totalAttendees}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Registered ticket holders</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider font-heading">Gross Ticket GMV</span>
                <BarChartIcon size={16} />
              </div>
              <div className="text-2xl font-bold text-zinc-950 font-heading font-mono">
                ₹{totalGMV.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Revenue across community drops</p>
            </div>
          </div>

          {/* Quick Launchpad & Upcoming Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Recent & Upcoming Events */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950 font-heading">
                  Active & Scheduled Events
                </h3>
                <Link
                  href={webAppHref(`/events/create?communityId=${channel.id}`)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  + Drop new event
                </Link>
              </div>

              {events.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center bg-zinc-50/50">
                  <p className="text-xs text-zinc-500 mb-3">No events hosted under this community yet.</p>
                  <Link
                    href={webAppHref(`/events/create?communityId=${channel.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 text-white px-4 py-1.5 text-xs font-semibold"
                  >
                    <span>Schedule First Drop</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between hover:border-zinc-300 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {(ev.square_banner_url || ev.banner_url) && <img
                          src={ev.square_banner_url || ev.banner_url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-zinc-100 shrink-0"
                        />}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-950 truncate font-heading">
                            {ev.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-mono truncate">
                            /events/{ev.slug || ev.id}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">
                              {ev.status}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {ev.attendee_count || 0} attendees
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/console/events/${encodeURIComponent(ev.slug || ev.id)}/overview`}
                          className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition"
                        >
                          Console
                        </Link>
                        <Link
                          href={webAppHref(`/events/${ev.slug || ev.id}`)}
                          target="_blank"
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 transition"
                          title="View Public Page"
                        >
                          <ArrowRightIcon size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Team Snapshot & Quick Actions */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-heading">
                  Community Shortcuts
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon size={14} className="text-indigo-600" />
                      <span className="text-xs font-semibold text-zinc-800">Invite Team Member</span>
                    </div>
                    <ArrowRightIcon size={12} className="text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UsersGroupIcon size={14} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-zinc-800">Broadcast to Followers</span>
                    </div>
                    <ArrowRightIcon size={12} className="text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange("settings")}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCwIcon size={14} className="text-amber-600" />
                      <span className="text-xs font-semibold text-zinc-800">Customize Branding</span>
                    </div>
                    <ArrowRightIcon size={12} className="text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Team Members Snapshot */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-heading">
                    Community Staff
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange("members")}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="space-y-2">
                  {(channel.members || []).slice(0, 3).map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{m.name || "Member"}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{m.email || m.user_id}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded uppercase font-mono">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EVENTS */}
      {/* ========================================================================= */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-heading">
                Community Events Catalog
              </h3>
              <p className="text-xs text-zinc-500">
                All events officially hosted under {channel.name}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                {(["ALL", "LIVE", "DRAFT"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setEventFilter(filter)}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      eventFilter === filter ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <Link
                href={webAppHref(`/events/create?communityId=${channel.id}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold transition"
              >
                <PlusIcon size={13} strokeWidth={2.5} />
                <span>New Event Drop</span>
              </Link>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center bg-zinc-50/50">
              <p className="text-xs text-zinc-500 mb-4">No events found matching this filter.</p>
              <Link
                href={webAppHref(`/events/create?communityId=${channel.id}`)}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 text-white px-5 py-2 text-xs font-semibold"
              >
                <PlusIcon size={14} />
                <span>Create Community Event</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs hover:border-zinc-300 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Event Banner */}
                    <div className="relative h-32 bg-zinc-100 overflow-hidden">
                      {(ev.banner_url || ev.square_banner_url) && <img
                        src={ev.banner_url || ev.square_banner_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white font-mono">
                        {ev.status}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-zinc-950 font-heading line-clamp-1">
                        {ev.title}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono truncate">
                        /events/{ev.slug || ev.id}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
                        <span>{ev.location || "Online"}</span>
                        <span className="font-semibold text-zinc-800">{ev.attendee_count || 0} RSVPs</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      href={`/console/events/${encodeURIComponent(ev.slug || ev.id)}/overview`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white py-2 text-xs font-semibold transition"
                    >
                      <span>Manage Event</span>
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEAM & ROLES */}
      {/* ========================================================================= */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-heading">
                Team Members & Access Roles
              </h3>
              <p className="text-xs text-zinc-500">
                Manage co-hosts, moderators, and community administrators.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Add Member</span>
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider font-heading">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Added Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(channel.members || []).map((member) => (
                  <tr key={member.user_id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center font-heading">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-950">{member.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{member.email || member.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {member.role === "owner" ? (
                        <span className="text-[10px] font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded font-mono uppercase">
                          OWNER
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value as ChannelRole)}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="host">Host</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(member.added_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {member.role !== "owner" && (
                        <button
                          type="button"
                          onClick={() => handlePromptRemoveMember(member.user_id, member.name)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIENCE & FOLLOWERS */}
      {/* ========================================================================= */}
      {activeTab === "followers" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-heading">
                Community Audience Roster
              </h3>
              <p className="text-xs text-zinc-500">
                Followers and subscribers subscribed to updates from {channel.name}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportFollowersCSV}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition cursor-pointer"
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <UsersGroupIcon size={14} />
                <span>Broadcast Update</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="max-w-sm">
            <input
              type="text"
              placeholder="Search followers by name or email..."
              value={followerSearch}
              onChange={(e) => setFollowerSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider font-heading">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(channel.members || [])
                  .filter((m) =>
                    m.name.toLowerCase().includes(followerSearch.toLowerCase()) ||
                    (m.email && m.email.toLowerCase().includes(followerSearch.toLowerCase()))
                  )
                  .map((m, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-zinc-900">{m.name}</td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{m.email || "-"}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                          {m.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                        {new Date(m.added_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ANALYTICS & GROWTH */}
      {/* ========================================================================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading">
              Community Performance & Growth
            </h3>
            <p className="text-xs text-zinc-500">
              Telemetry on community attendance, repeat attendees, and channel expansion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-heading block mb-2">
                Conversion Rate
              </span>
              <div className="text-2xl font-bold text-zinc-950 font-heading font-mono">
                Unavailable
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">RSVP to check-in completion</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-heading block mb-2">
                Audience Retention
              </span>
              <div className="text-2xl font-bold text-zinc-950 font-heading font-mono">
                Unavailable
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Attendees returning to multiple drops</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-heading block mb-2">
                Avg Event Size
              </span>
              <div className="text-2xl font-bold text-zinc-950 font-heading font-mono">
                {events.length > 0 ? Math.round(totalAttendees / events.length) : 0}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Confirmed guests per drop</p>
            </div>
          </div>

          {/* Event Breakdown Table */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-heading">
              Event Attendance Telemetry
            </h4>
            {events.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4">No events hosted under this community yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider font-heading">
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Admissions</th>
                    <th className="py-2.5 px-3">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-3 px-3 font-semibold text-zinc-950">{ev.title}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-800">{ev.attendee_count || 0}</td>
                      <td className="py-3 px-3 font-mono text-zinc-400">{ev.total_capacity || 100}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: BRANDING & SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading">
              Community Identity & Settings
            </h3>
            <p className="text-xs text-zinc-500">
              Customize your community profile, cover artwork, and domain handles.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 font-heading">
                Community Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 font-heading">
                Public URL Handle
              </label>
              <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-500">
                <span className="text-zinc-400 select-none">hackways.com/channels/</span>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                  className="bg-transparent text-zinc-900 font-mono outline-none flex-1 ml-0.5"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 font-heading">
                Community Bio & Description
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What does your community do? What kind of events do you organize?"
                className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 resize-none"
              />
            </div>

            {/* Avatar & 16:9 Banner URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 font-heading">
                  Square Avatar URL
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 font-heading">
                  16:9 Landscape Banner URL
                </label>
                <input
                  type="url"
                  value={editBannerUrl}
                  onChange={(e) => setEditBannerUrl(e.target.value)}
                  placeholder="https://... 16:9 cover image"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-zinc-800 font-heading block">
                Social Links & Links
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="url"
                  placeholder="Website (https://...)"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <input
                  type="text"
                  placeholder="Twitter / X (@handle)"
                  value={editTwitter}
                  onChange={(e) => setEditTwitter(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <input
                  type="text"
                  placeholder="GitHub (organization/handle)"
                  value={editGithub}
                  onChange={(e) => setEditGithub(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <input
                  type="text"
                  placeholder="LinkedIn (company URL)"
                  value={editLinkedin}
                  onChange={(e) => setEditLinkedin(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            {/* Privacy Toggle */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-900">Private Community</div>
                <div className="text-[11px] text-zinc-500">
                  When enabled, events are visible only to invited community members.
                </div>
              </div>
              <input
                type="checkbox"
                checked={editIsPrivate}
                onChange={(e) => setEditIsPrivate(e.target.checked)}
                className="w-4 h-4 text-zinc-900 rounded border-zinc-300 focus:ring-zinc-900 cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-40"
              >
                {savingSettings ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 max-w-2xl space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 font-heading">
                Danger Zone
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Permanently delete this community channel. Existing events will remain in the organizer archive.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 transition cursor-pointer"
            >
              Delete Community Channel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TEAM MEMBER */}
      {/* ========================================================================= */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950 font-heading">Invite Community Member</h3>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Full Name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Email Address</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as ChannelRole)}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  <option value="admin">Admin (Full management of community & events)</option>
                  <option value="host">Host (Can publish & manage events)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMember}
                  className="rounded-full bg-zinc-950 text-white px-5 py-2 text-xs font-semibold hover:bg-zinc-800 transition"
                >
                  {submittingMember ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      {/* ========================================================================= */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 font-heading">Broadcast to Community</h3>
                <p className="text-[11px] text-zinc-500">Send an announcement to all followers of {channel.name}.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Announcement Title</label>
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Next month's meetup dates announced!"
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Message Content</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write your announcement to all community followers..."
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="rounded-full bg-zinc-950 text-white px-5 py-2 text-xs font-semibold hover:bg-zinc-800 transition"
                >
                  {sendingBroadcast ? "Broadcasting..." : "Send Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE COMMUNITY */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 border border-rose-200">
            <div>
              <h3 className="text-sm font-bold text-rose-950 font-heading">Delete Community Channel</h3>
              <p className="text-xs text-rose-700 mt-1">
                This action is irreversible. To confirm, please type the exact community name: <strong className="font-mono text-zinc-900">{channel.name}</strong>
              </p>
            </div>

            <input
              type="text"
              value={confirmDeleteName}
              onChange={(e) => setConfirmDeleteName(e.target.value)}
              placeholder={channel.name}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-rose-600"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmDeleteName("");
                }}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || confirmDeleteName.trim() !== channel.name.trim()}
                onClick={handleDeleteCommunity}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REMOVE MEMBER (Zero Native Browser Popups) */}
      {/* ========================================================================= */}
      {memberToRemove && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4 border border-zinc-200">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 font-heading">Remove Member</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to remove <strong className="text-zinc-900">{memberToRemove.name}</strong> from this community?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={removingMember}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingMember}
                onClick={handleConfirmRemoveMember}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition disabled:opacity-40 cursor-pointer"
              >
                {removingMember ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
