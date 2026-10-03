/**
 * Category tints on the Hackways grey ramp, with Indigo as the single pop.
 *
 * The palette carries one accent, so categories separate by depth on the greys
 * rather than by hue — hunting for seven distinct colours here would invent a
 * palette the brand does not have.
 *
 * Keys must match the category values offered by the event forms
 * (see EventDashboardView's category <select>), otherwise filtering by
 * category would silently return nothing.
 */
export interface CategoryStyle {
  label: string;
  bg: string;
  text: string;
}

// Caviar text throughout: it clears 8.78:1 even on the darkest tint used here.
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "hackathon": { label: "Hackathon", bg: "#34349C", text: "#FBFBFB" },
  "developer conference": { label: "Developer Conference", bg: "#E3E2F7", text: "#2C2C2E" },
  "meetup & networking": { label: "Meetup & Networking", bg: "#CBCDD5", text: "#2C2C2E" },
  "technology & engineering": { label: "Technology & Engineering", bg: "#EAE8EC", text: "#2C2C2E" },
  "cloud architecture": { label: "Cloud Architecture", bg: "#DEDCE1", text: "#2C2C2E" },
  "design & creative": { label: "Design & Creative", bg: "#F2F1F3", text: "#2C2C2E" },
  "executive keynote": { label: "Executive Keynote", bg: "#2C2C2E", text: "#FBFBFB" },
};

const FALLBACK: CategoryStyle = { label: "Event", bg: "#EAE8EC", text: "#2C2C2E" };

export function categoryStyle(category?: string): CategoryStyle {
  if (!category) return FALLBACK;
  return CATEGORY_STYLES[category.trim().toLowerCase()] ?? { ...FALLBACK, label: category };
}

/** The canonical category names, in the order the landing page lists them. */
export const BROWSE_CATEGORIES = [
  "Hackathon",
  "Developer Conference",
  "Meetup & Networking",
  "Technology & Engineering",
  "Cloud Architecture",
  "Design & Creative",
  "Executive Keynote",
] as const;

/** Formats an event's start time, falling back to a host-supplied display string. */
export function formatEventWhen(startTime?: string, timeDisplay?: string): string {
  if (startTime) {
    const date = new Date(startTime);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  return timeDisplay || "Date to be announced";
}
