import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { assertEventAccess, eventOwnerIds } from "@/lib/tenantAccess";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id") || undefined;
  const code = searchParams.get("code") || undefined;

  // Looking a team up by its invite code is how attendees join it — that stays public.
  // Listing every team for an event is a host-only console view.
  if (eventId && code) {
    const team = serverStore.getTeamByCode(eventId, code);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    return NextResponse.json({ team });
  }

  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  if (eventId) {
    const deny = assertEventAccess(session, serverStore.getEventById(eventId));
    if (deny) return deny;
    return NextResponse.json({ teams: serverStore.getTeams(eventId) });
  }

  // No eventId used to mean every team on the platform, to any organizer —
  // scope to events the caller owns/hosts; admin keeps the platform-wide view.
  const teams = session.role === "admin"
    ? serverStore.getTeams()
    : serverStore.getEvents()
        .filter((e) => eventOwnerIds(e).includes(session.sub))
        .flatMap((e) => serverStore.getTeams(e.id));
  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await req.json();
    if (!data.event_id || !data.name || !data.code) {
      return NextResponse.json({ error: "Missing required team fields" }, { status: 400 });
    }

    const event = serverStore.getEventById(data.event_id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if team already exists to avoid unauthorized team takeover
    const existingTeam = data.id
      ? serverStore.getTeamById(data.id)
      : serverStore.getTeamByCode(data.event_id, data.code);

    if (existingTeam && session.role !== "admin" && !eventOwnerIds(event).includes(session.sub)) {
      const isLeader = existingTeam.leader_email.toLowerCase() === session.email.toLowerCase();
      if (!isLeader) {
        return NextResponse.json({ error: "You don't have permission to modify this team" }, { status: 403 });
      }
    }

    const saved = serverStore.saveTeam({
      ...data,
      leader_name: existingTeam?.leader_name || data.leader_name || session.name || "Team Leader",
      leader_email: existingTeam?.leader_email || data.leader_email || session.email,
    });
    return NextResponse.json({ team: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save team" }, { status: 500 });
  }
}
