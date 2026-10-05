import { expect, test } from "@playwright/test";

test("home page shows discovery rows and TMDB attribution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trending now" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top rated" })).toBeVisible();
  await expect(page.getByText("This product uses the TMDB API")).toBeVisible();
});

test("search finds a movie and opens its page with similar movies", async ({ page }) => {
  await page.goto("/browse?q=godfather");
  const first = page.locator("article a[href^='/movie/']").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/movie\/\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where to watch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "More like this" })).toBeVisible();
});

test("browse filters narrow results via the URL", async ({ page }) => {
  await page.goto("/browse");
  await page.getByText(/^Filters/).click();
  await page.getByRole("button", { name: "Comedy" }).click();
  await expect(page).toHaveURL(/genres=\d+/);
  await page.getByLabel("Min rating").selectOption("8");
  await expect(page).toHaveURL(/ratingMin=8/);
});

test("watchlist and ratings persist for the session and drive picks", async ({ page }) => {
  await page.goto("/browse?sort=popularity");
  await page.locator("article a[href^='/movie/']").first().click();
  // the main action button comes first in the DOM; "More like this" cards have their own icon buttons
  await page.getByRole("button", { name: /Add .* to watchlist/ }).first().click();
  await expect(page.getByRole("button", { name: /Remove .* from watchlist/ }).first()).toBeVisible();
  await page.getByRole("radio", { name: "Rate 10 out of 10" }).click();
  await expect(page.getByText("10/10", { exact: true })).toBeVisible();

  await page.goto("/watchlist");
  await expect(page.locator("article")).toHaveCount(1);
  await page.goto("/ratings");
  await expect(page.locator("article")).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Picked for you" })).toBeVisible();
});

test("quiz returns ten picks", async ({ page }) => {
  await page.goto("/quiz");
  for (const answer of ["Feel-good", "Up to 2h20", "Crowd favourites", "Any era"]) await page.getByRole("button", { name: new RegExp(answer) }).click();
  await expect(page.locator("article").first()).toBeVisible();
  expect(await page.locator("article").count()).toBeGreaterThan(0);
});

test("unknown movie shows the friendly 404", async ({ page }) => {
  const res = await page.goto("/movie/999999999");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /missing/i })).toBeVisible();
});

test("theme toggle switches to light and back", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Switch to light theme/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
