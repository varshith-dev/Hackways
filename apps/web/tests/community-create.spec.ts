import { test, expect, type Page } from "@playwright/test";
import { seedAuth } from "./helpers/auth";

async function openForm(page: Page, signedIn = true) {
  if (signedIn) {
    await seedAuth(page, { userId: "community-test-owner", name: "Community test owner", email: "owner@example.test", role: "organizer" });
  }
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("community-test-ready")) {
      localStorage.setItem("hackways_communities_v9", "[]");
      sessionStorage.setItem("community-test-ready", "true");
    }
  });
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { events: [] } }));
  await page.route("**/api/v1/attendees", (route) => route.fulfill({ json: { attendees: [] } }));
  await page.route("**/api/v1/orders", (route) => route.fulfill({ json: { orders: [] } }));
  await page.goto("/channels/create");
  await expect(page.getByRole("heading", { name: "Create a community", exact: true })).toBeVisible();
}

test("community form is centered, compact and creates real owner details", async ({ page }) => {
  await openForm(page);
  const submit = page.getByRole("button", { name: "Create community", exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Community name", { exact: true }).fill("Fixture community");
  await page.getByLabel("Description", { exact: false }).fill("A test community description.");
  await expect(submit).toBeEnabled();
  const main = await page.locator("main").boundingBox();
  const button = await submit.boundingBox();
  expect(main!.width).toBeLessThanOrEqual(600);
  expect(button!.width).toBeLessThan(240);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("community-create.png"), fullPage: true });
  await submit.click();
  await expect(page).toHaveURL(/\/console\/channels\/ch_/, { timeout: 20000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("hackways_communities_v9") || "[]"));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    name: "Fixture community", description: "A test community description.",
    owner_id: "community-test-owner", owner_name: "Community test owner",
    follower_count: 0, verified: false,
  });
});

test("logo validation, preview and removal work without losing form details", async ({ page }) => {
  await openForm(page);
  await page.getByLabel("Community name", { exact: true }).fill("Logo fixture");
  const upload = page.getByLabel("Community logo file", { exact: true });
  await upload.setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("Not an image") });
  await expect(page.getByRole("alert").filter({ hasText: "Choose a PNG" })).toBeVisible();
  await upload.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await expect(page.getByRole("alert").filter({ hasText: "too large" })).toBeVisible();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#444";
    context.fillRect(0, 0, 32, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await upload.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await expect(page.getByRole("img", { name: "Community logo preview" })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("img", { name: "Community logo preview" })).toHaveCount(0);
  await expect(page.getByLabel("Community name", { exact: true })).toHaveValue("Logo fixture");
});

test("storage failures stay on the form with an actionable error", async ({ page }) => {
  await openForm(page);
  await page.getByLabel("Community name", { exact: true }).fill("Cannot save fixture");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "hackways_communities_v9") throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Create community", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "couldn't be saved" })).toBeVisible();
  await expect(page).toHaveURL(/\/channels\/create$/);
  await expect(page.getByLabel("Community name", { exact: true })).toHaveValue("Cannot save fixture");
  await expect(page.getByRole("button", { name: "Create community", exact: true })).toBeEnabled();
});

test("signed-out users cannot create a fabricated owner", async ({ page }) => {
  await openForm(page, false);
  await page.getByLabel("Community name", { exact: true }).fill("Guest fixture");
  await expect(page.getByRole("button", { name: "Create community", exact: true })).toBeDisabled();
  await expect(page.locator("form").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login?redirect=%2Fchannels%2Fcreate");
});
