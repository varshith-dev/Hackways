import { test, expect, type Page } from "@playwright/test";
import type { EventItem, Channel } from "../src/lib/types";
import { cleanEventArtwork, cleanSeededChannels, withoutStockPhoto } from "../src/lib/demoCleanup";
import { eventDate, eventPrice, eventTime, groupEvents, isDiscoveryEvent, isPastEvent, registrationTickets } from "../src/lib/eventBrowsing";
import type { UserTicket } from "../src/lib/api";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/analytics/track", (route) => route.fulfill({ status: 204 }));
});

const artwork = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23999'/%3E%3C/svg%3E";
const event: EventItem = {
  id: "fixture-event", title: "Fixture workshop", description: "",
  organizer_id: "fixture-host", status: "PUBLISHED", total_capacity: 12,
  created_at: "2026-01-01T00:00:00Z", start_time: "2099-10-10T10:00:00Z",
  city: "Hyderabad", location: "Fixture studio", category: "Workshop",
  banner_url: "/fixture-wide.png", square_banner_url: artwork,
  tiers: [{ id: "fixture-tier", event_id: "fixture-event", name: "Admission", total_capacity: 12, remaining_capacity: 6, price_cents: 0 }],
};
const events = [
  event,
  { ...event, id: "private", title: "Private fixture", visibility: "PRIVATE" as const },
  { ...event, id: "draft", title: "Draft fixture", status: "DRAFT" as const },
  { ...event, id: "past", title: "Past fixture", start_time: "2020-01-01T10:00:00Z" },
];

const fixtureUser = { userId: "fixture-host", email: "fixture@example.test", name: "Fixture host", role: "organizer" as const };

const fixtureTickets = [
  { id: "mine", event_id: event.id, event_title: event.title, event_start_time: event.start_time, user_id: "fixture-host", user_email: "fixture@example.test", status: "CONFIRMED", ticket_code: "FIXTURE", tier_name: "Admission", price_cents: 0, created_at: event.created_at },
  { id: "past-registration", event_id: "past", event_title: "Past fixture", event_start_time: "2020-01-01T10:00:00Z", user_id: "fixture-host", user_email: "fixture@example.test", status: "CHECKED_IN", created_at: event.created_at },
  { id: "older-cancelled", event_id: event.id, event_title: event.title, event_start_time: event.start_time, user_id: "fixture-host", user_email: "fixture@example.test", status: "CANCELLED", created_at: "2025-01-01T00:00:00Z" },
  { id: "someone-else", event_id: "other-event", event_title: "Someone else's registration", event_start_time: event.start_time, user_id: "other", user_email: "other@example.test", status: "CONFIRMED", created_at: event.created_at },
];

async function prepare(page: Page, signedIn = false) {
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events } }));
  await page.route("**/api/v1/attendees", (route) => route.fulfill({ json: { attendees: [] } }));
  await page.route("**/api/v1/orders", (route) => route.fulfill({ json: { orders: [] } }));
  // The session is an httpOnly HMAC cookie client JS cannot forge; mirror the
  // server contract instead: optimistic cache for first paint, /me for truth.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill(signedIn ? { json: { user: fixtureUser } } : { status: 401, json: { error: "Unauthorized" } })
  );
  await page.addInitScript(({ signedIn, user, tickets }) => {
    if (signedIn) {
      localStorage.setItem("hackways_user_cache_v1", JSON.stringify({ user, cachedAt: Date.now() }));
    }
    localStorage.setItem("hackways_tickets_v7", JSON.stringify(tickets));
  }, { signedIn, user: fixtureUser, tickets: fixtureTickets });
}

test("Discover stays compact, private/draft/past events stay hidden, and search works", async ({ page }) => {
  await prepare(page);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Private fixture|Draft fixture|Past fixture/ })).toHaveCount(0);
  await expect(page.getByText("All locations", { exact: true })).toHaveCount(0);
  await expect(page.locator("main aside, main select, main footer")).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  const headerBackground = page.locator("header > div[aria-hidden='true']");
  await expect(headerBackground).toHaveCSS("border-bottom-width", "0px");
  await expect(headerBackground).toHaveCSS("backdrop-filter", "blur(4px)");
  await expect(headerBackground).toHaveCSS("box-shadow", "none");
  const article = page.locator("article").first();
  await expect(article).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(article).toHaveCSS("border-radius", "14px");
  const image = article.locator("img");
  await expect(image).toHaveAttribute("src", artwork);
  const box = await image.boundingBox();
  expect(box?.width).toBe(box?.height);
  await page.getByRole("button", { name: "Search events", exact: true }).click();
  await page.getByRole("searchbox").fill("nothing matches");
  await expect(page.getByRole("searchbox")).toHaveCSS("outline-style", "none");
  await expect(page.getByRole("searchbox")).toHaveCSS("box-shadow", "none");
  await expect(page.getByRole("heading", { name: "No events found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("discover.png"), fullPage: true });
});

test("bookmarks persist in Discover without becoming registrations", async ({ page }) => {
  await prepare(page);
  await page.goto("/home");
  await page.getByRole("button", { name: "Save Fixture workshop", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Unsave Fixture workshop" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/my-events");
  await expect(page.getByRole("heading", { name: "Sign in to see your events" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toHaveCount(0);
  await page.goto("/home");
  await page.getByRole("button", { name: "Unsave Fixture workshop" }).click();
  await expect(page.getByRole("button", { name: "Save Fixture workshop", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("My events includes only current user's registrations, not hosted or saved-only events", async ({ page }) => {
  await prepare(page, true);
  const savedOnly = { ...event, id: "saved-only", title: "Saved only fixture", organizer_id: "another-host" };
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events: [...events, savedOnly] } }));
  await page.addInitScript(() => localStorage.setItem("hackways_saved_events_v1:fixture-host", JSON.stringify(["saved-only", "fixture-event"])));
  await page.goto("/my-events");
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await expect(page.getByText("Going", { exact: true })).toBeVisible();
  await expect(page.getByText("Someone else's registration")).toHaveCount(0);
  await expect(page.locator('header nav')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Attending|Saved|Hosting|All)$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upcoming", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Draft fixture|Private fixture|Saved only fixture/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Manage event" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View event", exact: true })).toHaveAttribute("href", "/events/fixture-event");
  await expect(page.getByRole("link", { name: "Manage tickets" })).toHaveAttribute("href", "/profile");
  await expect(page.getByText("They do not sync across devices.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hackways_saved_events_v1:fixture-host")!))).toEqual(["saved-only", "fixture-event"]);
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Past fixture" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("my-events.png"), fullPage: true });
});

test("failed refresh keeps useful data and provides a retry", async ({ page }) => {
  await prepare(page);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await page.route("**/api/v1/events", (route) => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("couldn't refresh");
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events } }));
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("community demo migration removes only seeded entries and preserves real content", async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("fixtures-initialized")) {
      localStorage.setItem("hackways_communities_v9", JSON.stringify([
        { id: "ch_ai_hyderabad", name: "AI Hyderabad", members: [] },
        { id: "ch_founders_bay", name: "Founders Bay", members: [] },
        { id: "real", name: "Real community", slug: "real", description: "User-created community", owner_name: "Real owner", members: [], follower_count: 0 },
      ]));
      localStorage.setItem("unrelated-setting", "preserve");
      sessionStorage.setItem("fixtures-initialized", "true");
    }
  });
  await page.goto("/channels");
  await expect(page.getByRole("heading", { name: "Real community" })).toBeVisible();
  await expect(page.getByText("AI Hyderabad")).toHaveCount(0);
  await expect(page.getByText("Founders Bay")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("unrelated-setting"))).toBe("preserve");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hackways_communities_v9") || "[]").length)).toBe(1);
  await expect(page.locator("main img")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("communities.png"), fullPage: true });
});

test("date, price, visibility and cleanup helpers preserve truthful data", () => {
  expect(eventDate("invalid")).toBeNull();
  expect(groupEvents([{ ...event, id: "undated", start_time: "invalid" }, event])[0].events[0].id).toBe(event.id);
  expect(eventPrice({ ...event, tiers: [] })).toBe("Details soon");
  expect(eventPrice({ ...event, tiers: [{ ...event.tiers[0], price_cents: undefined }] })).toBe("See ticket details");
  expect(eventPrice({ ...event, tiers: [{ ...event.tiers[0], price_cents: 12550 }] })).toBe("\u20b9125.50");
  expect(eventPrice({ ...event, tiers: [{ ...event.tiers[0], remaining_capacity: 0 }] })).toBe("Sold out");
  expect(eventTime("2099-10-10T10:00")).toContain("event local time");
  expect(eventTime("2099-10-10T10:00:00Z")).not.toContain("event local time");
  expect(isPastEvent({ ...event, start_time: "2099-10-10T01:00" }, new Date("2099-10-10T23:00"))).toBe(false);
  expect(isDiscoveryEvent({ ...event, status: "DRAFT" })).toBe(false);
  expect(isDiscoveryEvent({ ...event, channel_is_private: true })).toBe(false);
  const cleaned = cleanEventArtwork({ ...event, banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600" });
  expect(cleaned.banner_url).toBeUndefined();
  expect(cleaned.square_banner_url).toBe(artwork);
  expect(withoutStockPhoto("/uploads/my-banner.png")).toBe("/uploads/my-banner.png");
  expect(withoutStockPhoto("https://example.test/photo-1540575467063-178a50c2df87")).toBe("https://example.test/photo-1540575467063-178a50c2df87");
  const community: Channel = { id: "real", name: "Real", slug: "real", description: "", owner_id: "owner", owner_name: "Owner", members: [], follower_count: 0, verified: false, created_at: event.created_at };
  expect(cleanSeededChannels([community, { ...community, id: "ch_ai_hyderabad" }])).toEqual([community]);
});

test("empty state is centered and uses the supplied compact dashboard asset", async ({ page }) => {
  await prepare(page);
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events: [] } }));
  await page.goto("/home");
  const title = page.getByRole("heading", { name: "No upcoming events" });
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("text-align", "center");
  const image = page.locator('main img[src="/dashboard-assets/no-events.png"]');
  await expect(image).toBeVisible();
  const imageBox = await image.boundingBox();
  const mainBox = await page.locator("main").boundingBox();
  expect(imageBox?.width).toBe(112);
  expect(imageBox?.height).toBe(112);
  expect(Math.abs((imageBox!.x + 56) - (mainBox!.x + mainBox!.width / 2))).toBeLessThan(2);
  await page.screenshot({ path: test.info().outputPath("empty-state.png"), fullPage: true });
});

test("search is keyboard accessible and retains its query while closed", async ({ page }) => {
  await prepare(page, true);
  for (const path of ["/home", "/my-events"]) {
    await page.goto(path);
    const toggle = page.getByRole("button", { name: "Search events", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    const input = page.getByRole("searchbox");
    await expect(input).toBeFocused();
    await input.fill("does not match");
    await expect(page.getByRole("heading", { name: "No events found" })).toBeVisible();
    await page.getByRole("button", { name: "Close search" }).click();
    await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
    await toggle.click();
    await expect(input).toHaveValue("does not match");
    await expect(input).toBeFocused();
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(input).toBeFocused();
    await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
    const box = await input.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(64);
  }
});

test("malformed registrations show a recoverable error without destroying stored data", async ({ page }) => {
  await prepare(page, true);
  await page.goto("/my-events");
  await expect(page.getByText("Going", { exact: true })).toBeVisible();
  for (const raw of ["not-json", "{}", "[null]", '[{"id":"missing-fields"}]']) {
    await page.evaluate((raw) => {
      localStorage.setItem("hackways_tickets_v7", raw);
      window.dispatchEvent(new Event("hackways_tickets_updated"));
    }, raw);
    await expect(page.locator("main").getByRole("alert")).toContainText("couldn't read your registrations");
    expect(await page.evaluate(() => localStorage.getItem("hackways_tickets_v7"))).toBe(raw);
    await expect(page.getByText("Going", { exact: true })).toBeVisible();
    // Retry alone cannot fix corrupted data — the error must persist honestly.
    await page.getByRole("button", { name: "Retry registrations" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("couldn't read your registrations");
    // Restoring a valid snapshot clears the error without any reload.
    await page.evaluate((tickets) => {
      localStorage.setItem("hackways_tickets_v7", JSON.stringify(tickets));
      window.dispatchEvent(new Event("hackways_tickets_updated"));
    }, fixtureTickets);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("Going", { exact: true })).toBeVisible();
  }
});

test("denied storage is not mistaken for an empty registration list", async ({ page }) => {
  await prepare(page, true);
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === "hackways_tickets_v7") throw new DOMException("Storage denied", "SecurityError");
      return getItem.call(this, key);
    };
  });
  await page.goto("/my-events");
  await expect(page.getByRole("heading", { name: "Registrations unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No upcoming events" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry registrations" })).toBeVisible();
});

test("missing or empty ticket stores stay empty despite saved and hosted events", async ({ page }) => {
  await prepare(page, true);
  await page.addInitScript(() => {
    localStorage.removeItem("hackways_tickets_v7");
    localStorage.setItem("hackways_saved_events_v1:fixture-host", '["fixture-event"]');
  });
  await page.goto("/my-events");
  await expect(page.getByRole("heading", { name: "No upcoming events" })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem("hackways_tickets_v7", "[]");
    window.dispatchEvent(new Event("hackways_tickets_updated"));
  });
  await expect(page.getByRole("heading", { name: "No upcoming events" })).toBeVisible();
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No past events" })).toBeVisible();
});

test("registration snapshots remain useful offline with honest pending and cancelled states", async ({ page }) => {
  await prepare(page, true);
  await page.route("**/api/v1/events", (route) => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(({ event, artwork }) => {
    localStorage.setItem("hackways_tickets_v7", JSON.stringify(
      ["WAITLIST", "PENDING_APPROVAL", "CANCELLED"].map((status, index) => ({
        id: `snapshot-${index}`, event_id: `snapshot-${index}`,
        event_title: `Registration ${index}`, event_start_time: event.start_time,
        event_square_banner: artwork, event_banner: "/fixture-wide.png",
        user_id: "fixture-host", user_email: "fixture@example.test", status, created_at: event.created_at,
      }))
    ));
  }, { event, artwork });
  await page.goto("/my-events");
  await expect(page.getByText("On the waitlist", { exact: true })).toBeVisible();
  await expect(page.getByText("Awaiting approval", { exact: true })).toBeVisible();
  await expect(page.getByText("Registration cancelled", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText("saved registration details are still available");
  await expect(page.locator("article img").first()).toHaveAttribute("src", artwork);
  await expect(page.getByRole("link", { name: "Manage event" })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("registration-states.png"), fullPage: true });
});

test("blank failed discovery is an error, not a no-events result, and retry recovers", async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => localStorage.setItem("hackways_events_v7", "[]"));
  await page.route("**/api/v1/events", (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Events unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No upcoming events" })).toHaveCount(0);
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events } }));
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("active registrations win over old cancellations regardless of storage order", () => {
  const ticket: UserTicket = {
    id: "confirmed", event_id: event.id, event_title: event.title,
    ticket_code: "FIXTURE", tier_id: "tier", tier_name: "Admission", price_cents: 0,
    user_id: "user", user_name: "User", user_email: "user@example.test",
    status: "CONFIRMED", created_at: event.created_at,
  };
  const cancelled: UserTicket = { ...ticket, id: "cancelled", status: "CANCELLED", created_at: "2025-01-01T00:00:00Z" };
  expect(registrationTickets([ticket, cancelled])).toEqual([ticket]);
  expect(registrationTickets([cancelled, ticket])).toEqual([ticket]);
});

test("browsing text contrast, touch controls and narrow reflow meet the scoped design floor", async ({ page }) => {
  await prepare(page);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Fixture workshop" })).toBeVisible();
  await page.getByRole("button", { name: "Search events", exact: true }).click();
  const contrasts = await page.evaluate(() => {
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
        const channel = value / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const main = document.querySelector("main")!;
    const background = getComputedStyle(main.parentElement!).backgroundColor;
    return [...main.querySelectorAll("article p, article h3, article span, input")].map((element) => {
      const style = getComputedStyle(element);
      const foreground = element.tagName === "INPUT" ? getComputedStyle(element, "::placeholder").color : style.color;
      const surface = style.backgroundColor === "rgba(0, 0, 0, 0)" ? background : style.backgroundColor;
      const a = luminance(foreground);
      const b = luminance(surface);
      return { text: element.textContent || "Search placeholder", contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  for (const entry of contrasts) expect(entry.contrast, entry.text).toBeGreaterThanOrEqual(4.5);
  for (const button of await page.locator("main button").all()) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("narrow-search.png"), fullPage: true });
});
