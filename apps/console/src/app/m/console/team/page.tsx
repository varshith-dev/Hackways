"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Shield,
  QrCode,
  Calendar,
  Wallet,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";
import { ExtendedTeamMember } from "./invite/page";

const DEFAULT_TEAM: ExtendedTeamMember[] = [
  { id: "tm_1", name: "Alex Rivera", email: "alex@hackways.dev", role: "Co-Host", status: "ACTIVE", assignedEventTitle: "All Events", invitedAt: new Date().toISOString() },
  { id: "tm_2", name: "Sarah Chen", email: "sarah@hackways.dev", role: "Event Manager", status: "ACTIVE", assignedEventTitle: "All Events", invitedAt: new Date().toISOString() },
  { id: "tm_3", name: "Marcus Brody", email: "marcus@ops.hackways.dev", role: "Door Scanner", status: "ACTIVE", assignedEventTitle: "All Events", phone: "+91 98765 43210", invitedAt: new Date().toISOString() },
];

export default function MobileTeamPage() {
  const { showToast } = useToast();
  const [team, setTeam] = useState<ExtendedTeamMember[]>(DEFAULT_TEAM);

  const loadTeam = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hackways_organizer_team");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeam(parsed);
          }
        } catch {
          setTeam(DEFAULT_TEAM);
        }
      } else {
        localStorage.setItem("hackways_organizer_team", JSON.stringify(DEFAULT_TEAM));
        setTeam(DEFAULT_TEAM);
      }
    }
  };

  useEffect(() => {
    loadTeam();
    window.addEventListener("hackways_team_updated", loadTeam);
    return () => window.removeEventListener("hackways_team_updated", loadTeam);
  }, []);

  const handleRemove = (id: string, name: string) => {
    const nextList = team.filter((m) => m.id !== id);
    setTeam(nextList);
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_organizer_team", JSON.stringify(nextList));
    }
    showToast(`${name} removed from team.`);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Door Scanner":
        return <QrCode size={12} className="text-zinc-500" />;
      case "Event Manager":
        return <Calendar size={12} className="text-zinc-500" />;
      case "Host":
        return <Shield size={12} className="text-zinc-500" />;
      case "Finance":
        return <Wallet size={12} className="text-zinc-500" />;
      default:
        return <Shield size={12} className="text-zinc-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="team"
        title="Team & Roles"
        subtitle="Co-hosts, managers & staff"
        rightAction={
          <Link
            href="/m/console/team/invite"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202022] text-white text-xs font-medium whitespace-nowrap shrink-0 hover:opacity-90 transition active:scale-95"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Invite</span>
          </Link>
        }
      />

      {/* Main Content */}
      <main className="p-4 space-y-3 max-w-[600px] mx-auto w-full pb-20">
        {/* Team Roster List */}
        <div className="space-y-3">
          {team.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white border border-[#dedee2] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#fafafa] border border-[#dedee2] flex items-center justify-center text-[#707077]">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#202022]">No team members yet</p>
                <p className="text-xs text-[#707077] mt-0.5">
                  Invite door staff, managers, or co-hosts to help run your events.
                </p>
              </div>
              <Link
                href="/m/console/team/invite"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition whitespace-nowrap shrink-0"
              >
                <Plus size={14} />
                <span>Invite Team Member</span>
              </Link>
            </div>
          ) : (
            team.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#202022] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-950 truncate">
                          {member.name}
                        </span>
                        {member.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="text-zinc-400 shrink-0" />
                        <span>{member.email}</span>
                      </p>
                      {member.phone && (
                        <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-zinc-400 shrink-0" />
                          <span>{member.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {member.role !== "Co-Host" && (
                    <button
                      onClick={() => handleRemove(member.id, member.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-50 transition"
                      aria-label="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Capsule Badges for Role & Event Coverage */}
                <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-semibold">
                      {getRoleIcon(member.role)}
                      <span>{member.role}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-medium">
                      <Calendar size={10} className="text-zinc-400" />
                      <span>{member.assignedEventTitle || "All Events"}</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-400">
                    {member.status === "ACTIVE" ? "Active" : "Invite sent"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
