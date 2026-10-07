/**
 * Specimen token-in-use previews (D53), opened from the built docs/index.html:
 *   • no horizontal page scroll at phone and desktop widths, in both schemes;
 *   • every preview frame is sized to its content and does not scroll sideways;
 *   • the theme toggle reaches every frame;
 *   • forced-state copies draw the focus ring from the tokens.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect, type Page } from "@playwright/test";

const SPECIMEN = pathToFileURL(resolve("docs/index.html")).href;
const tokens = JSON.parse(readFileSync("dist/tokens.json", "utf8")) as Record<
  "light" | "dark",
  Record<string, string>
>;

/** "#0C0A09" -> "rgb(12, 10, 9)", the form getComputedStyle reports. */
function rgb(hex: string): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const frameStates = (page: Page) =>
  page.$$eval("iframe.preview", (frames) =>
    frames.map((frame) => {
      const doc = (frame as HTMLIFrameElement).contentDocument;
      const root = doc?.documentElement;
      return {
        title: frame.getAttribute("title"),
        height: frame.getBoundingClientRect().height,
        overflow: root ? root.scrollWidth - root.clientWidth : -1,
        theme: root?.dataset.theme ?? null,
        bg: doc?.body ? getComputedStyle(doc.body).backgroundColor : null,
      };
    }),
  );

for (const colorScheme of ["light", "dark"] as const) {
  for (const [label, viewport] of [
    ["phone", { width: 375, height: 812 }],
    ["desktop", { width: 1280, height: 900 }],
  ] as const) {
    test(`previews fit at ${label} width in OS ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize(viewport);
      await page.goto(SPECIMEN);
      await page.waitForLoadState("load");

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow, "horizontal page scroll").toBeLessThanOrEqual(0);

      const frames = await frameStates(page);
      expect(frames.length).toBeGreaterThan(0);
      for (const frame of frames) {
        expect(frame.height, `${frame.title} height`).toBeGreaterThan(40);
        expect(frame.overflow, `${frame.title} sideways scroll`).toBeLessThanOrEqual(0);
        expect(frame.bg, `${frame.title} body background`).toBe(
          rgb(tokens[colorScheme]["color.bg"] ?? ""),
        );
      }
    });
  }
}

test("theme toggle reaches every preview", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(SPECIMEN);
  await page.waitForLoadState("load");
  await page.click("#theme-toggle");

  for (const frame of await frameStates(page)) {
    expect(frame.theme, `${frame.title} data-theme`).toBe("dark");
    expect(frame.bg, `${frame.title} body background`).toBe(rgb(tokens.dark["color.bg"] ?? ""));
  }
});

test("forced keyboard-focus copies draw the focus ring", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(SPECIMEN);
  await page.waitForLoadState("load");

  const frame = page.frameLocator('iframe[title="Actions: Button variants preview"]');
  const forced = frame.locator('[data-force="focus-visible"]').first();
  await expect(forced).toHaveCSS("outline-color", rgb(tokens.light["color.focus-ring"] ?? ""));
  await expect(forced).toHaveCSS("outline-style", "solid");
});
