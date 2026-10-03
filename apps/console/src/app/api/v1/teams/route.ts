import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

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

  const teams = serverStore.getTeams(eventId);
  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.event_id || !data.name || !data.code) {
      return NextResponse.json({ error: "Missing required team fields" }, { status: 400 });
    }
    const saved = serverStore.saveTeam(data);
    return NextResponse.json({ team: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save team" }, { status: 500 });
  }
}
