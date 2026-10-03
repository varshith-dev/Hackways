import { test, expect as baseExpect, type Page } from "@playwright/test";
import type { EventItem } from "../src/lib/types";
import { seedAuth } from "./helpers/auth";

const expect = baseExpect.configure({ timeout: 20000 });

async function setup(page: Page, path = "/events/create/details?host=solo") {
  const session = { userId: "event-fixture-host", email: "host@example.test", name: "Fixture host", role: "organizer" as const };
  await seedAuth(page, session);
  await page.addInitScript((session) => {
    if (!sessionStorage.getItem("event-fixtures-ready")) localStorage.setItem("hackways_communities_v9", JSON.stringify([
      { id: "owned", name: "My community", slug: "mine", owner_id: session.userId, owner_name: session.name, description: "", members: [], follower_count: 0, verified: false },
      { id: "private-owned", name: "Private community", slug: "private-mine", owner_id: session.userId, owner_name: session.name, description: "", members: [], follower_count: 0, verified: false, visibility: "PRIVATE", is_private: true },
      { id: "unrelated", name: "Someone else's community", slug: "unrelated", owner_id: "another-user", owner_name: "Someone else", description: "", members: [] },
    ]));
    sessionStorage.setItem("event-fixtures-ready", "true");
  }, session);
  let created: EventItem | undefined;
  await page.route("**/api/v1/events", async (route) => {
    if (route.request().method() === "POST") {
      created = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { event: created } });
    }
    return route.fulfill({ json: { events: created ? [created] : [] } });
  });
  await page.route("**/api/v1/attendees", (route) => route.fulfill({ json: { attendees: [] } }));
  await page.route("**/api/v1/orders", (route) => route.fulfill({ json: { orders: [] } }));
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Create an event" })).toBeVisible();
  return () => created;
}

test("community hosting uses separate steps, real icons and a saved draft", async ({ page }) => {
  const saved = await setup(page, "/events/create");
  await expect(page.getByLabel("Event name", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Host with your community", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Choose your community" })).toBeVisible();
  const createCommunity = page.getByRole("link", { name: "Create new community", exact: true });
  await expect(createCommunity.locator("svg")).toHaveCount(1);
  await expect(createCommunity).not.toContainText("+");
  await expect(page.getByRole("option", { name: "Someone else's community" })).toHaveCount(0);
  await createCommunity.click();
  await expect(page.getByRole("heading", { name: "Create a community" })).toBeVisible();
  await page.getByLabel("Community name", { exact: true }).fill("Fixture new community");
  await page.getByRole("button", { name: "Create and continue" }).click();
  await expect(page).toHaveURL(/\/events\/create\/details\?communityId=ch_/, { timeout: 20000 });
  await page.getByLabel("Event name", { exact: true }).fill("Fixture gathering");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await page.locator("main").boundingBox())!.width).toBeLessThanOrEqual(704);
  await page.screenshot({ path: test.info().outputPath("event-create.png"), fullPage: true });
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect.poll(() => saved()).toBeTruthy();
  expect(saved()).toMatchObject({ title: "Fixture gathering", status: "DRAFT", banner_url: "", square_banner_url: "", total_capacity: 100, channel_name: "Fixture new community" });
  expect(saved()?.host_users?.[0].user_id).toBe("event-fixture-host");
  await expect(page).toHaveURL(/\/(?:console|mobile)\/events\/[^/]+\/overview$/, { timeout: 60000 });
  // Console URLs are canonical slugs; the id remains the stored identity.
  expect([saved()!.id, saved()!.slug]).toContain(new URL(page.url()).pathname.split("/")[3]);
});

test("both uploaded banner formats have independent previews and payload fields", async ({ page }) => {
  const saved = await setup(page);
  await page.getByLabel("Event name", { exact: true }).fill("Artwork fixture");
  const data = await page.evaluate(() => {
    return [[160, 90, "#222"], [80, 80, "#777"]].map(([width, height, color]) => {
      const canvas = document.createElement("canvas");
      canvas.width = Number(width); canvas.height = Number(height);
      const context = canvas.getContext("2d")!;
      context.fillStyle = String(color); context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL().split(",")[1];
    });
  });
  await page.getByLabel("Landscape banner file", { exact: true }).setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: Buffer.from(data[0], "base64") });
  await page.getByLabel("Square poster file", { exact: true }).setInputFiles({ name: "square.png", mimeType: "image/png", buffer: Buffer.from(data[1], "base64") });
  const wide = page.getByRole("img", { name: "Landscape banner preview" });
  const square = page.getByRole("img", { name: "Square poster preview" });
  await expect(wide).toBeVisible(); await expect(square).toBeVisible();
  const wideBox = await wide.boundingBox(); const squareBox = await square.boundingBox();
  expect(wideBox!.width / wideBox!.height).toBeCloseTo(16 / 9, 1);
  expect(squareBox!.width / squareBox!.height).toBeCloseTo(1, 1);
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect.poll(() => saved()?.id).toBeTruthy();
  expect(saved()?.banner_url).toBe(`data:image/png;base64,${data[0]}`);
  expect(saved()?.square_banner_url).toBe(`data:image/png;base64,${data[1]}`);
});

test("failed event persistence retains input and retry keeps the private community", async ({ page }) => {
  const saved = await setup(page, "/events/create?communityId=private-owned");
  await page.getByLabel("Event name", { exact: true }).fill("Private fixture");
  let fail = true;
  const submittedIds: string[] = [];
  await page.route("**/api/v1/events", async (route) => {
    if (route.request().method() === "POST") {
      submittedIds.push(route.request().postDataJSON().id);
      if (fail) return route.fulfill({ status: 503, json: { error: "Server unavailable. Try again." } });
    }
    return route.fallback();
  });
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Server unavailable" })).toBeVisible();
  await expect(page).toHaveURL(/\/events\/create\/setup$/);
  await page.getByRole("link", { name: "Edit details", exact: true }).click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue("Private fixture");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Server unavailable" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect.poll(() => saved()?.id).toBeTruthy();
  expect(saved()).toMatchObject({ channel_id: "private-owned", channel_is_private: true, visibility: "PRIVATE", organizer_id: "private-owned" });
  expect(submittedIds).toHaveLength(3);
  expect(new Set(submittedIds).size).toBe(1);
});

test("creation moves to a dedicated yellow progress ring until the server confirms", async ({ page }) => {
  const saved = await setup(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/v1/events", async (route) => {
    if (route.request().method() === "POST") {
      requests += 1;
      await pending;
    }
    return route.fallback();
  });
  try {
    await page.getByLabel("Event name", { exact: true }).fill("Setup fixture");
    await page.getByRole("button", { name: "Create event", exact: true }).click();
    await expect(page).toHaveURL(/\/events\/create\/setup$/);
    await expect(page.getByRole("heading", { name: "Setting up your event", exact: true })).toBeVisible();
    await expect(page.getByText("Please hold on.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Creating..." })).toHaveCount(0);
    const ring = page.getByRole("progressbar", { name: "Event setup" });
    await expect(ring).toHaveAttribute("aria-valuenow", "25");
    const box = await ring.boundingBox();
    expect(box!.width).toBe(box!.height);
    const arc = ring.locator("circle").last();
    await expect(arc).toHaveCSS("stroke", "rgb(255, 211, 41)");
    await expect(arc).toHaveCSS("stroke-width", "12px");
    await expect(arc).toHaveCSS("animation-name", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("event-setup.png"), fullPage: true });
    expect(saved()).toBeUndefined();
    await expect.poll(() => requests).toBe(1);
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/(?:console|mobile)\/events\/[^/]+\/overview$/, { timeout: 60000 });
  expect(requests).toBe(1);
  await expect.poll(() => saved()?.id).toBeTruthy();
  expect([saved()!.id, saved()!.slug]).toContain(new URL(page.url()).pathname.split("/")[3]);
});

test("opening setup without a draft offers recovery without creating an event", async ({ page }) => {
  const saved = await setup(page);
  await page.goto("/events/create/setup");
  await expect(page.getByRole("heading", { name: "Start with your event details" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to event creation" })).toHaveAttribute("href", "/events/create");
  expect(saved()).toBeUndefined();
});

  test("solo hosting skips community selection and creation", async ({ page }) => {
    const saved = await setup(page, "/events/create");
    await page.getByRole("link", { name: "Host solo", exact: false }).click();
    await expect(page).toHaveURL(/\/events\/create\/details\?host=solo$/);
    await page.getByLabel("Event name", { exact: true }).fill("Solo fixture");
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByLabel("Community name", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Create event", exact: true }).click();
    await expect.poll(() => saved()?.id).toBeTruthy();
    expect(saved()).toMatchObject({ organizer_type: "USER", organizer_id: "event-fixture-host" });
    expect(saved()?.channel_id).toBeUndefined();
  });

  test("existing community picker continues with the selected community", async ({ page }) => {
    await setup(page, "/events/create");
    await page.getByRole("link", { name: "Host with your community", exact: false }).click();
    await page.getByRole("combobox", { name: "Community", exact: true }).selectOption("private-owned");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/events\/create\/details\?communityId=private-owned$/);
    await expect(page.locator("main")).toContainText("Private community");
    await expect(page.getByLabel("Event name", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("accounts without communities go to community creation then event details", async ({ page }) => {
    await setup(page, "/events/create");
    await page.evaluate(() => localStorage.setItem("hackways_communities_v9", "[]"));
    await page.getByRole("link", { name: "Host with your community", exact: false }).click();
    await expect(page).toHaveURL(/\/channels\/create\?next=event$/, { timeout: 20000 });
    await page.getByLabel("Community name", { exact: true }).fill("First community");
    await page.getByRole("button", { name: "Create and continue" }).click();
    await expect(page.getByLabel("Event name", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("First community");
  });

  test("another account's community cannot be used from a forged details URL", async ({ page }) => {
    await setup(page, "/events/create/details?communityId=unrelated");
    await page.getByLabel("Event name", { exact: true }).fill("Unauthorized fixture");
    await expect(page.getByRole("alert").filter({ hasText: "isn't available to your account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create event", exact: true })).toBeDisabled();
  });
