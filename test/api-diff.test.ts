import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { diffNames, readFromTarball, tokenNames } from "../scripts/api-diff.js";

const names = ["--mk-color-accent", "--mk-color-bg"];

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
});
