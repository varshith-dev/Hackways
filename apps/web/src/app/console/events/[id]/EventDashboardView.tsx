"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  ZapIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  MailIcon,
  ClockIcon,
  MapPinIcon,
  SparklesIcon,
  CalendarIcon,
} from "@/components/icons/hugeicons";
import { SlideOverDrawer } from "@/components/ui/SlideOverDrawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import DashboardArtwork from "@/components/ui/DashboardArtwork";
import { PageSkeleton } from "@/components/ui/Skeleton";
import CameraScanner from "@/components/events/CameraScanner";
import MobileEventOverview from "@/components/events/MobileEventOverview";
import mobileStyles from "@/components/events/MobileEventDashboard.module.css";
import {
  getEvent,
  getEventSync,
  saveEvent,
  deleteEvent,
  getEventAttendees,
  getAllOrders,
  checkInAttendee,
  getEventTeams,
  approveAttendee,
  rejectAttendee,
  cancelAttendeeRegistration,
  getEventPageViews,
  EventPageView,
  StoredAttendee,
  StoredOrder,
} from "@/lib/api";
import { EventItem, EventTeam, EventStaffMember, MediaAsset, RSVPQuestion, QuestionType, TicketApprovalMode, EventScheduleItem, EventFaq, EventPageTheme } from "@/lib/types";
import { readImageFile } from "@/lib/imageUpload";
export interface EventTicketTier {
  id: string;
  name: string;
  price: number;
  inventory: number;
  sold: number;
  available: number;
  salesStart: string;
  salesEnd: string;
  status: "ACTIVE" | "SOLD_OUT" | "DISABLED";
  approvalMode?: TicketApprovalMode;
  waitlistCount?: number;
}

export interface EventDashboardViewProps {
  eventId: string;
  activeTab: string;
  mobileView?: boolean;
  initialEvent?: EventItem | null;
  initialOrders?: any[];
  initialAttendees?: StoredAttendee[];
  initialTeams?: EventTeam[];
}

export default function EventDashboardView({
  eventId,
  activeTab,
  mobileView = false,
  initialEvent,
  initialOrders,
  initialAttendees,
  initialTeams,
}: EventDashboardViewProps) {
  const pathname = usePathname();
  const isMPath = pathname?.startsWith("/m");
  const mobilePrefix = isMPath ? "/m" : "/mobile";
  const consoleBase = `${mobileView ? mobilePrefix : "/console"}/events/${encodeURIComponent(eventId)}`;
  // Category sub-tabs within modules
  const [setupSubtab, setSetupSubtab] = useState<
    "basic" | "datetime" | "venue" | "page" | "content" | "seo" | "settings"
  >("basic");
  const [ticketsSubtab, setTicketsSubtab] = useState<
    "types" | "pricing" | "inventory" | "addons" | "rules" | "questions" | "conditional-questions"
  >("types");
  const [ordersSubtab, setOrdersSubtab] = useState<
    "all" | "paid" | "pending" | "failed" | "refunded"
  >("all");
  const [attendeesSubtab, setAttendeesSubtab] = useState<
    "all" | "confirmed" | "checked_in" | "pending_approval" | "waitlist" | "vip" | "speakers" | "staff" | "cancelled"
  >("all");
  const [venueSubtab, setVenueSubtab] = useState<
    "overview" | "floorplan" | "sections" | "capacity"
  >("overview");
  const [checkinSubtab, setCheckinSubtab] = useState<
    "live" | "devices" | "gates" | "reports"
  >("live");
  const [marketingSubtab, setMarketingSubtab] = useState<
    "campaigns" | "coupons" | "referrals" | "tracking"
  >("campaigns");
  const [commsSubtab, setCommsSubtab] = useState<
    "email" | "sms" | "whatsapp" | "automations"
  >("email");
  const [staffSubtab, setStaffSubtab] = useState<
    "roster" | "roles" | "scanners" | "activity"
  >("roster");
  const [financeSubtab, setFinanceSubtab] = useState<
    "revenue" | "transactions" | "payouts" | "invoices"
  >("revenue");
  const [analyticsSubtab, setAnalyticsSubtab] = useState<
    "sales" | "audience" | "marketing" | "traffic"
  >("sales");
  const [integrationsSubtab, setIntegrationsSubtab] = useState<
    "payments" | "email_sms" | "crm" | "webhooks"
  >("payments");
  const [settingsSubtab, setSettingsSubtab] = useState<
    "general" | "privacy" | "refund_policy" | "danger"
  >("general");

  // Toast feedback
  const { showToast } = useToast();
  const router = useRouter();
  const { settings: platformSettings } = usePlatformSettings();

  const resolvedInitialEvent = initialEvent || getEventSync(eventId);

  // Real Event & Persistence State - Synchronous instant cache hit on first render
  const [event, setEvent] = useState<EventItem | null>(() => resolvedInitialEvent);
  const [isLoading, setIsLoading] = useState(() => !resolvedInitialEvent);

  // Cache initialEvent to localStorage for instant client navigations
  useEffect(() => {
    if (resolvedInitialEvent && typeof window !== "undefined") {
      try {
        localStorage.setItem(`hackways_event_${resolvedInitialEvent.id}`, JSON.stringify(resolvedInitialEvent));
        if (resolvedInitialEvent.slug) {
          localStorage.setItem(`hackways_event_${resolvedInitialEvent.slug.toLowerCase()}`, JSON.stringify(resolvedInitialEvent));
        }
        if (resolvedInitialEvent.tiers && resolvedInitialEvent.tiers.length > 0) {
          localStorage.setItem(`hackways_tiers_${resolvedInitialEvent.id}`, JSON.stringify(resolvedInitialEvent.tiers));
        }
      } catch {}
    }
  }, [resolvedInitialEvent]);

  // Editable Event Setup fields
  const [editTitle, setEditTitle] = useState(() => resolvedInitialEvent?.title || "");
  const [editSlug, setEditSlug] = useState(() => {
    return (
      resolvedInitialEvent?.slug ||
      (resolvedInitialEvent?.title
        ? resolvedInitialEvent.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : eventId)
    );
  });
  const [isCustomSlugEdited, setIsCustomSlugEdited] = useState(() => !!resolvedInitialEvent?.slug);
  const [editDescription, setEditDescription] = useState(() => resolvedInitialEvent?.description || "");
  const [editLocation, setEditLocation] = useState(() => resolvedInitialEvent?.location || "");
  const [editStartTime, setEditStartTime] = useState(() => resolvedInitialEvent?.start_time || "");
  const [editBannerUrl, setEditBannerUrl] = useState(() => resolvedInitialEvent?.banner_url || "");
  const [editSquareBannerUrl, setEditSquareBannerUrl] = useState(() => resolvedInitialEvent?.square_banner_url || "");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => resolvedInitialEvent?.media_assets || []);
  const [editCategory, setEditCategory] = useState(() => resolvedInitialEvent?.category || "Technology & Engineering");
  const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "PRIVATE">(() => resolvedInitialEvent?.visibility || "PUBLIC");
  const [isCommunityPrivate, setIsCommunityPrivate] = useState(() => !!resolvedInitialEvent?.channel_is_private);
  const [editTeamEnabled, setEditTeamEnabled] = useState(() => !!resolvedInitialEvent?.team_registration_enabled);
  const [editTeamMinSize, setEditTeamMinSize] = useState(() => String(resolvedInitialEvent?.team_min_size ?? 2));
  const [editTeamMaxSize, setEditTeamMaxSize] = useState(() => String(resolvedInitialEvent?.team_max_size ?? 4));
  const [editEndTime, setEditEndTime] = useState(() => resolvedInitialEvent?.end_time || "");
  const [editPageTheme, setEditPageTheme] = useState<EventPageTheme>(() => resolvedInitialEvent?.page_theme || "auto");
  const [editSchedule, setEditSchedule] = useState<EventScheduleItem[]>(() => resolvedInitialEvent?.schedule || []);
  const [editFaqs, setEditFaqs] = useState<EventFaq[]>(() => resolvedInitialEvent?.faqs || []);
  const [editContactEmail, setEditContactEmail] = useState(() => resolvedInitialEvent?.contact_email || "");
  const [editContactPhone, setEditContactPhone] = useState(() => resolvedInitialEvent?.contact_phone || "");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingSquareBanner, setIsUploadingSquareBanner] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isCustomUrlOpen, setIsCustomUrlOpen] = useState(false);
  const [isCustomSquareUrlOpen, setIsCustomSquareUrlOpen] = useState(false);

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // State collections initialized synchronously from local store or server props
  const [tiers, setTiers] = useState<EventTicketTier[]>(() => {
    const ev = resolvedInitialEvent;
    if (ev?.tiers && ev.tiers.length > 0) {
      return ev.tiers.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price_cents ? t.price_cents / 100 : 0,
        inventory: t.total_capacity,
        sold: Math.max(0, t.total_capacity - (t.remaining_capacity ?? t.total_capacity)),
        available: t.remaining_capacity ?? t.total_capacity,
        salesStart: ev.start_time?.split("T")[0] || new Date().toISOString().split("T")[0],
        salesEnd: ev.start_time?.split("T")[0] || "",
        status: (t.remaining_capacity ?? t.total_capacity) <= 0 ? "SOLD_OUT" : "ACTIVE",
        approvalMode: t.approval_mode || "AUTO_APPROVE",
      }));
    }
    return [];
  });
  const [orders, setOrders] = useState<any[]>(() => initialOrders || (typeof window !== "undefined" ? getAllOrders().filter((o) => o.eventId === eventId) : []));
  const [attendees, setAttendees] = useState<StoredAttendee[]>(() => initialAttendees || (typeof window !== "undefined" ? getEventAttendees(eventId) : []));
  const [teams, setTeams] = useState<EventTeam[]>(() => initialTeams || (typeof window !== "undefined" ? getEventTeams(eventId) : []));
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");

  // Custom Registration Questions State
  const [customQuestions, setCustomQuestions] = useState<RSVPQuestion[]>([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("text");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState("");
  const [newQuestionPlaceholder, setNewQuestionPlaceholder] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Dedicated Conditional Questions & Feature Gate
  const [isConditionalQuestionsEnabled, setIsConditionalQuestionsEnabled] = useState<boolean>(false);
  const [selectedConditionalQId, setSelectedConditionalQId] = useState<string>("");
  const [condTier, setCondTier] = useState<string>("ALL");
  const [condDependsOn, setCondDependsOn] = useState<string>("");
  const [condOperator, setCondOperator] = useState<"equals" | "not_equals" | "contains" | "is_answered">("equals");
  const [condExpectedValue, setCondExpectedValue] = useState<string>("");

  // Sync feature flag from organizer settings
  useEffect(() => {
    const checkConditionalFeature = () => {
      if (typeof window !== "undefined") {
        setIsConditionalQuestionsEnabled(localStorage.getItem("hackways_feature_conditional_questions") === "true");
      }
    };
    checkConditionalFeature();
    window.addEventListener("storage", checkConditionalFeature);
    return () => window.removeEventListener("storage", checkConditionalFeature);
  }, []);

  // Fetch real event and related entities
  useEffect(() => {
    getEvent(eventId).then((ev) => {
      if (ev) {
        setEvent(ev);
        setEditTitle(ev.title || "");
        setEditSlug(
          ev.slug ||
            (ev.title
              ? ev.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")
              : ev.id)
        );
        setIsCustomSlugEdited(!!ev.slug);
        setEditDescription(ev.description || "");
        setEditLocation(ev.location || "");
        setEditStartTime(ev.start_time || "");
        setEditBannerUrl(ev.banner_url || "");
        setEditSquareBannerUrl(ev.square_banner_url || "");
        setMediaAssets(ev.media_assets || []);
        setEditCategory(ev.category || "Technology & Engineering");
        setEditVisibility(ev.visibility || (ev.channel_is_private ? "PRIVATE" : "PUBLIC"));
        setIsCommunityPrivate(ev.channel_is_private ?? false);
        setEditTeamEnabled(ev.team_registration_enabled ?? false);
        setEditTeamMinSize(String(ev.team_min_size ?? 2));
        setEditTeamMaxSize(String(ev.team_max_size ?? 4));
        setEditEndTime(ev.end_time || "");
        setEditPageTheme(ev.page_theme || "auto");
        setEditSchedule(ev.schedule || []);
        setEditFaqs(ev.faqs || []);
        setEditContactEmail(ev.contact_email || "");
        setEditContactPhone(ev.contact_phone || "");
        setCustomQuestions(ev.custom_questions || []);

        if (ev.tiers && ev.tiers.length > 0) {
          setTiers(
            ev.tiers.map((t) => ({
              id: t.id,
              name: t.name,
              price: t.price_cents ? t.price_cents / 100 : 0,
              inventory: t.total_capacity,
              sold: Math.max(0, t.total_capacity - (t.remaining_capacity ?? t.total_capacity)),
              available: t.remaining_capacity ?? t.total_capacity,
              salesStart: ev.start_time?.split("T")[0] || new Date().toISOString().split("T")[0],
              salesEnd: ev.start_time?.split("T")[0] || "",
              status: (t.remaining_capacity ?? t.total_capacity) <= 0 ? "SOLD_OUT" : "ACTIVE",
              approvalMode: t.approval_mode || "AUTO_APPROVE",
            }))
          );
        } else {
          setTiers([]);
        }
      } else {
        setEvent(null);
        setTiers([]);
      }

      const atts = getEventAttendees(eventId);
      setAttendees(atts);

      const ords = getAllOrders().filter((o) => o.eventId === eventId);
      setOrders(ords);

      const tms = getEventTeams(eventId);
      setTeams(tms);

      const views = getEventPageViews(eventId);
      setRecordedViews(views);

      setIsLoading(false);
    });

    const handleTeamsUpdated = () => {
      setTeams(getEventTeams(eventId));
    };
    const handleViewsUpdated = () => {
      setRecordedViews(getEventPageViews(eventId));
    };
    window.addEventListener("hackways_teams_updated", handleTeamsUpdated);
    window.addEventListener("hackways_views_updated", handleViewsUpdated);
    return () => {
      window.removeEventListener("hackways_teams_updated", handleTeamsUpdated);
      window.removeEventListener("hackways_views_updated", handleViewsUpdated);
    };
  }, [eventId]);

  // If user navigates to legacy /venue tab, redirect to overview
  useEffect(() => {
    if (activeTab === "venue") {
      router.replace(`${consoleBase}/overview`);
    }
  }, [activeTab, consoleBase, router]);

  // Inline table editing state (No prompt/alert)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [transferringAttendeeId, setTransferringAttendeeId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [cancellingAttendee, setCancellingAttendee] = useState<StoredAttendee | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingAttendee, setIsCancellingAttendee] = useState(false);

  // Check-in simulator state
  const [manualCode, setManualCode] = useState("");
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Right Slide-Over Drawer States
  const [isTierDrawerOpen, setIsTierDrawerOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<EventTicketTier | null>(null);
  const [tierDrawerName, setTierDrawerName] = useState("");
  const [tierDrawerIsPaid, setTierDrawerIsPaid] = useState(false); // Default: Free
  const [tierDrawerPrice, setTierDrawerPrice] = useState("0");     // Default for Paid: ₹0
  const [tierDrawerCap, setTierDrawerCap] = useState("100");
  const [tierDrawerStatus, setTierDrawerStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");
  const [tierDrawerApprovalMode, setTierDrawerApprovalMode] = useState<TicketApprovalMode>("AUTO_APPROVE");
  const [tierDrawerSalesStart, setTierDrawerSalesStart] = useState("");
  const [tierDrawerSalesEnd, setTierDrawerSalesEnd] = useState("");
  const [tierDrawerTab, setTierDrawerTab] = useState<"details" | "questions">("details");

  const [isStaffDrawerOpen, setIsStaffDrawerOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffDrawerName, setStaffDrawerName] = useState("");
  const [staffDrawerEmail, setStaffDrawerEmail] = useState("");
  const [staffDrawerRole, setStaffDrawerRole] = useState("Door Check-in Scanner");
  const [staffDrawerStation, setStaffDrawerStation] = useState("");
  const [staffDrawerStatus, setStaffDrawerStatus] = useState<"ACTIVE" | "OFF_DUTY" | "INVITED" | "SUSPENDED">("ACTIVE");

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffDrawerName("");
    setStaffDrawerEmail("");
    setStaffDrawerRole("Door Check-in Scanner");
    setStaffDrawerStation("Gate A - Main Entrance");
    setStaffDrawerStatus("ACTIVE");
    setIsStaffDrawerOpen(true);
  };

  const handleOpenEditStaff = (staff: EventStaffMember) => {
    setEditingStaffId(staff.id);
    setStaffDrawerName(staff.name);
    setStaffDrawerEmail(staff.email);
    setStaffDrawerRole(staff.role);
    setStaffDrawerStation(staff.gate || "All Doors & Turnstiles");
    setStaffDrawerStatus(staff.status || "ACTIVE");
    setIsStaffDrawerOpen(true);
  };

  const handleSaveStaffMember = () => {
    if (!event) return;
    if (!staffDrawerName.trim() || !staffDrawerEmail.trim()) {
      showToast("Staff name and email are required.");
      return;
    }

    const currentStaff: EventStaffMember[] = (event.staff_members && event.staff_members.length > 0)
      ? [...event.staff_members]
      : [
          {
            id: event.organizer_id || "lead_owner",
            name: event.hosts?.[0] || "Lead Event Organizer",
            email: "event-director@hackways.internal",
            role: "Event Owner & Director",
            gate: "All Doors & Turnstiles",
            status: "ACTIVE",
            added_at: event.created_at || new Date().toISOString(),
            is_owner: true,
          },
        ];

    let updatedList: EventStaffMember[];
    if (editingStaffId) {
      updatedList = currentStaff.map((s) =>
        s.id === editingStaffId
          ? {
              ...s,
              name: staffDrawerName.trim(),
              email: staffDrawerEmail.trim(),
              role: staffDrawerRole,
              gate: staffDrawerStation || "All Doors & Turnstiles",
              status: staffDrawerStatus,
            }
          : s
      );
      showToast(`Staff member "${staffDrawerName.trim()}" updated.`);
    } else {
      const newStaff: EventStaffMember = {
        id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: staffDrawerName.trim(),
        email: staffDrawerEmail.trim(),
        role: staffDrawerRole,
        gate: staffDrawerStation || "Gate A - Main Entrance",
        status: staffDrawerStatus,
        added_at: new Date().toISOString(),
      };
      updatedList = [...currentStaff, newStaff];
      showToast(`Staff member "${staffDrawerName.trim()}" invited.`);
    }

    const updatedEvent: EventItem = {
      ...event,
      staff_members: updatedList,
    };
    setEvent(updatedEvent);
    saveEvent(updatedEvent);
    setIsStaffDrawerOpen(false);
    setEditingStaffId(null);
  };

  const handleRemoveStaff = (staffId: string) => {
    if (!event) return;
    const currentStaff: EventStaffMember[] = (event.staff_members && event.staff_members.length > 0)
      ? event.staff_members
      : [
          {
            id: event.organizer_id || "lead_owner",
            name: event.hosts?.[0] || "Lead Event Organizer",
            email: "event-director@hackways.internal",
            role: "Event Owner & Director",
            gate: "All Doors & Turnstiles",
            status: "ACTIVE",
            added_at: event.created_at || new Date().toISOString(),
            is_owner: true,
          },
        ];

    const target = currentStaff.find((s) => s.id === staffId);
    if (!target) return;

    const filtered = currentStaff.filter((s) => s.id !== staffId);
    const updatedEvent: EventItem = {
      ...event,
      staff_members: filtered,
    };
    setEvent(updatedEvent);
    saveEvent(updatedEvent);
    showToast(`Staff member "${target.name}" removed from event.`);
  };

  const [isManualPassDrawerOpen, setIsManualPassDrawerOpen] = useState(false);
  const [manualPassName, setManualPassName] = useState("");
  const [manualPassEmail, setManualPassEmail] = useState("");
  const [manualPassTier, setManualPassTier] = useState("General Admission");
  const [manualPassType, setManualPassType] = useState("Complimentary VIP Guest");

  // Invite with email IDs state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteTierId, setInviteTierId] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Analytics timeframe state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"7d" | "24h" | "30d">("7d");
  const [recordedViews, setRecordedViews] = useState<EventPageView[]>([]);

  // New ticket state: Default is Free, Paid starts at ₹0 with custom adjustment
  const [newTierName, setNewTierName] = useState("");
  const [newTierIsPaid, setNewTierIsPaid] = useState(false);
  const [newTierPrice, setNewTierPrice] = useState("0");
  const [newTierCap, setNewTierCap] = useState("100");

  const handleOpenEditTier = (t: EventTicketTier) => {
    setEditingTier(t);
    setTierDrawerName(t.name);
    const isPaid = Number(t.price) > 0;
    setTierDrawerIsPaid(isPaid);
    setTierDrawerPrice(String(t.price || 0));
    setTierDrawerCap(String(t.inventory));
    setTierDrawerStatus(t.status === "DISABLED" ? "DISABLED" : "ACTIVE");
    setTierDrawerApprovalMode(t.approvalMode || "AUTO_APPROVE");
    setTierDrawerSalesStart(t.salesStart || new Date().toISOString().split("T")[0]);
    setTierDrawerSalesEnd(t.salesEnd || editStartTime?.split("T")[0] || "");
    setTierDrawerTab("details");
    setIsTierDrawerOpen(true);
  };

  const handleOpenCreateTier = () => {
    setEditingTier(null);
    setTierDrawerName("");
    setTierDrawerIsPaid(false); // Default: Free
    setTierDrawerPrice("");
    setTierDrawerCap("");
    setTierDrawerStatus("ACTIVE");
    setTierDrawerApprovalMode("AUTO_APPROVE");
    setTierDrawerSalesStart(new Date().toISOString().split("T")[0]);
    setTierDrawerSalesEnd(editStartTime?.split("T")[0] || "");
    setTierDrawerTab("details");
    setIsTierDrawerOpen(true);
  };

  const handleSaveTierFromDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierDrawerName.trim()) return;
    const priceNum = tierDrawerIsPaid ? Math.max(0, Number(tierDrawerPrice) || 0) : 0;
    const capNum = Math.max(1, Number(tierDrawerCap) || 100);
    const startStr = tierDrawerSalesStart || new Date().toISOString().split("T")[0];
    const endStr = tierDrawerSalesEnd || editStartTime?.split("T")[0] || "";

    let nextTiers: EventTicketTier[];
    if (editingTier) {
      nextTiers = tiers.map((t) =>
        t.id === editingTier.id
          ? {
              ...t,
              name: tierDrawerName.trim(),
              price: priceNum,
              inventory: capNum,
              available: Math.max(0, capNum - t.sold),
              status: tierDrawerStatus,
              approvalMode: tierDrawerApprovalMode,
              salesStart: startStr,
              salesEnd: endStr,
            }
          : t
      );
      showToast(`Ticket tier "${tierDrawerName.trim()}" updated.`);
    } else {
      const newT: EventTicketTier = {
        id: `tkt_${Date.now()}`,
        name: tierDrawerName.trim(),
        price: priceNum,
        inventory: capNum,
        sold: 0,
        available: capNum,
        salesStart: startStr,
        salesEnd: endStr,
        status: tierDrawerStatus,
        approvalMode: tierDrawerApprovalMode,
      };
      nextTiers = [...tiers, newT];
      showToast(`Created ticket tier "${newT.name}".`);
    }

    setTiers(nextTiers);
    const currentEvent: EventItem = event || {
      id: eventId,
      title: "New Event",
      description: "",
      organizer_id: "org_current",
      start_time: new Date().toISOString(),
      location: "Online",
      status: "DRAFT",
      total_capacity: capNum,
      created_at: new Date().toISOString(),
      tiers: [],
    };
    const updated: EventItem = {
      ...currentEvent,
      tiers: nextTiers.map((t) => ({
        id: t.id,
        event_id: eventId,
        name: t.name,
        price_cents: t.price * 100,
        total_capacity: t.inventory,
        remaining_capacity: t.available,
        approval_mode: t.approvalMode,
      })),
      total_capacity: nextTiers.reduce((s, t) => s + t.inventory, 0),
      custom_questions: customQuestions,
    };
    saveEvent(updated);
    setEvent(updated);
    setIsTierDrawerOpen(false);
  };

  const handleDuplicateTier = (tierId: string) => {
    const source = tiers.find((t) => t.id === tierId);
    if (!source) return;
    const duplicated: EventTicketTier = {
      id: `tkt_${Date.now()}_copy`,
      name: `${source.name} (Copy)`,
      price: source.price,
      inventory: source.inventory,
      sold: 0,
      available: source.inventory,
      salesStart: source.salesStart,
      salesEnd: source.salesEnd,
      status: "ACTIVE",
      approvalMode: source.approvalMode || "AUTO_APPROVE",
    };
    const nextTiers = [...tiers, duplicated];
    setTiers(nextTiers);
    if (event) {
      const updated: EventItem = {
        ...event,
        tiers: nextTiers.map((t) => ({
          id: t.id,
          event_id: eventId,
          name: t.name,
          price_cents: t.price * 100,
          total_capacity: t.inventory,
          remaining_capacity: t.available,
          approval_mode: t.approvalMode,
        })),
        total_capacity: nextTiers.reduce((s, t) => s + t.inventory, 0),
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast(`Ticket tier "${source.name}" duplicated.`);
  };

  const handleDeleteTier = (tierId: string) => {
    const target = tiers.find((t) => t.id === tierId);
    if (!target) return;

    // Check for active registrations: ticket cannot be deleted when there is an active registration
    const activeCount = attendees.filter(
      (a) =>
        (a.tierId === tierId || a.tierName?.toLowerCase() === target.name.toLowerCase()) &&
        (a.status === "CONFIRMED" || a.status === "CHECKED_IN")
    ).length;

    const totalSoldOrActive = Math.max(target.sold, activeCount);
    if (totalSoldOrActive > 0) {
      showToast(
        `Cannot delete "${target.name}": There are ${totalSoldOrActive} active registration(s). You can disable sales instead.`
      );
      return;
    }

    const nextTiers = tiers.filter((t) => t.id !== tierId);
    setTiers(nextTiers);
    if (event) {
      const updated: EventItem = {
        ...event,
        tiers: nextTiers.map((t) => ({
          id: t.id,
          event_id: eventId,
          name: t.name,
          price_cents: t.price * 100,
          total_capacity: t.inventory,
          remaining_capacity: t.available,
        })),
        total_capacity: nextTiers.reduce((s, t) => s + t.inventory, 0),
      };
      saveEvent(updated);
      setEvent(updated);
    }
    if (editingTier?.id === tierId) {
      setIsTierDrawerOpen(false);
    }
    showToast(`Ticket tier "${target.name}" deleted successfully.`);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionLabel.trim()) return;
    const opts =
      newQuestionType === "select" || newQuestionType === "multiselect" || newQuestionType === "radio"
        ? newQuestionOptions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingQuestionId) {
      const existing = customQuestions.find((q) => q.id === editingQuestionId);
      const nextQuestions = customQuestions.map((q) => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            label: newQuestionLabel.trim(),
            type: newQuestionType,
            required: newQuestionRequired,
            placeholder: newQuestionPlaceholder.trim() || undefined,
            options: opts,
            condition: existing?.condition,
          };
        }
        return q;
      });
      setCustomQuestions(nextQuestions);
      setEditingQuestionId(null);
      setNewQuestionLabel("");
      setNewQuestionPlaceholder("");
      setNewQuestionOptions("");
      setNewQuestionRequired(false);
      if (event) {
        const updated: EventItem = {
          ...event,
          custom_questions: nextQuestions,
        };
        saveEvent(updated);
        setEvent(updated);
      }
      showToast("Registration question updated successfully.");
      return;
    }

    const newQ: RSVPQuestion = {
      id: `q_${Date.now()}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      placeholder: newQuestionPlaceholder.trim() || undefined,
      options: opts,
    };
    const nextQuestions = [...customQuestions, newQ];
    setCustomQuestions(nextQuestions);
    setNewQuestionLabel("");
    setNewQuestionPlaceholder("");
    setNewQuestionOptions("");
    setNewQuestionRequired(false);
    if (event) {
      const updated: EventItem = {
        ...event,
        custom_questions: nextQuestions,
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast(`Added registration question: "${newQ.label}"`);
  };

  const handleStartEditQuestion = (q: RSVPQuestion) => {
    setEditingQuestionId(q.id);
    setNewQuestionLabel(q.label);
    setNewQuestionType(q.type);
    setNewQuestionPlaceholder(q.placeholder || "");
    setNewQuestionOptions(q.options?.join(", ") || "");
    setNewQuestionRequired(q.required);
    const formEl = document.getElementById("registration-question-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setNewQuestionLabel("");
    setNewQuestionPlaceholder("");
    setNewQuestionOptions("");
    setNewQuestionRequired(false);
  };

  const handleSelectQuestionForCondition = (qId: string) => {
    setSelectedConditionalQId(qId);
    const targetQ = customQuestions.find((q) => q.id === qId);
    if (targetQ?.condition) {
      setCondTier(targetQ.condition.ticket_tier_id || "ALL");
      setCondDependsOn(targetQ.condition.depends_on_question_id || "");
      setCondOperator(targetQ.condition.operator || "equals");
      setCondExpectedValue(targetQ.condition.expected_value || "");
    } else {
      setCondTier("ALL");
      setCondDependsOn("");
      setCondOperator("equals");
      setCondExpectedValue("");
    }
  };

  const handleSaveQuestionCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConditionalQId) {
      showToast("Please select a target question to configure rules.");
      return;
    }

    const hasAnyRule = condTier !== "ALL" || Boolean(condDependsOn);
    const condition = hasAnyRule
      ? {
          ticket_tier_id: condTier !== "ALL" ? condTier : undefined,
          depends_on_question_id: condDependsOn || undefined,
          operator: condDependsOn ? condOperator : undefined,
          expected_value: condDependsOn && condOperator !== "is_answered" ? condExpectedValue.trim() : undefined,
        }
      : undefined;

    const nextQuestions = customQuestions.map((q) =>
      q.id === selectedConditionalQId ? { ...q, condition } : q
    );
    setCustomQuestions(nextQuestions);
    if (event) {
      const updated: EventItem = {
        ...event,
        custom_questions: nextQuestions,
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast(hasAnyRule ? "Conditional display rule saved." : "Conditional rules cleared for question.");
  };

  const handleRemoveQuestionCondition = (qId: string) => {
    const nextQuestions = customQuestions.map((q) =>
      q.id === qId ? { ...q, condition: undefined } : q
    );
    setCustomQuestions(nextQuestions);
    if (qId === selectedConditionalQId) {
      setCondTier("ALL");
      setCondDependsOn("");
      setCondOperator("equals");
      setCondExpectedValue("");
    }
    if (event) {
      const updated: EventItem = {
        ...event,
        custom_questions: nextQuestions,
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast("Conditional rule removed.");
  };

  const handleDeleteQuestion = (questionId: string) => {
    const nextQuestions = customQuestions.filter((q) => q.id !== questionId);
    setCustomQuestions(nextQuestions);
    if (event) {
      const updated: EventItem = {
        ...event,
        custom_questions: nextQuestions,
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast("Registration question removed.");
  };

  const handleToggleQuestionRequired = (questionId: string) => {
    const nextQuestions = customQuestions.map((q) =>
      q.id === questionId ? { ...q, required: !q.required } : q
    );
    setCustomQuestions(nextQuestions);
    if (event) {
      const updated: EventItem = {
        ...event,
        custom_questions: nextQuestions,
      };
      saveEvent(updated);
      setEvent(updated);
    }
  };

  // Handlers for Banner and Media Assets Upload — persisted to permanent
  // storage via /api/v1/uploads (see lib/imageUpload) instead of being held
  // as base64 data URIs, which never survived a hard refresh and bloated the
  // event record enough to crash SSR.
  const handleBannerFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const url = await readImageFile(file);
      setEditBannerUrl(url);
      const newAsset: MediaAsset = {
        id: `asset_${Date.now()}`,
        name: file.name,
        url,
        uploaded_at: new Date().toISOString(),
        size: `${(file.size / 1024).toFixed(1)} KB`,
      };
      setMediaAssets((prev) => [newAsset, ...prev]);
      showToast(`Banner "${file.name}" uploaded successfully.`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Failed to upload image.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSquareBannerFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingSquareBanner(true);
    try {
      const url = await readImageFile(file);
      setEditSquareBannerUrl(url);
      const newAsset: MediaAsset = {
        id: `asset_${Date.now()}`,
        name: file.name,
        url,
        uploaded_at: new Date().toISOString(),
        size: `${(file.size / 1024).toFixed(1)} KB`,
      };
      setMediaAssets((prev) => [newAsset, ...prev]);
      showToast(`1:1 Square banner "${file.name}" uploaded successfully.`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Failed to upload image.");
    } finally {
      setIsUploadingSquareBanner(false);
    }
  };

  const handleMultipleAssetsUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingAsset(true);
    const fileArray = Array.from(files);
    try {
      const newAssets = await Promise.all(
        fileArray.map(async (file) => ({
          id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: await readImageFile(file),
          uploaded_at: new Date().toISOString(),
          size: `${(file.size / 1024).toFixed(1)} KB`,
        }))
      );
      setMediaAssets((prev) => [...newAssets, ...prev]);
      showToast(`${fileArray.length} asset${fileArray.length > 1 ? "s" : ""} added to event gallery.`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Failed to upload one or more images.");
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    setMediaAssets((prev) => {
      const filtered = prev.filter((a) => a.id !== assetId);
      return filtered;
    });
    showToast("Asset removed from gallery.");
  };

  const handleSetAssetAsBanner = (asset: MediaAsset) => {
    setEditBannerUrl(asset.url);
    showToast(`"${asset.name}" set as 16:9 event banner.`);
  };

  const handleSetAssetAsSquareBanner = (asset: MediaAsset) => {
    setEditSquareBannerUrl(asset.url);
    showToast(`"${asset.name}" set as 1:1 square banner.`);
  };

  const handleSaveEventSetup = () => {
    if (!event) return;
    const totalCap = tiers.reduce((sum, t) => sum + (Number(t.inventory) || 0), 0);
    const minSize = Math.max(1, Number(editTeamMinSize) || 2);
    const maxSize = Math.max(minSize, Number(editTeamMaxSize) || 4);
    const cleanSlug =
      editSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/^-+|-+$/g, "") ||
      (editTitle.trim()
        ? editTitle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .replace(/^-+|-+$/g, "")
        : event.slug || event.id);

    const updated: EventItem = {
      ...event,
      title: editTitle.trim() || event.title,
      slug: cleanSlug,
      description: editDescription.trim(),
      location: editLocation.trim(),
      start_time: editStartTime || event.start_time,
      banner_url: editBannerUrl,
      square_banner_url: editSquareBannerUrl,
      media_assets: mediaAssets,
      category: editCategory,
      visibility: isCommunityPrivate ? "PRIVATE" : editVisibility,
      channel_is_private: isCommunityPrivate,
      team_registration_enabled: editTeamEnabled,
      team_min_size: minSize,
      team_max_size: maxSize,
      end_time: editEndTime.trim() || undefined,
      page_theme: editPageTheme === "auto" ? undefined : editPageTheme,
      schedule: editSchedule.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim(), time: s.time.trim(), description: s.description?.trim() || undefined })),
      faqs: editFaqs.filter((f) => f.question.trim() && f.answer.trim()).map((f) => ({ ...f, question: f.question.trim(), answer: f.answer.trim() })),
      contact_email: editContactEmail.trim() || undefined,
      contact_phone: editContactPhone.trim() || undefined,
      tiers: tiers.map((t) => ({
        id: t.id,
        event_id: eventId,
        name: t.name,
        price_cents: t.price * 100,
        total_capacity: t.inventory,
        remaining_capacity: t.available,
        approval_mode: t.approvalMode,
      })),
      total_capacity: totalCap,
      custom_questions: customQuestions,
    };
    saveEvent(updated);
    setEvent(updated);
    setEditSlug(cleanSlug);
    showToast("Event configuration saved successfully.");
  };

  const handleConfirmDeleteCurrentEvent = () => {
    if (!event) return;
    if (deleteConfirmName.trim() !== event.title.trim()) {
      showToast("Event title does not match. Please enter exact title to confirm.");
      return;
    }

    setIsDeleting(true);
    deleteEvent(event.id, "Deleted by organizer via Event Settings");
    showToast(`Event "${event.title}" deleted. Records archived for Super Admin.`);
    setIsDeleteModalOpen(false);
    router.push("/console/organizer/events");
  };

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim()) return;
    const priceNum = newTierIsPaid ? Math.max(0, Number(newTierPrice) || 0) : 0;
    const capNum = Number(newTierCap) || 100;
    const newTierItem: EventTicketTier = {
      id: `tkt_${Date.now()}`,
      name: newTierName.trim(),
      price: priceNum,
      inventory: capNum,
      sold: 0,
      available: capNum,
      salesStart: new Date().toISOString().split("T")[0],
      salesEnd: editStartTime || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    };
    const nextTiers = [...tiers, newTierItem];
    setTiers(nextTiers);
    setNewTierName("");
    setNewTierIsPaid(false);
    setNewTierPrice("0");
    if (event) {
      const updated: EventItem = {
        ...event,
        tiers: nextTiers.map((t) => ({
          id: t.id,
          event_id: eventId,
          name: t.name,
          price_cents: t.price * 100,
          total_capacity: t.inventory,
          remaining_capacity: t.available,
        })),
        total_capacity: nextTiers.reduce((s, t) => s + t.inventory, 0),
      };
      saveEvent(updated);
      setEvent(updated);
    }
    showToast(`Created ticket tier "${newTierName.trim()}"`);
  };

  const handleSavePrice = (tierId: string) => {
    const val = Number(tempPrice);
    if (!isNaN(val) && val >= 0) {
      setTiers(tiers.map((t) => (t.id === tierId ? { ...t, price: val } : t)));
      showToast(`Updated tier price to INR ${val.toLocaleString()}`);
    }
    setEditingPriceId(null);
  };

  const handleToggleTier = (id: string) => {
    const updated = tiers.map((t) =>
      t.id === id
        ? { ...t, status: (t.status === "DISABLED" ? "ACTIVE" : "DISABLED") as "ACTIVE" | "DISABLED" | "SOLD_OUT" }
        : t
    );
    setTiers(updated);
    const target = updated.find((t) => t.id === id);
    if (target) {
      showToast(`${target.name} tier is now ${target.status}`);
    }
  };

  const handleRefundOrder = (id: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: "REFUNDED" } : o))
    );
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: "REFUNDED" });
    }
  };

  const handleScanTicket = (code: string) => {
    if (!code.trim()) return;
    const clean = code.trim().toUpperCase();
    const found = attendees.find((a) => a.ticketCode.toUpperCase() === clean);
    if (!found) {
      setScanMessage(`Invalid Pass: Code "${clean}" not found.`);
      return;
    }
    if (found.status === "CHECKED_IN") {
      setScanMessage(`Already Admitted: ${found.name} checked in at ${found.checkedInAt || "earlier"}.`);
      return;
    }
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendees(
      attendees.map((a) =>
        a.id === found.id
          ? { ...a, status: "CHECKED_IN", checkedInAt: timeNow, entrance: "Gate A" }
          : a
      )
    );
    setScanMessage(`Verified: ${found.name} (${found.tierName}) Admitted at ${timeNow}`);
    setManualCode("");
  };

  const handleApproveAttendee = (attId: string) => {
    const res = approveAttendee(attId);
    if (res.success) {
      setAttendees(getEventAttendees(eventId));
      getEvent(eventId).then((ev) => {
        if (ev) setEvent(ev);
      });
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleRejectAttendee = (attId: string) => {
    const res = rejectAttendee(attId);
    if (res.success) {
      setAttendees(getEventAttendees(eventId));
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleConfirmCancelRegistration = () => {
    if (!cancellingAttendee) return;
    setIsCancellingAttendee(true);
    try {
      const res = cancelAttendeeRegistration(cancellingAttendee.id, cancelReason.trim());
      if (res.success) {
        setAttendees(getEventAttendees(eventId));
        getEvent(eventId).then((ev) => {
          if (ev) setEvent(ev);
        });
        showToast(res.message);
        setCancellingAttendee(null);
        setCancelReason("");
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to cancel registration.");
    } finally {
      setIsCancellingAttendee(false);
    }
  };

  const handleSendInvites = () => {
    if (!inviteEmails.trim() || !event) return;
    setIsSendingInvites(true);
    try {
      const emailList = Array.from(
        new Set(
          inviteEmails
            .split(/[\n,;\s]+/)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 3 && e.includes("@"))
        )
      );

      if (emailList.length === 0) {
        showToast("Please enter at least one valid email address");
        setIsSendingInvites(false);
        return;
      }

      const tier = event.tiers.find((t) => t.id === inviteTierId) || event.tiers[0];
      const nowIso = new Date().toISOString();

      const newAttendees: StoredAttendee[] = emailList.map((email, idx) => ({
        id: `att_${Date.now()}_${idx}`,
        eventId: event.id,
        name: email.split("@")[0].replace(/[._-]/g, " "),
        email,
        tierName: tier?.name || "General Admission",
        tierId: tier?.id || "tier_default",
        ticketCode: `HKW-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        priceFormatted: "INVITED",
        status: "CONFIRMED",
        approvalMode: "AUTO_APPROVE",
        registeredAt: nowIso,
      }));

      const raw = localStorage.getItem("hackways_attendees_v6");
      const existing = raw ? JSON.parse(raw) : [];
      localStorage.setItem("hackways_attendees_v6", JSON.stringify([...newAttendees, ...existing]));

      setAttendees((prev) => [...newAttendees, ...prev]);
      window.dispatchEvent(new CustomEvent("hackways_attendees_updated"));

      showToast(`Invited ${emailList.length} attendee${emailList.length > 1 ? "s" : ""} successfully.`);
      setIsInviteModalOpen(false);
      setInviteEmails("");
      setInviteNote("");
    } catch {
      showToast("Failed to process invitations.");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchQuery =
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.toLowerCase().includes(orderSearch.toLowerCase());
    if (ordersSubtab === "paid") return matchQuery && o.status === "SETTLED";
    if (ordersSubtab === "refunded") return matchQuery && o.status === "REFUNDED";
    return matchQuery;
  });

  const filteredAttendees = attendees
    .filter((a, idx, arr) => arr.findIndex((x) => x.email.trim().toLowerCase() === a.email.trim().toLowerCase()) === idx)
    .filter((a) => {
      const matchQuery =
        a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        a.ticketCode.toLowerCase().includes(attendeeSearch.toLowerCase());
      if (attendeesSubtab === "confirmed") return matchQuery && (a.status === "CONFIRMED" || a.status === "CHECKED_IN");
      if (attendeesSubtab === "checked_in") return matchQuery && a.status === "CHECKED_IN";
      if (attendeesSubtab === "pending_approval") return matchQuery && a.status === "PENDING_APPROVAL";
      if (attendeesSubtab === "waitlist") return matchQuery && a.status === "WAITLIST";
      if (attendeesSubtab === "vip") return matchQuery && a.isVip;
      if (attendeesSubtab === "speakers") return matchQuery && a.isSpeaker;
      if (attendeesSubtab === "cancelled") return matchQuery && (a.status === "CANCELLED" || a.status === "REFUNDED");
      return matchQuery;
    });

  const pendingApprovalCount = attendees.filter((a) => a.status === "PENDING_APPROVAL").length;
  const waitlistCount = attendees.filter((a) => a.status === "WAITLIST").length;
  const cancelledCount = attendees.filter((a) => a.status === "CANCELLED" || a.status === "REFUNDED").length;

  const totalCapacity = tiers.reduce((sum, t) => sum + (Number(t.inventory) || 0), 0) || event?.total_capacity || 0;
  const activeAttendees = attendees.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN");
  const totalTicketsSold = activeAttendees.length > 0 ? activeAttendees.length : tiers.reduce((sum, t) => sum + (t.sold || 0), 0);
  const ticketsRemaining = Math.max(0, totalCapacity - totalTicketsSold);
  const totalGrossSales = orders.reduce((sum, o) => sum + (o.amount || 0), 0) || tiers.reduce((sum, t) => sum + (t.sold * t.price), 0);
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const capacityPct = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;
  const turnoutPct = totalTicketsSold > 0 ? Math.round((checkedInCount / totalTicketsSold) * 100) : 0;
  const platformFeePct = platformSettings?.platformFeePercent ?? 3;

  // Marketing surfaces: zero-value stat cards stay hidden until real data exists.
  const marketingStatsGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {totalGrossSales > 0 && (
        <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
          <div className="text-xs text-zinc-500 font-heading font-medium">Attributed Sales</div>
          <div className="text-2xl font-extrabold text-zinc-950 tabular-nums font-heading">
            ₹{totalGrossSales.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400 font-body">Direct checkout and organic conversion</p>
        </div>
      )}
      <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
        <div className="text-xs text-zinc-500 font-heading font-medium">Campaign Referral Link</div>
        <div className="text-xs font-mono font-bold text-zinc-900 truncate">
          hackways.com/events/{eventId}
        </div>
        <p className="text-[11px] text-zinc-400 font-body">Primary public pass url</p>
      </div>
    </div>
  );
  const marketingPromoPanel = (
    <div className="p-6 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-950 font-heading">Promo Codes & Discounts</h3>
        <button
          type="button"
          onClick={() => showToast("Promo code feature: Add custom codes in event settings.")}
          className="btn-secondary text-xs"
        >
          <span>Add Promo Code</span>
        </button>
      </div>
      <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
        <div className="mb-3"><DashboardArtwork kind="broadcast" /></div>
        <p className="text-xs font-semibold text-zinc-800 font-heading">No Active Promo Codes or Campaigns</p>
        <p className="text-[11px] text-zinc-500 max-w-xs mt-0.5 font-body">
          Create coupon codes and tracking parameters to accelerate registrations through partner channels.
        </p>
      </div>
    </div>
  );

  if (!event) {
    return (
      <div className="space-y-3 py-8">
        {isLoading ? <PageSkeleton rows={4} /> : <p className="text-sm text-zinc-600">Event not found.</p>}
        {!isLoading && <Link href={mobileView ? "/my-events" : "/console/organizer/events"} className="text-sm underline">Back to events</Link>}
      </div>
    );
  }

  return (
    <div className={mobileView ? mobileStyles.content : "space-y-6 max-w-6xl"} data-mobile-event-dashboard={mobileView || undefined}>
      {activeTab === "overview" && mobileView && <MobileEventOverview event={event} registrations={totalTicketsSold} checkedIn={checkedInCount} remaining={ticketsRemaining} />}
      {/* ------------------------------------------------------------------ */}
      {/* 1. OVERVIEW                                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "overview" && !mobileView && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <span>
                  {event?.time_display ||
                    (event?.start_time
                      ? new Date(event.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Date TBD")}
                </span>
                <span className="text-zinc-300">•</span>
                <span>{event?.location || "Venue TBD"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading mt-1.5">
                {event?.title || "Event Dashboard"}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body line-clamp-1 max-w-2xl">
                {event?.description?.split("\n")[0]?.slice(0, 120) || "Event dashboard"}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href={`/events/${event?.slug || eventId}`}
                target="_blank"
                className="btn-secondary group"
              >
                <span>Preview Public Pass</span>
                <ArrowRightIcon size={12} className="-rotate-45 text-zinc-400 group-hover:text-zinc-800 transition-transform" />
              </Link>
              <Link
                href={`${consoleBase}/setup`}
                className="btn-primary"
              >
                <PresentationIcon size={13} className="text-zinc-400" />
                <span>Edit Event Setup</span>
              </Link>
            </div>
          </div>

          {/* 4 Core KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-zinc-200/80 pb-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Tickets Sold</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-heading tracking-tight tabular-nums">
                {totalTicketsSold.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-body">
                {capacityPct}% total capacity
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Tickets Remaining</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-heading tracking-tight tabular-nums">
                {ticketsRemaining.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-body">
                across {tiers.length} {tiers.length === 1 ? "tier" : "tiers"}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Gross Sales</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-heading tracking-tight tabular-nums">
                ₹{totalGrossSales >= 100000 ? `${(totalGrossSales / 100000).toFixed(1)}L` : totalGrossSales.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 font-body">
                {orders.length} verified {orders.length === 1 ? "order" : "orders"}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Door Turnout</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-heading tracking-tight tabular-nums">
                {checkedInCount} / {totalTicketsSold}
              </div>
              <div className="text-[11px] text-zinc-400 font-body">
                {turnoutPct}% checked in
              </div>
            </div>
          </div>

          {/* Sales Breakdown by Ticket Tier & Live Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Sales by Ticket Type */}
            <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 font-heading tracking-tight">Sales by Ticket Type</h3>
                  <p className="text-xs text-zinc-500 font-body">Inventory allocation and velocity</p>
                </div>
                <span className="text-xs font-medium text-zinc-400 font-heading">
                  {tiers.length} Active {tiers.length === 1 ? "Tier" : "Tiers"}
                </span>
              </div>

              {tiers.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-zinc-200 rounded-lg">
                  <p className="text-xs text-zinc-500">No ticket tiers created yet for this event.</p>
                  <button
                    type="button"
                    onClick={() => setIsTierDrawerOpen(true)}
                    className="btn-secondary text-xs inline-flex items-center gap-1.5"
                  >
                    <TicketIcon size={13} className="text-zinc-400" />
                    <span>Add Ticket Tier</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tiers.map((t) => {
                    const pct = t.inventory > 0 ? Math.round((t.sold / t.inventory) * 100) : 0;
                    return (
                      <div key={t.id} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="text-zinc-900 font-semibold font-heading">{t.name}</span>
                          <span className="text-zinc-600 tabular-nums font-body">
                            {t.sold} / {t.inventory} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Live Event Activity Stream */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950 font-heading tracking-tight">Live Event Activity</h3>
                <span className="text-[11px] text-zinc-400 font-mono">Real-time</span>
              </div>
              {orders.length === 0 && attendees.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400 font-body">
                  No activity recorded yet. Orders and check-ins will appear here live.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 text-xs">
                  {orders.slice(0, 4).map((o) => (
                    <div key={o.id} className="py-2 space-y-0.5">
                      <p className="text-zinc-800 font-medium font-body">
                        Order #{o.id.slice(-6)} placed ({o.tier || "Pass"})
                      </p>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span className="font-body">{o.customer}</span>
                        <span className="tabular-nums font-body">₹{Number(o.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {attendees
                    .filter((a) => a.status === "CHECKED_IN")
                    .slice(0, 4)
                    .map((a) => (
                      <div key={`chk_${a.id}`} className="py-2 space-y-0.5">
                        <p className="text-zinc-800 font-medium font-body">Admitted at gate turnstile</p>
                        <div className="flex justify-between text-[11px] text-zinc-400">
                          <span className="font-body">{a.name}</span>
                          <span className="tabular-nums font-body">{a.checkedInAt || "Door"}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. EVENT SETUP                                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "setup" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Event Setup & Details
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
                Configure basic information, date & time, venue, public landing page, and SEO settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveEventSetup}
                className="btn-secondary"
              >
                <CheckCircleIcon size={14} className="text-zinc-400" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (event) {
                    const updated = { ...event, status: "PUBLISHED" as const };
                    saveEvent(updated);
                    setEvent(updated);
                  }
                  handleSaveEventSetup();
                  showToast("Event published live to platform directory.");
                }}
                className="btn-primary"
              >
                <ZapIcon size={13} className="text-zinc-400" />
                <span>Publish Event</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto">
            {[
              { id: "basic", label: "Basic Information" },
              { id: "datetime", label: "Date & Time" },
              { id: "venue", label: "Venue & Address" },
              { id: "page", label: "Event Page & Media" },
              { id: "content", label: "Content & Theme" },
              { id: "seo", label: "SEO & Social" },
              { id: "settings", label: "Registration Rules" },
            ].map((sub) => {
              const isActive = setupSubtab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSetupSubtab(sub.id as any)}
                  className={`relative pb-3 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{sub.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Setup Subtab Content - Clean SaaS Settings Layout */}
          <div className="max-w-2xl border border-[#e8eaed] rounded-lg bg-white overflow-hidden">
            <div className="p-6 space-y-6">
              {setupSubtab === "basic" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Basic information
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Name, description, and primary host details for this event.
                    </p>
                  </div>

                  {/* Event Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="dashboard-event-name" className="text-xs font-medium text-zinc-700">
                      Event name
                    </label>
                    <input
                      id="dashboard-event-name"
                      type="text"
                      value={editTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTitle(val);
                        if (!isCustomSlugEdited) {
                          setEditSlug(
                            val
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+|-+$/g, "")
                          );
                        }
                      }}
                      placeholder="e.g. NextGen Engineering Summit"
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 transition"
                    />
                  </div>

                  {/* Event URL Slug */}
                  <div className="space-y-2 p-3.5 rounded-lg border border-zinc-200/80 bg-zinc-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-zinc-900">
                          Event URL slug
                        </label>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-700">
                          Public Permlink
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "https://hackways.com";
                            const link = `${origin}/events/${editSlug || eventId}`;
                            navigator.clipboard.writeText(link);
                            showToast("Public event link copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200/60 transition"
                        >
                          <CopyIcon size={12} className="text-zinc-500" />
                          <span>Copy Link</span>
                        </button>
                        <Link
                          href={`/events/${editSlug || eventId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200/60 transition"
                        >
                          <span>Visit</span>
                          <ArrowRightIcon size={11} className="-rotate-45 text-zinc-400" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center rounded-md border border-zinc-300 bg-white shadow-sm overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900/10 transition">
                      <span className="text-xs text-zinc-400 font-mono px-3 py-2 bg-zinc-50 border-r border-zinc-200 select-none">
                        hackways.com/events/
                      </span>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => {
                          setIsCustomSlugEdited(true);
                          setEditSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-_]/g, "-")
                              .replace(/--+/g, "-")
                          );
                        }}
                        placeholder="your-event-slug"
                        className="flex-1 px-3 py-2 text-xs font-mono font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                      />
                    </div>

                    <p className="text-[11px] text-zinc-500">
                      Customize this URL so guests and sponsors can access your public event landing page directly.
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Brief overview of event agenda and speakers..."
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 transition resize-y min-h-[72px] leading-relaxed"
                    />
                    <p className="text-[11px] text-zinc-500">
                      A short summary displayed on public listings and search results.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Category
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      >
                        <option value="Technology & Engineering">Technology & Engineering</option>
                        <option value="Developer Conference">Developer Conference</option>
                        <option value="Executive Keynote">Executive Keynote</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Cloud Architecture">Cloud Architecture</option>
                        <option value="Meetup & Networking">Meetup & Networking</option>
                        <option value="Design & Creative">Design & Creative</option>
                      </select>
                    </div>

                    {/* Organizer / Host Entity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Host organization
                      </label>
                      <div className="h-9 px-3 rounded-md border border-zinc-200 bg-zinc-50/70 flex items-center justify-between text-xs text-zinc-800">
                        <span className="font-medium truncate">
                          {event?.hosts?.[0] || event?.organizer_id || "Event Host"}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">Verified host</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {setupSubtab === "datetime" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Schedule & dates
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Event dates and operational time zone.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Start date & time
                      </label>
                      <input
                        type="datetime-local"
                        value={editStartTime ? editStartTime.slice(0, 16) : ""}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      >
                      </input>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700" htmlFor="event-end-time">
                        End time <span className="text-zinc-400 font-normal">Optional</span>
                      </label>
                      <input
                        id="event-end-time"
                        type="text"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        placeholder="e.g. 6:00 PM"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Time zone
                      </label>
                      <div className="h-9 px-3 rounded-md border border-zinc-200 bg-zinc-50/70 flex items-center text-xs text-zinc-800 font-mono">
                        Asia/Kolkata (IST • UTC+05:30)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {setupSubtab === "venue" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Venue & address
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Physical location printed on attendee passes.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Venue & location
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="e.g. BIEC Hall 3, Tumkur Road, Bengaluru"
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>
              )}

              {setupSubtab === "content" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Page content & theme
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Schedule, FAQs, contact details, and the look of your public event page.
                    </p>
                  </div>

                  {/* Page Theme Picker */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-zinc-700">Page theme</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {([
                        { id: "auto", label: "Auto", hint: "Matches artwork", swatch: "linear-gradient(135deg,#fafafa 50%,#090a0b 50%)", text: "#71717a" },
                        { id: "light", label: "Light", hint: "Clean, no glow", swatch: "#fafafa", text: "#202022" },
                        { id: "dark", label: "Dark", hint: "Clean, no glow", swatch: "#090a0b", text: "#f4f4f5" },
                        { id: "light-ambient", label: "Light ambient", hint: "Soft artwork glow", swatch: "linear-gradient(135deg,#fafafa 30%,#e8e4d8 100%)", text: "#202022" },
                        { id: "dark-ambient", label: "Dark ambient", hint: "Soft artwork glow", swatch: "linear-gradient(135deg,#090a0b 30%,#3a3423 100%)", text: "#f4f4f5" },
                        { id: "obsidian", label: "Obsidian", hint: "Pure black vignette", swatch: "#000", text: "#f4f4f5" },
                        { id: "sand", label: "Sand", hint: "Warm paper", swatch: "#f5f1e8", text: "#3f3a30" },
                      ] as { id: EventPageTheme; label: string; hint: string; swatch: string; text: string }[]).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEditPageTheme(t.id)}
                          aria-pressed={editPageTheme === t.id}
                          className={`rounded-lg border p-1.5 text-left transition ${
                            editPageTheme === t.id
                              ? "border-zinc-900 ring-1 ring-zinc-900"
                              : "border-zinc-200 hover:border-zinc-400"
                          }`}
                        >
                          <span className="block h-12 rounded-md border border-zinc-200/70" style={{ background: t.swatch }} aria-hidden="true" />
                          <span className="block text-xs font-semibold text-zinc-900 mt-1.5">{t.label}</span>
                          <span className="block text-[10px] text-zinc-500">{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-700">Schedule</label>
                      <button
                        type="button"
                        onClick={() => setEditSchedule((items) => [...items, { id: `sch_${Date.now()}`, time: "", title: "", description: "" }])}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        Add item
                      </button>
                    </div>
                    {editSchedule.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">No schedule items. Add sessions, talks, or breaks in order.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {editSchedule.map((item, idx) => (
                          <div key={item.id} className="flex items-start gap-2.5 rounded-lg border border-zinc-200 p-3">
                            <input
                              type="text"
                              value={item.time}
                              onChange={(e) => setEditSchedule((items) => items.map((s) => s.id === item.id ? { ...s, time: e.target.value } : s))}
                              placeholder="10:00 AM"
                              aria-label={`Schedule item ${idx + 1} time`}
                              className="w-20 shrink-0 bg-white border border-zinc-300 rounded-md px-2 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-900"
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => setEditSchedule((items) => items.map((s) => s.id === item.id ? { ...s, title: e.target.value } : s))}
                                placeholder="Session title"
                                aria-label={`Schedule item ${idx + 1} title`}
                                className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                              />
                              <input
                                type="text"
                                value={item.description || ""}
                                onChange={(e) => setEditSchedule((items) => items.map((s) => s.id === item.id ? { ...s, description: e.target.value } : s))}
                                placeholder="Details (optional)"
                                aria-label={`Schedule item ${idx + 1} details`}
                                className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditSchedule((items) => items.filter((s) => s.id !== item.id))}
                              aria-label={`Remove schedule item ${idx + 1}`}
                              className="p-1.5 text-zinc-400 hover:text-red-600 transition"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FAQ Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-700">FAQs</label>
                      <button
                        type="button"
                        onClick={() => setEditFaqs((items) => [...items, { id: `faq_${Date.now()}`, question: "", answer: "" }])}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        Add question
                      </button>
                    </div>
                    {editFaqs.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">No FAQs. Answer common attendee questions here.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {editFaqs.map((faq, idx) => (
                          <div key={faq.id} className="rounded-lg border border-zinc-200 p-3 space-y-1.5">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => setEditFaqs((items) => items.map((f) => f.id === faq.id ? { ...f, question: e.target.value } : f))}
                                placeholder="Question"
                                aria-label={`FAQ ${idx + 1} question`}
                                className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:outline-none focus:border-zinc-900"
                              />
                              <button
                                type="button"
                                onClick={() => setEditFaqs((items) => items.filter((f) => f.id !== faq.id))}
                                aria-label={`Remove FAQ ${idx + 1}`}
                                className="p-1.5 text-zinc-400 hover:text-red-600 transition"
                              >
                                <TrashIcon size={13} />
                              </button>
                            </div>
                            <textarea
                              value={faq.answer}
                              onChange={(e) => setEditFaqs((items) => items.map((f) => f.id === faq.id ? { ...f, answer: e.target.value } : f))}
                              placeholder="Answer"
                              rows={2}
                              aria-label={`FAQ ${idx + 1} answer`}
                              className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 resize-y"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-700">Contact details <span className="text-zinc-400 font-normal">Shown as “Questions?” on the event page</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        value={editContactEmail}
                        onChange={(e) => setEditContactEmail(e.target.value)}
                        placeholder="Contact email"
                        aria-label="Organizer contact email"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                      <input
                        type="tel"
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                        placeholder="Contact phone"
                        aria-label="Organizer contact phone"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {setupSubtab === "seo" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      URL & metadata
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Permalinks and social share previews.
                    </p>
                  </div>

                  {/* Public URL Link & Slug */}
                  <div className="space-y-2 p-3.5 rounded-lg border border-zinc-200/80 bg-zinc-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-zinc-900">
                          Public URL link
                        </label>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-700">
                          SEO Canonical
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "https://hackways.com";
                            const link = `${origin}/events/${editSlug || eventId}`;
                            navigator.clipboard.writeText(link);
                            showToast("Public event link copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200/60 transition"
                        >
                          <CopyIcon size={12} className="text-zinc-500" />
                          <span>Copy Link</span>
                        </button>
                        <Link
                          href={`/events/${editSlug || eventId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200/60 transition"
                        >
                          <span>Visit</span>
                          <ArrowRightIcon size={11} className="-rotate-45 text-zinc-400" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center rounded-md border border-zinc-300 bg-white shadow-sm overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900/10 transition">
                      <span className="text-xs text-zinc-400 font-mono px-3 py-2 bg-zinc-50 border-r border-zinc-200 select-none">
                        hackways.com/events/
                      </span>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => {
                          setIsCustomSlugEdited(true);
                          setEditSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-_]/g, "-")
                              .replace(/--+/g, "-")
                          );
                        }}
                        placeholder="your-event-slug"
                        className="flex-1 px-3 py-2 text-xs font-mono font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                      />
                    </div>

                    <p className="text-[11px] text-zinc-500">
                      The permanent address indexed by search engines and embedded in social share previews.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Page title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>
              )}

              {setupSubtab === "page" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Event artwork & banner
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Upload your primary event header banner and manage promotional media assets.
                    </p>
                  </div>

                  {/* Two Banners Section: Rule requires both 16:9 and 1:1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. 16:9 Landscape Banner */}
                    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-zinc-900">
                            16:9 Landscape Banner
                          </label>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            Hero & Featured
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomUrlOpen(!isCustomUrlOpen)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-800 underline transition"
                        >
                          {isCustomUrlOpen ? "Upload File" : "Image URL"}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Featured hero showcase on Explore, event header, and wide displays.
                      </p>

                      {isCustomUrlOpen ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editBannerUrl}
                            onChange={(e) => setEditBannerUrl(e.target.value)}
                            placeholder="https://... 16:9 image link"
                            aria-label="Landscape banner URL"
                            className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono text-[11px]"
                          />
                        </div>
                      ) : (
                        <div>
                          {editBannerUrl ? (
                            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 space-y-2 p-2.5">
                              <div className="relative aspect-16/9 w-full rounded-md overflow-hidden bg-zinc-900 border border-zinc-200 shadow-2xs">
                                <img
                                  src={editBannerUrl}
                                  alt="16:9 banner preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-zinc-500">Active 16:9 Banner</span>
                                <div className="flex items-center gap-2">
                                  <label className="btn-secondary cursor-pointer py-1 px-2.5 text-xs">
                                    <span>Replace</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleBannerFileUpload(e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setEditBannerUrl("")}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium px-1.5"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-zinc-50/50 hover:bg-zinc-50 transition cursor-pointer group">
                              <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:scale-105 transition-transform shadow-2xs">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <span className="text-xs font-semibold text-zinc-900 block">
                                  {isUploadingBanner ? "Uploading..." : "Upload 16:9 Banner"}
                                </span>
                                <span className="text-[10px] text-zinc-400">16:9 Landscape (e.g. 1600x900)</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingBanner}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleBannerFileUpload(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. 1:1 Square Banner */}
                    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-zinc-900">
                            1:1 Square Banner
                          </label>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            Poster & Card
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomSquareUrlOpen(!isCustomSquareUrlOpen)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-800 underline transition"
                        >
                          {isCustomSquareUrlOpen ? "Upload File" : "Image URL"}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Timeline event cards, compact mobile lists, and feed posters.
                      </p>

                      {isCustomSquareUrlOpen ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editSquareBannerUrl}
                            onChange={(e) => setEditSquareBannerUrl(e.target.value)}
                            placeholder="https://... 1:1 square image link"
                            aria-label="Square banner URL"
                            className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 font-mono text-[11px]"
                          />
                        </div>
                      ) : (
                        <div>
                          {editSquareBannerUrl ? (
                            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 space-y-2 p-2.5">
                              <div className="relative aspect-square max-w-[200px] mx-auto rounded-md overflow-hidden bg-zinc-900 border border-zinc-200 shadow-2xs">
                                <img
                                  src={editSquareBannerUrl}
                                  alt="1:1 banner preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-zinc-500">Active 1:1 Poster</span>
                                <div className="flex items-center gap-2">
                                  <label className="btn-secondary cursor-pointer py-1 px-2.5 text-xs">
                                    <span>Replace</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleSquareBannerFileUpload(e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setEditSquareBannerUrl("")}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium px-1.5"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-zinc-50/50 hover:bg-zinc-50 transition cursor-pointer group">
                              <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:scale-105 transition-transform shadow-2xs">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <span className="text-xs font-semibold text-zinc-900 block">
                                  {isUploadingSquareBanner ? "Uploading..." : "Upload 1:1 Poster"}
                                </span>
                                <span className="text-[10px] text-zinc-400">1:1 Square (e.g. 800x800)</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingSquareBanner}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleSquareBannerFileUpload(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multiple Media Assets Gallery */}
                  <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900">
                          Multiple Media Assets Gallery ({mediaAssets.length})
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Upload multiple promotional posters, schedule cards, or sponsor logos.
                        </p>
                      </div>
                      <label className="btn-secondary cursor-pointer py-1.5 px-3 text-xs">
                        <span>{isUploadingAsset ? "Uploading..." : "+ Upload Assets"}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={isUploadingAsset}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleMultipleAssetsUpload(e.target.files);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {mediaAssets.length === 0 ? (
                      <div className="p-5 rounded-lg border border-zinc-200 bg-zinc-50/50 text-center space-y-1">
                        <p className="text-xs text-zinc-500">No media assets uploaded yet.</p>
                        <p className="text-[11px] text-zinc-400">
                          Upload multiple graphics here to easily switch banners or showcase event media.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {mediaAssets.map((asset) => {
                          const isCurrentBanner = editBannerUrl === asset.url;
                          return (
                            <div
                              key={asset.id}
                              className={`group relative rounded-lg border overflow-hidden bg-white shadow-2xs transition ${
                                isCurrentBanner ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200"
                              }`}
                            >
                              <div className="aspect-16/9 w-full bg-zinc-100 overflow-hidden relative">
                                <img
                                  src={asset.url}
                                  alt={asset.name}
                                  className="w-full h-full object-cover"
                                />
                                {isCurrentBanner && (
                                  <span className="absolute top-1.5 left-1.5 bg-zinc-950 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-xs">
                                    Current Banner
                                  </span>
                                )}
                              </div>
                              <div className="p-2 space-y-1.5">
                                <div className="text-[11px] font-medium text-zinc-800 truncate" title={asset.name}>
                                  {asset.name}
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSetAssetAsBanner(asset)}
                                      className="text-zinc-700 hover:text-zinc-950 font-semibold"
                                      title="Set as 16:9 hero banner"
                                    >
                                      Set 16:9
                                    </button>
                                    <span className="text-zinc-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSetAssetAsSquareBanner(asset)}
                                      className="text-zinc-700 hover:text-zinc-950 font-semibold"
                                      title="Set as 1:1 square poster"
                                    >
                                      Set 1:1
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAsset(asset.id)}
                                    className="text-red-500 hover:text-red-700 font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {setupSubtab === "settings" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      Registration & Visibility Rules
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Configure team registration policies, member limits, and public directory visibility.
                    </p>
                  </div>

                  {/* Team Registration Configuration */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-zinc-900 font-heading">
                          Team Registration
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Allow participants to register as a squad/team and generate a shareable team invite link.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editTeamEnabled}
                          onChange={(e) => setEditTeamEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-950"></div>
                      </label>
                    </div>

                    {editTeamEnabled && (
                      <div className="pt-3 border-t border-zinc-100 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-700">
                              Minimum Team Size
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={editTeamMinSize}
                              onChange={(e) => setEditTeamMinSize(e.target.value)}
                              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                            />
                            <p className="text-[10px] text-zinc-400">Minimum members required for a valid team.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-700">
                              Maximum Team Size
                            </label>
                            <input
                              type="number"
                              min={Number(editTeamMinSize) || 1}
                              max={50}
                              value={editTeamMaxSize}
                              onChange={(e) => setEditTeamMaxSize(e.target.value)}
                              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                            />
                            <p className="text-[10px] text-zinc-400">Hard limit on teammates per team invite link.</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-600 leading-relaxed">
                          <strong>Organizer Limit Range Active:</strong> Participants will be able to invite teammates using their generated team invite link until the <strong>{editTeamMaxSize || 4} member maximum</strong> is reached.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event Type & Discovery Visibility */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3">
                    <div>
                      <div className="font-heading font-semibold text-zinc-950 text-xs">
                        Event Type & Discovery Visibility
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Controls whether this event is displayed on public discovery pages or restricted to invite link recipients.
                      </p>
                    </div>

                    {isCommunityPrivate ? (
                      <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1">
                        <div className="font-semibold text-zinc-900 font-heading">
                          Inherited Community Privacy
                        </div>
                        <p className="text-[11px] text-zinc-600">
                          This event belongs to a private community. As required, events in private communities are hidden from the discovery page, and only community members will know about and see this event.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label
                          className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                            editVisibility === "PUBLIC"
                              ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="event_visibility"
                            value="PUBLIC"
                            checked={editVisibility === "PUBLIC"}
                            onChange={() => setEditVisibility("PUBLIC")}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-bold text-zinc-900 font-heading">
                              Public Event
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                              Listed on the discovery page (/explore) and searchable by all visitors.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                            editVisibility === "PRIVATE"
                              ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="event_visibility"
                            value="PRIVATE"
                            checked={editVisibility === "PRIVATE"}
                            onChange={() => setEditVisibility("PRIVATE")}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-bold text-zinc-900 font-heading">
                              Private Event
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                              Hidden from discovery page. Only people with the direct link can view and register.
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Save Bar */}
            <div className="px-6 py-3.5 bg-zinc-50/40 border-t border-[#e8eaed] flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveEventSetup}
                className="btn-primary"
              >
                <span>Save changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. TICKETS                                                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Tickets & Pricing Tiers
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Create ticket types, adjust inventory, set sales windows, and manage pricing rules.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateTier}
              className="btn-primary"
            >
              <TicketIcon size={13} className="text-zinc-400" />
              <span>Add Ticket Tier</span>
            </button>
          </div>

          {/* Sub-tabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto">
            {[
              { id: "types", label: "Ticket Types" },
              { id: "questions", label: `Registration Questions (${customQuestions.length})` },
              { id: "conditional-questions", label: "Conditional Questions" },
              { id: "pricing", label: "Pricing & Limits" },
              { id: "inventory", label: "Inventory Allocation" },
              { id: "addons", label: "Add-ons & Merch" },
              { id: "rules", label: "Access Rules" },
            ].map((sub) => {
              const isActive = ticketsSubtab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setTicketsSubtab(sub.id as any)}
                  className={`relative pb-3 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{sub.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 1. Questions Subtab View */}
          {ticketsSubtab === "questions" ? (
            <div className="space-y-6">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">
                    Custom Registration Questions
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure question prompts required for attendees booking any ticket tier for this event.
                  </p>
                </div>
              </div>

              {/* Add / Edit Question Card (CLEAN WITHOUT CONDITIONAL DISPLAY RULES) */}
              <form
                id="registration-question-form"
                onSubmit={handleSaveQuestion}
                className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-950 font-heading">
                      {editingQuestionId ? "Edit Registration Question" : "Create Registration Question"}
                    </span>
                    {editingQuestionId && (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        Editing Mode
                      </span>
                    )}
                  </div>
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={handleCancelEditQuestion}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Question Title / Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dietary Preferences, T-Shirt Size, GitHub Profile..."
                    value={newQuestionLabel}
                    onChange={(e) => setNewQuestionLabel(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 block">Response Type</label>
                    <select
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Paragraph / Long Text</option>
                      <option value="select">Dropdown Menu Options</option>
                      <option value="multiselect">Multiple Choice (Checkboxes)</option>
                      <option value="radio">Single Choice (Radio Buttons)</option>
                      <option value="number">Number / Numeric Value</option>
                      <option value="phone">Phone Number</option>
                      <option value="email">Email Address</option>
                      <option value="url">Website / Portfolio Link</option>
                      <option value="date">Date Picker</option>
                      <option value="checkbox">Yes / No Confirmation Toggle</option>
                      <option value="file">File / Document Upload</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 block">Placeholder (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Please specify..."
                      value={newQuestionPlaceholder}
                      onChange={(e) => setNewQuestionPlaceholder(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                </div>

                {(newQuestionType === "select" || newQuestionType === "multiselect" || newQuestionType === "radio") && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 block">
                      Choices / Options (comma-separated) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Small, Medium, Large, Extra Large"
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestionRequired}
                      onChange={(e) => setNewQuestionRequired(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                    />
                    <span>Mandatory response for registration</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {editingQuestionId && (
                      <button
                        type="button"
                        onClick={handleCancelEditQuestion}
                        className="px-4 py-1.5 rounded-full text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="btn-primary text-xs py-1.5 px-4 rounded-full">
                      {editingQuestionId ? <EditIcon size={13} /> : <PlusIcon size={13} />}
                      <span>{editingQuestionId ? "Update Question" : "Add Question"}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Current Questions List */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <div className="p-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 font-heading">
                    Active Questions ({customQuestions.length})
                  </span>
                </div>
                {customQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400 font-body">
                    No custom questions configured. Attendees will only be asked for Name and Email.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {customQuestions.map((q, idx) => (
                      <div key={q.id} className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-zinc-400 font-bold">#{idx + 1}</span>
                            <span className="text-xs font-bold text-zinc-950 font-heading">{q.label}</span>
                            {q.required && (
                              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                            <span className="font-mono bg-zinc-100 px-1.5 py-0.2 rounded uppercase text-zinc-700">{q.type}</span>
                            {q.placeholder && <span>&bull; &ldquo;{q.placeholder}&rdquo;</span>}
                            {q.options && <span>&bull; Choices: {q.options.join(", ")}</span>}
                          </div>
                          {q.condition && (
                            <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-medium">
                              <FilterIcon size={11} className="text-zinc-600 shrink-0" />
                              <span>Rule:</span>
                              {q.condition.ticket_tier_id && (
                                <span>
                                  Tier:{" "}
                                  <strong>
                                    {event?.tiers?.find((t) => t.id === q.condition?.ticket_tier_id)?.name || q.condition.ticket_tier_id}
                                  </strong>
                                </span>
                              )}
                              {q.condition.depends_on_question_id && (
                                <span>
                                  {q.condition.ticket_tier_id ? " & " : ""}
                                  Shows if &ldquo;{customQuestions.find((parent) => parent.id === q.condition?.depends_on_question_id)?.label || "Question"}&rdquo; {q.condition.operator === "equals" ? "equals" : q.condition.operator === "not_equals" ? "is not" : q.condition.operator === "contains" ? "contains" : "is answered"} {q.condition.expected_value ? `"${q.condition.expected_value}"` : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(q)}
                            className="px-3 py-1 text-xs font-semibold rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Edit question details"
                          >
                            <EditIcon size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionRequired(q.id)}
                            className="btn-secondary text-xs py-1 px-2.5 rounded-full"
                          >
                            {q.required ? "Make Optional" : "Make Required"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-zinc-400 hover:text-red-600 p-1.5 transition rounded-full"
                            title="Delete question"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : ticketsSubtab === "conditional-questions" ? (
            /* 2. DEDICATED CONDITIONAL QUESTIONS TAB */
            <div className="space-y-6">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">
                      Conditional Registration Questions (If / Else Logic)
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isConditionalQuestionsEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isConditionalQuestionsEnabled ? "Feature Activated" : "Feature Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Define visibility rules so questions only display when specific ticket tiers or previous answers match.
                  </p>
                </div>
                <Link
                  href="/console/organizer?tab=settings"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition inline-flex items-center gap-1"
                >
                  <span>Organiser Settings</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

              {!isConditionalQuestionsEnabled ? (
                <div className="p-8 sm:p-12 border border-zinc-200 rounded-xl bg-white text-center max-w-lg mx-auto space-y-4 shadow-2xs my-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-600">
                    <FilterIcon size={22} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">
                      Conditional Questions Feature Inactive
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Conditional Display Rules (If / Else branching) allows questions to be shown only for specific ticket tiers or when previous questions match specific answers. This feature must be activated in your Organiser Settings.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/console/organizer?tab=settings"
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Open Organiser Settings</span>
                      <ArrowRightIcon size={13} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("hackways_feature_conditional_questions", "true");
                        setIsConditionalQuestionsEnabled(true);
                        showToast("Conditional Questions activated for this organizer.");
                      }}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 transition shadow-2xs cursor-pointer"
                    >
                      Activate for Organization
                    </button>
                  </div>
                </div>
              ) : customQuestions.length === 0 ? (
                <div className="p-8 border border-zinc-200 rounded-xl bg-white text-center text-xs text-zinc-500 space-y-3">
                  <p>No registration questions created yet. Add questions first in the Registration Questions tab.</p>
                  <button
                    type="button"
                    onClick={() => setTicketsSubtab("questions")}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
                  >
                    Go to Registration Questions
                  </button>
                </div>
              ) : (
                <>
                  {/* Dedicated Rule Builder Form */}
                  <form
                    onSubmit={handleSaveQuestionCondition}
                    className="p-5 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                      <div className="text-xs font-bold text-zinc-900 font-heading">
                        Configure Question Display Rule
                      </div>
                      <span className="text-[11px] text-zinc-400">Step 1: Choose target question &rarr; Step 2: Set condition</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 block">
                        Target Question <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedConditionalQId}
                        onChange={(e) => handleSelectQuestionForCondition(e.target.value)}
                        required
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">Select question to attach rule...</option>
                        {customQuestions.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.label} ({q.type}) {q.condition ? "• [Active Rule]" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedConditionalQId && (
                      <div className="space-y-4 pt-2 border-t border-zinc-100">
                        {/* 1. Target Ticket Tier */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-700 block">
                            1. Target Ticket Tier (Show only for selected tier)
                          </label>
                          <select
                            value={condTier}
                            onChange={(e) => setCondTier(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs cursor-pointer"
                          >
                            <option value="ALL">All Ticket Tiers (Universal)</option>
                            {event?.tiers?.map((t) => (
                              <option key={t.id} value={t.id}>
                                Only for: {t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Depends on Previous Question (If / Else) */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-700 block">
                            2. Depends on Previous Question (If / Else branching)
                          </label>
                          <select
                            value={condDependsOn}
                            onChange={(e) => setCondDependsOn(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs cursor-pointer"
                          >
                            <option value="">No question dependency (Always show for tier)</option>
                            {customQuestions
                              .filter((q) => q.id !== selectedConditionalQId)
                              .map((q) => (
                                <option key={q.id} value={q.id}>
                                  If answer to: &ldquo;{q.label}&rdquo;
                                </option>
                              ))}
                          </select>
                        </div>

                        {condDependsOn && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 shadow-2xs">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                                Condition Operator
                              </label>
                              <select
                                value={condOperator}
                                onChange={(e) => setCondOperator(e.target.value as any)}
                                className="w-full bg-white border border-zinc-200 rounded-md px-2.5 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                              >
                                <option value="equals">Equals ( == )</option>
                                <option value="not_equals">Does not equal ( != )</option>
                                <option value="contains">Contains text</option>
                                <option value="is_answered">Is answered (not blank)</option>
                              </select>
                            </div>

                            {condOperator !== "is_answered" && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                                  Expected Answer Value
                                </label>
                                {(() => {
                                  const parentQ = customQuestions.find((q) => q.id === condDependsOn);
                                  if (parentQ && parentQ.options && parentQ.options.length > 0) {
                                    return (
                                      <select
                                        value={condExpectedValue}
                                        onChange={(e) => setCondExpectedValue(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-md px-2.5 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                                      >
                                        <option value="">Select choice...</option>
                                        {parentQ.options.map((opt, oIdx) => (
                                          <option key={oIdx} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    );
                                  }
                                  return (
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Yes, VIP, Vegetarian..."
                                      value={condExpectedValue}
                                      onChange={(e) => setCondExpectedValue(e.target.value)}
                                      className="w-full bg-white border border-zinc-200 rounded-md px-2.5 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                                    />
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex items-center gap-3">
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FilterIcon size={12} />
                            <span>Save Conditional Rule</span>
                          </button>
                          {customQuestions.find((q) => q.id === selectedConditionalQId)?.condition && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionCondition(selectedConditionalQId)}
                              className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-red-600 transition cursor-pointer shadow-2xs"
                            >
                              Clear Rule
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Active Conditional Rules Ledger */}
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                    <div className="p-3.5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 font-heading">
                        All Questions & Conditional Logic Status
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {customQuestions.filter((q) => q.condition).length} of {customQuestions.length} conditional
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100 text-xs">
                      {customQuestions.map((q, idx) => (
                        <div key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-400 font-bold">#{idx + 1}</span>
                              <span className="font-bold text-zinc-950 font-heading">{q.label}</span>
                              <span className="font-mono text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded uppercase">
                                {q.type}
                              </span>
                            </div>

                            {q.condition ? (
                              <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md font-medium">
                                <FilterIcon size={11} className="text-zinc-600 shrink-0" />
                                <span>Rule:</span>
                                {q.condition.ticket_tier_id && (
                                  <span>
                                    Tier:{" "}
                                    <strong>
                                      {event?.tiers?.find((t) => t.id === q.condition?.ticket_tier_id)?.name || q.condition.ticket_tier_id}
                                    </strong>
                                  </span>
                                )}
                                {q.condition.depends_on_question_id && (
                                  <span>
                                    {q.condition.ticket_tier_id ? " & " : ""}
                                    Shows if &ldquo;{customQuestions.find((parent) => parent.id === q.condition?.depends_on_question_id)?.label || "Question"}&rdquo; {q.condition.operator === "equals" ? "equals" : q.condition.operator === "not_equals" ? "is not" : q.condition.operator === "contains" ? "contains" : "is answered"} {q.condition.expected_value ? `"${q.condition.expected_value}"` : ""}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400 italic">
                                Universal (always shown to all attendees)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectQuestionForCondition(q.id);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="px-3 py-1 rounded-full text-xs font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <FilterIcon size={11} />
                              <span>{q.condition ? "Edit Rule" : "Configure Rule"}</span>
                            </button>
                            {q.condition && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestionCondition(q.id)}
                                className="px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-red-600 transition cursor-pointer"
                                title="Remove conditional rule"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Ticket Table */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs" data-mobile-records="tickets">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold font-heading">
                    <tr>
                      <th className="py-3 px-4">Ticket Type</th>
                      <th className="py-3 px-4">Approval Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Inventory</th>
                      <th className="py-3 px-4">Sold</th>
                      <th className="py-3 px-4">Available</th>
                      <th className="py-3 px-4">Sales Window</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tiers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="mb-3"><DashboardArtwork kind="tickets" /></div>
                            <h4 className="text-sm font-bold text-zinc-950 font-heading">No Ticket Tiers Created</h4>
                            <p className="text-xs text-zinc-500 mt-1 font-body">
                              Set up passes for your event drop to start selling registrations and admissions.
                            </p>
                            <button
                              type="button"
                              onClick={handleOpenCreateTier}
                              className="btn-primary mt-4 text-xs"
                            >
                              <PlusIcon size={13} />
                              <span>Create First Tier</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tiers.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-950 font-heading">
                          <div>{t.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 ${
                              t.approvalMode === "REQUIRES_APPROVAL"
                                ? "bg-zinc-900 text-white"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {t.approvalMode === "REQUIRES_APPROVAL"
                              ? "Requires Approval"
                              : "Auto Approve"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 tabular-nums">
                          {editingPriceId === t.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500 font-heading">INR</span>
                              <input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePrice(t.id);
                                  if (e.key === "Escape") setEditingPriceId(null);
                                }}
                                className="w-20 px-2 py-0.5 text-xs font-semibold bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-900 tabular-nums"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePrice(t.id)}
                                className="h-6 px-2 text-[11px] font-heading font-semibold bg-zinc-900 text-white rounded hover:bg-zinc-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceId(null)}
                                className="h-6 px-1.5 text-zinc-500 hover:text-zinc-900 inline-flex items-center justify-center"
                                title="Cancel"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            `INR ${t.price.toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 tabular-nums font-body">{t.inventory}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 tabular-nums font-body">{t.sold}</td>
                        <td className="py-3 px-4 text-zinc-600 tabular-nums font-body">{t.available}</td>
                        <td className="py-3 px-4 text-zinc-500 text-[11px] font-body">
                          {t.salesStart} - {t.salesEnd}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-heading ${
                              t.status === "DISABLED"
                                ? "bg-zinc-200 text-zinc-700"
                                : "bg-zinc-100 text-zinc-900"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTier(t)}
                              className="h-6 px-2.5 inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-zinc-900 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded shadow-2xs transition active:scale-[0.98]"
                              title="Edit ticket tier details and questions"
                            >
                              <EditIcon size={11} className="text-zinc-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateTier(t.id)}
                              className="h-6 px-2 inline-flex items-center gap-1 text-[11px] font-heading font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 rounded shadow-2xs transition active:scale-[0.98]"
                              title="Duplicate this ticket tier"
                            >
                              <CopyIcon size={11} className="text-zinc-500" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleTier(t.id)}
                              className="h-6 px-2 inline-flex items-center text-[11px] font-heading font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded shadow-2xs transition active:scale-[0.98]"
                            >
                              {t.status === "DISABLED" ? "Enable" : "Disable"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTier(t.id)}
                              className={`h-6 px-2 inline-flex items-center gap-1 text-[11px] font-heading font-medium rounded shadow-2xs transition active:scale-[0.98] ${
                                t.sold > 0
                                  ? "text-zinc-400 bg-zinc-50 border border-zinc-200 cursor-pointer"
                                  : "text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-200 hover:border-red-600 cursor-pointer"
                              }`}
                              title={
                                t.sold > 0
                                  ? `Cannot delete: ${t.sold} active registrations exist.`
                                  : "Delete this ticket tier"
                              }
                            >
                              <TrashIcon size={11} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. ORDERS                                                          */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Event Orders
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Track payments, order receipts, customer details, and execute refunds.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search order ID or customer..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full sm:w-64 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Sub-tabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto">
            {[
              { id: "all", label: "All Orders" },
              { id: "paid", label: "Paid" },
              { id: "refunded", label: "Refunded" },
            ].map((sub) => {
              const isActive = ordersSubtab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setOrdersSubtab(sub.id as any)}
                  className={`relative pb-3 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{sub.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs" data-mobile-records="orders">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="mb-3"><DashboardArtwork kind={ordersSubtab === "refunded" ? "refunds" : "revenue"} /></div>
                        <h4 className="text-sm font-bold text-zinc-950 font-heading">
                          {ordersSubtab === "refunded" ? "No Refunded Orders" : "No Orders Recorded"}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 font-body">
                          {ordersSubtab === "refunded"
                            ? "There are no refunded or disputed orders for this event drop."
                            : "Ticket sales and attendee order records will appear here as soon as guests register."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4 font-mono text-zinc-700">{ord.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950 font-heading">{ord.customer}</div>
                      <div className="text-[11px] text-zinc-400">{ord.email}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 text-xs">{ord.tier}</td>
                    <td className="py-3 px-4 font-bold text-zinc-900 tabular-nums">
                      INR {ord.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900">{ord.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="h-6 px-2.5 inline-flex items-center text-[11px] font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded shadow-2xs transition active:scale-[0.98]"
                        >
                          View Details
                        </button>
                        {ord.status !== "REFUNDED" && (
                          <button
                            onClick={() => handleRefundOrder(ord.id)}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/80 rounded transition active:scale-[0.98]"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. ATTENDEES                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "attendees" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Attendees
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Individual pass holders for this event. One order can contain multiple attendees.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                placeholder="Search attendee by name, email, code..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full sm:w-60 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 shadow-2xs font-body"
              />
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="btn-secondary shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <MailIcon size={13} className="text-zinc-500" />
                <span>Invite via Email</span>
              </button>
              <button
                type="button"
                onClick={() => setIsManualPassDrawerOpen(true)}
                className="btn-primary shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <UserIcon size={13} className="text-zinc-400" />
                <span>Issue Pass</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto">
            {[
              { id: "all", label: "All Attendees" },
              {
                id: "pending_approval",
                label: `Pending Approval ${pendingApprovalCount > 0 ? `(${pendingApprovalCount})` : ""}`,
                highlight: pendingApprovalCount > 0,
              },
              {
                id: "waitlist",
                label: `Waitlist ${waitlistCount > 0 ? `(${waitlistCount})` : ""}`,
              },
              { id: "confirmed", label: "Confirmed" },
              { id: "checked_in", label: "Checked In" },
              { id: "vip", label: "VIP Passes" },
              { id: "speakers", label: "Speakers" },
              { id: "cancelled", label: `Cancelled ${cancelledCount > 0 ? `(${cancelledCount})` : ""}` },
            ].map((sub) => {
              const isActive = attendeesSubtab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setAttendeesSubtab(sub.id as any)}
                  className={`relative pb-3 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none flex items-center gap-1.5 ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : sub.highlight
                      ? "text-zinc-900 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{sub.label}</span>
                  {sub.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs" data-mobile-records="attendees">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold font-heading">
                <tr>
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Pass Tier</th>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Status & Entrance</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="mb-3"><DashboardArtwork kind="participants" /></div>
                        <h4 className="text-sm font-bold text-zinc-950 font-heading">
                          {attendeesSubtab === "cancelled"
                            ? "No Cancelled Registrations"
                            : attendeesSubtab === "pending_approval"
                            ? "No Registrations Pending Approval"
                            : attendeesSubtab === "waitlist"
                            ? "Waitlist is Empty"
                            : attendeesSubtab === "checked_in"
                            ? "No Guests Checked In Yet"
                            : "No Attendees Found"}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 font-body">
                          {attendeesSubtab === "cancelled"
                            ? "Cancelled and refunded guest registrations will be archived here."
                            : attendeesSubtab === "pending_approval"
                            ? "When attendees apply for approval-required tiers, their requests appear here for your review."
                            : attendeesSubtab === "checked_in"
                            ? "Admit guests at turnstiles or door scanner to see live check-in timestamps."
                            : "Issue manual passes or share your registration drop link to start welcoming guests."}
                        </p>
                        {attendeesSubtab === "all" && (
                          <button
                            type="button"
                            onClick={() => setIsManualPassDrawerOpen(true)}
                            className="btn-primary mt-4 text-xs"
                          >
                            <UserIcon size={13} className="text-zinc-400" />
                            <span>Issue Direct Pass</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 px-4 font-medium text-zinc-950">
                      <div className="font-heading font-semibold text-zinc-900">{att.name}</div>
                      <div className="text-[11px] text-zinc-500 font-body">{att.email}</div>
                      {att.answers && Object.keys(att.answers).length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-zinc-100 space-y-0.5">
                          {Object.entries(att.answers).map(([key, val], idx) => (
                            <div key={idx} className="text-[10.5px] text-zinc-600 font-body">
                              <span className="font-semibold text-zinc-800">{key}:</span>{" "}
                              <span className="text-zinc-600">{Array.isArray(val) ? val.join(", ") : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-zinc-700 font-heading">
                      <div>{att.tierName}</div>
                      {att.approvalMode === "REQUIRES_APPROVAL" && (
                        <span className="text-[10px] text-zinc-400 font-mono">Host Approval Tier</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                      {att.status === "PENDING_APPROVAL" ? (
                        <span className="text-zinc-400 font-normal italic">Pending Review</span>
                      ) : att.status === "WAITLIST" ? (
                        <span className="text-zinc-400 font-normal italic">Waitlisted</span>
                      ) : att.status === "CANCELLED" || att.status === "REFUNDED" ? (
                        <span className="line-through text-zinc-400 font-normal font-mono">{att.ticketCode}</span>
                      ) : (
                        att.ticketCode
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.status === "PENDING_APPROVAL" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          Requires Approval
                        </span>
                      ) : att.status === "WAITLIST" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          Waitlist
                        </span>
                      ) : att.status === "REJECTED" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500">
                          Application Declined
                        </span>
                      ) : att.status === "CANCELLED" || att.status === "REFUNDED" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                          Cancelled by Host
                        </span>
                      ) : att.status === "CHECKED_IN" ? (
                        <span className="text-zinc-900 font-bold font-heading">Checked In ({att.checkedInAt || "Door"})</span>
                      ) : (
                        <span className="text-zinc-400 font-normal font-body">Pending Entrance</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.status === "CANCELLED" || att.status === "REFUNDED" ? (
                        <span className="text-zinc-400 font-normal italic text-[11px]">Pass Revoked</span>
                      ) : att.status === "PENDING_APPROVAL" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveAttendee(att.id)}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded shadow-2xs transition active:scale-[0.98]"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectAttendee(att.id)}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 rounded shadow-2xs transition active:scale-[0.98]"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingAttendee(att);
                              setCancelReason("");
                            }}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded shadow-2xs transition active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : att.status === "WAITLIST" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveAttendee(att.id)}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded shadow-2xs transition active:scale-[0.98]"
                          >
                            Admit Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingAttendee(att);
                              setCancelReason("");
                            }}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded shadow-2xs transition active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : transferringAttendeeId === att.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="email"
                            placeholder="recipient@email.com"
                            value={transferEmail}
                            onChange={(e) => setTransferEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && transferEmail.trim()) {
                                showToast(`Pass ${att.ticketCode} transferred to ${transferEmail.trim()}`);
                                setTransferringAttendeeId(null);
                                setTransferEmail("");
                              }
                              if (e.key === "Escape") setTransferringAttendeeId(null);
                            }}
                            className="w-36 px-2 py-0.5 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-900 font-body"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (transferEmail.trim()) {
                                showToast(`Pass ${att.ticketCode} transferred to ${transferEmail.trim()}`);
                                setTransferringAttendeeId(null);
                                setTransferEmail("");
                              }
                            }}
                            className="h-6 px-2 text-[11px] font-heading font-semibold bg-zinc-900 text-white rounded hover:bg-zinc-800"
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransferringAttendeeId(null)}
                            className="h-6 px-1.5 text-zinc-500 hover:text-zinc-900 inline-flex items-center justify-center"
                            title="Cancel"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => showToast(`Resent ticket code ${att.ticketCode} to ${att.email}`)}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-md shadow-2xs transition active:scale-[0.98]"
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferringAttendeeId(att.id);
                              setTransferEmail("");
                            }}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-md shadow-2xs transition active:scale-[0.98]"
                          >
                            Transfer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingAttendee(att);
                              setCancelReason("");
                            }}
                            className="h-6 px-2.5 inline-flex items-center text-[11px] font-heading font-medium text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200/90 rounded-md shadow-2xs transition active:scale-[0.98]"
                            title="Cancel registration and release spot"
                          >
                            Cancel Pass
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5B. TEAMS & SQUADS                                                 */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "teams" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                  Teams & Squads
                </h1>
                <span className={`text-[11px] font-semibold font-heading px-2 py-0.5 rounded-full ${
                  event?.team_registration_enabled ? "bg-zinc-100 text-zinc-900" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {event?.team_registration_enabled ? "Team Registration Active" : "Registration Disabled"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
                Manage participant teams, track member limits ({event?.team_min_size || 2} - {event?.team_max_size || 4} members per team), and share invite links.
              </p>
            </div>
            {event?.team_registration_enabled && teams.length > 0 && (
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Search team by name, code, leader..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-64 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs font-body"
                />
                <Link
                  href={`${consoleBase}/setup`}
                  onClick={() => setSetupSubtab("settings")}
                  className="btn-secondary"
                >
                  <span>Configure Limit Range</span>
                </Link>
              </div>
            )}
          </div>

          {/* Disabled or no teams yet: signboard only, no zero-value metrics or controls */}
          {(!event?.team_registration_enabled || teams.length === 0) && (
            <div className="py-12 px-4 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className="mb-3"><DashboardArtwork kind="communities" /></div>
                <h3 className="text-sm font-bold text-zinc-900 font-heading">
                  {event?.team_registration_enabled ? "No Teams Registered Yet" : "Team Registration Is Disabled"}
                </h3>
                <p className="text-xs text-zinc-500 font-body max-w-sm mx-auto mt-1 leading-relaxed">
                  {event?.team_registration_enabled
                    ? "When participants register as a squad on the public pass page, their teams and invite links will show up here."
                    : "Enable it in Event Setup to let participants create teams."}
                </p>
                {!event?.team_registration_enabled && (
                  <Link
                    href={`${consoleBase}/setup`}
                    onClick={() => setSetupSubtab("settings")}
                    className="btn-primary inline-flex mt-4 text-xs"
                  >
                    <span>Enable Team Registration</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Quick Metrics: only once real team data exists */}
          {teams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium font-heading">Total Registered Teams</div>
              <div className="text-2xl font-extrabold text-zinc-950 font-heading tabular-nums">{teams.length}</div>
              <p className="text-[11px] text-zinc-400 font-body">Formed by participants</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium font-heading">Total Team Participants</div>
              <div className="text-2xl font-extrabold text-zinc-950 font-heading tabular-nums">
                {teams.reduce((sum, t) => sum + t.members.length, 0)}
              </div>
              <p className="text-[11px] text-zinc-400 font-body">Leaders and joined teammates</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Team Size Policy</div>
              <div className="text-xl font-bold text-zinc-950 font-heading">
                {event?.team_min_size || 2} - {event?.team_max_size || 4} members
              </div>
              <p className="text-[11px] text-zinc-400 font-body">Controlled by organizing body</p>
            </div>
          </div>
          )}

          {/* Teams Roster: only once teams exist */}
          {teams.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="divide-y divide-zinc-200">
                {teams
                  .filter((t) => {
                    const q = teamSearch.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.code.toLowerCase().includes(q) ||
                      t.leader_name.toLowerCase().includes(q) ||
                      t.leader_email.toLowerCase().includes(q)
                    );
                  })
                  .map((team) => {
                    const isFull = team.members.length >= team.max_size;
                    const pct = Math.min(100, Math.round((team.members.length / team.max_size) * 100));
                    return (
                      <div key={team.id} className="p-5 space-y-4 hover:bg-zinc-50/50 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-sm font-bold text-zinc-950 font-heading">{team.name}</h3>
                              <span className="font-mono text-xs font-semibold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
                                {team.code}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded font-heading ${
                                isFull ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                              }`}>
                                {isFull ? "Team Full" : "Open for Teammates"}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 font-body flex items-center gap-2">
                              <span>Leader: <strong className="text-zinc-800">{team.leader_name}</strong> ({team.leader_email})</span>
                              <span>•</span>
                              <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right space-y-1">
                              <div className="text-xs font-semibold text-zinc-900 font-heading">
                                {team.members.length} / {team.max_size} members
                              </div>
                              <div className="w-28 h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                                <div className="h-full bg-zinc-950 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/events/${eventId}/rsvp?team=${team.code}`;
                                navigator.clipboard.writeText(url);
                                showToast(`Invite link for "${team.name}" copied to clipboard.`);
                              }}
                              className="btn-secondary text-xs py-1 px-3 shrink-0"
                            >
                              <span>Copy Invite Link</span>
                            </button>
                          </div>
                        </div>

                        {/* Team Member Roster */}
                        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 space-y-2">
                          <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider font-heading">
                            Team Roster ({team.members.length} participants)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {team.members.map((member) => (
                              <div key={member.id} className="p-2.5 rounded-md bg-white border border-zinc-200/90 space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-zinc-900 truncate font-heading">{member.name}</div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-heading">
                                    {member.role}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 truncate font-body">{member.email}</div>
                              </div>
                            ))}
                            {/* Empty remaining slots up to team.max_size */}
                            {Array.from({ length: Math.max(0, team.max_size - team.members.length) }).map((_, idx) => (
                              <div key={`empty_${idx}`} className="p-2.5 rounded-md border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-[11px] font-body">
                                <span>Slot {team.members.length + idx + 1} (Empty)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
          </div>
          )}
        </div>
      )}
      {/* 6. CHECK-IN                                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "check-in" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Turnstile Check-In Operations
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Hardware scanner stations, live gates, manual code verification, and check-in stats.
              </p>
            </div>
            <button
              onClick={() => {
                const pending = attendees.filter((a) => a.status !== "CHECKED_IN");
                if (pending.length === 0) {
                  showToast("All registered attendees are already checked in.");
                  return;
                }
                // Persist each admission through the same store path as individual scans
                let admitted = 0;
                for (const a of pending) {
                  const res = checkInAttendee(a.id, eventId);
                  if (res.success) admitted += 1;
                }
                if (admitted === 0) {
                  showToast("Bulk check-in failed. Storage may be unavailable.");
                  return;
                }
                setAttendees(getEventAttendees(eventId));
                showToast(
                  admitted === pending.length
                    ? `Admitted ${admitted} attendees via bulk check-in sweep.`
                    : `Admitted ${admitted} of ${pending.length} attendees; ${pending.length - admitted} failed — try again.`
                );
              }}
              className="btn-primary"
            >
              <CheckCircleIcon size={14} className="text-zinc-400" />
              <span>Bulk Check-in All</span>
            </button>
          </div>

          {/* Quick Scanner */}
          <div className="p-6 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs max-w-xl">
            <h3 className="text-sm font-bold text-zinc-950 font-heading">Scan Ticket / Hardware Verification</h3>
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="btn-primary"
            >
              <QrCodeIcon size={14} className="text-zinc-400" />
              <span>Scan with camera</span>
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanTicket(manualCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Scan or enter code (e.g. HKW-98214-VIP)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-500 shadow-2xs"
              />
              <button
                type="submit"
                className="btn-primary shrink-0"
              >
                <span>Admit Pass</span>
              </button>
            </form>
            {scanMessage && (
              <div className="p-3 rounded-md bg-zinc-50 border border-zinc-300/80 text-xs font-heading font-semibold text-zinc-900">
                {scanMessage}
              </div>
            )}
          </div>

          {/* Real Door Turnout KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs font-bold text-zinc-500 uppercase font-heading">Total Admitted</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums font-heading">
                {checkedInCount}
              </div>
              <div className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2 font-body">
                of {totalTicketsSold} registered passes
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs font-bold text-zinc-500 uppercase font-heading">Pending Arrival</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums font-heading">
                {Math.max(0, totalTicketsSold - checkedInCount)}
              </div>
              <div className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2 font-body">
                awaiting door verification
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs font-bold text-zinc-500 uppercase font-heading">Turnout Rate</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums font-heading">
                {turnoutPct}%
              </div>
              <div className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2 font-body">
                live entrance completion
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
              <div className="text-xs font-bold text-zinc-500 uppercase font-heading">Scanner Status</div>
              <div className="text-sm font-bold text-zinc-950 font-heading">
                Web & Camera
              </div>
              <div className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2 font-body">
                Live verification ready
              </div>
            </div>
          </div>

          {/* Recent Gate Arrivals Manifest */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 font-heading">Recent Door Check-ins</h3>
            {attendees.filter((a) => a.status === "CHECKED_IN").length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="mb-3"><DashboardArtwork kind="participants" /></div>
                <p className="text-xs font-semibold text-zinc-800 font-heading">No Attendees Admitted Yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mt-0.5 font-body">
                  Scan ticket QR codes or enter codes above to admit guests through the gate.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 text-xs">
                {attendees
                  .filter((a) => a.status === "CHECKED_IN")
                  .slice(0, 10)
                  .map((a) => (
                    <div key={a.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-zinc-900 font-heading">{a.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{a.ticketCode} • {a.tierName}</div>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded font-semibold">
                        {a.checkedInAt || "Admitted"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <CameraScanner
            open={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onDetect={handleScanTicket}
            result={scanMessage ?? ""}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. MARKETING                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Event Marketing & Tracking
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
              Campaigns, coupons, promotions, referral codes, affiliate links, and traffic tracking.
            </p>
          </div>

          {mobileView ? (
            <div className="space-y-6">
              {marketingPromoPanel}
              {marketingStatsGrid}
            </div>
          ) : (
            <>
              {marketingStatsGrid}
              {marketingPromoPanel}
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 9. COMMUNICATIONS                                                 */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "communications" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Communications & Automations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
              Email, SMS, WhatsApp broadcasts, automated reminder journey, and attendee templates.
            </p>
          </div>

          {/* Automation Journey Preview */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-heading">
              Automated Attendee Journey
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-bold text-zinc-950 font-heading">1. Ticket Purchase</span>
                <p className="text-[11px] text-zinc-500 mt-1 font-body">Instant confirmation & pass QR sent via email & WhatsApp.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-bold text-zinc-950 font-heading">2. 24 Hours Prior</span>
                <p className="text-[11px] text-zinc-500 mt-1 font-body">Gate directions, parking guidelines, and schedule highlight.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-bold text-zinc-950 font-heading">3. Event Day Check-in</span>
                <p className="text-[11px] text-zinc-500 mt-1 font-body">Welcome greeting & hall Wi-Fi access credentials.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="font-bold text-zinc-950 font-heading">4. Post-Event</span>
                <p className="text-[11px] text-zinc-500 mt-1 font-body">Thank you note, session video recording links, and feedback survey.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. STAFF                                                          */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "staff" && (() => {
        const staffList: EventStaffMember[] = (event?.staff_members && event.staff_members.length > 0)
          ? event.staff_members
          : [
              {
                id: event?.organizer_id || "lead_owner",
                name: event?.hosts?.[0] || "Lead Event Organizer",
                email: "event-director@hackways.internal",
                role: "Event Owner & Director",
                gate: "All Doors & Turnstiles",
                status: "ACTIVE",
                added_at: event?.created_at || new Date().toISOString(),
                is_owner: true,
              },
            ];

        return (
          <div className="space-y-6">
            <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                  Event Staff & Roles
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
                  Event owner, box office, gate scanners, volunteers, and operational permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="btn-primary"
              >
                <UsersGroupIcon size={13} className="text-zinc-400" />
                <span>Invite Staff Member</span>
              </button>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold font-heading">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Gate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-medium text-zinc-950">
                        <div className="font-heading font-semibold text-zinc-900">
                          {st.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-body">{st.email}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-700 font-heading font-medium">{st.role}</td>
                      <td className="py-3 px-4 text-zinc-600 font-body">{st.gate || "All Doors & Turnstiles"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-heading font-semibold text-[10px] ${
                            st.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : st.status === "OFF_DUTY"
                              ? "bg-zinc-100 text-zinc-600"
                              : st.status === "SUSPENDED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {st.status === "ACTIVE" ? "Active On-Duty" : st.status === "OFF_DUTY" ? "Off Duty" : st.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(st)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Edit Staff Member"
                          >
                            <EditIcon size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(st.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Remove Staff Member"
                          >
                            <TrashIcon size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {staffList.length <= 1 && (
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-center text-xs text-zinc-500 font-body">
                No secondary door staff or volunteer scanners invited yet. Click &quot;Invite Staff Member&quot; to grant gate check-in permissions.
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* 11. FINANCE                                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
                Event Financial Ledger
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
                Gross sales, platform fees, payment gateway splits, refunds, and net withdrawable balance.
              </p>
            </div>
            {totalGrossSales > 0 && (
              <button
                type="button"
                onClick={() => showToast("Financial statement exported as CSV.")}
                className="btn-secondary"
              >
                <span>Download Financial Report</span>
              </button>
            )}
          </div>

          {totalGrossSales === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className="mb-3"><DashboardArtwork kind="revenue" /></div>
                <h4 className="text-sm font-bold text-zinc-950 font-heading">No Transactions Recorded</h4>
                <p className="text-xs text-zinc-500 mt-1 font-body">
                  When guests buy passes, gross revenue, processing fees, and settlement payouts will be reconciled here.
                </p>
              </div>
            </div>
          )}

          {totalGrossSales > 0 && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-b border-zinc-200/80 pb-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Gross Sales</div>
              <div className="text-xl font-extrabold text-zinc-950 tabular-nums font-heading">
                ₹{totalGrossSales.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Platform Fees ({platformFeePct}%)</div>
              <div className="text-xl font-extrabold text-zinc-950 tabular-nums font-heading">
                - ₹{Math.round(totalGrossSales * (platformFeePct / 100)).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Payment Fees (2%)</div>
              <div className="text-xl font-extrabold text-zinc-950 tabular-nums font-heading">
                - ₹{Math.round(totalGrossSales * 0.02).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Refunds</div>
              <div className="text-xl font-extrabold text-zinc-950 tabular-nums font-heading">
                - ₹{orders.filter((o) => o.status === "REFUNDED").reduce((sum, o) => sum + (o.amount || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-heading">Net Revenue</div>
              <div className="text-xl font-extrabold text-zinc-950 tabular-nums font-heading">
                ₹{Math.max(0, Math.round(totalGrossSales * 0.95) - orders.filter((o) => o.status === "REFUNDED").reduce((sum, o) => sum + (o.amount || 0), 0)).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
              Transaction Settlement Ledger ({orders.length})
            </h3>
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold font-heading">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-body">
                    {orders.slice(0, 10).map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-4 font-mono text-zinc-600">{o.id}</td>
                        <td className="py-3 px-4 text-zinc-900 font-medium">{o.customer}</td>
                        <td className="py-3 px-4 font-heading font-semibold text-zinc-950">₹{o.amount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="bg-zinc-100 text-zinc-800 text-[10px] font-heading font-semibold px-2 py-0.5 rounded">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 12. ANALYTICS                                                      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "analytics" && (() => {
        const now = Date.now();
        const views24h = recordedViews.filter(
          (v) => now - new Date(v.timestamp).getTime() <= 24 * 3600 * 1000
        ).length;

        const views7d = recordedViews.filter(
          (v) => now - new Date(v.timestamp).getTime() <= 7 * 24 * 3600 * 1000
        ).length;

        const views30d = recordedViews.filter(
          (v) => now - new Date(v.timestamp).getTime() <= 30 * 24 * 3600 * 1000
        ).length;

        const bucketCount = analyticsTimeframe === "24h" ? 24 : analyticsTimeframe === "7d" ? 7 : 30;

        const chartBars = Array.from({ length: bucketCount }).map((_, idx) => {
          let startTime: number;
          let endTime: number;
          let label: string;

          if (analyticsTimeframe === "24h") {
            const hourOffset = bucketCount - 1 - idx;
            startTime = now - (hourOffset + 1) * 3600 * 1000;
            endTime = now - hourOffset * 3600 * 1000;
            label = new Date(endTime).toLocaleTimeString([], { hour: "numeric", hour12: true });
          } else {
            const dayOffset = bucketCount - 1 - idx;
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - dayOffset);
            dStart.setHours(0, 0, 0, 0);
            startTime = dStart.getTime();

            const dEnd = new Date(dStart);
            dEnd.setHours(23, 59, 59, 999);
            endTime = dEnd.getTime();
            label = dStart.toLocaleDateString([], { month: "short", day: "numeric" });
          }

          const count = recordedViews.filter((v) => {
            const t = new Date(v.timestamp).getTime();
            return t >= startTime && t <= endTime;
          }).length;

          return { label, count };
        });

        const peakCount = Math.max(1, ...chartBars.map((b) => b.count));

        // Real Sources from actual recordedViews
        const sourcesMap: Record<string, number> = {};
        recordedViews.forEach((v) => {
          sourcesMap[v.source] = (sourcesMap[v.source] || 0) + 1;
        });
        const totalViews = recordedViews.length;
        const realSources = Object.entries(sourcesMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({
            name,
            count,
            pct: `${Math.round((count / totalViews) * 100)}%`,
          }));

        // Real Cities from actual recordedViews
        const citiesMap: Record<string, number> = {};
        recordedViews.forEach((v) => {
          citiesMap[v.city] = (citiesMap[v.city] || 0) + 1;
        });
        const realCities = Object.entries(citiesMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({
            name,
            count,
            pct: `${Math.round((count / totalViews) * 100)}%`,
          }));

        const firstLabel = chartBars[0]?.label || "";
        const midLabel = chartBars[Math.floor(chartBars.length / 2)]?.label || "";
        const lastLabel = chartBars[chartBars.length - 1]?.label || "";

        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 space-y-6 shadow-2xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-heading">
                    Page Views
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 font-normal">
                    Real-time unique visitor telemetry. Strictly one view per device.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700">
                    <ClockIcon size={14} className="text-zinc-500" />
                    <select
                      value={analyticsTimeframe}
                      onChange={(e) => setAnalyticsTimeframe(e.target.value as any)}
                      className="bg-transparent border-0 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
                    >
                      <option value="7d">Past 7 Days</option>
                      <option value="24h">Past 24 Hours</option>
                      <option value="30d">Past 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {recordedViews.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="mb-3"><DashboardArtwork kind="analytics" /></div>
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">No Visitors Yet</h3>
                    <p className="text-xs text-zinc-500 mt-1 font-body">
                      When someone opens your event page, unique views, sources, and cities appear here. Share your event link to start measuring.
                    </p>
                  </div>
                </div>
              ) : (
              <>
              {/* Dynamic Real Bar Chart */}
              <div className="pt-4 pb-2">
                <div className="relative h-48 w-full flex items-end justify-between gap-1.5 sm:gap-2 pt-6 pb-6 border-b border-zinc-100">
                  {/* Real guide lines */}
                  <div className="pointer-events-none absolute inset-x-0 top-6 border-b border-dashed border-zinc-200/60 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-zinc-400 pr-1 -translate-y-2.5">{peakCount}</span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-24 border-b border-dashed border-zinc-200/60 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-zinc-400 pr-1 -translate-y-2.5">{Math.ceil(peakCount / 2)}</span>
                  </div>

                  {/* Real Bars */}
                  {chartBars.map((bar, idx) => {
                    const heightPct = bar.count > 0 ? `${Math.max(12, (bar.count / peakCount) * 100)}%` : "3px";
                    return (
                      <div
                        key={idx}
                        className="group relative flex-1 h-full flex items-end justify-center"
                      >
                        <div
                          style={{ height: heightPct }}
                          className={`w-full max-w-[14px] sm:max-w-[20px] rounded-t-[3px] transition-all cursor-pointer ${
                            bar.count > 0 ? "bg-[#ec4899] hover:bg-[#db2777]" : "bg-zinc-200/70"
                          }`}
                        />
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20">
                          <div className="bg-zinc-950 text-white text-[11px] font-mono py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                            {bar.count} unique view{bar.count === 1 ? "" : "s"} • {bar.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Real X-Axis Milestones (Accurate Dates, No Typos) */}
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-2 px-1">
                  <span>{firstLabel}</span>
                  <span>{midLabel}</span>
                  <span>{lastLabel}</span>
                </div>
              </div>

              {/* Bottom Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-zinc-100">
                {/* Left Column: Real Page Views Summary & Live Traffic */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Page Views</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                        <div className="text-[11px] text-zinc-500 font-medium">24 hours</div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-950 font-heading mt-0.5">
                          {views24h}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                        <div className="text-[11px] text-zinc-500 font-medium">7 days</div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-950 font-heading mt-0.5">
                          {views7d}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                        <div className="text-[11px] text-zinc-500 font-medium">30 days</div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-950 font-heading mt-0.5">
                          {views30d}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-zinc-950 font-heading">
                        Live Traffic
                      </h3>
                      <span className="text-[11px] text-zinc-400 font-medium">1 unique view / device</span>
                    </div>

                    {recordedViews.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 text-center text-xs text-zinc-500">
                        No visitors recorded yet. When a visitor opens the event link on any device, it will be registered here once.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {recordedViews.map((item, idx) => {
                          const elapsedMs = now - new Date(item.timestamp).getTime();
                          const mins = Math.floor(elapsedMs / 60000);
                          const timeStr = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/90 bg-white shadow-2xs text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                                  {item.device === "Mobile" ? (
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                                      <path d="M12 18h.01" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect width="20" height="14" x="2" y="3" rx="2" />
                                      <path d="M8 21h8M12 17v4" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-zinc-950">
                                    Visitor from {item.source}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                                    <MapPinIcon size={11} className="text-zinc-400" />
                                    <span>{item.city}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-[11px] font-mono text-zinc-400 font-medium">
                                {timeStr}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Real Sources & Real Cities */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Traffic Sources</h3>
                    {realSources.length === 0 ? (
                      <div className="text-xs text-zinc-400 py-2">No traffic source data yet.</div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {realSources.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="text-zinc-600 font-medium">{s.name}</span>
                            <span className="font-semibold text-zinc-950 font-mono">{s.pct}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Cities</h3>
                    {realCities.length === 0 ? (
                      <div className="text-xs text-zinc-400 py-2">No visitor city data yet.</div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {realCities.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="text-zinc-600 font-medium">{c.name}</span>
                            <span className="font-semibold text-zinc-950 font-mono">{c.pct}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-zinc-950 font-heading">UTM Campaigns</h3>
                    </div>
                    <div className="text-xs text-zinc-400 py-1">
                      {recordedViews.length > 0 ? "Direct & organic traffic" : "No campaign parameters logged."}
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* 13. INTEGRATIONS                                                   */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Event Integrations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
              Operational webhook dispatches, hardware scanner sync, and attendee messaging channels.
            </p>
          </div>

          {/* Super Admin Managed Notice */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-zinc-900 flex items-center gap-2 font-heading">
                <span>Payment Gateway Extensions</span>
                <span className="text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-heading">
                  Managed by Super Admin
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-body">
                Payment rails (Razorpay UPI, Cards, NetBanking) are globally configured, secured, and reconciled by the platform Super Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-950 font-heading">
                <span>Discord & Slack Webhooks</span>
                <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-medium font-heading">ACTIVE</span>
              </div>
              <p className="text-xs text-zinc-500 font-body">Real-time alert dispatch to staff ops channels upon ticket drop sales and door arrivals.</p>
              <div className="text-[11px] font-mono text-zinc-500">#event-ops-alerts</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-950 font-heading">
                <span>Turnstile Hardware Scanners</span>
                <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-medium font-heading">CONNECTED</span>
              </div>
              <p className="text-xs text-zinc-500 font-body">Direct LAN TCP socket connection to physical optical RFID/barcode turnstiles.</p>
              <div className="text-[11px] font-mono text-zinc-500">Sync latency unavailable</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-950 font-heading">
                <span>WhatsApp Ticket Delivery</span>
                <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-medium font-heading">ACTIVE</span>
              </div>
              <p className="text-xs text-zinc-500 font-body">Instant WhatsApp dispatch of printable pass PDF and Apple Wallet pass upon purchase.</p>
              <div className="text-[11px] text-zinc-500 font-body">Template: `pass_drop_confirmed_v2`</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 14. SETTINGS                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Event Settings & Controls
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
              General settings, ticket limits, privacy, terms, refund policy, and drop controls.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-200 bg-white space-y-5 shadow-2xs max-w-2xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 font-heading">Refund Policy Statement</label>
              <input
                type="text"
                defaultValue="Allow cancellations up to 7 days before event start date."
                className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 font-body shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 font-heading">Max Tickets Per Order</label>
              <input
                type="number"
                defaultValue="6"
                className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 font-body shadow-2xs"
              />
            </div>

            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="text-xs font-bold text-zinc-950 font-heading">Concurrency Protection Status</div>
              <p className="text-[11px] text-zinc-500 font-body">
                Atomic Zero-Overselling engine lock active. Inventory is reserved before payment verification.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Danger Zone
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => showToast("Ticket checkout drop paused for 15 minutes.")}
                  className="btn-secondary"
                >
                  <span>Disable Ticket Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Event moved to draft / unpublished.")}
                  className="btn-secondary"
                >
                  <span>Unpublish Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast("Event cancellation requested. Notifications queued.");
                  }}
                  className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <span>Cancel Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmName("");
                    setIsDeleteModalOpen(true);
                  }}
                  className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300 font-semibold"
                >
                  <span>Delete Event</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------ */}
      {/* 1. CENTERED MODAL: CREATE / EDIT TICKET TIER                       */}
      {/* ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------ */}
      {/* 1. RIGHT SLIDE-OVER DRAWER: CREATE / EDIT TICKET TIER              */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={isTierDrawerOpen}
        onClose={() => setIsTierDrawerOpen(false)}
        title={editingTier ? "Edit Ticket" : "Add Ticket"}
        width="md"
        footer={
          <div className="w-full flex items-center justify-between">
            {editingTier ? (
              <button
                type="button"
                onClick={() => handleDeleteTier(editingTier.id)}
                disabled={editingTier.sold > 0}
                className={`text-xs font-medium transition cursor-pointer ${
                  editingTier.sold > 0
                    ? "text-zinc-300 cursor-not-allowed"
                    : "text-red-600 hover:text-red-700"
                }`}
              >
                Delete
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTierDrawerOpen(false)}
                className="h-9 px-3.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ticket-tier-drawer-form"
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                {editingTier ? "Save" : "Add Ticket"}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="ticket-tier-drawer-form"
          onSubmit={handleSaveTierFromDrawer}
          className="space-y-4"
        >
          {/* Segmented Free / Paid Tab */}
          <div className="flex border-b border-zinc-200 gap-6 text-sm mb-2">
            <button
              type="button"
              onClick={() => {
                setTierDrawerIsPaid(false);
                setTierDrawerPrice("0");
              }}
              className={`pb-2.5 font-medium transition cursor-pointer border-b-2 -mb-[1px] ${
                !tierDrawerIsPaid
                  ? "border-zinc-950 text-zinc-950 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => {
                setTierDrawerIsPaid(true);
                if (!tierDrawerPrice || tierDrawerPrice === "0") setTierDrawerPrice("");
              }}
              className={`pb-2.5 font-medium transition cursor-pointer border-b-2 -mb-[1px] ${
                tierDrawerIsPaid
                  ? "border-zinc-950 text-zinc-950 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Paid
            </button>
          </div>

          {/* Ticket Name */}
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">
              Name
            </label>
            <input
              type="text"
              required
              value={tierDrawerName}
              onChange={(e) => setTierDrawerName(e.target.value)}
              placeholder="General Admission"
              className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition"
            />
          </div>

          {/* Pricing & Capacity */}
          {tierDrawerIsPaid ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                  Price
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-medium text-zinc-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierDrawerPrice}
                    onChange={(e) => setTierDrawerPrice(e.target.value)}
                    placeholder="500"
                    className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg pl-7 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  value={tierDrawerCap}
                  onChange={(e) => setTierDrawerCap(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                Capacity
              </label>
              <input
                type="number"
                min="1"
                value={tierDrawerCap}
                onChange={(e) => setTierDrawerCap(e.target.value)}
                placeholder="Unlimited"
                className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition tabular-nums"
              />
            </div>
          )}

          {/* Registration Approval */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tierDrawerApprovalMode === "REQUIRES_APPROVAL"}
                onChange={(e) =>
                  setTierDrawerApprovalMode(e.target.checked ? "REQUIRES_APPROVAL" : "AUTO_APPROVE")
                }
                className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-0 cursor-pointer"
              />
              <span>Require host approval</span>
            </label>
          </div>

          {/* Sales Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                Sales start
              </label>
              <input
                type="date"
                value={tierDrawerSalesStart}
                onChange={(e) => setTierDrawerSalesStart(e.target.value)}
                className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                Sales end
              </label>
              <input
                type="date"
                value={tierDrawerSalesEnd}
                onChange={(e) => setTierDrawerSalesEnd(e.target.value)}
                className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-950 transition font-mono"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">
              Status
            </label>
            <select
              value={tierDrawerStatus}
              onChange={(e) => setTierDrawerStatus(e.target.value as any)}
              className="w-full h-10 bg-white border border-zinc-300 focus:border-zinc-950 rounded-lg px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition cursor-pointer"
            >
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Paused</option>
            </select>
          </div>

          {editingTier && (
            <div className="text-xs text-zinc-500 pt-2 flex gap-4 border-t border-zinc-100">
              <span>Sold: <strong className="text-zinc-900">{editingTier.sold}</strong></span>
              <span>Available: <strong className="text-zinc-900">{editingTier.available}</strong></span>
            </div>
          )}
        </form>
      </SlideOverDrawer>

      {/* ------------------------------------------------------------------ */}
      {/* 2. RIGHT SIDE BAR DRAWER: INVITE / EDIT EVENT STAFF               */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={isStaffDrawerOpen}
        onClose={() => {
          setIsStaffDrawerOpen(false);
          setEditingStaffId(null);
        }}
        title={editingStaffId ? "Edit Event Staff Member" : "Invite Event Staff"}
        subtitle={editingStaffId ? "Update duty responsibilities, station assignment, or status" : "Assign on-duty responsibilities and gate stations"}
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsStaffDrawerOpen(false);
                setEditingStaffId(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!staffDrawerEmail.trim() || !staffDrawerName.trim()}
              onClick={handleSaveStaffMember}
              className={`btn-primary ${(!staffDrawerEmail.trim() || !staffDrawerName.trim()) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {editingStaffId ? "Save Changes" : "Send Staff Invite"}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
              {editingStaffId ? "Edit Staff Details" : "Staff Member Details"}
            </h3>
            <p className="text-xs text-zinc-500 font-body mt-0.5">
              Assign scanner privileges and station check-in credentials.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Staff Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Varma"
              value={staffDrawerName}
              onChange={(e) => setStaffDrawerName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-950 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Staff Work Email *
            </label>
            <input
              type="email"
              placeholder="ramesh@security.com"
              value={staffDrawerEmail}
              onChange={(e) => setStaffDrawerEmail(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-950 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Assigned Duty Role *
            </label>
            <select
              value={staffDrawerRole}
              onChange={(e) => setStaffDrawerRole(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            >
              <option value="Door Check-in Scanner">Door Check-in Scanner</option>
              <option value="Turnstile Supervisor">Turnstile Supervisor</option>
              <option value="VIP Guest List Lead">VIP Guest List Lead</option>
              <option value="Volunteer Coordinator">Volunteer Coordinator</option>
              <option value="Box Office Cashier">Box Office Cashier</option>
              <option value="Event Owner & Director">Event Owner & Director</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Assigned Check-in Station
            </label>
            <input
              type="text"
              placeholder="e.g. Main Desk, Registration Table, Hall A"
              value={staffDrawerStation}
              onChange={(e) => setStaffDrawerStation(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Operational Status
            </label>
            <select
              value={staffDrawerStatus}
              onChange={(e) => setStaffDrawerStatus(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            >
              <option value="ACTIVE">Active On-Duty</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="INVITED">Invited (Pending Confirmation)</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </SlideOverDrawer>

      {/* ------------------------------------------------------------------ */}
      {/* 3. RIGHT SIDE BAR DRAWER: ISSUE MANUAL PASS                        */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={isManualPassDrawerOpen}
        onClose={() => setIsManualPassDrawerOpen(false)}
        title="Issue Manual Pass"
        subtitle="Direct pass assignment for VIP complimentary guests or offline bank settlements"
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsManualPassDrawerOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!manualPassEmail.trim()}
              onClick={() => {
                if (!manualPassEmail.trim()) return;
                const newAtt: StoredAttendee = {
                  id: `att_${Date.now().toString().slice(-4)}`,
                  eventId: eventId,
                  name: manualPassName.trim() || manualPassEmail.split("@")[0],
                  email: manualPassEmail.trim(),
                  ticketCode: `TKT-MN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  tierName: manualPassTier,
                  tierId: "tier_manual",
                  priceFormatted: "₹0",
                  status: "CONFIRMED",
                  registeredAt: new Date().toISOString(),
                };
                setAttendees([newAtt, ...attendees]);
                showToast(`Manual pass issued to ${manualPassEmail}. Confirmation sent.`);
                setIsManualPassDrawerOpen(false);
                setManualPassName("");
                setManualPassEmail("");
              }}
              className={`btn-primary ${!manualPassEmail.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Issue Pass
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
              Attendee Details
            </h3>
            <p className="text-xs text-zinc-500 font-body mt-0.5">
              The recipient will receive an encrypted QR entry pass via email.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Attendee Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ananya Rao"
              value={manualPassName}
              onChange={(e) => setManualPassName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-950 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Attendee Email Address *
            </label>
            <input
              type="email"
              placeholder="ananya@company.com"
              value={manualPassEmail}
              onChange={(e) => setManualPassEmail(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-950 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Select Admission Tier *
            </label>
            <select
              value={manualPassTier}
              onChange={(e) => setManualPassTier(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} (₹{t.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Issuance Reason *
            </label>
            <select
              value={manualPassType}
              onChange={(e) => setManualPassType(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            >
              <option value="Complimentary VIP Guest">Complimentary VIP Guest / Speaker</option>
              <option value="Offline Bank Wire Settled">Offline Bank Wire Settled</option>
              <option value="Cash Paid at Physical Desk">Cash Paid at Physical Desk</option>
              <option value="Sponsor Quota Pass">Sponsor Quota Pass</option>
            </select>
          </div>
        </div>
      </SlideOverDrawer>
      {/* ------------------------------------------------------------------ */}
      {/* 4. RIGHT SIDE BAR DRAWER: ORDER INSPECTION DETAILS                 */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.id}` : "Order Details"}
        subtitle="Transaction summary and pass issuance"
        width="md"
        footer={
          selectedOrder && (
            <>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
              >
                Close
              </button>
              {selectedOrder.status !== "REFUNDED" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRefundOrder(selectedOrder.id);
                  }}
                  className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Issue Refund
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  showToast(`Invoice receipt downloaded for Order #${selectedOrder.id}.`);
                }}
                className="btn-primary"
              >
                Download Receipt
              </button>
            </>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span
                className={`text-[10px] font-bold font-heading px-2.5 py-0.5 rounded-full ${
                  selectedOrder.status === "CONFIRMED"
                    ? "bg-zinc-900 text-white"
                    : selectedOrder.status === "REFUNDED"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {selectedOrder.status}
              </span>
              <span className="text-xs text-zinc-400 font-mono">{selectedOrder.date}</span>
            </div>

            {/* Total Amount Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-heading">
                  Total Paid
                </div>
                <div className="text-xl font-black text-zinc-950 font-heading mt-0.5">
                  ₹{Number(selectedOrder.amount).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-zinc-400 font-heading uppercase">
                  Payment Rail
                </div>
                <div className="text-xs font-bold text-zinc-800 font-heading mt-0.5">
                  {selectedOrder.method}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-heading">
                Customer Information
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Customer:</span>
                  <span className="font-semibold text-zinc-900 font-heading">{selectedOrder.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Email Address:</span>
                  <span className="font-mono text-zinc-700 text-[11px]">
                    {selectedOrder.email || `${selectedOrder.customer.toLowerCase().replace(/\s+/g, ".")}@example.com`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Transaction ID:</span>
                  <span className="font-mono text-zinc-500 text-[11px]">
                    TXN_{selectedOrder.id.replace("ord_", "")}_RZP
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Passes in Order */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-heading">
                Admission Passes
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white space-y-2 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900 font-heading">
                    {selectedOrder.tier || "General Admission Pass"}
                  </div>
                  <div className="font-mono font-bold text-zinc-900">
                    ₹{Number(selectedOrder.amount).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Pass Code:</span>
                  <span className="font-mono text-zinc-800 font-semibold">
                    {selectedOrder.ticketCode || `HKW-${selectedOrder.id.slice(-4)}-PASS`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-heading">
                Operational Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => showToast("Pass delivery isn't connected to an email service yet.")}
                  className="btn-secondary justify-center text-center text-xs"
                >
                  Resend Pass
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Receipt email isn't connected to an email service yet.")}
                  className="btn-secondary justify-center text-center text-xs"
                >
                  Email Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Delete Event Confirmation Modal */}
      {isDeleteModalOpen && event && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-zinc-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-950 font-heading">Delete Event</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-body">
                This will delete <span className="font-bold text-zinc-900 font-heading">"{event.title}"</span> from your host dashboard. Active listings, ticket passes, and attendee rosters will be removed from your view, but all payment records, ticket logs, and compliance manifests will be archived and retained by Super Admin.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
              <p className="text-xs text-zinc-700 font-medium font-body">
                To confirm, type <span className="font-mono font-bold text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded select-all">{event.title}</span> below:
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={`Type "${event.title}"`}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmName("");
                }}
                disabled={isDeleting}
                className="h-8 px-3 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-md transition font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCurrentEvent}
                disabled={deleteConfirmName.trim() !== event.title.trim() || isDeleting}
                className="h-8 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 rounded-md transition shadow-2xs font-heading cursor-pointer disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete this event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Registration Confirmation Modal */}
      {cancellingAttendee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-zinc-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-950 font-heading">
                Cancel Registration
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-body">
                Are you sure you want to cancel the registration for{" "}
                <span className="font-bold text-zinc-900 font-heading">
                  {cancellingAttendee.name}
                </span>{" "}
                ({cancellingAttendee.email})?
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 text-xs font-body">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ticket Pass:</span>
                <span className="font-mono font-bold text-zinc-900">{cancellingAttendee.ticketCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tier:</span>
                <span className="font-semibold text-zinc-800">{cancellingAttendee.tierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Status:</span>
                <span className="font-semibold text-zinc-800">{cancellingAttendee.status}</span>
              </div>
              <p className="text-[11px] text-zinc-500 pt-1.5 border-t border-zinc-200/80 leading-normal">
                This will invalidate their ticket pass and release 1 spot back to the tier capacity.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 font-heading">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Cancelled per attendee request"
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 font-body"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingAttendee(null);
                  setCancelReason("");
                }}
                disabled={isCancellingAttendee}
                className="h-8 px-3 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-md transition font-heading"
              >
                Keep Registration
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRegistration}
                disabled={isCancellingAttendee}
                className="h-8 px-4 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 rounded-md transition shadow-2xs font-heading cursor-pointer"
              >
                {isCancellingAttendee ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INVITE ATTENDEES MODAL                                             */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Attendees via Email"
        description="Issue direct invitations and confirmed passes to guests by entering their email addresses."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Email Addresses *
            </label>
            <textarea
              rows={4}
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="Paste email addresses separated by commas or lines:&#10;ananya@example.com, rahul@company.com&#10;priya@dev.org"
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs resize-none"
            />
            <p className="text-[11px] text-zinc-400">
              Multiple emails supported. Each recipient will receive a confirmed pass for this event.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Select Ticket Tier *
            </label>
            <select
              value={inviteTierId || (event?.tiers?.[0]?.id ?? "")}
              onChange={(e) => setInviteTierId(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            >
              {event?.tiers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Capacity: {t.remaining_capacity ?? t.total_capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Invitation Note (Optional)
            </label>
            <input
              type="text"
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              placeholder="e.g., We're excited to have you join our private keynote!"
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendInvites}
              disabled={isSendingInvites || !inviteEmails.trim()}
              className="btn-primary"
            >
              {isSendingInvites ? "Sending Invites..." : "Send Invitations"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
