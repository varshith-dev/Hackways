import { test, expect as baseExpect, type Page } from "@playwright/test";
import type { EventItem } from "../src/lib/types";
import { seedAuth } from "./helpers/auth";

const expect = baseExpect.configure({ timeout: 30000 });
const eventId = "ev_mobile_fixture";
const base = `/mobile/events/${eventId}`;

async function setup(page: Page, width = 390, tab = "overview") {
  await page.setViewportSize({ width, height: 844 });
  const session = { userId: "mobile-host", name: "Mobile host", email: "mobile@example.test", role: "organizer" as const };
  let event: EventItem = {
    id: eventId, title: "Community workshop", slug: "mobile-fixture", description: "A workshop for our community.",
    created_at: "2029-05-01T00:00:00Z",
    status: "DRAFT", organizer_id: session.userId, organizer_type: "USER", total_capacity: 25,
    start_time: "2030-05-15T09:00:00Z", location: "Community studio",
    banner_url: "", square_banner_url: "",
    host_users: [{ user_id: session.userId, name: session.name, email: session.email, role: "Primary Host" }],
    tiers: [{ id: "tier-mobile", event_id: eventId, name: "General Admission", price_cents: 0, total_capacity: 25, remaining_capacity: 24 }],
  };
  const attendees = [{
    id: "att-mobile", eventId, name: "Alex Guest", email: "alex@example.test", ticketCode: "TIV-MOBILE",
    tierId: "tier-mobile", tierName: "General Admission", status: "CONFIRMED", createdAt: "2029-05-01T00:00:00Z",
  }];
  const orders = [{ id: "order-mobile", eventId, customer: "Alex Guest", email: "alex@example.test", tier: "General Admission", amount: 0, status: "SETTLED" }];
  await seedAuth(page, session);
  await page.addInitScript(({ event, attendees, orders }) => {
    if (sessionStorage.getItem("mobile-fixture-ready")) return;
    localStorage.setItem("hackways_events_v7", JSON.stringify([event]));
    localStorage.setItem(`hackways_event_${event.id}`, JSON.stringify(event));
    localStorage.setItem(`hackways_tiers_${event.id}`, JSON.stringify(event.tiers));
    localStorage.setItem("hackways_attendees_v7", JSON.stringify(attendees));
    localStorage.setItem("hackways_orders_v7", JSON.stringify(orders));
    localStorage.setItem("hackways_communities_v9", "[]");
    sessionStorage.setItem("mobile-fixture-ready", "true");
  }, { event, attendees, orders });
  await page.route("**/api/v1/events", async (route) => {
    if (route.request().method() === "POST") {
      event = route.request().postDataJSON();
      return route.fulfill({ json: { event } });
    }
    return route.fulfill({ json: { events: [event] } });
  });
  await page.route(`**/api/v1/events/${eventId}`, (route) => {
    if (route.request().method() === "PUT") event = route.request().postDataJSON();
    return route.fulfill({ json: { event } });
  });
  await page.route("**/api/v1/attendees", (route) => route.fulfill({ json: { attendees } }));
  await page.route("**/api/v1/orders", (route) => route.fulfill({ json: { orders } }));
  await page.goto(`/console/events/${eventId}/${tab}`);
  return () => event;
}

test("phones enter the separate dashboard and compact overview", async ({ page }) => {
  await setup(page, 320);
  await expect(page).toHaveURL(`${base}/overview`);
  await expect(page.getByRole("heading", { name: "Community workshop", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Finish event setup" })).toHaveAttribute("href", `${base}/setup`);
  const primary = page.getByRole("link", { name: "Finish event setup" });
  await expect(primary).toHaveCSS("border-radius", "999px");
  await expect(primary).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(primary).toHaveCSS("border-top-width", "1px");
  await expect(primary).toHaveCSS("border-top-color", "rgb(196, 196, 201)");
  await expect(primary).toHaveCSS("color", "rgb(32, 32, 34)");
  const menu = page.getByRole("button", { name: "Open event navigation" });
  await expect(menu).toHaveCSS("border-top-width", "0px");
  await expect(menu.locator("svg")).toHaveCSS("stroke-width", "1.5px");
  await expect(page.getByRole("link", { name: "View public event", exact: true }).locator("svg").first()).toHaveCSS("stroke-width", "1.5px");
  await expect(page.getByLabel("Event overview")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("mobile-event-overview.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(primary).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(primary).toHaveCSS("color", "rgb(32, 32, 34)");
});

test("sidebar opens, restores focus and navigates without the desktop shell", async ({ page }) => {
  await setup(page, 360);
  const menu = page.getByRole("button", { name: "Open event navigation" });
  await menu.click();
  const sidebar = page.getByRole("dialog");
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator(`a[href="${base}/overview"]`)).toHaveAttribute("aria-current", "page");
  await expect(sidebar.locator(`a[href="${base}/settings"]`)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sidebar).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await sidebar.locator(`a[href="${base}/tickets"]`).click();
  await expect(page).toHaveURL(`${base}/tickets`);
  await expect(sidebar).not.toBeVisible();
});

test("tickets and attendees keep their actions in native mobile modules", async ({ page }) => {
  await setup(page, 360, "tickets");
  await expect(page).toHaveURL(`${base}/tickets`);
  await expect(page.getByRole("heading", { name: "Ticketing Tiers" })).toBeVisible();
  await expect(page.getByText("General Admission", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Tier" }).click();
  await expect(page.getByText("New Admission Tier")).toBeVisible();
  await page.getByPlaceholder("e.g. VIP Pass, Early Bird").fill("Workshop pass");
  await page.getByRole("button", { name: "Save Tier" }).click();
  await expect(page.getByText("Workshop pass", { exact: true })).toBeVisible();
  await page.goto(`${base}/attendees`);
  await expect(page.getByRole("heading", { name: "Attendee Manifest" })).toBeVisible();
  await expect(page.getByText("Alex Guest", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("mobile setup uses a native flat page and retains both banner formats", async ({ page }) => {
  const saved = await setup(page, 390, "setup");
  await expect(page).toHaveURL(`${base}/setup`);
  await expect(page.getByLabel("Event name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Description", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Date & time", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Location", { exact: true })).toBeVisible();
  await page.getByLabel("Event name", { exact: true }).fill("Updated workshop");
  // Existing events keep their slug stable; editing the link is explicit.
  await expect(page.getByLabel("Event link", { exact: true })).toHaveValue("mobile-fixture");
  await page.getByLabel("Event link", { exact: true }).fill("updated-workshop");
  await page.getByRole("button", { name: "Banner image link", exact: true }).click();
  await page.getByRole("button", { name: "Poster image link", exact: true }).click();
  await page.getByLabel("Banner image URL", { exact: true }).fill("/dashboard-assets/no-tickets.png");
  await page.getByLabel("Poster image URL", { exact: true }).fill("/dashboard-assets/no-events.png");
  const save = page.getByRole("button", { name: "Save draft", exact: true });
  await expect(save).toHaveCSS("border-radius", "999px");
  await save.click();
  await expect.poll(() => saved().title).toBe("Updated workshop");
  expect(saved().banner_url).toBe("/dashboard-assets/no-tickets.png");
  expect(saved().square_banner_url).toBe("/dashboard-assets/no-events.png");
  await page.getByLabel("Banner image URL", { exact: true }).fill("");
  await save.click();
  await expect.poll(() => saved().banner_url).toBe("");
  expect(saved().square_banner_url).toBe("/dashboard-assets/no-events.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("mobile-event-setup.png"), fullPage: true });
});

test("desktop stays on the original console and resizing preserves the current module", async ({ page }) => {
  await setup(page, 1440, "tickets");
  await expect(page).toHaveURL(`/console/events/${eventId}/tickets`);
  await expect(page.locator("[data-mobile-event-dashboard]")).toHaveCount(0);
  await page.goto(`${base}/tickets?source=shortcut#inventory`);
  await expect(page).toHaveURL(`/console/events/${eventId}/tickets?source=shortcut#inventory`);
  await page.setViewportSize({ width: 767, height: 900 });
  await expect(page).toHaveURL(`${base}/tickets?source=shortcut#inventory`);
  await expect(page.getByRole("button", { name: "Open event navigation" })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page).toHaveURL(`/console/events/${eventId}/tickets?source=shortcut#inventory`);
});

test("camera scanner opens, reports unsupported or missing cameras honestly, and closes", async ({ page }) => {
  await setup(page, 390);
  await page.goto(`${base}/check-in`);
  await page.getByRole("button", { name: "Scan with camera", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Scan ticket QR code" });
  await expect(scanner).toBeVisible();
  await expect(scanner.getByRole("button", { name: "Close scanner" })).toBeVisible();
  await expect(scanner.getByRole("status")).toBeVisible();
  // Headless test browser has no camera: an honest error replaces the feed.
  await expect(scanner.getByRole("alert")).toContainText(/No camera|couldn't start|denied/, { timeout: 15000 });
  await scanner.getByRole("button", { name: "Close scanner" }).click();
  await expect(scanner).not.toBeVisible();
});

test("teams and remaining modules render native mobile content", async ({ page }) => {
  await setup(page, 390);
  await page.goto(`${base}/teams`);
  await expect(page.getByRole("heading", { name: /teams module/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Overview" })).toHaveAttribute("href", `${base}/overview`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("all event management modules stay contained on a narrow phone", async ({ page }) => {
  test.setTimeout(240000);
  await setup(page, 320);
  for (const tab of ["orders", "teams", "check-in", "marketing", "communications", "staff", "finance", "analytics", "integrations", "settings"]) {
    await page.goto(`${base}/${tab}`);
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} must not overflow the viewport`).toBe(true);
  }
});
