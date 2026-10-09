import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  diffNames,
  diffSiteControls,
  diffStylelintConfig,
  diffValues,
  jsonNames,
  namesError,
  readFromTarball,
  siteControlsError,
  siteControlsSurface,
  tokenNames,
  type FileDiff,
  type TokensJson,
} from "../scripts/api-diff.js";

const names = ["--mk-color-accent", "--mk-color-bg"];

const tokensJson = (
  breakpoints: Record<string, unknown> = { "breakpoint.sm": "560px" },
): TokensJson => ({
  version: "1.0.0",
  light: { "color.bg": "#fff" },
  dark: { "color.bg": "#000" },
  shared: { "font.size.base": "17px" },
  breakpoints,
});

describe("API diff", () => {
  it("collects each custom property once, sorted", () => {
    const css =
      ":root { --mk-color-bg: #fff; --mk-color-accent: #00f; }\n:root[x] { --mk-color-bg: #000; }";
    expect(tokenNames(css)).toEqual(names);
  });

  it("fails when a token is added without a MINOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "1.2.1", names: [...names, "--mk-color-new"] },
    );
    expect(diff).toEqual({ removed: [], added: ["--mk-color-new"], ok: false });
    expect(namesError("CSS custom properties", diff)).toBe(
      "CSS custom properties: added --mk-color-new. An addition requires a MINOR bump.",
    );
  });

  it("passes when names are only added with a suitable MINOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "1.3.0", names: [...names, "--mk-color-new"] },
    );
    expect(diff).toEqual({ removed: [], added: ["--mk-color-new"], ok: true });
  });

  it("fails when a name is removed without a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "1.3.0", names: ["--mk-color-bg"] },
    );
    expect(diff).toEqual({ removed: ["--mk-color-accent"], added: [], ok: false });
    expect(namesError("CSS custom properties", diff)).toBe(
      "CSS custom properties: removed --mk-color-accent. " +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("fails naming both names when a token is renamed without a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "1.3.0", names: ["--mk-color-bg", "--mk-color-brand"] },
    );
    expect(diff).toEqual({
      removed: ["--mk-color-accent"],
      added: ["--mk-color-brand"],
      ok: false,
    });
    expect(namesError("CSS custom properties", diff)).toBe(
      "CSS custom properties: removed --mk-color-accent; added --mk-color-brand. " +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("has no message for a passing name diff", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "1.3.0", names: [...names, "--mk-color-new"] },
    );
    expect(namesError("CSS custom properties", diff)).toBeUndefined();
  });

  it("passes a removal with a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names },
      { version: "2.0.0", names: ["--mk-color-bg"] },
    );
    expect(diff.ok).toBe(true);
  });

  it("reads dist/tokens.css out of an npm tarball", () => {
    const entry = (name: string, body: string) => {
      const header = Buffer.alloc(512);
      header.write(name, 0);
      header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
      const data = Buffer.alloc(Math.ceil(body.length / 512) * 512);
      data.write(body);
      return [header, data];
    };
    const tgz = gzipSync(
      Buffer.concat([
        ...entry("package/package.json", "{}"),
        ...entry("package/dist/tokens.css", ":root { --mk-color-bg: #fff; }"),
        Buffer.alloc(1024),
      ]),
    );
    expect(readFromTarball(tgz, "dist/tokens.css")).toBe(":root { --mk-color-bg: #fff; }");
    expect(readFromTarball(tgz, "dist/missing.css")).toBeUndefined();
  });

  it("collects group.key names from every tokens.json group, sorted", () => {
    expect(jsonNames(tokensJson())).toEqual([
      "breakpoints.breakpoint.sm",
      "dark.color.bg",
      "light.color.bg",
      "shared.font.size.base",
    ]);
  });

  it("passes when a tokens.json key is only added with a suitable MINOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      {
        version: "1.3.0",
        names: jsonNames(tokensJson({ "breakpoint.sm": "560px", "breakpoint.md": "900px" })),
      },
    );
    expect(diff.ok).toBe(true);
    expect(diff.added).toEqual(["breakpoints.breakpoint.md"]);
  });

  it("fails when a tokens.json key is only added without a MINOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      {
        version: "1.2.1",
        names: jsonNames(tokensJson({ "breakpoint.sm": "560px", "breakpoint.md": "900px" })),
      },
    );
    expect(diff.ok).toBe(false);
    expect(diff.added).toEqual(["breakpoints.breakpoint.md"]);
    expect(namesError("tokens.json keys", diff)).toBe(
      "tokens.json keys: added breakpoints.breakpoint.md. An addition requires a MINOR bump.",
    );
  });

  it("fails naming the group and the key when a breakpoint is removed without a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      { version: "1.3.0", names: jsonNames(tokensJson({})) },
    );
    expect(diff).toEqual({ removed: ["breakpoints.breakpoint.sm"], added: [], ok: false });
    expect(namesError("tokens.json keys", diff)).toBe(
      "tokens.json keys: removed breakpoints.breakpoint.sm. " +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("fails naming both keys when a tokens.json key is renamed without a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      { version: "1.3.0", names: jsonNames(tokensJson({ "breakpoint.small": "560px" })) },
    );
    expect(diff).toEqual({
      removed: ["breakpoints.breakpoint.sm"],
      added: ["breakpoints.breakpoint.small"],
      ok: false,
    });
    expect(namesError("tokens.json keys", diff)).toBe(
      "tokens.json keys: removed breakpoints.breakpoint.sm; added breakpoints.breakpoint.small. " +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("fails naming the group and the key when a shared key is removed without a MAJOR bump", () => {
    const published = tokensJson();
    const local = tokensJson();
    delete (local.shared as Record<string, unknown>)["font.size.base"];
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(published) },
      { version: "1.3.0", names: jsonNames(local) },
    );
    expect(diff).toEqual({ removed: ["shared.font.size.base"], added: [], ok: false });
  });

  it("passes a tokens.json key removal with a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      { version: "2.0.0", names: jsonNames(tokensJson({})) },
    );
    expect(diff.ok).toBe(true);
  });

  it("allows unchanged same-version builds and compares prerelease to final intentionally", () => {
    const sameBuild = diffNames({ version: "1.2.0", names }, { version: "1.2.0", names });
    expect(sameBuild).toEqual({ removed: [], added: [], ok: true });

    const prereleaseToFinal = diffNames(
      { version: "1.2.0-rc.1", names },
      { version: "1.2.0", names },
    );
    expect(prereleaseToFinal).toEqual({ removed: [], added: [], ok: true });
  });

  it("requires MINOR for a token value change and MAJOR for a stricter stylelint change", () => {
    const css = ":root { --mk-color-bg: #fff; --mk-color-accent: #00f; }";
    const published = {
      version: "1.2.0",
      values: { "light.color.bg": "#fff", "dark.color.bg": "#000" },
    };
    const local = {
      version: "1.2.1",
      values: { "light.color.bg": "#fefefe", "dark.color.bg": "#000" },
    };
    const valueDiff = diffValues(published, local);
    expect(valueDiff.changed).toEqual(["light.color.bg"]);
    expect(valueDiff.ok).toBe(false);

    const stylelintDiff = diffStylelintConfig(
      {
        version: "1.2.0",
        config: `export default { rules: { "color-no-hex": false, "function-disallowed-list": ["/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)$/i"] } };`,
      },
      {
        version: "1.2.0",
        config: `export default { rules: { "color-no-hex": true, "function-disallowed-list": ["/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)$/i"] } };`,
      },
    );
    expect(stylelintDiff.ok).toBe(false);
    expect(stylelintDiff.changes).toEqual([
      { rule: "color-no-hex", change: "stricter", required: "MAJOR" },
    ]);
    expect(tokenNames(css)).toEqual(["--mk-color-accent", "--mk-color-bg"]);
  });

  it("reads dist/tokens.json out of an npm tarball, and is absent for a version published before it shipped", () => {
    const entry = (name: string, body: string) => {
      const header = Buffer.alloc(512);
      header.write(name, 0);
      header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
      const data = Buffer.alloc(Math.ceil(body.length / 512) * 512);
      data.write(body);
      return [header, data];
    };
    const withJson = gzipSync(
      Buffer.concat([
        ...entry("package/package.json", "{}"),
        ...entry("package/dist/tokens.json", JSON.stringify(tokensJson())),
        Buffer.alloc(1024),
      ]),
    );
    expect(readFromTarball(withJson, "dist/tokens.json")).toBe(JSON.stringify(tokensJson()));

    const withoutJson = gzipSync(
      Buffer.concat([
        ...entry("package/package.json", "{}"),
        ...entry("package/dist/tokens.css", ""),
        Buffer.alloc(1024),
      ]),
    );
    expect(readFromTarball(withoutJson, "dist/tokens.json")).toBeUndefined();
  });
});

const fixture = (name: string) =>
  readFileSync(new URL(`fixtures/site-controls/${name}`, import.meta.url), "utf8");
const baseCss = fixture("base.css");
const controlsJs = fixture("controls.js");
const siteControls = (
  version: string,
  files: { base?: string; controls?: string } = { base: baseCss, controls: controlsJs },
) => ({
  version,
  files: { "dist/base.css": files.base, "dist/controls.js": files.controls },
});
const diffFor = (diffs: FileDiff[], path: string): FileDiff => {
  const diff = diffs.find((d) => d.path === path);
  if (!diff) throw new Error(`No site-controls diff for ${path}.`);
  return diff;
};

describe("API diff: site controls (D54)", () => {
  it("collects data-mk-* attributes with their values from base.css", () => {
    expect(siteControlsSurface(baseCss)).toEqual([
      "attribute data-mk-container",
      "attribute data-mk-width",
      'attribute data-mk-width="full"',
    ]);
  });

  it("collects attributes, values and storage keys from controls.js, and no events", () => {
    expect(siteControlsSurface(controlsJs)).toEqual([
      "attribute data-mk-theme-choice",
      'attribute data-mk-theme-choice="dark"',
      'attribute data-mk-theme-choice="light"',
      'attribute data-mk-theme-choice="system"',
      "attribute data-mk-width",
      "attribute data-mk-width-toggle",
      'attribute data-mk-width="full"',
      "storage key mk-theme",
      "storage key mk-width",
    ]);
  });

  it("collects dispatched event names and ignores comments", () => {
    const script = [
      `/* data-mk-old "mk-old" */`,
      `// data-mk-older`,
      `el.dispatchEvent(new CustomEvent("mk-theme-change"));`,
      `el.dispatchEvent(new Event('mk-width-change'));`,
    ].join("\n");
    expect(siteControlsSurface(script)).toEqual([
      "event mk-theme-change",
      "event mk-width-change",
      "storage key mk-theme-change",
      "storage key mk-width-change",
    ]);
  });

  it("passes an unchanged surface at the same version", () => {
    const diffs = diffSiteControls(siteControls("1.6.0"), siteControls("1.6.0"));
    expect(diffs.map((d) => [d.path, d.added, d.removed, d.ok])).toEqual([
      ["dist/base.css", [], [], true],
      ["dist/controls.js", [], [], true],
    ]);
  });

  it("fails naming the attribute and the file when an attribute is removed without a MAJOR bump", () => {
    const local = controlsJs.replace(
      `    else if (target.closest('[data-mk-theme-choice="dark"]')) setTheme("dark");\n`,
      "",
    );
    const diff = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.7.0", { base: baseCss, controls: local }),
      ),
      "dist/controls.js",
    );
    expect(diff).toMatchObject({
      removed: ['attribute data-mk-theme-choice="dark"'],
      added: [],
      ok: false,
    });
    expect(siteControlsError(diff)).toBe(
      'Site controls in dist/controls.js: removed attribute data-mk-theme-choice="dark". ' +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("fails naming both names and the file when an attribute is renamed without a MAJOR bump", () => {
    const local = baseCss.replaceAll("data-mk-container", "data-mk-wrapper");
    const diff = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.7.0", { base: local, controls: controlsJs }),
      ),
      "dist/base.css",
    );
    expect(diff).toMatchObject({
      removed: ["attribute data-mk-container"],
      added: ["attribute data-mk-wrapper"],
      ok: false,
    });
    expect(siteControlsError(diff)).toBe(
      "Site controls in dist/base.css: removed attribute data-mk-container; " +
        "added attribute data-mk-wrapper. A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("passes an attribute rename with a MAJOR bump", () => {
    const local = baseCss.replaceAll("data-mk-container", "data-mk-wrapper");
    const diffs = diffSiteControls(
      siteControls("1.6.0"),
      siteControls("2.0.0", { base: local, controls: controlsJs }),
    );
    expect(diffs.every((d) => d.ok)).toBe(true);
  });

  it("requires a MINOR bump for an added attribute value", () => {
    const local = controlsJs.replace(
      `    else if (target.closest("[data-mk-width-toggle]")) toggleWidth();\n`,
      `    else if (target.closest("[data-mk-width-toggle]")) toggleWidth();\n` +
        `    else if (target.closest('[data-mk-theme-choice="sepia"]')) setTheme("sepia");\n`,
    );
    const patch = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.6.1", { base: baseCss, controls: local }),
      ),
      "dist/controls.js",
    );
    expect(patch).toMatchObject({
      removed: [],
      added: ['attribute data-mk-theme-choice="sepia"'],
      ok: false,
    });
    expect(siteControlsError(patch)).toBe(
      'Site controls in dist/controls.js: added attribute data-mk-theme-choice="sepia". ' +
        "An addition requires a MINOR bump.",
    );
    const minor = diffSiteControls(
      siteControls("1.6.0"),
      siteControls("1.7.0", { base: baseCss, controls: local }),
    );
    expect(minor.every((d) => d.ok)).toBe(true);
  });

  it("fails naming the key and the file when a storage key is removed without a MAJOR bump", () => {
    const local = controlsJs.replaceAll('"mk-width"', "WIDTH_KEY");
    const diff = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.7.0", { base: baseCss, controls: local }),
      ),
      "dist/controls.js",
    );
    expect(diff).toMatchObject({ removed: ["storage key mk-width"], added: [], ok: false });
    expect(siteControlsError(diff)).toBe(
      "Site controls in dist/controls.js: removed storage key mk-width. " +
        "A removal or rename requires a MAJOR bump or restoration.",
    );
  });

  it("fails when a storage key is renamed without a MAJOR bump, and passes with one", () => {
    const local = controlsJs.replaceAll('"mk-theme"', '"mk-colour-theme"');
    const minor = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.7.0", { base: baseCss, controls: local }),
      ),
      "dist/controls.js",
    );
    expect(minor).toMatchObject({
      removed: ["storage key mk-theme"],
      added: ["storage key mk-colour-theme"],
      ok: false,
    });
    expect(siteControlsError(minor)).toBe(
      "Site controls in dist/controls.js: removed storage key mk-theme; " +
        "added storage key mk-colour-theme. A removal or rename requires a MAJOR bump or restoration.",
    );
    const major = diffSiteControls(
      siteControls("1.6.0"),
      siteControls("2.0.0", { base: baseCss, controls: local }),
    );
    expect(major.every((d) => d.ok)).toBe(true);
  });

  it("requires a MINOR bump for an added storage key", () => {
    const local = controlsJs.replace(
      "  applyWidth(localStorage",
      '  localStorage.removeItem("mk-legacy");\n  applyWidth(localStorage',
    );
    const patch = diffFor(
      diffSiteControls(
        siteControls("1.6.0"),
        siteControls("1.6.1", { base: baseCss, controls: local }),
      ),
      "dist/controls.js",
    );
    expect(patch).toMatchObject({ removed: [], added: ["storage key mk-legacy"], ok: false });
    const minor = diffSiteControls(
      siteControls("1.6.0"),
      siteControls("1.7.0", { base: baseCss, controls: local }),
    );
    expect(minor.every((d) => d.ok)).toBe(true);
  });

  it("counts a file missing from the published version only as additions", () => {
    const published = siteControls("1.6.0", { base: baseCss });
    const patch = diffFor(diffSiteControls(published, siteControls("1.6.1")), "dist/controls.js");
    expect(patch.removed).toEqual([]);
    expect(patch.added).toEqual(siteControlsSurface(controlsJs));
    expect(patch.ok).toBe(false);
    expect(siteControlsError(patch)).toMatch(/^Site controls in dist\/controls\.js: added /);

    expect(diffSiteControls(published, siteControls("1.7.0")).every((d) => d.ok)).toBe(true);
  });

  it("requires a MAJOR bump when a published file is missing locally", () => {
    const diff = diffFor(
      diffSiteControls(siteControls("1.6.0"), siteControls("1.7.0", { base: baseCss })),
      "dist/controls.js",
    );
    expect(diff.removed).toEqual(siteControlsSurface(controlsJs));
    expect(diff.ok).toBe(false);
  });
});
