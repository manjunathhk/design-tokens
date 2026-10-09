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
 *   • document.fonts reports all Inter and JetBrains Mono faces as loaded.
 *   • Without the CORS header on the font responses, fonts fail to load
 *     (negative CORS check).
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Server } from "node:http";
import type { Page } from "@playwright/test";
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

const EXPECTED_FACES = ["Inter", "JetBrains Mono"] as const;

test("document.fonts reports all Inter and JetBrains Mono faces as loaded", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  // Explicitly request each family so the browser fetches the @font-face files.
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('1em "Inter"'),
      document.fonts.load('1em "JetBrains Mono"'),
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
        document.fonts.load('1em "Inter"'),
        document.fonts.load('1em "JetBrains Mono"'),
      ]);
    });

    const loadedFamilies = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
    );

    // Without CORS, no self-hosted Inter or JetBrains Mono font should be in loaded state.
    const selfHosted = loadedFamilies.filter(
      (f) => f.includes("Inter") || f.includes("JetBrains Mono"),
    );
    expect(
      selfHosted,
      "Inter and JetBrains Mono fonts should not load without CORS headers",
    ).toEqual([]);
  } finally {
    await stopServer(noCorsPageServer);
  }
});

// ---------------------------------------------------------------------------
// Base stylesheet: reset, reduced motion, and specificity
// ---------------------------------------------------------------------------

test("base reset: elements, ::before and ::after receive border-box from built index.css", async ({
  page,
}) => {
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "pseudo-elements-content";
    style.textContent = `
      .test-element::before { content: "before"; display: block; }
      .test-element::after { content: "after"; display: block; }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.className = "test-element";
    div.id = "box-sizing-target";
    document.body.appendChild(div);
  });

  const [elBoxSizing, beforeBoxSizing, afterBoxSizing] = await page.evaluate(() => {
    const el = document.getElementById("box-sizing-target");
    if (!el) throw new Error("box-sizing-target not found");
    return [
      getComputedStyle(el).boxSizing,
      getComputedStyle(el, "::before").boxSizing,
      getComputedStyle(el, "::after").boxSizing,
    ];
  });

  expect(elBoxSizing).toBe("border-box");
  expect(beforeBoxSizing).toBe("border-box");
  expect(afterBoxSizing).toBe("border-box");
});

test("base reset: elements, ::before and ::after receive border-box from built base.css directly", async ({
  page,
}) => {
  const cdnOrigin = `http://127.0.0.1:${CDN_PORT}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="${cdnOrigin}/base.css" />
    <style>
      .standalone-test::before { content: "before"; display: block; }
      .standalone-test::after { content: "after"; display: block; }
    </style>
  </head>
  <body>
    <div class="standalone-test" id="standalone-target"></div>
  </body>
</html>`;

  await page.setContent(html);
  await page.waitForLoadState("networkidle");

  const [elBoxSizing, beforeBoxSizing, afterBoxSizing] = await page.evaluate(() => {
    const el = document.getElementById("standalone-target");
    if (!el) throw new Error("standalone-target not found");
    return [
      getComputedStyle(el).boxSizing,
      getComputedStyle(el, "::before").boxSizing,
      getComputedStyle(el, "::after").boxSizing,
    ];
  });

  expect(elBoxSizing).toBe("border-box");
  expect(beforeBoxSizing).toBe("border-box");
  expect(afterBoxSizing).toBe("border-box");
});

test("reduced motion: pseudo-element animation and transition follow reduction policy, ordinary mode unchanged", async ({
  page,
}) => {
  // 1. Reduced motion enabled: durations clamped to 0.01ms, iteration count clamped to 1
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "motion-style";
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .motion-box {
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
      .motion-box::before {
        content: "b";
        display: block;
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
      .motion-box::after {
        content: "a";
        display: block;
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.className = "motion-box";
    div.id = "motion-target";
    document.body.appendChild(div);
  });

  const reduced = await page.evaluate(() => {
    const el = document.getElementById("motion-target");
    if (!el) throw new Error("motion-target not found");
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const elStyle = getComputedStyle(el);
    return {
      elAnimDuration: elStyle.animationDuration,
      elAnimIteration: elStyle.animationIterationCount,
      elTransDuration: elStyle.transitionDuration,
      beforeAnimDuration: before.animationDuration,
      beforeAnimIteration: before.animationIterationCount,
      beforeTransDuration: before.transitionDuration,
      afterAnimDuration: after.animationDuration,
      afterAnimIteration: after.animationIterationCount,
      afterTransDuration: after.transitionDuration,
    };
  });

  expect(["0.00001s", "1e-05s"]).toContain(reduced.elAnimDuration);
  expect(reduced.elAnimIteration).toBe("1");
  expect(["0.00001s", "1e-05s"]).toContain(reduced.elTransDuration);

  expect(["0.00001s", "1e-05s"]).toContain(reduced.beforeAnimDuration);
  expect(reduced.beforeAnimIteration).toBe("1");
  expect(["0.00001s", "1e-05s"]).toContain(reduced.beforeTransDuration);

  expect(["0.00001s", "1e-05s"]).toContain(reduced.afterAnimDuration);
  expect(reduced.afterAnimIteration).toBe("1");
  expect(["0.00001s", "1e-05s"]).toContain(reduced.afterTransDuration);

  // 2. Ordinary mode (reducedMotion: "no-preference") unchanged
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "motion-style-ordinary";
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .motion-box {
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
      .motion-box::before {
        content: "b";
        display: block;
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
      .motion-box::after {
        content: "a";
        display: block;
        animation: spin 10s infinite;
        transition: opacity 10s;
      }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.className = "motion-box";
    div.id = "motion-target-ordinary";
    document.body.appendChild(div);
  });

  const ordinary = await page.evaluate(() => {
    const el = document.getElementById("motion-target-ordinary");
    if (!el) throw new Error("motion-target-ordinary not found");
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const elStyle = getComputedStyle(el);
    return {
      elAnimDuration: elStyle.animationDuration,
      elAnimIteration: elStyle.animationIterationCount,
      elTransDuration: elStyle.transitionDuration,
      beforeAnimDuration: before.animationDuration,
      beforeAnimIteration: before.animationIterationCount,
      beforeTransDuration: before.transitionDuration,
      afterAnimDuration: after.animationDuration,
      afterAnimIteration: after.animationIterationCount,
      afterTransDuration: after.transitionDuration,
    };
  });

  expect(ordinary.elAnimDuration).toBe("10s");
  expect(ordinary.elAnimIteration).toBe("infinite");
  expect(ordinary.elTransDuration).toBe("10s");
  expect(ordinary.beforeAnimDuration).toBe("10s");
  expect(ordinary.beforeAnimIteration).toBe("infinite");
  expect(ordinary.beforeTransDuration).toBe("10s");
  expect(ordinary.afterAnimDuration).toBe("10s");
  expect(ordinary.afterAnimIteration).toBe("infinite");
  expect(ordinary.afterTransDuration).toBe("10s");
});

test("consumer overrides: site rules override pseudo-element reset without !important (D23)", async ({
  page,
}) => {
  // Test consumer styles loaded after index.css
  await page.goto(`http://127.0.0.1:${PAGE_PORT}/`);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "consumer-override-style";
    style.textContent = `
      .custom-box { box-sizing: content-box; }
      .custom-box::before { content: "b"; display: block; box-sizing: content-box; }
      .custom-box::after { content: "a"; display: block; box-sizing: content-box; }
    `;
    document.head.appendChild(style);

    const div = document.createElement("div");
    div.className = "custom-box";
    div.id = "override-target";
    document.body.appendChild(div);
  });

  const [elBoxSizing, beforeBoxSizing, afterBoxSizing] = await page.evaluate(() => {
    const el = document.getElementById("override-target");
    if (!el) throw new Error("override-target not found");
    return [
      getComputedStyle(el).boxSizing,
      getComputedStyle(el, "::before").boxSizing,
      getComputedStyle(el, "::after").boxSizing,
    ];
  });

  expect(elBoxSizing).toBe("content-box");
  expect(beforeBoxSizing).toBe("content-box");
  expect(afterBoxSizing).toBe("content-box");
});

test("consumer overrides: site rules placed before index.css override pseudo-element reset without !important (D23)", async ({
  page,
}) => {
  const cdnOrigin = `http://127.0.0.1:${CDN_PORT}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      .early-override { box-sizing: content-box; }
      .early-override::before { content: "b"; display: block; box-sizing: content-box; }
      .early-override::after { content: "a"; display: block; box-sizing: content-box; }
    </style>
    <link rel="stylesheet" href="${cdnOrigin}/index.css" />
  </head>
  <body>
    <div class="early-override" id="early-target"></div>
  </body>
</html>`;

  await page.setContent(html);
  await page.waitForLoadState("networkidle");

  const [elBoxSizing, beforeBoxSizing, afterBoxSizing] = await page.evaluate(() => {
    const el = document.getElementById("early-target");
    if (!el) throw new Error("early-target not found");
    return [
      getComputedStyle(el).boxSizing,
      getComputedStyle(el, "::before").boxSizing,
      getComputedStyle(el, "::after").boxSizing,
    ];
  });

  expect(elBoxSizing).toBe("content-box");
  expect(beforeBoxSizing).toBe("content-box");
  expect(afterBoxSizing).toBe("content-box");
});

// ---------------------------------------------------------------------------
// Content width hook (D54): data-mk-container, Fit and Full
// ---------------------------------------------------------------------------

const CONTAINER_MAX = tokens.shared["layout.container-max"];

function widthPage(opts: { full: boolean; siteCss?: string }): string {
  const cdnOrigin = `http://127.0.0.1:${CDN_PORT}`;
  return `<!doctype html>
<html lang="en"${opts.full ? ' data-mk-width="full"' : ""}>
  <head>
    <meta charset="utf-8" />
    ${opts.siteCss ? `<style>${opts.siteCss}</style>` : ""}
    <link rel="stylesheet" href="${cdnOrigin}/index.css" />
  </head>
  <body>
    <main data-mk-container class="site-main" id="container"></main>
  </body>
</html>`;
}

async function containerBox(page: Page) {
  return page.evaluate(() => {
    const el = document.getElementById("container");
    if (!el) throw new Error("container not found");
    const s = getComputedStyle(el);
    return {
      maxWidth: s.maxWidth,
      width: el.getBoundingClientRect().width,
      marginLeft: s.marginLeft,
      marginRight: s.marginRight,
    };
  });
}

test("width hook: data-mk-container is capped at layout.container-max and centred (Fit)", async ({
  page,
}) => {
  expect(CONTAINER_MAX, "layout.container-max missing from dist/tokens.json").toBeDefined();
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.setContent(widthPage({ full: false }));
  await page.waitForLoadState("networkidle");

  const box = await containerBox(page);
  expect(box.maxWidth).toBe(CONTAINER_MAX);
  expect(`${box.width}px`).toBe(CONTAINER_MAX);
  expect(box.marginLeft).toBe(box.marginRight);
  expect(box.marginLeft).not.toBe("0px");
});

test('width hook: data-mk-width="full" on <html> removes the cap without controls.js (Full)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.setContent(widthPage({ full: true }));
  await page.waitForLoadState("networkidle");

  const box = await containerBox(page);
  expect(box.maxWidth).toBe("none");
  expect(box.width).toBe(1800);
});

test("consumer overrides: a site max-width on the container wins in Fit and Full without !important (D23)", async ({
  page,
}) => {
  // The site rule is placed before index.css, so it wins on specificity alone.
  const siteCss = ".site-main { max-width: 600px; }";
  await page.setViewportSize({ width: 1800, height: 900 });

  for (const full of [false, true]) {
    await page.setContent(widthPage({ full, siteCss }));
    await page.waitForLoadState("networkidle");
    const box = await containerBox(page);
    expect(box.maxWidth, `site rule lost with full=${full}`).toBe("600px");
  }
});
