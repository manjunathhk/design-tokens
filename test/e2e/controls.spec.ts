/**
 * Site controls (D54): dist/controls.js loaded cross-origin from a "CDN"
 * server into a consumer page, the way a site uses it.
 *
 * Assertions:
 *   • a saved dark theme and a saved full width are applied before first
 *     paint: a probe script right after controls.js in <head> sees the
 *     attribute and the dark token, and no paint has happened yet;
 *   • each theme choice and the width toggle update the attribute,
 *     aria-pressed on every matching button and localStorage, and survive a
 *     reload;
 *   • the buttons work from the keyboard (Enter and Space) and show a focus
 *     ring;
 *   • buttons added after load get the current aria-pressed and work;
 *   • without the script the OS theme and the Fit width apply;
 *   • with storage blocked there is no error and the defaults apply;
 *   • the script adds no globals.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Server } from "node:http";
import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

const tokens = JSON.parse(readFileSync("dist/tokens.json", "utf8")) as Record<
  "light" | "dark" | "shared",
  Record<string, string>
>;
const LIGHT_BG = tokens.light["color.bg"]?.toLowerCase();
const DARK_BG = tokens.dark["color.bg"]?.toLowerCase();
const CONTAINER_MAX = Number.parseFloat(tokens.shared["layout.container-max"] ?? "");

const PAGE_PORT = 7351;
const CDN_PORT = 7352;
const PAGE = `http://127.0.0.1:${PAGE_PORT}`;
const CDN = `http://127.0.0.1:${CDN_PORT}`;

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
};

/** The consumer page; /no-script is the same page without controls.js. */
function pageHtml(withScript: boolean): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Site controls</title>
    <link rel="stylesheet" href="${CDN}/index.css" />
    ${withScript ? `<script src="${CDN}/controls.js"></script>` : ""}
    <script>
      window.probe = {
        theme: document.documentElement.getAttribute("data-theme"),
        width: document.documentElement.getAttribute("data-mk-width"),
        bg: getComputedStyle(document.documentElement).getPropertyValue("--mk-color-bg").trim(),
        paints: performance.getEntriesByType("paint").length,
      };
    </script>
  </head>
  <body>
    <main data-mk-container id="container">
      <div role="group" aria-label="Theme">
        <button type="button" data-mk-theme-choice="system">System</button>
        <button type="button" data-mk-theme-choice="light">Light</button>
        <button type="button" data-mk-theme-choice="dark">Dark</button>
      </div>
      <button type="button" data-mk-width-toggle>Full width</button>
    </main>
    <footer>
      <button type="button" data-mk-theme-choice="system">System</button>
      <button type="button" data-mk-theme-choice="light">Light</button>
      <button type="button" data-mk-theme-choice="dark">Dark</button>
      <button type="button" data-mk-width-toggle>Full width</button>
    </footer>
  </body>
</html>`;
}

function serve(port: number, handle: (path: string) => { type: string; body: Buffer | string }) {
  const server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    try {
      const { type, body } = handle(path);
      res.writeHead(200, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return new Promise<Server>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

let pageServer: Server;
let cdnServer: Server;

test.beforeAll(async () => {
  pageServer = await serve(PAGE_PORT, (path) => {
    if (path !== "/" && path !== "/no-script") throw new Error(`No page at ${path}`);
    return { type: "text/html; charset=utf-8", body: pageHtml(path === "/") };
  });
  cdnServer = await serve(CDN_PORT, (path) => {
    const type = MIME[extname(path)];
    if (!type) throw new Error(`No type for ${path}`);
    return { type, body: readFileSync(join("dist", path)) };
  });
});

test.afterAll(async () => {
  await Promise.all(
    [pageServer, cdnServer].map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

test.beforeEach(async ({ page }) => {
  // Wider than layout.container-max, so Fit and Full differ.
  await page.setViewportSize({ width: CONTAINER_MAX + 400, height: 900 });
});

const html = (page: Page, name: string) =>
  page.evaluate((n) => document.documentElement.getAttribute(n), name);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const pressed = (page: Page, selector: string) =>
  page.$$eval(selector, (buttons) => buttons.map((b) => b.getAttribute("aria-pressed")));
const probe = (page: Page) =>
  page.evaluate(() => (window as unknown as { probe: Record<string, unknown> }).probe);
/** The body's computed background as lower-case #rrggbb. */
const bodyBg = async (page: Page) =>
  "#" +
  (await page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .match(/\d+/g)
    ?.slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");
const containerWidth = (page: Page) =>
  page.$eval("#container", (el) => el.getBoundingClientRect().width);

/** aria-pressed of [system, light, dark] buttons, checked on both copies. */
async function themePressed(page: Page): Promise<(string | null)[]> {
  const sets = await Promise.all(
    ["main", "footer"].map((scope) => pressed(page, `${scope} [data-mk-theme-choice]`)),
  );
  expect(sets[1], "footer theme buttons match the main ones").toEqual(sets[0]);
  return sets[0] ?? [];
}

async function save(page: Page, entries: Record<string, string>) {
  await page.goto(`${PAGE}/`);
  await page.evaluate((e) => {
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
  }, entries);
  await page.reload();
}

test("a saved dark theme applies before first paint, under OS light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await save(page, { "mk-theme": "dark" });

  const seen = await probe(page);
  expect(seen, "state seen in <head> right after controls.js").toMatchObject({
    theme: "dark",
    width: null,
    paints: 0,
  });
  expect(String(seen.bg).toLowerCase(), "--mk-color-bg in <head>").toBe(DARK_BG);
  expect(await themePressed(page)).toEqual(["false", "false", "true"]);
});

test("a saved full width applies before first paint", async ({ page }) => {
  await save(page, { "mk-width": "full" });

  const seen = await probe(page);
  expect(seen.width, "data-mk-width in <head> right after controls.js").toBe("full");
  expect(seen.paints, "paint entries before controls.js finished").toBe(0);
  expect(await containerWidth(page)).toBe(CONTAINER_MAX + 400);
  expect(await pressed(page, "[data-mk-width-toggle]")).toEqual(["true", "true"]);
});

test("each theme choice updates the page, aria-pressed and storage, and survives a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${PAGE}/`);
  expect(await themePressed(page), "no saved choice means System").toEqual([
    "true",
    "false",
    "false",
  ]);

  for (const [choice, theme, bg, state] of [
    ["dark", "dark", DARK_BG, ["false", "false", "true"]],
    ["light", "light", LIGHT_BG, ["false", "true", "false"]],
    ["system", null, LIGHT_BG, ["true", "false", "false"]],
  ] as const) {
    // Alternate between the two copies so both are wired up.
    const scope = choice === "light" ? "footer" : "main";
    await page.click(`${scope} [data-mk-theme-choice="${choice}"]`);
    for (const when of ["after click", "after reload"]) {
      expect(await html(page, "data-theme"), `data-theme ${when} on ${choice}`).toBe(theme);
      expect(await themePressed(page), `aria-pressed ${when} on ${choice}`).toEqual(state);
      expect(await stored(page, "mk-theme"), `mk-theme ${when} on ${choice}`).toBe(choice);
      expect(await bodyBg(page), `body background ${when} on ${choice}`).toBe(bg);
      if (when === "after click") await page.reload();
    }
  }
});

test("the width toggle switches Fit and Full, and survives a reload", async ({ page }) => {
  await page.goto(`${PAGE}/`);
  expect(await containerWidth(page)).toBe(CONTAINER_MAX);
  expect(await pressed(page, "[data-mk-width-toggle]")).toEqual(["false", "false"]);

  for (const [scope, width, value, px, state] of [
    ["main", "full", "full", CONTAINER_MAX + 400, "true"],
    ["footer", null, "fit", CONTAINER_MAX, "false"],
  ] as const) {
    await page.click(`${scope} [data-mk-width-toggle]`);
    for (const when of ["after click", "after reload"]) {
      expect(await html(page, "data-mk-width"), `data-mk-width ${when}`).toBe(width);
      expect(await pressed(page, "[data-mk-width-toggle]"), `aria-pressed ${when}`).toEqual([
        state,
        state,
      ]);
      expect(await stored(page, "mk-width"), `mk-width ${when}`).toBe(value);
      expect(await containerWidth(page), `container width ${when}`).toBe(px);
      if (when === "after click") await page.reload();
    }
  }
});

test("the controls work from the keyboard and show a focus ring", async ({ page }) => {
  await page.goto(`${PAGE}/`);
  const focusRing = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return {
        label: el.textContent,
        focusVisible: el.matches(":focus-visible"),
        outline: `${style.outlineStyle} ${style.outlineWidth}`,
      };
    });

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await focusRing()).toEqual({ label: "Light", focusVisible: true, outline: "solid 2px" });
  await page.keyboard.press("Enter");
  expect(await html(page, "data-theme"), "Enter on Light").toBe("light");

  await page.keyboard.press("Tab");
  expect(await focusRing()).toEqual({ label: "Dark", focusVisible: true, outline: "solid 2px" });
  await page.keyboard.press("Space");
  expect(await html(page, "data-theme"), "Space on Dark").toBe("dark");
  expect(await themePressed(page)).toEqual(["false", "false", "true"]);

  await page.keyboard.press("Tab");
  expect(await focusRing()).toEqual({
    label: "Full width",
    focusVisible: true,
    outline: "solid 2px",
  });
  await page.keyboard.press("Enter");
  expect(await html(page, "data-mk-width"), "Enter on the width toggle").toBe("full");
});

test("buttons rendered after load get the current aria-pressed and work", async ({ page }) => {
  await save(page, { "mk-theme": "dark", "mk-width": "full" });
  await page.waitForLoadState("load");
  await page.evaluate(() => {
    const late = document.createElement("div");
    late.id = "late";
    late.innerHTML =
      '<button type="button" data-mk-theme-choice="system">System</button>' +
      '<button type="button" data-mk-theme-choice="light">Light</button>' +
      '<button type="button" data-mk-theme-choice="dark">Dark</button>' +
      '<button type="button" data-mk-width-toggle><span id="late-icon">Width</span></button>';
    document.body.append(late);
  });

  await expect
    .poll(() => pressed(page, "#late button"))
    .toEqual(["false", "false", "true", "true"]);
  await page.click('#late [data-mk-theme-choice="light"]');
  expect(await html(page, "data-theme")).toBe("light");
  // A click on content inside the button counts as a click on the button.
  await page.click("#late-icon");
  expect(await html(page, "data-mk-width")).toBe(null);
  expect(await pressed(page, "#late button")).toEqual(["false", "true", "false", "false"]);
});

test("without the script, the OS theme and the Fit width apply", async ({ page }) => {
  for (const [scheme, bg] of [
    ["dark", DARK_BG],
    ["light", LIGHT_BG],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // A saved choice is ignored when the script is not loaded.
    await save(page, { "mk-theme": scheme === "dark" ? "light" : "dark", "mk-width": "full" });
    await page.goto(`${PAGE}/no-script`);
    expect(await probe(page)).toMatchObject({ theme: null, width: null });
    expect(await bodyBg(page), `body background under OS ${scheme}`).toBe(bg);
    expect(await containerWidth(page)).toBe(CONTAINER_MAX);
    await page.click('[data-mk-theme-choice="dark"]');
    await page.click("[data-mk-width-toggle]");
    expect(await html(page, "data-theme"), "buttons do nothing without the script").toBe(null);
    expect(await html(page, "data-mk-width")).toBe(null);
  }
});

test("with storage blocked, there is no error and the defaults apply", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage is blocked.", "SecurityError");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${PAGE}/`);

  expect(await probe(page)).toMatchObject({ theme: null, width: null });
  expect(await themePressed(page)).toEqual(["true", "false", "false"]);
  expect(await containerWidth(page)).toBe(CONTAINER_MAX);
  // Choices still apply to the page; they are just not remembered.
  await page.click('[data-mk-theme-choice="dark"]');
  await page.click("[data-mk-width-toggle]");
  expect(await html(page, "data-theme")).toBe("dark");
  expect(await html(page, "data-mk-width")).toBe("full");
  await page.reload();
  expect(await html(page, "data-theme")).toBe(null);
  expect(await html(page, "data-mk-width")).toBe(null);
  expect(errors, "page errors with storage blocked").toEqual([]);
});

test("the script adds no globals", async ({ page }) => {
  const globals = async (path: string) => {
    await page.goto(`${PAGE}${path}`);
    return page.evaluate(() => Object.getOwnPropertyNames(window).sort());
  };
  expect(await globals("/")).toEqual(await globals("/no-script"));
});
