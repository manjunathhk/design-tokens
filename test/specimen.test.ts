import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { loadExamples } from "../src/specimen-examples.js";

const read = (file: string) => readFileSync(file, "utf8");

beforeAll(() => {
  if (!existsSync("docs/index.html"))
    throw new Error("docs/index.html not found. Run npm run build first.");
});

describe("specimen page", () => {
  let html = "";
  let tokens: {
    light: Record<string, string | number>;
    dark: Record<string, string | number>;
    shared: Record<string, string | number>;
  };

  beforeAll(() => {
    html = read("docs/index.html");
    tokens = JSON.parse(read("dist/tokens.json")) as typeof tokens;
  });

  it("is generated with specimen sections", () => {
    expect(html).toContain("<title>@manjunathhk/design-tokens specimen</title>");
    expect(html).toContain("Colour swatches and contrast ratios");
    expect(html).toContain("Type scale");
    expect(html).toContain("Spacing");
    expect(html).toContain("Radius");
    expect(html).toContain("Motion");
  });

  it("has a system/light/dark theme switch on the shipped controls.js hooks (D54)", () => {
    expect(html).toMatch(
      /<div class="theme-switch" id="theme-switch" role="group" aria-label="Theme">/,
    );
    for (const [choice, pressed, iconName] of [
      ["system", "true", "monitor"],
      ["light", "false", "sun"],
      ["dark", "false", "moon"],
    ] as const) {
      expect(html, `${choice} button`).toMatch(
        new RegExp(
          `<button[^>]*data-mk-theme-choice="${choice}" aria-pressed="${pressed}"[^>]*aria-label="[^"]+"[^>]*><svg class="icon icon-${iconName}"`,
        ),
      );
    }
    const head = /<head>([^]*?)<\/head>/.exec(html)?.[1] ?? "";
    expect(head, "dist/controls.js inlined in <head>, so the theme applies before paint").toContain(
      `<script>\n${read("dist/controls.js")}\n  </script>`,
    );
    expect(html, "base.css on the page, for the width hook").toContain(read("src/base.css"));
  });

  it("has no specimen-only theme or width state left (D54)", () => {
    expect(html).not.toContain("data-layout");
    expect(html).not.toContain("mk-specimen-");
    expect(html).not.toContain("data-theme-choice");
  });

  it("has a width toggle on the shipped hooks and a collapsing section menu", () => {
    expect(html).toMatch(/<button[^>]*id="width-toggle" data-mk-width-toggle aria-pressed="false"/);
    expect(html).toContain("<main data-mk-container>");
    expect(html).toMatch(/<button[^>]*id="menu-toggle"[^>]*aria-controls="toc-links"/);
    expect(html).toContain('<div class="toc-links" id="toc-links">');
  });

  it("has an inline SVG favicon coloured from accent and on-accent in both modes", () => {
    const href =
      /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,([^"]+)">/.exec(
        html,
      )?.[1];
    expect(href, "favicon <link> with a data: SVG").toBeDefined();
    const svg = decodeURIComponent(href ?? "");
    const [light = "", dark = ""] = svg.split("@media (prefers-color-scheme: dark)");
    for (const [mode, css] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      expect(css, `${mode} tile`).toContain(`.tile { fill: ${tokens[mode]["color.accent"]}; }`);
      expect(css, `${mode} bars`).toContain(`.bars { fill: ${tokens[mode]["color.on-accent"]}; }`);
    }
  });

  it("has copyable consumption snippets", () => {
    expect(html).toContain("Use it");
    expect(html).toContain("data-copy=");
    expect(html).toContain("https://design.manjunathhk.in/v1/index.css");
  });

  it("puts every copy button inside its code box, as an icon", () => {
    const buttons = [...html.matchAll(/<button[^>]*data-copy=[^>]*>/g)].map((match) => match[0]);
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const label = /aria-label="([^"]*)"/.exec(button)?.[1] ?? button.slice(0, 80);
      expect(button, `${label}: copy-button class`).toContain('class="icon-button copy-button"');
      expect(label, `${label}: aria-label`).toMatch(/^Copy /);
    }
    const boxed = html.match(/<div class="code"><pre>[^]*?<\/pre><button[^>]*data-copy=/g) ?? [];
    expect(boxed.length, "copy buttons that directly follow a <pre> inside .code").toBe(
      buttons.length,
    );
    expect(html.match(/class="icon icon-copy"/g)?.length).toBe(buttons.length);
  });

  it("shows every token-in-use example with a preview and exact copy snippets (D53)", () => {
    const unescape = (value: string) =>
      value
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&");
    const copied = [...html.matchAll(/data-copy="([^"]*)"/g)].map((match) =>
      unescape(match[1] ?? ""),
    );
    expect(html).toContain('id="in-use"');
    expect(html).toContain("Not yet expressible");
    for (const group of loadExamples()) {
      expect(copied, `${group.id} CSS snippet`).toContain(group.css);
      for (const example of group.examples) {
        expect(html, `${group.id}/${example.id} preview`).toContain(
          `title="${group.title}: ${example.title} preview"`,
        );
        expect(copied, `${group.id}/${example.id} HTML snippet`).toContain(example.html);
      }
    }
  });

  it("includes contrast rows and shadow.raised value from tokens", () => {
    expect(html).toContain("Light contrast ratios");
    expect(html).toContain("Dark contrast ratios");
    expect(html).toContain("color.accent");
    expect(html).toContain(String(tokens.shared["shadow.raised"]));
  });
});
