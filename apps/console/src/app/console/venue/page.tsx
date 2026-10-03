"use client";

import React, { useState } from "react";
import { MOCK_VENUE_ROOMS } from "../mockData";

export default function VenueDashboard() {
  const [rooms] = useState(MOCK_VENUE_ROOMS);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setActiveBroadcast(broadcastMessage.trim());
    setBroadcastMessage("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">
            Venue
          </h1>
        </div>

        <button
          onClick={() => setDoorsOpen(!doorsOpen)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition border ${
            doorsOpen
              ? "bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-800"
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          {doorsOpen ? "Doors open" : "Doors closed"}
        </button>
      </div>

      {/* Active broadcast banner */}
      {activeBroadcast && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between text-xs">
          <span className="text-zinc-900 font-medium">{activeBroadcast}</span>
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-zinc-400 hover:text-zinc-900 ml-4 transition text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Room occupancy */}
      <div className="space-y-3">
        {rooms.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6">
            No rooms configured. Add rooms in event setup to track occupancy.
          </p>
        ) : (
          rooms.map((room) => {
            const pct = room.percentage;
            const high = pct >= 90;
            return (
              <div
                key={room.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-950">{room.name}</span>
                  <span className="font-mono text-zinc-600 tabular-nums">
                    {room.currentOccupancy} / {room.capacity}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      high ? "bg-zinc-950" : "bg-zinc-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {high && (
                  <p className="text-[11px] text-zinc-500">Near capacity</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">Broadcast</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Send an announcement to all venue monitors.
          </p>
        </div>
        <form onSubmit={handleBroadcast} className="space-y-3">
          <textarea
            rows={3}
            placeholder="Type an announcement..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            className="w-full border border-zinc-200 rounded-md p-3 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 resize-none bg-zinc-50/50"
          />
          <button
            type="submit"
            disabled={!broadcastMessage.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 transition disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
