import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

beforeAll(() => {
  if (!existsSync("docs/index.html"))
    throw new Error("docs/index.html not found. Run npm run build first.");
});

describe("specimen page", () => {
  let html = "";
  let tokens: {
    shared: Record<string, string | number>;
  };

  beforeAll(() => {
    html = read("docs/index.html");
    tokens = JSON.parse(read("dist/tokens.json")) as {
      shared: Record<string, string | number>;
    };
  });

  it("is generated with specimen sections", () => {
    expect(html).toContain("<title>@manjunathhk/design-tokens specimen</title>");
    expect(html).toContain("Colour swatches and contrast ratios");
    expect(html).toContain("Type scale");
    expect(html).toContain("Spacing");
    expect(html).toContain("Radius");
    expect(html).toContain("Motion");
    expect(html).toContain("Consumption snippets");
  });

  it("contains specimen-only data-theme controls", () => {
    expect(html).toContain('name="theme" value="system"');
    expect(html).toContain('name="theme" value="light"');
    expect(html).toContain('name="theme" value="dark"');
    expect(html).toContain('root.setAttribute("data-theme", value)');
  });

  it("includes contrast rows and shadow.raised value from tokens", () => {
    expect(html).toContain("Light contrast ratios");
    expect(html).toContain("Dark contrast ratios");
    expect(html).toContain("color.accent");
    expect(html).toContain(String(tokens.shared["shadow.raised"]));
  });

  it("embeds the generated foundation rather than a hardcoded approximation", () => {
    const index = read("dist/index.css");
    const base = read("src/base.css");
    const tokensCss = read("dist/tokens.css");
    // Every :root / dark custom-property block and the whole base come through verbatim.
    expect(html).toContain(base);
    expect(html).toContain(tokensCss.slice(tokensCss.indexOf(":root {")));
    // index.css minus font URLs is a prefix-compatible subset of what the page embeds.
    const withoutFonts = (css: string) => css.replace(/url\("[^"]+"\)/g, "url()");
    const indexBody = withoutFonts(index).split("\n").slice(1).join("\n").trim();
    expect(withoutFonts(html)).toContain(indexBody);
  });

  it("is self-contained: fonts are inlined and no relative font URL remains", () => {
    expect(html).toContain('url("data:font/woff2;base64,');
    expect(/url\("fonts\//.test(html), "relative font url() remains").toBe(false);
    expect(/<(?:link|script|img)\b[^>]*\b(?:href|src)=/.test(html), "external resource tag").toBe(
      false,
    );
  });

  it("has no stale IBM Plex or Paper & Denim presentation copy", () => {
    const visible = html.replace(/<style>[\s\S]*?<\/style>/, "");
    expect(visible).not.toMatch(/IBM Plex|Paper (?:&|&amp;) Denim/i);
  });

  it("demonstrates the Inter and JetBrains Mono families and the weights", () => {
    expect(html).toContain("<h2>Typography</h2>");
    expect(html).toContain("font.family.mono");
    expect(html).toContain("JetBrains Mono");
    for (const weight of ["regular 400", "medium 500", "semibold 600", "bold 700"])
      expect(html).toContain(weight);
  });
});
