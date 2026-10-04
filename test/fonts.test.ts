import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");
const fontFiles = [
  "inter-latin-400-italic.woff2",
  "inter-latin-400-normal.woff2",
  "inter-latin-500-normal.woff2",
  "inter-latin-600-normal.woff2",
  "inter-latin-700-normal.woff2",
  "jetbrains-mono-latin-400-italic.woff2",
  "jetbrains-mono-latin-400-normal.woff2",
  "jetbrains-mono-latin-500-normal.woff2",
  "jetbrains-mono-latin-700-normal.woff2",
] as const;
const licenseFiles = ["Inter-OFL.txt", "JetBrainsMono-OFL.txt"] as const;

beforeAll(() => {
  if (!existsSync("dist/fonts.css"))
    throw new Error("dist/fonts.css not found. Run npm run build first.");
});

describe("fonts.css", () => {
  const css = read("dist/fonts.css");
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1] ?? "");

  it("points every face at an existing dist asset", () => {
    const missing = urls.filter((url) => !existsSync(join("dist", url)));
    expect(missing, `fonts.css references missing files: ${missing.join(", ")}`).toEqual([]);
  });

  it("uses only latin woff2 subset files", () => {
    expect(urls.every((url) => url.endsWith(".woff2"))).toBe(true);
    expect(urls.every((url) => url.includes("latin"))).toBe(true);
    expect(urls.sort()).toEqual(fontFiles.map((file) => `fonts/${file}`).sort());
  });

  it("declares the requested Inter and JetBrains Mono faces with font-display swap", () => {
    expect(css.match(/@font-face/g)).toHaveLength(fontFiles.length);
    expect(css.match(/font-display: swap;/g)).toHaveLength(fontFiles.length);
    expect(css).toContain('font-family: "Inter";');
    expect(css).toContain('font-family: "JetBrains Mono";');
    expect(css).toContain("font-style: italic;");
  });
});

describe("font assets", () => {
  it("ships only the expected font files in dist/fonts", () => {
    expect(readdirSync("dist/fonts").sort()).toEqual([...fontFiles].sort());
  });

  it("ships an OFL text for each family", () => {
    expect(readdirSync("dist/LICENSES").sort()).toEqual([...licenseFiles].sort());
    for (const file of licenseFiles) {
      expect(read(join("dist/LICENSES", file))).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });
});
