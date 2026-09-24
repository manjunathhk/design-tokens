import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  diffNames,
  jsonNames,
  readFromTarball,
  tokenNames,
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

  it("passes when names are only added", () => {
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

  it("passes when a tokens.json key is only added", () => {
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

  it("fails naming the group and the key when a breakpoint is removed without a MAJOR bump", () => {
    const diff = diffNames(
      { version: "1.2.0", names: jsonNames(tokensJson()) },
      { version: "1.3.0", names: jsonNames(tokensJson({})) },
    );
    expect(diff).toEqual({ removed: ["breakpoints.breakpoint.sm"], added: [], ok: false });
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
