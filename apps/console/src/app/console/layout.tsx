"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TicketIcon,
  PresentationIcon,
  UsersGroupIcon,
  BarChartIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  LockIcon,
  RefreshCwIcon,
  FilterIcon,
  UserIcon,
  PlusIcon,
} from "@/components/icons/hugeicons";
import Logo3D from "@/components/ui/Logo3D";
import { ToastProvider } from "@/components/ui/Toast";
import {
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { canAccessModule, CONSOLE_MODULES } from "@/lib/platformSettings";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getStoredEvents, getStoredChannels } from "@/lib/api";
import { EventItem, Channel } from "@/lib/types";
import { webAppHref } from "@/lib/webAppUrl";

interface SubItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface ParentItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface SubPanelConfig {
  title: string;
  items: SubItem[];
  isCommunityMode?: boolean;
  communityId?: string;
  community?: Channel | null;
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const isSuperAdminSuite =
    pathname.startsWith("/console/super-admin") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/kpi");

  const [hasEventOrCommunity, setHasEventOrCommunity] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (isSuperAdminSuite && !isAdmin) {
      router.replace("/console/organizer");
      return;
    }

    if (!user) return;
    if (isAdmin) {
      setHasEventOrCommunity(true);
      return;
    }

    const checkAccess = () => {
      const events = getStoredEvents();
      const channels = getStoredChannels();
      const userEmail = (user.email || "").toLowerCase();
      const userId = user.userId;

      const ownsEvent = events.some(
        (e) =>
          (e.organizer_id && (e.organizer_id === userId || e.organizer_id.toLowerCase() === userEmail)) ||
          (e.hosts && e.hosts.some((h) => h === userId || h.toLowerCase() === userEmail)) ||
          (e.host_users && e.host_users.some((h) => h.user_id === userId || h.email?.toLowerCase() === userEmail))
      );

      const ownsCommunity = channels.some(
        (c) =>
          (c.owner_id && (c.owner_id === userId || c.owner_id.toLowerCase() === userEmail)) ||
          (c.members && c.members.some((m) => (m.user_id === userId || m.email?.toLowerCase() === userEmail) && (m.role === "owner" || m.role === "admin" || m.role === "host")))
      );

      setHasEventOrCommunity(ownsEvent || ownsCommunity);
    };

    checkAccess();
  }, [isLoading, isSuperAdminSuite, isAdmin, user, router]);

  if (isSuperAdminSuite && !isLoading && !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-6 font-body">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <LockIcon size={20} />
          </div>
          <h2 className="text-sm font-bold text-zinc-950 font-heading">Super Admin Restricted</h2>
          <p className="text-xs text-zinc-500 mt-1">This console section is strictly limited to verified platform administrators.</p>
          <button
            onClick={() => router.replace("/console/organizer")}
            className="mt-4 px-4 py-2 bg-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"
          >
            Go to Organizer Console
          </button>
        </div>
      </div>
    );
  }

  // Must own an event or a community to access the console
  if (user && hasEventOrCommunity === false && !pathname.startsWith("/console/start")) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa] p-6 font-body text-zinc-900">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto">
            <PresentationIcon size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-950 font-heading">Organizer Console Access</h2>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              To access the organizer console, you must create at least one event or own a community.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={webAppHref("/events/create")}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition text-center"
            >
              Create an Event
            </a>
            <a
              href={webAppHref("/channels/create")}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition text-center"
            >
              Launch Community
            </a>
          </div>
          <div className="pt-2">
            <a href={webAppHref("/profile")} className="text-[11px] text-zinc-400 hover:text-zinc-600 transition">
              Return to Profile
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Standalone KPI & User Management Suites: dedicated uncompressed full-bleed dashboards
  if (
    pathname.startsWith("/console/kpi") ||
    pathname.startsWith("/console/users")
  ) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return <DesktopConsoleLayout>{children}</DesktopConsoleLayout>;
}

function DesktopConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const { settings: platformSettings, loaded: accessLoaded, error: accessError, retry: retryAccess } = usePlatformSettings();
  const userRole = user?.role ?? "attendee";
  const moduleAllowed = (moduleId: string) =>
    platformSettings ? canAccessModule(platformSettings, moduleId, userRole) : !accessError;

  const isSuperAdminContext = pathname.startsWith("/console/super-admin");

  const getCurrentRole = (): string => {
    if (pathname.startsWith("/console/marketing")) return "marketing";
    if (pathname.startsWith("/console/users")) return "users";
    if (pathname.startsWith("/console/kpi")) return "kpi";
    if (pathname.startsWith("/console/super-admin")) return "super_admin";
    if (pathname.startsWith("/console/team")) return "team";
    if (pathname.startsWith("/console/checkin")) return "checkin";
    if (pathname.startsWith("/console/finance")) return "finance";
    if (pathname.startsWith("/console/channels")) return "channels";
    if (pathname.startsWith("/console/events")) return "events";
    return "organizer";
  };

  const [currentRole, setCurrentRole] = useState<string>("organizer");
  const [deniedModule, setDeniedModule] = useState("");
  const [channelsList, setChannelsList] = useState<Channel[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const denied = params.get("denied");
    if (denied) {
      setDeniedModule(denied);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [pathname]);

  useEffect(() => {
    setCurrentRole(getCurrentRole());
    setChannelsList(getStoredChannels());

    const handleChannelsUpdate = () => {
      setChannelsList(getStoredChannels());
    };
    window.addEventListener("hackways_channels_updated", handleChannelsUpdate);
    return () => {
      window.removeEventListener("hackways_channels_updated", handleChannelsUpdate);
    };
  }, [pathname]);

  const handleRoleChange = (role: string) => {
    setCurrentRole(role);
    switch (role) {
      case "marketing":
        router.push("/console/marketing");
        break;
      case "users":
        router.push("/console/users");
        break;
      case "kpi":
        router.push("/console/kpi");
        break;
      case "organizer":
        router.push("/console/organizer/overview");
        break;
      case "super_admin":
        router.push("/console/super-admin/overview");
        break;
      case "team":
        router.push("/console/team/overview");
        break;
      case "checkin":
        router.push("/console/checkin");
        break;
      case "finance":
        router.push("/console/finance");
        break;
      case "channels":
        router.push("/console/channels");
        break;
      default:
        router.push("/console/organizer/overview");
    }
  };

  // Primary navigation items (Column 1)
  const parentSections: ParentItem[] = isSuperAdminContext
    ? [
        { id: "overview", name: "Overview", href: "/console/super-admin/overview", icon: <BarChartIcon size={18} /> },
        { id: "events", name: "Events", href: "/console/super-admin/events", icon: <TicketIcon size={18} /> },
        { id: "organizers", name: "Organizers", href: "/console/super-admin/organizers", icon: <UsersGroupIcon size={18} /> },
        { id: "attendees", name: "Attendees / Users", href: "/console/super-admin/attendees", icon: <UserIcon size={18} /> },
        { id: "orders", name: "Orders", href: "/console/super-admin/orders", icon: <BarChartIcon size={18} /> },
        { id: "tickets", name: "Tickets", href: "/console/super-admin/tickets", icon: <TicketIcon size={18} /> },
        { id: "payments", name: "Payments", href: "/console/super-admin/payments", icon: <LockIcon size={18} /> },
        { id: "refunds", name: "Refunds", href: "/console/super-admin/refunds", icon: <RefreshCwIcon size={18} /> },
        { id: "payouts", name: "Payouts", href: "/console/super-admin/payouts", icon: <LockIcon size={18} /> },
        { id: "commissions", name: "Commissions", href: "/console/super-admin/commissions", icon: <BarChartIcon size={18} /> },
        { id: "kyc", name: "KYC / Verification", href: "/console/super-admin/kyc", icon: <ShieldCheckIcon size={18} /> },
        { id: "fraud", name: "Fraud & Risk", href: "/console/super-admin/fraud", icon: <ShieldCheckIcon size={18} /> },
        { id: "disputes", name: "Disputes", href: "/console/super-admin/disputes", icon: <FilterIcon size={18} /> },
        { id: "support", name: "Support", href: "/console/super-admin/support", icon: <UsersGroupIcon size={18} /> },
        { id: "analytics", name: "Analytics", href: "/console/super-admin/analytics", icon: <BarChartIcon size={18} /> },
        { id: "access", name: "Access & Fees", href: "/console/super-admin/access", icon: <ShieldCheckIcon size={18} /> },
        { id: "settings", name: "Platform Settings", href: "/console/super-admin/settings", icon: <RefreshCwIcon size={18} /> },
      ]
    : [
        { id: "overview", name: "Overview", href: "/console/organizer/overview", icon: <BarChartIcon size={18} /> },
        { id: "events", name: "Events", href: "/console/organizer/events", icon: <PresentationIcon size={18} /> },
        { id: "customers", name: "Orders & Customers", href: "/console/organizer/customers", icon: <UsersGroupIcon size={18} /> },
        { id: "checkin", name: "Door Check-in", href: "/console/checkin", icon: <QrCodeIcon size={18} /> },
        { id: "finance", name: "Finance & Payouts", href: "/console/finance", icon: <LockIcon size={18} /> },
        { id: "analytics", name: "Analytics", href: "/console/organizer/analytics", icon: <BarChartIcon size={18} /> },
        { id: "channels", name: "Communities", href: "/console/channels", icon: <UsersGroupIcon size={18} /> },
        { id: "marketing", name: "Marketing", href: "/console/marketing", icon: <FilterIcon size={18} /> },
        { id: "team", name: "Team", href: "/console/team/overview", icon: <UserIcon size={18} /> },
        { id: "settings", name: "Settings", href: "/console/organizer/settings", icon: <RefreshCwIcon size={18} /> },
      ];

  // Active Parent Item
  const getActiveParentId = (): string => {
    if (isSuperAdminContext) {
      for (const item of parentSections) {
        if (pathname === item.href || pathname.startsWith(item.href + "/")) return item.id;
      }
      return "overview";
    }

    if (pathname.startsWith("/console/finance")) return "finance";
    if (pathname.startsWith("/console/events") || pathname.startsWith("/console/organizer/events")) return "events";
    if (pathname.startsWith("/console/organizer/customers")) return "customers";
    if (pathname.startsWith("/console/checkin")) return "checkin";
    if (pathname.startsWith("/console/organizer/analytics")) return "analytics";
    if (pathname.startsWith("/console/channels")) return "channels";
    if (pathname.startsWith("/console/marketing")) return "marketing";
    if (pathname.startsWith("/console/team")) return "team";
    if (pathname.startsWith("/console/organizer/settings")) return "settings";
    return "overview";
  };

  const activeParentId = getActiveParentId();

  // Secondary sub-panel config (Column 2) - ONLY rendered when the active section HAS sub-railbars
  const getSubPanelConfig = (): SubPanelConfig | null => {
    // Super Admin has all its tabs directly in Column 1, so no Column 2
    if (isSuperAdminContext) {
      return null;
    }

    // 1. Finance & Payouts Sub-Panel (1:1 with user screenshot media_1790956095695.png)
    if (pathname.startsWith("/console/finance")) {
      return {
        title: "PAYOUTS",
        items: [
          { name: "Overview & Balance", href: "/console/finance", icon: <BarChartIcon size={18} /> },
          { name: "Transactions", href: "/console/finance/transactions", icon: <TicketIcon size={18} /> },
          { name: "Payout Transfers", href: "/console/finance/payouts", icon: <RefreshCwIcon size={18} /> },
          { name: "Bank Account", href: "/console/finance/account", icon: <ShieldCheckIcon size={18} /> },
          { name: "Tax & GST", href: "/console/finance/tax", icon: <UserIcon size={18} /> },
        ],
      };
    }

    // 2. Event Operations Sub-Panel (when operating a specific event)
    const eventMatch = pathname.match(/^\/console\/events\/([^\/]+)/);
    if (eventMatch) {
      const eventId = eventMatch[1];
      return {
        title: "EVENT OPERATIONS",
        items: [
          { name: "Overview", href: `/console/events/${eventId}/overview`, icon: <BarChartIcon size={18} /> },
          { name: "Event Setup", href: `/console/events/${eventId}/setup`, icon: <PresentationIcon size={18} /> },
          { name: "Tickets & Tiers", href: `/console/events/${eventId}/tickets`, icon: <TicketIcon size={18} /> },
          { name: "Orders", href: `/console/events/${eventId}/orders`, icon: <BarChartIcon size={18} /> },
          { name: "Attendees", href: `/console/events/${eventId}/attendees`, icon: <UsersGroupIcon size={18} /> },
          { name: "Teams & Squads", href: `/console/events/${eventId}/teams`, icon: <UsersGroupIcon size={18} /> },
          { name: "Turnstile Check-in", href: `/console/events/${eventId}/check-in`, icon: <QrCodeIcon size={18} /> },
          { name: "Marketing", href: `/console/events/${eventId}/marketing`, icon: <FilterIcon size={18} /> },
          { name: "Communications", href: `/console/events/${eventId}/communications`, icon: <RefreshCwIcon size={18} /> },
          { name: "Staff & Scanners", href: `/console/events/${eventId}/staff`, icon: <UserIcon size={18} /> },
          { name: "Finance & Ledger", href: `/console/events/${eventId}/finance`, icon: <LockIcon size={18} /> },
          { name: "Analytics", href: `/console/events/${eventId}/analytics`, icon: <BarChartIcon size={18} /> },
          { name: "Settings", href: `/console/events/${eventId}/settings`, icon: <RefreshCwIcon size={18} /> },
        ],
      };
    }

    // 3. Community Console Sub-Panel (when operating a specific community)
    const channelMatch = pathname.match(/^\/console\/channels\/([^\/]+)/);
    if (channelMatch) {
      const channelId = channelMatch[1];
      const found = channelsList.find((c) => c.id === channelId || c.slug === channelId) || null;
      return {
        title: found ? found.name : "Community Console",
        isCommunityMode: true,
        communityId: channelId,
        community: found,
        items: [
          { name: "Overview", href: `/console/channels/${channelId}`, icon: <BarChartIcon size={18} /> },
          { name: "Events", href: `/console/channels/${channelId}?tab=events`, icon: <PresentationIcon size={18} /> },
          { name: "Team & Roles", href: `/console/channels/${channelId}?tab=members`, icon: <UserIcon size={18} /> },
          { name: "Audience & Followers", href: `/console/channels/${channelId}?tab=followers`, icon: <UsersGroupIcon size={18} /> },
          { name: "Analytics", href: `/console/channels/${channelId}?tab=analytics`, icon: <BarChartIcon size={18} /> },
          { name: "Branding & Settings", href: `/console/channels/${channelId}?tab=settings`, icon: <RefreshCwIcon size={18} /> },
        ],
      };
    }

    // 4. Co-Organizer Team Sub-Panel
    if (pathname.startsWith("/console/team")) {
      return {
        title: "CO-ORGANIZER",
        items: [
          { name: "Overview", href: "/console/team/overview", icon: <BarChartIcon size={18} /> },
          { name: "My Events", href: "/console/team/my-events", icon: <PresentationIcon size={18} /> },
          { name: "Tasks", href: "/console/team/tasks", icon: <ShieldCheckIcon size={18} /> },
          { name: "Attendees", href: "/console/team/attendees", icon: <UserIcon size={18} /> },
          { name: "Tickets & Orders", href: "/console/team/tickets-orders", icon: <TicketIcon size={18} /> },
          { name: "Check-in", href: "/console/checkin", icon: <QrCodeIcon size={18} /> },
        ],
      };
    }

    // 5. Door Check-in Sub-Panel
    if (pathname.startsWith("/console/checkin")) {
      return {
        title: "DOOR CHECK-IN",
        items: [
          { name: "Door Scanner & Code", href: "/console/checkin", icon: <QrCodeIcon size={18} /> },
          { name: "Attendee Manifest", href: "/console/checkin?tab=manifest", icon: <UsersGroupIcon size={18} /> },
          { name: "Events Overview", href: "/console/organizer/events", icon: <PresentationIcon size={18} /> },
        ],
      };
    }

    // Other parent sections (Overview, Events list, Customers, Analytics, Marketing, Settings) do not have sub-railbars
    return null;
  };

  const subPanel = getSubPanelConfig();

  return (
    <SidebarProvider>
      <div className="h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white flex flex-col font-body antialiased overflow-hidden">
        {/* Top Header Bar: Clean White, Fixed at Top */}
        <header className="h-16 shrink-0 border-b border-[#e8eaed] bg-white px-4 sm:px-6 flex items-center justify-between z-50">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center group py-1" aria-label="Hackways Home">
              <Logo3D />
            </Link>
            <span className="hidden sm:inline-block text-[#dadce0]">/</span>
            <span className="text-xs font-semibold text-[#5f6368] tracking-wider uppercase font-heading">
              Console
            </span>
            <SidebarTrigger />
          </div>

          {/* Right Actions: Dashboard Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-2xs hover:border-zinc-400 focus:outline-none focus:border-zinc-900 cursor-pointer transition"
                aria-label="Switch Console"
              >
                {(isAdmin
                  ? [
                      { value: "super_admin", label: "Super Admin" },
                      { value: "users", label: "User Management" },
                      { value: "kpi", label: "Platform Analytics" },
                      { value: "organizer", label: "Organizer Console" },
                      { value: "channels", label: "Communities" },
                    ]
                  : [
                      { value: "organizer", label: "Organizer Console" },
                      { value: "marketing", label: "Marketing" },
                      { value: "checkin", label: "Door Check-in" },
                      { value: "finance", label: "Payouts" },
                      { value: "team", label: "Co-Organizer" },
                      { value: "channels", label: "Communities" },
                    ]
                )
                  .filter((o) => {
                    if (o.value === "super_admin" || o.value === "users" || o.value === "kpi") {
                      return isAdmin;
                    }
                    return moduleAllowed(o.value);
                  })
                  .map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
              </select>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 border border-zinc-200 text-zinc-600 hover:text-zinc-950 rounded-md"
              aria-label="Toggle Navigation"
            >
              <FilterIcon size={16} />
            </button>
          </div>
        </header>

        {/* Main Layout: Fixed Sidebars on Left, Content Scrolls on Right */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Desktop: Side Navigation Panels (Column 1 + Column 2 when sub-panel exists) */}
          <TwoColumnSidebar
            isSuperAdmin={isSuperAdminContext}
            parentSections={parentSections}
            activeParentId={activeParentId}
            subPanel={subPanel}
            channelsList={channelsList}
            pathname={pathname}
            router={router}
          />

          {/* Mobile: dropdown navigation panel */}
          <aside
            className={`lg:hidden w-full shrink-0 border-b border-zinc-200 bg-white py-3 px-2 flex flex-col justify-between overflow-y-auto max-h-72 ${
              mobileMenuOpen ? "block" : "hidden"
            }`}
          >
            <div className="space-y-2">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-heading">
                {subPanel ? subPanel.title : (isSuperAdminContext ? "SUPER ADMIN" : "ORGANIZER")}
              </div>
              <nav className="space-y-0.5">
                {(subPanel ? subPanel.items : parentSections).map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                        isActive
                          ? "bg-zinc-100 text-zinc-950 font-semibold"
                          : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-normal"
                      }`}
                    >
                      <span className={isActive ? "text-zinc-950" : "text-zinc-400"}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content Canvas: Independently Scrollable */}
          <main data-lenis-prevent="true" className="flex-1 h-full min-h-0 overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] bg-white p-4 sm:p-6 lg:p-8">
            {deniedModule && (
              <div role="alert" className="mb-6 flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                <p className="text-xs text-zinc-600">
                  Your {userRole} account doesn&apos;t have access to that module. Ask the platform admin to enable it for your role.
                </p>
                <button type="button" onClick={() => setDeniedModule("")} className="text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-4 shrink-0">
                  Dismiss
                </button>
              </div>
            )}
            <ModuleGate
              moduleId={currentRole}
              settingsLoaded={accessLoaded}
              settingsError={accessError}
              onRetry={retryAccess}
              allowed={moduleAllowed(currentRole)}
              role={userRole}
            >
              {children}
            </ModuleGate>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

/* Blocks console modules the signed-in role has no access to */
function ModuleGate({
  moduleId,
  settingsLoaded,
  settingsError,
  onRetry,
  allowed,
  role,
  children,
}: {
  moduleId: string;
  settingsLoaded: boolean;
  settingsError: string;
  onRetry: () => void;
  allowed: boolean;
  role: string;
  children: React.ReactNode;
}) {
  if (!CONSOLE_MODULES.some((m) => m.id === moduleId)) return children;
  if (!settingsLoaded && !settingsError) return <PageSkeleton rows={4} />;
  if (settingsError) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-zinc-600">{settingsError}</p>
        <button type="button" onClick={onRetry} className="btn-secondary">Retry</button>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="py-16 text-center space-y-3">
        <h2 className="text-base font-semibold text-zinc-950">No access to this module</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Your {role} account doesn&apos;t include this console. Ask the platform admin to enable it for your role.
        </p>
        <Link href="/console" className="btn-secondary inline-flex">Back to console</Link>
      </div>
    );
  }
  return children;
}

/* Two-Column Side Navigation Component matching user design (Column 1 + Column 2 when subPanel exists) */
function TwoColumnSidebar({
  isSuperAdmin,
  parentSections,
  activeParentId,
  subPanel,
  channelsList,
  pathname,
  router,
}: {
  isSuperAdmin: boolean;
  parentSections: ParentItem[];
  activeParentId: string;
  subPanel: SubPanelConfig | null;
  channelsList: Channel[];
  pathname: string;
  router: any;
}) {
  const { collapsed } = useSidebar();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div className="relative hidden lg:flex shrink-0 h-full border-r border-[#e8eaed] bg-white select-none">
      {/* COLUMN 1: Parent Navigation Panel (w-52 or w-14 if collapsed) */}
      <div
        className={`shrink-0 border-r border-[#e8eaed] bg-white flex flex-col justify-between py-4 px-2.5 transition-[width] duration-200 overflow-y-auto ${
          collapsed ? "w-14 items-center px-1" : "w-52"
        }`}
      >
        <div className="w-full">
          {!collapsed && (
            <div className="px-3 py-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-heading">
              {isSuperAdmin ? "SUPER ADMIN" : "ORGANIZER"}
            </div>
          )}
          <nav className="space-y-1">
            {parentSections.map((item) => {
              const isActive = activeParentId === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center rounded-lg text-[13px] transition-colors ${
                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                  } ${
                    isActive
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-medium"
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? "text-zinc-950" : "text-zinc-400"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* COLUMN 2: Sub-Panel Railbar (w-56, right beside Column 1) - ONLY when subPanel exists, STAYS ALIVE when primary collapses */}
      {subPanel && (
        <div className="w-56 shrink-0 bg-[#fafafa]/50 border-r border-[#e8eaed] flex flex-col justify-between py-4 px-2.5 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full">
            {/* Community Switcher Popover if in Community Mode */}
            {subPanel.isCommunityMode ? (
              <div className="px-1 mb-3 relative">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-heading px-1 mb-1.5 flex items-center justify-between">
                  <span>Community Console</span>
                  {subPanel.community?.verified && (
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                      VERIFIED
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition text-left cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {subPanel.community?.avatar_url ? (
                      <img
                        src={subPanel.community.avatar_url}
                        alt=""
                        className="w-6 h-6 rounded object-contain shrink-0 bg-white border border-zinc-200 p-0.5"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 font-heading">
                        {subPanel.community?.name?.charAt(0).toUpperCase() || "C"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-900 truncate font-heading group-hover:text-indigo-600 transition">
                        {subPanel.community?.name || "Community"}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        @{subPanel.community?.slug || "community"}
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${switcherOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {switcherOpen && (
                  <div className="absolute left-1 right-1 top-full mt-1 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-2">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-heading">
                      Switch Community
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-zinc-50">
                      {channelsList.map((ch) => {
                        const isSelected = ch.id === subPanel.communityId || ch.slug === subPanel.communityId;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => {
                              setSwitcherOpen(false);
                              router.push(`/console/channels/${ch.id}`);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-50 transition cursor-pointer ${
                              isSelected ? "bg-zinc-50 font-semibold" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {ch.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-zinc-900 truncate">{ch.name}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">@{ch.slug}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-indigo-600 uppercase font-mono">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-zinc-100 mt-1 pt-1 px-2 space-y-0.5">
                      <Link
                        href={webAppHref("/channels/create")}
                        onClick={() => setSwitcherOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-md font-medium transition"
                      >
                        <PlusIcon size={14} />
                        <span>Create New</span>
                      </Link>
                      <Link
                        href="/console/channels"
                        onClick={() => setSwitcherOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-md transition"
                      >
                        <span>All Communities Hub</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-heading">
                {subPanel.title}
              </div>
            )}

            {/* Sub navigation items */}
            <nav className="space-y-1">
              {subPanel.items.map((sub) => {
                const isSubActive =
                  pathname === sub.href ||
                  (pathname.startsWith(sub.href) && sub.href !== "/console/finance" && sub.href !== "/console/super-admin" && sub.href !== "/console/organizer");
                return (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                      isSubActive
                        ? "bg-zinc-100 text-zinc-950 font-semibold shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70 font-medium"
                    }`}
                  >
                    <span className={`shrink-0 ${isSubActive ? "text-zinc-950" : "text-zinc-400"}`}>
                      {sub.icon}
                    </span>
                    <span className="truncate">{sub.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <SidebarRail />
    </div>
  );
}
