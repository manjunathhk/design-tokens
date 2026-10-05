import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { UploadManifest } from "../scripts/upload-manifest.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const VERSION = "1.2.3";

const FIXTURE_KEYS = [
  "v1.2.3/_tokens.scss",
  "v1.2.3/fonts/IBMPlexSans-Regular-Latin1.woff2",
  "v1.2.3/index.css",
  "v1.2.3/tokens.json",
  "v1.2.3/tokens.mjs",
];

const manifestScript = `
import { readFileSync, writeFileSync } from "node:fs";
import { uploadManifest } from "./scripts/upload-manifest.ts";

const version = process.argv[2];
const keys = JSON.parse(readFileSync(process.env.FIXTURE_KEYS, "utf8"));
const prefix = \`v\${version}/\`;
const files = keys
  .filter((key) => typeof key === "string" && key.startsWith(prefix))
  .map((key) => key.slice(prefix.length));
writeFileSync(process.env.FIXTURE_OUT, JSON.stringify(uploadManifest(files, version), null, 2));
`;

function runManifestStep(entryArgs: readonly string[]) {
  const dir = mkdtempSync(join(tmpdir(), "promote-manifest-"));
  const keysPath = join(dir, "pinned-keys.json");
  const outPath = join(dir, "upload-manifest.json");
  writeFileSync(keysPath, JSON.stringify(FIXTURE_KEYS));
  const run = spawnSync(process.execPath, [tsxCli, ...entryArgs], {
    input: manifestScript,
    cwd: repoRoot,
    env: { ...process.env, FIXTURE_KEYS: keysPath, FIXTURE_OUT: outPath },
    encoding: "utf8",
  });
  return {
    status: run.status,
    stderr: run.stderr,
    outPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe("promote workflow manifest invocation", () => {
  it("builds the manifest from the pinned-keys fixture through the stdin invocation with the - sentinel", () => {
    const run = runManifestStep(["-", VERSION]);
    try {
      expect(run.status).toBe(0);
      const manifest: UploadManifest = JSON.parse(readFileSync(run.outPath, "utf8"));
      expect(manifest.version).toBe(VERSION);
      expect(manifest.major).toBe(1);
      expect(manifest.entries.map((entry) => entry.path)).toEqual([
        "_tokens.scss",
        "fonts/IBMPlexSans-Regular-Latin1.woff2",
        "index.css",
        "tokens.json",
        "tokens.mjs",
      ]);
      for (const entry of manifest.entries) {
        expect(entry.pinnedKey).toBe(`v${VERSION}/${entry.path}`);
        expect(entry.aliasKey).toBe(`v1/${entry.path}`);
      }
      const byPath = Object.fromEntries(
        manifest.entries.map((entry) => [entry.path, entry.contentType]),
      );
      expect(byPath["index.css"]).toBe("text/css");
      expect(byPath["fonts/IBMPlexSans-Regular-Latin1.woff2"]).toBe("font/woff2");
      expect(byPath["tokens.json"]).toBe("application/json");
    } finally {
      run.cleanup();
    }
  });

  it("fails the old sentinel-less invocation with the script never executed", () => {
    const run = runManifestStep([VERSION]);
    try {
      expect(run.status).not.toBe(0);
      expect(run.stderr).toContain("ERR_MODULE_NOT_FOUND");
      expect(run.stderr).toContain(VERSION);
      expect(existsSync(run.outPath)).toBe(false);
    } finally {
      run.cleanup();
    }
  });

  it("keeps the - stdin sentinel on promote.yml's tsx manifest step", () => {
    const workflow = readFileSync(join(repoRoot, ".github", "workflows", "promote.yml"), "utf8");
    const tsxLines = workflow
      .split("\n")
      .map((line) => line.trimStart())
      .filter((line) => line.startsWith("npx tsx"));
    // The manifest heredoc is the only stdin-fed tsx script and keeps the - sentinel;
    // the version validator (scripts/promote-version.ts) is a file, not stdin, and the
    // CDN verifier runs inside the shared promote-alias action (D51).
    const manifestLines = tsxLines.filter((line) => line.startsWith("npx tsx - "));
    const fileScriptLines = tsxLines.filter((line) => !line.startsWith("npx tsx - "));
    expect(manifestLines).toHaveLength(1);
    expect(manifestLines[0]).toMatch(/^npx tsx - /);
    expect(fileScriptLines).toEqual(['npx tsx scripts/promote-version.ts >> "$GITHUB_OUTPUT"']);
  });
});
