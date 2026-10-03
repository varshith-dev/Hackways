import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionTokenEdge } from "@/lib/edgeAuth";
import { canAccessModule, defaultPlatformSettings, isSuperAdminEmail, type ConsoleModuleId } from "@/lib/platformSettings";

const ADMIN_ONLY_PREFIXES = ["/console/users", "/console/super-admin", "/console/kpi"];
const SUPER_ADMIN_PREFIX = "/console/super-admin";
const CONSOLE_PREFIXES = ["/console", "/m/console"];

const MODULE_PREFIXES: Array<{ prefixes: string[]; module: ConsoleModuleId }> = [
  { prefixes: ["/console/marketing", "/m/console/marketing"], module: "marketing" },
  { prefixes: ["/console/kpi", "/m/console/kpi"], module: "kpi" },
  { prefixes: ["/console/checkin", "/m/console/checkin"], module: "checkin" },
  { prefixes: ["/console/finance", "/m/console/finance"], module: "finance" },
  { prefixes: ["/console/team"], module: "team" },
  { prefixes: ["/console/channels", "/m/console/channels"], module: "channels" },
  { prefixes: ["/console/organizer", "/m/console"], module: "organizer" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and banners bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/banners") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp")
  ) {
    return NextResponse.next();
  }

  // Auto-take /m on mobile devices when accessing /console
  const userAgent = request.headers.get("user-agent") || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
  const wantsDesktop = request.nextUrl.searchParams.get("view") === "desktop";

  const hasNoMobileEquivalent = ["/console/venue", "/console/users", "/console/super-admin", "/console/kpi", "/console/start"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (pathname.startsWith("/console") && isMobileUA && !wantsDesktop && !hasNoMobileEquivalent && pathname.startsWith("/console/events/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/console\/events\//, "/mobile/events/");
    return NextResponse.redirect(url);
  }

  if (pathname === "/m/console/events" || pathname.startsWith("/m/console/events/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/m\/console\/events\//, "/mobile/events/");
    return NextResponse.redirect(url);
  }
  if (pathname === "/m/console" || pathname.startsWith("/m/console/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/m\/console/, "/console");
    return NextResponse.redirect(url);
  }

  // Cryptographically verify session token via Edge WebCrypto
  const session = await verifySessionTokenEdge(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/signin") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.search = request.nextUrl.search;
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.next();
  }

  const redirectToLogin = () => {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (pathname === "/console/start" && session && (session.role === "organizer" || session.role === "admin")) {
    return NextResponse.redirect(new URL("/console/organizer", request.url));
  }

  if (pathname === "/create" || pathname === "/create/branding" || pathname === "/console/start") {
    return NextResponse.next();
  }

  const isCreateRoute = pathname.startsWith("/events/create");
  const isManageRoute = pathname.endsWith("/manage") || pathname.includes("/manage/");
  const isEventDashboard = pathname.startsWith("/console/events/") || pathname.startsWith("/m/console/events/") || pathname.startsWith("/mobile/events/");

  if (isCreateRoute || isManageRoute || isEventDashboard) {
    if (!session) return redirectToLogin();
    return NextResponse.next();
  }

  const isConsoleRoute = CONSOLE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isConsoleRoute) {
    if (!session) return redirectToLogin();
    if (session.role !== "organizer" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/console/start", request.url));
    }
    const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (isAdminOnly && session.role !== "admin") {
      return NextResponse.redirect(new URL("/console/organizer", request.url));
    }

    // Super admin is a stricter tier than the generic "admin" role: it must
    // additionally be on the allowlisted email list, checked here so no
    // unassigned/default role can ever reach it.
    const isSuperAdminRoute = pathname === SUPER_ADMIN_PREFIX || pathname.startsWith(`${SUPER_ADMIN_PREFIX}/`);
    if (isSuperAdminRoute && !isSuperAdminEmail(session.email)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const moduleMatch = MODULE_PREFIXES.find(({ prefixes }) =>
      prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    );
    if (moduleMatch) {
      const settings = defaultPlatformSettings();
      if (!canAccessModule(settings, moduleMatch.module, session.role)) {
        const denied = new URL("/console/organizer", request.url);
        denied.searchParams.set("denied", moduleMatch.module);
        return NextResponse.redirect(denied);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
