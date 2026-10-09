/**
 * Specimen token-in-use previews (D53), opened from the built docs/index.html:
 *   • no horizontal page scroll at phone and desktop widths, in both schemes;
 *   • every preview frame is sized to its content and does not scroll sideways;
 *   • the system/light/dark theme switch reaches every frame, follows the OS
 *     on system and is remembered across reloads;
 *   • section links collapse behind a menu button at breakpoint.md and below;
 *   • main is capped at layout.container-max; the width toggle lifts the cap
 *     and is remembered across reloads;
 *   • copy buttons sit inside their code box and copy the exact snippet;
 *   • forced-state copies draw the focus ring from the tokens.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect, type Page } from "@playwright/test";

const SPECIMEN = pathToFileURL(resolve("docs/index.html")).href;
const tokens = JSON.parse(readFileSync("dist/tokens.json", "utf8")) as Record<
  "light" | "dark" | "shared",
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

const pressedTheme = (page: Page) =>
  page.$$eval('#theme-switch [aria-pressed="true"]', (buttons) =>
    buttons.map((button) => (button as HTMLElement).dataset.themeChoice),
  );

test("theme switch reaches every preview in each of its three states", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(SPECIMEN);
  await page.waitForLoadState("load");
  expect(await pressedTheme(page), "default choice").toEqual(["system"]);

  for (const [choice, theme, bg] of [
    ["dark", "dark", tokens.dark["color.bg"]],
    ["light", "light", tokens.light["color.bg"]],
    ["system", null, tokens.light["color.bg"]],
  ] as const) {
    await page.click(`[data-theme-choice="${choice}"]`);
    expect(await pressedTheme(page), `pressed after choosing ${choice}`).toEqual([choice]);
    expect(
      await page.evaluate(() => document.documentElement.dataset.theme ?? null),
      `page data-theme after choosing ${choice}`,
    ).toBe(theme);
    for (const frame of await frameStates(page)) {
      expect(frame.theme, `${frame.title} data-theme after choosing ${choice}`).toBe(theme);
      expect(frame.bg, `${frame.title} body background after choosing ${choice}`).toBe(
        rgb(bg ?? ""),
      );
    }
  }
});

test("system theme follows the OS and the theme choice survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(SPECIMEN);
  await page.waitForLoadState("load");
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bodyBg(), "system under OS dark").toBe(rgb(tokens.dark["color.bg"] ?? ""));

  await page.click('[data-theme-choice="light"]');
  await page.reload();
  await page.waitForLoadState("load");
  expect(await pressedTheme(page), "pressed after reload").toEqual(["light"]);
  expect(await bodyBg(), "light kept after reload under OS dark").toBe(
    rgb(tokens.light["color.bg"] ?? ""),
  );
  for (const frame of await frameStates(page))
    expect(frame.theme, `${frame.title} data-theme after reload`).toBe("light");

  await page.click('[data-theme-choice="system"]');
  await page.reload();
  await page.waitForLoadState("load");
  expect(await pressedTheme(page), "pressed after reload").toEqual(["system"]);
  expect(await bodyBg(), "system after reload under OS dark").toBe(
    rgb(tokens.dark["color.bg"] ?? ""),
  );
});

test("section links collapse behind the menu button at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(SPECIMEN);
  const menu = page.locator("#menu-toggle");
  const links = page.locator("#toc-links");

  await expect(links, "section links before opening the menu").toBeHidden();
  await expect(page.locator("#width-toggle")).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(links, "section links after opening the menu").toBeVisible();
  await links.getByRole("link", { name: "Type" }).click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(links, "section links after following one").toBeHidden();

  await menu.click();
  await page.keyboard.press("Escape");
  await expect(links, "section links after Escape").toBeHidden();
  await expect(menu).toBeFocused();
});

test("section links show inline and the menu button is hidden at desktop width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(SPECIMEN);
  await expect(page.locator("#menu-toggle")).toBeHidden();
  await expect(page.locator("#toc-links")).toBeVisible();
});

test("main is capped at layout.container-max until the width toggle lifts it, and stays lifted after a reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto(SPECIMEN);
  const mainWidth = () =>
    page.locator("main").evaluate((main) => main.getBoundingClientRect().width);

  await expect(page.locator("main"), "main content width before the toggle").toHaveCSS(
    "width",
    tokens.shared["layout.container-max"] ?? "",
  );
  const capped = await mainWidth();
  await page.click("#width-toggle");
  await expect(page.locator("#width-toggle")).toHaveAttribute("aria-pressed", "true");
  const full = await mainWidth();
  expect(full, "main width after the toggle").toBeGreaterThan(capped);

  await page.reload();
  await expect(page.locator("#width-toggle")).toHaveAttribute("aria-pressed", "true");
  expect(await mainWidth(), "main width after a reload").toBe(full);
});

test("copy buttons sit inside the code box and copy the exact snippet", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(SPECIMEN);
  const panel = page.locator("#in-use details").first();
  const button = panel.locator(".copy-button");
  await expect(button, "copy button while the panel is closed").toBeHidden();

  await panel.locator("summary").click();
  await expect(button, "copy button once the panel is open").toBeVisible();
  const box = async (selector: string) => {
    const rect = await panel.locator(selector).boundingBox();
    if (!rect) throw new Error(`${selector} in the first In use panel has no box.`);
    return rect;
  };
  const pre = await box("pre");
  const icon = await box(".copy-button");
  expect(icon.x, "copy button left edge").toBeGreaterThanOrEqual(pre.x);
  expect(icon.y, "copy button top edge").toBeGreaterThanOrEqual(pre.y);
  expect(icon.x + icon.width, "copy button right edge").toBeLessThanOrEqual(pre.x + pre.width);
  expect(icon.y + icon.height, "copy button bottom edge").toBeLessThanOrEqual(pre.y + pre.height);

  await button.click();
  await expect(button).toHaveAttribute("data-copied", "");
  await expect(button).toHaveAttribute("aria-label", "Copied");
  await expect(button.locator(".icon-check")).toBeVisible();
  await expect(button.locator(".icon-copy")).toBeHidden();
  // The Windows clipboard stores text with CRLF line endings.
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll("\r\n", "\n"), "clipboard text").toBe(
    await button.getAttribute("data-copy"),
  );

  await expect(button, "copy button after the check has shown").not.toHaveAttribute("data-copied");
  await expect(button.locator(".icon-copy")).toBeVisible();
  await expect(button).toHaveAttribute("aria-label", /^Copy /);
});

/**
 * Every visible text in every preview, live and forced, against the background
 * it is actually drawn on: translucent fills such as accent-subtle are
 * composited over the opaque ancestor below them. 4.5:1 for all text (D52);
 * disabled controls are exempt, as in WCAG 2.2 SC 1.4.3.
 */
for (const colorScheme of ["light", "dark"] as const) {
  test(`all preview text meets 4.5:1 in OS ${colorScheme}, in every state`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(SPECIMEN);
    await page.waitForLoadState("load");

    const failures = await page.$$eval("iframe.preview", (frames) => {
      type Rgba = [number, number, number, number];
      const parse = (value: string): Rgba => {
        const [r = 0, g = 0, b = 0, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
        return [r, g, b, a];
      };
      const over = (top: Rgba, bottom: Rgba): Rgba => [
        top[0] * top[3] + bottom[0] * (1 - top[3]),
        top[1] * top[3] + bottom[1] * (1 - top[3]),
        top[2] * top[3] + bottom[2] * (1 - top[3]),
        1,
      ];
      const channel = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (c: Rgba) =>
        0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
      const ratio = (a: Rgba, b: Rgba) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
        return (hi + 0.05) / (lo + 0.05);
      };
      const backdrop = (element: Element): Rgba => {
        const layers: Rgba[] = [];
        for (let node: Element | null = element; node; node = node.parentElement) {
          const layer = parse(getComputedStyle(node).backgroundColor);
          if (layer[3] > 0) layers.push(layer);
          if (layer[3] === 1) break;
        }
        return layers.reduceRight<Rgba>((below, layer) => over(layer, below), [255, 255, 255, 1]);
      };

      const found: string[] = [];
      for (const frame of frames) {
        const doc = (frame as HTMLIFrameElement).contentDocument;
        if (!doc) continue;
        for (const element of doc.body.querySelectorAll("*")) {
          const text = [...element.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent?.trim() ?? "")
            .join(" ")
            .trim();
          if (!text || element.getClientRects().length === 0) continue;
          if (element.closest(':disabled, [aria-disabled="true"], option')) continue;
          const fg = parse(getComputedStyle(element).color);
          const bg = backdrop(element);
          const measured = ratio(fg, bg);
          if (measured < 4.5) {
            const state = element.closest("[data-force]")?.getAttribute("data-force") ?? "live";
            found.push(
              `${frame.getAttribute("title")} [${state}] "${text.slice(0, 30)}": rgb(${fg.slice(0, 3).join(", ")}) on rgb(${bg
                .slice(0, 3)
                .map(Math.round)
                .join(", ")}) is ${measured.toFixed(2)}:1`,
            );
          }
        }
      }
      return found;
    });
    expect(failures).toEqual([]);
  });
}

test("forced keyboard-focus copies draw the focus ring", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(SPECIMEN);
  await page.waitForLoadState("load");

  const frame = page.frameLocator('iframe[title="Actions: Button variants preview"]');
  const forced = frame.locator('[data-force="focus-visible"]').first();
  await expect(forced).toHaveCSS("outline-color", rgb(tokens.light["color.focus-ring"] ?? ""));
  await expect(forced).toHaveCSS("outline-style", "solid");
});
