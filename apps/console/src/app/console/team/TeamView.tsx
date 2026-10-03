"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  BarChartIcon,
  TicketIcon,
  UsersGroupIcon,
  FilterIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  QrCodeIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  PresentationIcon,
  LockIcon,
  UserIcon,
} from "@/components/icons/hugeicons";
import {
  MOCK_CO_ORGANIZER_EVENTS,
  MOCK_CO_ORGANIZER_TASKS,
  MOCK_GUEST_LIST,
  MOCK_CHECKIN_STATIONS,
  MOCK_MARKETING_CAMPAIGNS,
  MOCK_COMMUNICATIONS,
  MOCK_TEAM_ACTIVITY_LOGS,
  MOCK_TEAM_NOTIFICATIONS,
  MOCK_ATTENDEES,
  MOCK_ADMIN_ORDERS,
  MOCK_ADMIN_TICKETS,
  MOCK_PROMO_CODES,
  MOCK_SESSIONS,
} from "../mockData";

export default function TeamView({ currentTab }: { currentTab: string }) {
  const { user } = useAuth();
  // Local state for interactive features
  const [tasks, setTasks] = useState(MOCK_CO_ORGANIZER_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Check-in Lead");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");

  const [guestList, setGuestList] = useState(MOCK_GUEST_LIST);
  const [guestFilter, setGuestFilter] = useState("ALL");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  // Checkin simulator
  const [manualCode, setManualCode] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Communications composer
  const [commTitle, setCommTitle] = useState("");
  const [commRecipient, setCommRecipient] = useState("All Confirmed Attendees");
  const [commsList, setCommsList] = useState(MOCK_COMMUNICATIONS);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "DONE" ? "PENDING" : "DONE" }
          : t
      )
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([
      {
        id: `tsk_${Date.now()}`,
        title: newTaskTitle.trim(),
        role: newTaskRole,
        priority: newTaskPriority,
        status: "PENDING",
        assignedTo: user?.name || user?.email || "Unassigned",
        dueDate: "Not set",
      },
      ...tasks,
    ]);
    setNewTaskTitle("");
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const found = MOCK_ATTENDEES.find(
      (a) => a.ticketCode.toUpperCase() === manualCode.trim().toUpperCase()
    );
    if (found) {
      setScanMessage(`Verified: ${found.name} (${found.tierName}) - Gate A Cleared`);
    } else {
      setScanMessage(`Invalid Pass: Code "${manualCode.trim().toUpperCase()}" not recognized`);
    }
    setManualCode("");
  };

  const handleSendComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTitle.trim()) return;
    setCommsList([
      {
        id: `comm_${Date.now()}`,
        type: "STAFF_RADIO_BROADCAST",
        recipientGroup: commRecipient,
        subject: commTitle.trim(),
        sentAt: "Just now",
        deliveryRate: "Unavailable",
        status: "DRAFT",
      },
      ...commsList,
    ]);
    setCommTitle("");
  };

  const markGuestArrived = (id: string) => {
    setGuestList(
      guestList.map((g) =>
        g.id === id
          ? {
              ...g,
              checkInStatus: "CHECKED_IN",
              arrivedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }
          : g
      )
    );
  };

  const filteredGuests =
    guestFilter === "ALL"
      ? guestList
      : guestList.filter((g) => g.category === guestFilter);

  const filteredAttendees = MOCK_ATTENDEES.filter(
    (a) =>
      a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  const filteredOrders = MOCK_ADMIN_ORDERS.filter(
    (o) =>
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.tier.toLowerCase().includes(orderSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ------------------------------------------------------------------ */}
      {/* 1. OVERVIEW                                                        */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Co-Organizer Operations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Event coordination, gate check-ins, tasks, and guest management.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-zinc-200/80 pb-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-600">Pending Tasks</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                {tasks.filter((t) => t.status !== "DONE").length} Action Items
              </div>
              <div className="text-[11px] text-zinc-500">
                {tasks.filter((t) => t.status === "DONE").length} completed today
              </div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-600">Door Check-in Rate</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                Unavailable
              </div>
              <div className="text-[11px] text-zinc-500">No event attendance source connected</div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-600">Turnstiles Active</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                Unavailable
              </div>
              <div className="text-[11px] text-zinc-500">Scanner status is not connected</div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-600">VIP Guests Arrived</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                {guestList.filter((g) => g.checkInStatus === "CHECKED_IN").length} / {guestList.length}
              </div>
              <div className="text-[11px] text-zinc-500">Speakers & Angel Investors</div>
            </div>
          </div>

          {/* Today's Schedule & Action Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: My Assigned Tasks */}
            <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">My Operational Tasks</h3>
                  <p className="text-xs text-zinc-500">Direct assignments for current event shift</p>
                </div>
                <Link
                  href="/console/team/tasks"
                  className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
                >
                  <span>View All ({tasks.length})</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

              <div className="space-y-2">
                {tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === "DONE"}
                        onChange={() => toggleTask(task.id)}
                        className="rounded border-zinc-300 text-zinc-950 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-medium truncate ${
                            task.status === "DONE"
                              ? "line-through text-zinc-400"
                              : "text-zinc-900"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>{task.role}</span>
                          <span>•</span>
                          <span>Due {task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        task.priority === "URGENT"
                          ? "bg-zinc-900 text-white"
                          : task.priority === "HIGH"
                          ? "bg-zinc-100 text-zinc-900 font-bold"
                          : "bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Live Turnstile Status */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Turnstile Gates</h3>
                  <p className="text-xs text-zinc-500">Live hardware monitoring</p>
                </div>
                <Link
                  href="/console/team/check-in"
                  className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
                >
                  <span>Monitor</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

              <div className="space-y-3">
                {MOCK_CHECKIN_STATIONS.map((stn) => (
                  <div key={stn.id} className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                      <span>{stn.stationName}</span>
                      <span className="text-[11px] font-mono text-zinc-600">{stn.scannedCount} scans</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{stn.assignedVolunteer}</span>
                      <span>Battery: {stn.batteryPercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Team Activity Stream */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Live Team Actions</h3>
                <p className="text-xs text-zinc-500">Real-time turnstile scans, badge handoffs & task updates</p>
              </div>
              <Link
                href="/console/team/team-activity"
                className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
              >
                <span>Full Audit Stream</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>

            <div className="divide-y divide-zinc-100">
              {MOCK_TEAM_ACTIVITY_LOGS.map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-zinc-900">{act.actor}</div>
                    <div className="text-zinc-500">{act.detail}</div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="font-mono text-zinc-500">{act.timestamp}</div>
                    <div className="text-[11px] text-zinc-400">{act.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. MY EVENTS                                                       */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "my-events" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              My Assigned Events
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Events where you have delegated co-organizer permissions and operations access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_CO_ORGANIZER_EVENTS.map((evt) => (
              <div
                key={evt.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-zinc-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-zinc-500">{evt.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-950">{evt.title}</h3>
                  <div className="text-xs font-semibold text-zinc-800">
                    Role: <span className="text-zinc-600 font-normal">{evt.role}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Venue: {evt.venue}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Permissions: {evt.permissions}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-zinc-400 text-[10px]">Registered</div>
                      <div className="font-bold text-zinc-900">{evt.registered} / {evt.capacity}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-[10px]">Checked In</div>
                      <div className="font-bold text-zinc-900">{evt.checkedIn}</div>
                    </div>
                  </div>

                  <Link
                    href={`/console/team/overview`}
                    className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg py-2 transition"
                  >
                    <span>Manage Operations</span>
                    <ArrowRightIcon size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. TASKS                                                           */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "tasks" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Team Tasks & Assignments
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Delegate, track, and complete shift tasks across check-in, marketing, volunteers, and stage operations.
              </p>
            </div>
          </div>

          {/* Inline Add Task */}
          <form
            onSubmit={handleAddTask}
            className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 flex flex-col sm:flex-row gap-3 items-center"
          >
            <input
              type="text"
              placeholder="Add new task (e.g., Verify Gate B volunteer shift handoff)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
            <select
              value={newTaskRole}
              onChange={(e) => setNewTaskRole(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-medium"
            >
              <option value="Check-in Lead">Check-in Lead</option>
              <option value="VIP Concierge">VIP Concierge</option>
              <option value="Venue Ops">Venue Ops</option>
              <option value="Communications Lead">Communications Lead</option>
              <option value="Volunteer Lead">Volunteer Lead</option>
            </select>
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-medium"
            >
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition"
            >
              Add Task
            </button>
          </form>

          {/* Task Board */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="divide-y divide-zinc-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "DONE"}
                      onChange={() => toggleTask(task.id)}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-medium ${
                          task.status === "DONE"
                            ? "line-through text-zinc-400"
                            : "text-zinc-900"
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1">
                        <span className="font-semibold text-zinc-700">{task.role}</span>
                        <span>•</span>
                        <span>Assigned to {task.assignedTo}</span>
                        <span>•</span>
                        <span>Due {task.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        task.priority === "URGENT"
                          ? "bg-zinc-900 text-white"
                          : task.priority === "HIGH"
                          ? "bg-zinc-100 text-zinc-900 font-bold"
                          : "bg-zinc-50 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-950 font-medium"
                    >
                      {task.status === "DONE" ? "Reopen" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. ATTENDEES                                                       */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "attendees" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Attendees & Passes
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Lookup registered attendees, pass categories, and door verification records.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or pass code..."
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              className="w-full md:w-72 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Attendee</th>
                  <th className="py-3 px-4">Pass Tier</th>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Door Check-In</th>
                  <th className="py-3 px-4">Seat / Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4 font-medium text-zinc-950">
                      <div>{att.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{att.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded font-mono text-[11px]">
                        {att.tierName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      {att.ticketCode}
                    </td>
                    <td className="py-3 px-4">
                      {att.status === "CHECKED_IN" ? (
                        <span className="text-zinc-900 font-semibold">Checked In ({att.checkedInAt || "Door"})</span>
                      ) : (
                        <span className="text-zinc-400 font-normal">Pending Entrance</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">
                      {att.entrance || "General Entry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. GUEST LIST                                                      */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "guest-list" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                VIP & Speaker Guest List
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Accreditation, private green room credentials, and host escort assignments for dignitaries.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium">Category:</span>
              <select
                value={guestFilter}
                onChange={(e) => setGuestFilter(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-900 font-medium focus:outline-none"
              >
                <option value="ALL">All Guests</option>
                <option value="KEYNOTE_SPEAKER">Keynote Speakers</option>
                <option value="INVESTOR">Investors</option>
                <option value="SPONSOR">Sponsors</option>
                <option value="MEDIA_PRESS">Media / Press</option>
                <option value="HONORED_GUEST">Honored Guests</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Guest & Affiliation</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Badge Accreditation</th>
                  <th className="py-3 px-4">Assigned Host</th>
                  <th className="py-3 px-4">Gate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-950">{guest.name}</div>
                      <div className="text-[11px] text-zinc-500">{guest.affiliation}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {guest.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-zinc-700">
                      {guest.badgeType}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-800">
                      {guest.assignedHost}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-mono text-[11px]">
                      {guest.gate}
                    </td>
                    <td className="py-3 px-4">
                      {guest.checkInStatus === "CHECKED_IN" ? (
                        <span className="text-zinc-950 font-bold">
                          Arrived ({guest.arrivedAt})
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-normal">Expected</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {guest.checkInStatus !== "CHECKED_IN" && (
                        <button
                          onClick={() => markGuestArrived(guest.id)}
                          className="px-2.5 py-1 bg-zinc-900 text-white rounded text-[11px] font-medium hover:bg-zinc-800 transition"
                        >
                          Mark Arrived
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

      {/* ------------------------------------------------------------------ */}
      {/* 6. TICKETS & ORDERS                                                */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "tickets-orders" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Tickets & Order History
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Real-time ledger of completed pass reservations, payment methods, and buyer receipts.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search order ID or buyer..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full md:w-72 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Pass Tier</th>
                  <th className="py-3 px-4">Gross Amount</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{ord.id}</td>
                    <td className="py-3 px-4 font-medium text-zinc-900">{ord.customer}</td>
                    <td className="py-3 px-4">
                      <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded font-mono text-[11px]">
                        {ord.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900 tabular-nums">
                      INR {ord.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900">{ord.status}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{ord.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. CHECK-IN                                                        */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "check-in" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Door Check-In Operations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Active turnstile hardware monitoring, scan velocity, and instant ticket pass validation.
            </p>
          </div>

          {/* Turnstile Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_CHECKIN_STATIONS.map((stn) => (
              <div
                key={stn.id}
                className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-950">{stn.stationName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900">
                    LIVE
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                  {stn.scannedCount} <span className="text-xs text-zinc-400 font-normal">scans</span>
                </div>
                <div className="space-y-1 text-[11px] text-zinc-500 border-t border-zinc-100 pt-2">
                  <div className="flex justify-between">
                    <span>Lead:</span>
                    <span className="font-medium text-zinc-800">{stn.assignedVolunteer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span className="font-mono text-zinc-800">{stn.speedAvgPerMin} / min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Battery:</span>
                    <span className="font-mono text-zinc-800">{stn.batteryPercentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Instant Manual Pass Verification Terminal */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950">Manual Code Check-In Terminal</h3>
            <p className="text-xs text-zinc-500">
              Enter the attendee ticket code if the scanner cannot read the QR barcode.
            </p>

            <form onSubmit={handleManualScan} className="flex gap-3 max-w-lg">
              <input
                type="text"
                placeholder="Enter Ticket Code (e.g. HYPER-9914)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition"
              >
                Verify & Admit
              </button>
            </form>

            {scanMessage && (
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-900">
                {scanMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. MARKETING                                                       */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "marketing" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Marketing & Affiliate Attribution
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Campaign channels, promotional codes, and conversion velocity for co-organizers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_MARKETING_CAMPAIGNS.map((cmp) => (
              <div
                key={cmp.id}
                className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs"
              >
                <div className="text-xs font-mono text-zinc-400">{cmp.channel}</div>
                <h3 className="text-sm font-bold text-zinc-950">{cmp.campaignName}</h3>
                <div className="inline-block bg-zinc-100 text-zinc-900 font-mono text-xs font-bold px-2 py-0.5 rounded">
                  Code: {cmp.promoCode}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-zinc-100">
                  <div>
                    <div className="text-zinc-400 text-[10px]">Orders</div>
                    <div className="font-bold text-zinc-900">{cmp.orders} passes</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px]">Conversion</div>
                    <div className="font-bold text-zinc-900">{cmp.conversionRate}</div>
                  </div>
                </div>
                <div className="text-xs font-bold text-zinc-900 pt-1">
                  Gross Sales: {cmp.grossSales}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 9. COMMUNICATIONS                                                  */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "communications" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Communications & Broadcast Alerts
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Dispatch SMS/Email updates to ticket holders, staff radio alerts, and green room coordination.
            </p>
          </div>

          {/* Quick Broadcast Form */}
          <form
            onSubmit={handleSendComm}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4 shadow-2xs"
          >
            <h3 className="text-sm font-bold text-zinc-950">Broadcast Announcement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Alert Subject or Message..."
                value={commTitle}
                onChange={(e) => setCommTitle(e.target.value)}
                className="sm:col-span-2 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
              />
              <select
                value={commRecipient}
                onChange={(e) => setCommRecipient(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-medium"
              >
                <option value="All Confirmed Attendees">All Confirmed Attendees</option>
                <option value="Turnstile Staff & Gate Leads">Turnstile Staff & Gate Leads (12)</option>
                <option value="Keynote Speakers & VIPs">Keynote Speakers & VIPs (18)</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition"
            >
              Dispatch Broadcast
            </button>
          </form>

          {/* Sent Communications Log */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Subject & Content</th>
                  <th className="py-3 px-4">Recipient Group</th>
                  <th className="py-3 px-4">Delivery Rate</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {commsList.map((comm) => (
                  <tr key={comm.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-zinc-950">{comm.subject}</td>
                    <td className="py-3 px-4 text-zinc-700">{comm.recipientGroup}</td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{comm.deliveryRate}</td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{comm.sentAt}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900">{comm.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. REPORTS                                                        */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "reports" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Operational Reports & Analytics
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Attendance pacing curves, gate throughput velocity, and downloadable audit reports.
              </p>
            </div>
            <button
              onClick={() => alert("Attendance summary CSV generated and exported.")}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition"
            >
              Export Attendance CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs text-zinc-500">Peak Scan Velocity</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                38 Scans / Min
              </div>
              <p className="text-[11px] text-zinc-400">Achieved at 13:15 during keynote queue</p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs text-zinc-500">Average Turnstile Latency</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                1.4 Seconds
              </div>
              <p className="text-[11px] text-zinc-400">NFC and offline local cache validation</p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs text-zinc-500">Unadmitted Passes</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                845 Passes
              </div>
              <p className="text-[11px] text-zinc-400">Expected prior to 15:30 afternoon block</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 11. TEAM ACTIVITY                                                  */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "team-activity" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Team Audit Trail & Activity
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Immutable log of check-ins, overrides, badge handoffs, and terminal synchronizations.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="divide-y divide-zinc-100">
              {MOCK_TEAM_ACTIVITY_LOGS.map((act) => (
                <div key={act.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-950">{act.actor}</span>
                      <span className="text-[10px] font-mono bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded">
                        {act.action}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600">{act.detail}</div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="font-mono text-xs text-zinc-900 font-semibold">{act.timestamp}</div>
                    <div className="text-[11px] text-zinc-400">{act.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 12. NOTIFICATIONS                                                  */}
      {/* ------------------------------------------------------------------ */}
      {currentTab === "notifications" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Operational Alerts & Notifications
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Hardware health, hall capacity thresholds, and VIP arrival updates.
            </p>
          </div>

          <div className="space-y-3">
            {MOCK_TEAM_NOTIFICATIONS.map((notif) => (
              <div
                key={notif.id}
                className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      notif.severity === "CRITICAL"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {notif.severity}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">{notif.time}</span>
                </div>
                <h3 className="text-xs font-bold text-zinc-950 pt-1">{notif.title}</h3>
                <p className="text-xs text-zinc-500">{notif.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
