import { getStoredEvents, getAllOrders, getAllAttendees, getEventPageViews } from "@/lib/api";
import { EventItem } from "@/lib/types";

export interface AnalyticsFilterState {
  dateRange: "today" | "7d" | "30d" | "90d" | "1y" | "all";
  eventId: string; // "all" or specific event ID
  organizerId?: string; // "all" or specific organizer
  communityId?: string; // "all" or specific channel/community
  city?: string; // "all" or specific city
  isLive: boolean;
  comparison: "period" | "year";
}

export function generateAnalyticsData(filters: AnalyticsFilterState) {
  const allPlatformEvents = getStoredEvents(true);

  // Extract distinct organizers, communities, and cities from platform events
  const organizerMap = new Map<string, string>();
  const communityMap = new Map<string, string>();
  const citySet = new Set<string>();

  allPlatformEvents.forEach((ev) => {
    if (ev.organizer_id) {
      const label = ev.hosts && ev.hosts.length > 0 ? ev.hosts[0] : `Host (${ev.organizer_id.slice(0, 8)})`;
      organizerMap.set(ev.organizer_id, label);
    } else if (ev.hosts && ev.hosts.length > 0) {
      organizerMap.set(ev.hosts[0], ev.hosts[0]);
    }

    if (ev.channel_id && ev.channel_name) {
      communityMap.set(ev.channel_id, ev.channel_name);
    } else if (ev.channel_name) {
      communityMap.set(ev.channel_name, ev.channel_name);
    }

    if (ev.city) {
      citySet.add(ev.city);
    }
  });

  const organizers = Array.from(organizerMap.entries()).map(([id, name]) => ({ id, name }));
  const communities = Array.from(communityMap.entries()).map(([id, name]) => ({ id, name }));
  const cities = Array.from(citySet);

  // Apply multi-dimensional filters
  let filteredEvents = allPlatformEvents;

  if (filters.eventId && filters.eventId !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.id === filters.eventId);
  }

  if (filters.organizerId && filters.organizerId !== "all") {
    filteredEvents = filteredEvents.filter(
      (e) => e.organizer_id === filters.organizerId || e.hosts?.includes(filters.organizerId!)
    );
  }

  if (filters.communityId && filters.communityId !== "all") {
    filteredEvents = filteredEvents.filter(
      (e) => e.channel_id === filters.communityId || e.channel_name === filters.communityId
    );
  }

  if (filters.city && filters.city !== "all") {
    filteredEvents = filteredEvents.filter(
      (e) => e.city === filters.city || (typeof e.location === "string" && e.location.includes(filters.city!))
    );
  }

  const activeEvents = filteredEvents;
  const activeEventIds = new Set(activeEvents.map((e) => e.id));

  // Real store data
  const allOrders = getAllOrders();
  const allAttendees = getAllAttendees();

  const orders = allOrders.filter((o) => activeEventIds.has(o.eventId));
  const attendees = allAttendees.filter((a) => activeEventIds.has(a.eventId));

  // Compute real metrics strictly from real store
  const totalCap = activeEvents.reduce(
    (sum, e) => sum + (e.tiers?.reduce((tSum, t) => tSum + (t.total_capacity || 0), 0) || e.total_capacity || 0),
    0
  );
  const remainingCap = activeEvents.reduce(
    (sum, e) => sum + (e.tiers?.length ? e.tiers.reduce((tSum, t) => tSum + (t.remaining_capacity ?? t.total_capacity), 0) : e.total_capacity || 0),
    0
  );

  const realTicketsSold = attendees.filter((attendee) => attendee.status === "CONFIRMED" || attendee.status === "CHECKED_IN").length;
  const grossRevenue = orders.reduce((sum, o) => sum + (o.amount || (o as any).totalAmount || 0), 0);
  const platformFee = Math.round(grossRevenue * 0.05);
  const paymentFee = Math.round(grossRevenue * 0.02);
  const netRevenue = grossRevenue - platformFee - paymentFee;
  const totalOrders = orders.length;
  const totalRegistrations = attendees.length;
  const checkInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const pageViews = activeEvents.reduce((sum, event) => sum + getEventPageViews(event.id).length, 0);
  const conversionRate = pageViews > 0 ? ((totalOrders / pageViews) * 100).toFixed(1) : "0.0";

  // Only recorded timestamps contribute to the chart; never spread totals over invented periods.
  const recordedDates = [...orders.map((order) => order.createdAt), ...attendees.map((attendee) => attendee.registeredAt)]
    .filter((date) => date && !Number.isNaN(Date.parse(date)))
    .map((date) => new Date(date).toISOString().slice(0, 10));
  const timeLabels = [...new Set(recordedDates)].sort();
  const revenueSeries = timeLabels.map((date) => orders
    .filter((order) => order.createdAt && !Number.isNaN(Date.parse(order.createdAt)) && new Date(order.createdAt).toISOString().startsWith(date))
    .reduce((sum, order) => sum + order.amount, 0));
  const ticketsSeries = timeLabels.map((date) => attendees
    .filter((attendee) => attendee.registeredAt && !Number.isNaN(Date.parse(attendee.registeredAt)) && new Date(attendee.registeredAt).toISOString().startsWith(date)).length);

  // Funnel stages (strictly real counts)
  const funnelStages = [
    { step: "1. Page Visits", count: pageViews, rate: pageViews ? "100%" : "Unavailable" },
    { step: "2. Registrations", count: totalRegistrations, rate: pageViews > 0 ? `${Math.round((totalRegistrations / pageViews) * 100)}%` : "Unavailable" },
    { step: "3. Recorded Orders", count: totalOrders, rate: totalRegistrations > 0 ? `${Math.round((totalOrders / totalRegistrations) * 100)}%` : "Unavailable" },
    { step: "4. Tickets Issued", count: realTicketsSold, rate: "Unavailable" },
    { step: "5. Checked In", count: checkInCount, rate: realTicketsSold > 0 ? `${Math.round((checkInCount / realTicketsSold) * 100)}%` : "Unavailable" },
  ];

  // Ticket Tiers derived strictly from real event tiers
  const ticketTiers: { name: string; sold: number; price: number; revenue: number; inventory: number }[] = [];
  activeEvents.forEach((ev) => {
    if (ev.tiers && ev.tiers.length > 0) {
      ev.tiers.forEach((t) => {
        const sold = (t.total_capacity || 0) - (t.remaining_capacity ?? t.total_capacity ?? 0);
        const price = (t.price_cents || 0) / 100;
        ticketTiers.push({
          name: t.name || "General",
          sold: Math.max(0, sold),
          price,
          revenue: Math.max(0, sold) * price,
          inventory: t.remaining_capacity ?? 0,
        });
      });
    }
  });

  // Gate check-ins from real attendees
  const gates: { name: string; scans: number; rate: string; status: string; latency: string }[] = [];

  // Live Activity from real orders & attendees
  const liveActivity: { id: string; time: string; type: string; title: string; detail: string }[] = [];
  orders.slice(0, 5).forEach((ord, i) => {
    liveActivity.push({
      id: ord.id || `ord_${i}`,
      time: ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
      type: "ORDER",
      title: `Order confirmed — ₹${ord.amount || 0}`,
      detail: `${ord.buyerName || ord.buyerEmail || "Customer"} · ${ord.eventName || ord.tierName || "Ticket Drop"}`,
    });
  });

  attendees.filter((a) => a.status === "CHECKED_IN").slice(0, 5).forEach((att, i) => {
    liveActivity.push({
      id: `check_${att.id || i}`,
      time: att.checkedInAt ? new Date(att.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Checked in",
      type: "CHECK_IN",
      title: `Attendee Turnstile Check-in`,
      detail: `${att.name} (${att.email}) · Code: ${att.ticketCode}`,
    });
  });

  return {
    events: allPlatformEvents,
    activeEvents,
    selectedEvent: filters.eventId === "all" ? null : allPlatformEvents.find((e) => e.id === filters.eventId) || null,
    hasRealData: allPlatformEvents.length > 0 || orders.length > 0 || attendees.length > 0,
    summary: {
      grossRevenue,
      netRevenue,
      platformFee,
      paymentFee,
      totalOrders,
      ticketsSold: realTicketsSold,
      totalRegistrations,
      checkInCount,
      pageViews,
      conversionRate,
      refundCount: orders.filter((order) => order.status === "REFUNDED").length,
      refundAmount: orders.filter((order) => order.status === "REFUNDED").reduce((sum, order) => sum + order.amount, 0),
      discountAmount: null,
      activeAttendees: checkInCount,
      avgTicketPrice: realTicketsSold > 0 ? Math.round(grossRevenue / realTicketsSold) : 0,
    },
    timeLabels,
    revenueSeries,
    ticketsSeries,
    funnelStages,
    ticketTiers,
    gates,
    liveActivity,
    totalCapacity: totalCap,
    remainingCapacity: remainingCap,
    organizers,
    communities,
    cities,
  };
}
