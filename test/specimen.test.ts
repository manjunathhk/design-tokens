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
  });

  it("contains a specimen-only light/dark theme toggle", () => {
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('root.setAttribute("data-theme", isDark() ? "light" : "dark")');
  });

  it("has copyable consumption snippets", () => {
    expect(html).toContain("Use it");
    expect(html).toContain("data-copy=");
    expect(html).toContain("https://design.manjunathhk.in/v1/index.css");
  });

  it("includes contrast rows and shadow.raised value from tokens", () => {
    expect(html).toContain("Light contrast ratios");
    expect(html).toContain("Dark contrast ratios");
    expect(html).toContain("color.accent");
    expect(html).toContain(String(tokens.shared["shadow.raised"]));
  });
});
