import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALIAS_CACHE_CONTROL,
  PINNED_CACHE_CONTROL,
  contentTypeFor,
  listDistFiles,
  uploadManifest,
} from "../scripts/upload-manifest.js";

describe("upload manifest", () => {
  it("maps dist files to pinned and alias keys with explicit headers", () => {
    const files = [
      "_tokens.scss",
      "base.css",
      "fonts/IBMPlexMono-Regular-Latin1.woff2",
      "index.css",
      "LICENSES/IBM-Plex-Mono-OFL-1.1.txt",
      "tokens.css",
      "tokens.d.ts",
      "tokens.json",
      "tokens.mjs",
    ];

    const manifest = uploadManifest(files, "1.2.3-rc.1");
    expect(manifest.major).toBe(1);
    expect(manifest.entries).toHaveLength(files.length);

    for (const entry of manifest.entries) {
      expect(entry.pinnedKey).toBe(`v1.2.3-rc.1/${entry.path}`);
      expect(entry.aliasKey).toBe(`v1/${entry.path}`);
      expect(entry.pinnedCacheControl).toBe(PINNED_CACHE_CONTROL);
      expect(entry.aliasCacheControl).toBe(ALIAS_CACHE_CONTROL);
    }

    const byPath = Object.fromEntries(
      manifest.entries.map((entry) => [entry.path, entry.contentType]),
    );
    expect(byPath).toEqual({
      "_tokens.scss": "text/plain",
      "base.css": "text/css",
      "fonts/IBMPlexMono-Regular-Latin1.woff2": "font/woff2",
      "index.css": "text/css",
      "LICENSES/IBM-Plex-Mono-OFL-1.1.txt": "text/plain",
      "tokens.css": "text/css",
      "tokens.d.ts": "text/plain",
      "tokens.json": "application/json",
      "tokens.mjs": "text/javascript",
    });
  });

  it("lists dist files recursively using posix-style paths", () => {
    const dist = mkdtempSync(join(tmpdir(), "manifest-test-"));
    mkdirSync(join(dist, "fonts"), { recursive: true });
    mkdirSync(join(dist, "LICENSES"), { recursive: true });
    writeFileSync(join(dist, "index.css"), "");
    writeFileSync(join(dist, "fonts", "a.woff2"), "");
    writeFileSync(join(dist, "LICENSES", "OFL.txt"), "");

    expect(listDistFiles(dist)).toEqual(["LICENSES/OFL.txt", "fonts/a.woff2", "index.css"]);
    rmSync(dist, { recursive: true, force: true });
  });

  it("fails fast when a file extension has no explicit content type", () => {
    expect(() => contentTypeFor("fonts/IBMPlexSans-Regular-Latin1.woff")).toThrow(
      "No explicit Content-Type for fonts/IBMPlexSans-Regular-Latin1.woff.",
    );
  });
});
