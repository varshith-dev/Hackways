"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-shell/AppHeader";
import {
  getChannelBySlug,
  getChannelEvents,
  toggleChannelFollow,
  isChannelFollowed,
} from "@/lib/api";
import { Channel, EventItem, ChannelMember } from "@/lib/types";
import {
  CalendarIcon,
  MapPinIcon,
  UsersGroupIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  PresentationIcon,
  CheckCircleIcon,
} from "@/components/icons/hugeicons";

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";

  const [community, setCommunity] = useState<Channel | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "team" | "about">("events");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const found = await getChannelBySlug(slug);
        if (found) {
          setCommunity(found);
          setFollowerCount(found.follower_count);
          setIsFollowing(isChannelFollowed(found.id));
          const channelEvents = await getChannelEvents(found.id);
          setEvents(channelEvents);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleFollowToggle = async () => {
    if (!community) return;
    const res = await toggleChannelFollow(community.id);
    setIsFollowing(res.following);
    setFollowerCount(res.count);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
        <AppHeader theme="light" />
        <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
          Loading community details...
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
        <AppHeader theme="light" />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <h1 className="text-2xl font-bold text-zinc-900">Community not found</h1>
          <p className="text-sm text-zinc-600 max-w-md">
            The community you are looking for might have been moved or doesn't exist yet.
          </p>
          <Link
            href="/channels"
            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition"
          >
            Browse all communities
          </Link>
        </main>
      </div>
    );
  }

  const owner = community.members.find((m) => m.role === "owner") || {
    user_id: community.owner_id,
    name: community.owner_name,
    email: "",
    role: "owner" as const,
    added_at: community.created_at,
    avatar_url: community.avatar_url,
  };
  const admins = community.members.filter((m) => m.role === "admin");
  const hosts = community.members.filter((m) => m.role === "host");

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans">
      <AppHeader theme="light" />

      {/* Community Header Banner: Clean artwork without floating badges */}
      <div className="relative h-56 sm:h-64 md:h-72 w-full bg-zinc-950 overflow-hidden">
        {community.banner_url ? (
          <img
            src={community.banner_url}
            alt={community.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 sm:px-10 pb-20">
        {/* Profile / Community Identity Header */}
        <div className="relative -mt-14 sm:-mt-18 mb-10">
          {/* Row 1: Avatar on left, Action buttons on right */}
          <div className="flex items-end justify-between gap-4">
            {/* Avatar Container with crisp white boundary */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl p-1 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
                {community.avatar_url ? (
                  <img
                    src={community.avatar_url}
                    alt={community.name}
                    className="w-full h-full rounded-[20px] sm:rounded-[22px] object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-[20px] sm:rounded-[22px] bg-zinc-100 flex items-center justify-center text-3xl sm:text-4xl font-bold text-zinc-400 select-none">
                    {community.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {community.verified && (
                <span
                  className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-zinc-950 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 border-white shadow-xs"
                  title="Verified Community"
                >
                  ✓
                </span>
              )}
            </div>

            {/* Action Buttons: Join Community, Manage, Share */}
            <div className="flex items-center gap-2.5 pb-1">
              <button
                onClick={handleFollowToggle}
                className={`h-10 px-5 sm:px-6 rounded-full text-xs font-semibold transition active:scale-[0.98] ${
                  isFollowing
                    ? "bg-zinc-100 text-zinc-800 border border-zinc-300 hover:bg-zinc-200"
                    : "bg-zinc-950 text-white hover:bg-zinc-800 shadow-xs"
                }`}
              >
                {isFollowing ? "Joined" : "Join Community"}
              </button>

              <Link
                href={`/console/channels/${community.id}`}
                className="h-10 px-4 sm:px-5 rounded-full text-xs font-semibold bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950 transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Manage</span>
              </Link>

              <button
                onClick={handleShare}
                className="h-10 w-10 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition flex items-center justify-center shadow-xs relative"
                aria-label="Share Community"
                title="Copy community link"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>

              {copiedToast && (
                <div className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs shadow-lg animate-in fade-in duration-200 z-30">
                  Link copied to clipboard
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Title & Details - 100% in light canvas, zero banner collision */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-950 font-heading tracking-tight">
                {community.name}
              </h1>
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
              <span>
                Organized by <strong className="text-zinc-900 font-semibold">{community.owner_name}</strong>
              </span>
              <span className="text-zinc-300">•</span>
              <span>
                <strong className="text-zinc-900 font-semibold">{followerCount.toLocaleString()}</strong> members
              </span>
              <span className="text-zinc-300">•</span>
              <span>
                <strong className="text-zinc-900 font-semibold">{events.length}</strong> {events.length === 1 ? "event" : "events"}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-zinc-700 leading-relaxed max-w-3xl pt-1">
              {community.description}
            </p>

            {/* Social Links styled as modern minimal interactive badges */}
            {community.social_links && (
              <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                {community.social_links.website && (
                  <a
                    href={community.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 transition shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>Website</span>
                  </a>
                )}
                {community.social_links.twitter && (
                  <a
                    href={community.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 transition shadow-2xs"
                  >
                    <span className="font-semibold text-xs leading-none">𝕏</span>
                    <span>X</span>
                  </a>
                )}
                {community.social_links.github && (
                  <a
                    href={community.social_links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 transition shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                )}
                {community.social_links.linkedin && (
                  <a
                    href={community.social_links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 transition shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-200 mb-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab("events")}
              className={`pb-4 text-sm font-semibold transition relative ${
                activeTab === "events"
                  ? "text-zinc-950 border-b-2 border-zinc-950"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`pb-4 text-sm font-semibold transition relative ${
                activeTab === "team"
                  ? "text-zinc-950 border-b-2 border-zinc-950"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Community Team ({community.members.length})
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`pb-4 text-sm font-semibold transition relative ${
                activeTab === "about"
                  ? "text-zinc-950 border-b-2 border-zinc-950"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              About Community
            </button>
          </nav>
        </div>

        {/* TAB 1: EVENTS */}
        {activeTab === "events" && (
          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200 p-8 space-y-3">
                <CalendarIcon size={32} className="mx-auto text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900">No events published yet</p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  This community hasn't scheduled any upcoming events. Stay tuned by joining!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((evt) => {
                  const isSoldOut = evt.status === "SOLD_OUT";
                  return (
                    <div
                      key={evt.id}
                      className="group bg-white rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      {/* Event Banner: Clean Artwork - Strictly ZERO floating badges over image */}
                      <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                        {evt.banner_url ? (
                          <img
                            src={evt.banner_url}
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900" />
                        )}
                      </div>

                      {/* Event Body with Status & Metadata cleanly placed in content */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          {/* Top Meta Line: Time & Status tag */}
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                              <CalendarIcon size={13} />
                              <span>{evt.time_display || "Upcoming"}</span>
                            </div>

                            {/* Clean native status tags in content area */}
                            {isSoldOut ? (
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                                Waiting list
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-900/[0.04] text-zinc-800 border border-zinc-200/80">
                                Registration Open
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-zinc-950 group-hover:text-zinc-700 transition-colors leading-snug">
                            {evt.title}
                          </h3>

                          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <MapPinIcon size={14} />
                            <span>{evt.city || evt.location || "Online"}</span>
                          </div>

                          <Link
                            href={`/events/${evt.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 hover:text-zinc-700 transition"
                          >
                            <span>Event Details</span>
                            <ArrowRightIcon size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM & ORGANIZERS */}
        {activeTab === "team" && (
          <div className="space-y-8">
            {/* Roles Description Bar */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 space-y-3">
              <h3 className="text-sm font-bold text-zinc-900">Community Hierarchy & Organizers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                  <span className="font-semibold text-zinc-900 block">Community Lead</span>
                  <p>Full control over community branding, events, finance, and organizers.</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                  <span className="font-semibold text-zinc-900 block">Community Organizers</span>
                  <p>Can create and manage all events under this community and review RSVPs.</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                  <span className="font-semibold text-zinc-900 block">Event Hosts</span>
                  <p>Scoped co-hosts assigned to manage specific individual event sessions.</p>
                </div>
              </div>
            </div>

            {/* Owner Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Community Lead
              </h4>
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={owner.avatar_url || community.avatar_url}
                    alt={owner.name}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-200"
                  />
                  <div>
                    <h5 className="text-sm font-bold text-zinc-950">{owner.name}</h5>
                    <p className="text-xs text-zinc-500">Creator & Lead Organizer</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-zinc-950 text-white rounded-full text-xs font-semibold">
                  Lead
                </span>
              </div>
            </div>

            {/* Community Organizers */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Community Organizers ({admins.length})
              </h4>
              {admins.length === 0 ? (
                <p className="text-xs text-zinc-500 bg-white p-4 rounded-xl border border-zinc-200">
                  No organizers added yet. Community leads can invite team members from the management console.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {admins.map((adm) => (
                    <div
                      key={adm.user_id}
                      className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        {adm.avatar_url ? <img
                          src={adm.avatar_url}
                          alt={adm.name}
                          className="w-11 h-11 rounded-full object-cover border border-zinc-200"
                        /> : <span className="w-11 h-11 flex items-center justify-center rounded-full bg-zinc-100 text-sm">{adm.name.charAt(0)}</span>}
                        <div>
                          <h5 className="text-sm font-bold text-zinc-950">{adm.name}</h5>
                          <p className="text-xs text-zinc-500">{adm.email || "Community Organizer"}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full text-[11px] font-semibold">
                        Organizer
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Hosts */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Event Hosts ({hosts.length})
              </h4>
              {hosts.length === 0 ? (
                <p className="text-xs text-zinc-500 bg-white p-4 rounded-xl border border-zinc-200">
                  No individual event hosts assigned yet. Organizers can assign hosts when setting up events.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hosts.map((host) => (
                    <div
                      key={host.user_id}
                      className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          {host.avatar_url ? <img
                            src={host.avatar_url}
                            alt={host.name}
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                          /> : <span className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-sm">{host.name.charAt(0)}</span>}
                          <div>
                            <h5 className="text-sm font-bold text-zinc-950">{host.name}</h5>
                            <p className="text-xs text-zinc-500">{host.email || "Event Host"}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-full text-[11px] font-medium">
                          Host
                        </span>
                      </div>

                      {host.assigned_event_ids && host.assigned_event_ids.length > 0 && (
                        <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                          <span>Assigned to {host.assigned_event_ids.length} specific event session(s)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT */}
        {activeTab === "about" && (
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 space-y-6 max-w-3xl">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-zinc-950">About {community.name}</h3>
              <p className="text-sm text-zinc-700 leading-relaxed">{community.description}</p>
            </div>

            <div className="pt-6 border-t border-zinc-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-zinc-500 block">Created</span>
                <span className="font-medium text-zinc-900">
                  {new Date(community.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Lead Organizer</span>
                <span className="font-medium text-zinc-900">{community.owner_name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Community Members</span>
                <span className="font-medium text-zinc-900">{followerCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Active Drops</span>
                <span className="font-medium text-zinc-900">{events.length}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Verification</span>
                <span className="font-medium text-zinc-900">
                  {community.verified ? "Verified Organizer" : "Standard"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
