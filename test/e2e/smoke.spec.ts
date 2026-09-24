/**
 * Cross-origin Playwright consumption smoke test (brief §6 test 5).
 *
 * Two local static servers run on different ports so they are different origins:
 *   - PAGE_PORT  serves test/e2e/fixture/index.html (the "consumer" page)
 *   - CDN_PORT   serves dist/ with Access-Control-Allow-Origin: * (the "CDN")
 *
 * The fixture page links index.css from the CDN origin.  Playwright opens the
 * page origin so cross-origin font loading is exercised exactly as it is from
 * the real CDN.
 *
 * Assertions:
 *   • body background and body colour resolve to the values in dist/tokens.json
 *     in four cases: OS light, OS dark, data-theme="light" under OS dark,
 *     data-theme="dark" under OS light.
 *   • document.fonts reports all IBM Plex faces as loaded.
 *   • Without the CORS header on the font responses, fonts fail to load
 *     (negative CORS check).
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Server } from "node:http";
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Token values read from the already-built dist/tokens.json
// ---------------------------------------------------------------------------

type TokenGroups = Record<"light" | "dark" | "shared" | "breakpoints", Record<string, string>>;

const tokens = JSON.parse(readFileSync("dist/tokens.json", "utf8")) as TokenGroups;
function tok(group: "light" | "dark", key: string): string {
  const v = tokens[group][key];
  if (v === undefined) throw new Error(`Token ${group}.${key} not found in dist/tokens.json`);
  return v;
}
const LIGHT_BG = tok("light", "color.bg");
const LIGHT_TEXT = tok("light", "color.text");
const DARK_BG = tok("dark", "color.bg");
const DARK_TEXT = tok("dark", "color.text");

// ---------------------------------------------------------------------------
// MIME map for the static CDN server
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".scss": "text/plain; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

// ---------------------------------------------------------------------------
// Helper: start a static file server
// ---------------------------------------------------------------------------

function startServer(
  rootDir: string,
  opts: { cors: boolean; port: number; pageHtml?: string },
): Promise<Server> {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";
    // Remove query string
    const pathname = url.split("?")[0] ?? "/";

    // If the caller provided synthetic HTML and this is the root request, serve it.
    if (opts.pageHtml && (pathname === "/" || pathname === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(opts.pageHtml);
      return;
    }

    const filePath = join(rootDir, pathname === "/" ? "index.html" : pathname);
    let body: Buffer;
    try {
      body = readFileSync(filePath);
    } catch {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const mime = MIME[extname(filePath)] ?? "application/octet-stream";
    const headers: Record<string, string> = { "Content-Type": mime };
    if (opts.cors) {
      headers["Access-Control-Allow-Origin"] = "*";
    }
    res.writeHead(200, headers);
    res.end(body);
  });

  return new Promise((resolve, reject) => {
    server.listen(opts.port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

// ---------------------------------------------------------------------------
// Fixture HTML – the CDN origin URL is injected at runtime
// ---------------------------------------------------------------------------

const FIXTURE_TEMPLATE = readFileSync("test/e2e/fixture/index.html", "utf8");

function makeFixtureHtml(cdnOrigin: string): string {
  return FIXTURE_TEMPLATE.replaceAll("__CDN_ORIGIN__", cdnOrigin);
}

// ---------------------------------------------------------------------------
// Helper: rgb() string → #RRGGBB
// ---------------------------------------------------------------------------

function rgbToHex(rgb: string): string {
  const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!m) return rgb; // already hex or some other form
  return (
    "#" +
    [m[1] ?? "", m[2] ?? "", m[3] ?? ""]
      .map((n) => parseInt(n, 10).toString(16).padStart(2, "0").toUpperCase())
      .join("")
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const PAGE_PORT = 7341;
const CDN_PORT = 7342;
const NO_CORS_CDN_PORT = 7343;

let pageServer: Server;
let cdnServer: Server;
let noCorsServer: Server;

test.beforeAll(async () => {
  const cdnOrigin = `http://127.0.0.1:${CDN_PORT}`;
  const pageHtml = makeFixtureHtml(cdnOrigin);

  pageServer = await startServer("test/e2e/fixture", { cors: false, port: PAGE_PORT, pageHtml });
  cdnServer = await startServer("dist", { cors: true, port: CDN_PORT });
  noCorsServer = await startServer("dist", { cors: false, port: NO_CORS_CDN_PORT });
});

test.afterAll(async () => {
  await Promise.all([stopServer(pageServer), stopServer(cdnServer), stopServer(noCorsServer)]);
});

// ---------------------------------------------------------------------------
// Theme cases
// ---------------------------------------------------------------------------

test("OS light: body background and text colour resolve to light tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  const bg = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const text = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).color));

  expect(bg).toBe(LIGHT_BG);
  expect(text).toBe(LIGHT_TEXT);
});

test("OS dark: body background and text colour resolve to dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  const bg = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const text = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).color));

  expect(bg).toBe(DARK_BG);
  expect(text).toBe(DARK_TEXT);
});

test("data-theme=light under OS dark: resolves to light tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

  const bg = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const text = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).color));

  expect(bg).toBe(LIGHT_BG);
  expect(text).toBe(LIGHT_TEXT);
});

test("data-theme=dark under OS light: resolves to dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));

  const bg = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const text = rgbToHex(await page.evaluate(() => getComputedStyle(document.body).color));

  expect(bg).toBe(DARK_BG);
  expect(text).toBe(DARK_TEXT);
});

// ---------------------------------------------------------------------------
// Font assertions
// ---------------------------------------------------------------------------

const EXPECTED_FACES = ["IBM Plex Sans", "IBM Plex Sans Condensed", "IBM Plex Mono"] as const;

test("document.fonts reports all IBM Plex faces as loaded", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  // Explicitly request each family so the browser fetches the @font-face files.
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('1em "IBM Plex Sans"'),
      document.fonts.load('1em "IBM Plex Sans Condensed"'),
      document.fonts.load('1em "IBM Plex Mono"'),
    ]);
  });

  const loadedFamilies = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
  );

  for (const face of EXPECTED_FACES) {
    const loaded = loadedFamilies.some((f) => f.replace(/['"]/g, "") === face);
    expect(loaded, `Expected "${face}" to be loaded`).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Negative CORS check
// ---------------------------------------------------------------------------

test("without CORS header, cross-origin fonts fail to load", async ({ page }) => {
  // Serve the fixture pointing to the no-CORS CDN server.
  const noCorsOrigin = `http://127.0.0.1:${NO_CORS_CDN_PORT}`;
  const html = makeFixtureHtml(noCorsOrigin);

  // Use a third server on PAGE_PORT+10 for this fixture, so it's a different
  // origin from the no-CORS CDN (different port = different origin).
  const NO_CORS_PAGE_PORT = PAGE_PORT + 10;
  const noCorsPageServer = await startServer("test/e2e/fixture", {
    cors: false,
    port: NO_CORS_PAGE_PORT,
    pageHtml: html,
  });

  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`http://127.0.0.1:${NO_CORS_PAGE_PORT}/`);
    await page.waitForLoadState("networkidle");

    // Explicitly request the fonts to prove they cannot load without CORS.
    // document.fonts.load() resolves (not rejects) with an empty array when
    // the font cannot be fetched; we catch any unexpected rejection defensively.
    await page.evaluate(async () => {
      await Promise.allSettled([
        document.fonts.load('1em "IBM Plex Sans"'),
        document.fonts.load('1em "IBM Plex Sans Condensed"'),
        document.fonts.load('1em "IBM Plex Mono"'),
      ]);
    });

    const loadedFamilies = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
    );

    // Without CORS, no IBM Plex font should be in loaded state.
    const ibmPlex = loadedFamilies.filter((f) => f.replace(/['"]/g, "").startsWith("IBM Plex"));
    expect(ibmPlex, "IBM Plex fonts should not load without CORS headers").toEqual([]);
  } finally {
    await stopServer(noCorsPageServer);
  }
});
