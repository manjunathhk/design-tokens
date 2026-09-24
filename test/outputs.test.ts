import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compileString } from "sass";
import { beforeAll, describe, expect, it } from "vitest";
import { tokenNames } from "../scripts/api-diff.js";

const PACKAGE = "@manjunathhk/design-tokens";
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
  style: string;
  exports: Record<string, string | Record<string, string>>;
};
const BANNER = `/*! ${PACKAGE} v${pkg.version} */`;
const read = (file: string) => readFileSync(file, "utf8");

type Tokens = Record<"light" | "dark" | "shared" | "breakpoints", Record<string, string | number>>;

beforeAll(() => {
  if (!existsSync("dist/tokens.css")) throw new Error("dist/ not found. Run npm run build first.");
});

describe("banners", () => {
  for (const file of [
    "index.css",
    "tokens.css",
    "base.css",
    "_tokens.scss",
    "tokens.mjs",
    "tokens.d.ts",
  ]) {
    it(`dist/${file} starts with ${BANNER}`, () => {
      expect(read(`dist/${file}`).split("\n")[0]).toBe(BANNER);
    });
  }

  it(`dist/tokens.json carries "version": "${pkg.version}"`, () => {
    expect((JSON.parse(read("dist/tokens.json")) as { version: string }).version).toBe(pkg.version);
  });
});

describe("exports map", () => {
  const targets = Object.entries(pkg.exports).flatMap(([entry, target]) =>
    typeof target === "string"
      ? [{ entry, condition: "default", target }]
      : Object.entries(target).map(([condition, t]) => ({ entry, condition, target: t })),
  );

  it("has an entry for every file in dist/ and for package.json", () => {
    const exported = new Set(targets.map((t) => t.target));
    const files = ["./package.json", ...readdirSync("dist").map((f) => `./dist/${f}`)];
    const missing = files.filter((f) => !exported.has(f));
    expect(missing, `Files in dist/ with no exports entry: ${missing.join(", ")}`).toEqual([]);
  });

  for (const { entry, condition, target } of targets) {
    it(`${entry} (${condition}) points at an existing file: ${target}`, () => {
      expect(existsSync(target), `exports["${entry}"] ${condition} -> ${target} is missing`).toBe(
        true,
      );
    });
  }

  it(`"style" field is dist/index.css and exists`, () => {
    expect(pkg.style).toBe("dist/index.css");
    expect(existsSync(pkg.style)).toBe(true);
  });

  it("resolves every entry through the package name", () => {
    const require = createRequire(import.meta.url);
    for (const entry of Object.keys(pkg.exports)) {
      const specifier = entry === "." ? PACKAGE : `${PACKAGE}${entry.slice(1)}`;
      expect(() => require.resolve(specifier), specifier).not.toThrow();
    }
  });

  it("tokens.mjs imports and matches tokens.json", async () => {
    const json = JSON.parse(read("dist/tokens.json")) as Tokens & { version: string };
    const mod = (await import(`${PACKAGE}/tokens.mjs`)) as typeof json;
    const main = (await import(PACKAGE)) as typeof json;
    for (const key of ["version", "light", "dark", "shared", "breakpoints"] as const) {
      expect(mod[key], `tokens.mjs ${key}`).toEqual(json[key]);
      expect(main[key], `${PACKAGE} ${key}`).toEqual(json[key]);
    }
  });

  it("tokens.d.ts declares every key in tokens.json", () => {
    const dts = read("dist/tokens.d.ts");
    const json = JSON.parse(read("dist/tokens.json")) as Tokens;
    const missing = (["light", "dark", "shared", "breakpoints"] as const)
      .flatMap((group) => Object.entries(json[group]))
      .filter(([key, value]) => !dts.includes(`readonly ${JSON.stringify(key)}: ${typeof value};`))
      .map(([key]) => key);
    expect(missing, `Keys missing or mistyped in tokens.d.ts: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("tokens.json", () => {
  const json = JSON.parse(read("dist/tokens.json")) as Tokens;

  it("light and dark have the same keys", () => {
    expect(Object.keys(json.dark)).toEqual(Object.keys(json.light));
  });

  it("shared holds exactly the mode-independent custom properties", () => {
    const css = tokenNames(read("dist/tokens.css"));
    const fromJson = [...Object.keys(json.light), ...Object.keys(json.shared)].map(
      (p) => `--mk-${p.replace(/\./g, "-")}`,
    );
    expect(fromJson.sort()).toEqual(css);
  });

  it("breakpoints are under their own key and never in the CSS", () => {
    expect(Object.keys(json.breakpoints).length).toBeGreaterThan(0);
    expect(Object.keys(json.breakpoints).every((k) => k.startsWith("breakpoint."))).toBe(true);
  });
});

describe("index.css", () => {
  it("concatenates tokens and base without @import (D8)", () => {
    const index = read("dist/index.css");
    const body = (file: string) => read(file).slice(BANNER.length + 1);
    expect(index).toBe(`${BANNER}\n${body("dist/tokens.css")}\n${body("dist/base.css")}`);
    expect(index).not.toMatch(/@import/);
  });
});

describe("base.css", () => {
  it("uses only custom properties that tokens.css defines", () => {
    const defined = new Set(tokenNames(read("dist/tokens.css")));
    const used = [...read("src/base.css").matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1] ?? "");
    const unknown = [...new Set(used.filter((n) => !defined.has(n)))];
    expect(unknown, `src/base.css uses undefined tokens: ${unknown.join(", ")}`).toEqual([]);
  });
});

describe("_tokens.scss", () => {
  const compile = (body: string) =>
    compileString(`@use "dist/tokens" as *;\n${body}`, { loadPaths: ["."] }).css;

  it("maps $mk-* variables to the custom properties", () => {
    expect(compile(".a { color: $mk-color-accent; }")).toContain("color: var(--mk-color-accent)");
  });

  it("mk-media emits a min-width query with the raw breakpoint", () => {
    const json = JSON.parse(read("dist/tokens.json")) as Tokens;
    expect(compile(".a { @include mk-media(md) { color: red; } }")).toContain(
      `@media (min-width: ${json.breakpoints["breakpoint.md"]})`,
    );
  });

  it("mk-media names an unknown breakpoint", () => {
    expect(() => compile(".a { @include mk-media(huge) { color: red; } }")).toThrow(
      'mk-media: unknown breakpoint "huge"',
    );
  });
});

describe("npm pack", () => {
  it("ships only dist/, LICENSE, README.md and package.json", () => {
    const [report] = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        encoding: "utf8",
      }),
    ) as [{ files: { path: string }[] }];
    const stray = report.files
      .map((f) => f.path)
      .filter(
        (p) => !p.startsWith("dist/") && !["LICENSE", "README.md", "package.json"].includes(p),
      );
    expect(stray, `npm pack would ship: ${stray.join(", ")}`).toEqual([]);
  });
});
