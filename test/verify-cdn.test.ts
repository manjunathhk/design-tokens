import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALIAS_CACHE_CONTROL,
  PINNED_CACHE_CONTROL,
  uploadManifest,
  type UploadManifest,
} from "../scripts/upload-manifest.js";
import {
  CORS_REQUEST_ORIGIN,
  verifyCdnResponses,
  type VerifyCdnMode,
} from "../scripts/verify-cdn.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const VERSION = "1.2.3";
const PREFIX = `v${VERSION}`;

// Two fonts on purpose: the old inline verifier checked only the first .woff2
// it saw, which is one of the gaps this suite exists to lock out.
const FILES = [
  "LICENSES/IBM-Plex-Mono-OFL-1.1.txt",
  "_tokens.scss",
  "controls.js",
  "fonts/IBMPlexSans-Bold-Latin1.woff2",
  "fonts/IBMPlexSans-Regular-Latin1.woff2",
  "index.css",
  "tokens.json",
  "tokens.mjs",
];

const FONT_PATHS = FILES.filter((file) => file.endsWith(".woff2"));
const FIRST_FONT_PATH = FONT_PATHS[0];
const SECOND_FONT_PATH = FONT_PATHS[1];

type FixtureResponse = {
  status?: number;
  // A null value removes the header from the response entirely, as opposed to
  // serving it empty.
  headers?: Record<string, string | null>;
  body?: string;
};
type Fixture = Record<string, FixtureResponse>;

function fixtureFor(manifest: UploadManifest, mode: VerifyCdnMode, prefix = PREFIX): Fixture {
  const cacheControl = mode === "pinned" ? PINNED_CACHE_CONTROL : ALIAS_CACHE_CONTROL;
  const fixture: Fixture = {};
  for (const entry of manifest.entries) {
    const headers: Record<string, string> = {
      "content-type": entry.contentType,
      "cache-control": cacheControl,
    };
    if (entry.path.endsWith(".woff2")) {
      headers["access-control-allow-origin"] = "*";
    }
    const banner = `/*! @manjunathhk/design-tokens v${manifest.version} */\n`;
    fixture[`${prefix}/${entry.path}`] = {
      status: 200,
      headers,
      body:
        entry.path === "index.css"
          ? `${banner}:root{}\n`
          : entry.path === "controls.js"
            ? `${banner}(() => {})();\n`
            : "fixture bytes",
    };
  }
  return fixture;
}

function withOverrides(base: Fixture, overrides: Fixture): Fixture {
  const merged: Fixture = { ...base };
  for (const [path, override] of Object.entries(overrides)) {
    const current: FixtureResponse = merged[path] ?? {};
    merged[path] = {
      ...current,
      ...override,
      headers: { ...current.headers, ...override.headers },
    };
  }
  return merged;
}

async function withServer(
  fixture: Fixture,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const match = fixture[(request.url ?? "/").replace(/^\//, "")];
    if (!match) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(match.headers ?? {})) {
      if (value !== null) headers[key] = value;
    }
    response.writeHead(match.status ?? 200, headers);
    response.end(match.body ?? "");
  });
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Fixture server did not report a port.");
    }
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    // fetch() keeps the socket alive after the response, which would hold
    // server.close() open forever; drop the connections explicitly.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("verifyCdnResponses against local HTTP fixtures", () => {
  const manifest = buildManifest();

  it("proves a correct pinned response set passes", async () => {
    await withServer(fixtureFor(manifest, "pinned"), async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).resolves.toBeUndefined();
    });
  });

  it("proves a correct alias response set passes", async () => {
    await withServer(fixtureFor(manifest, "alias", "v1"), async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: "v1", mode: "alias" }),
      ).resolves.toBeUndefined();
    });
  });

  it("fails when a font returns the wrong Access-Control-Allow-Origin", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/${FIRST_FONT_PATH}`]: {
        headers: { "access-control-allow-origin": "https://evil.example" },
      },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${FIRST_FONT_PATH}.*request sent Origin ${CORS_REQUEST_ORIGIN}.*Access-Control-Allow-Origin.*"https://evil.example".*expected "\\*"`,
          "s",
        ),
      );
    });
  });

  it("fails when a font response is missing Access-Control-Allow-Origin", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/${FIRST_FONT_PATH}`]: { headers: { "access-control-allow-origin": null } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(/Access-Control-Allow-Origin <missing>, expected "\*"/s);
    });
  });

  it("checks every font entry, not just the first", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      // The first font alphabetically is correct; only the second is wrong.
      [`${PREFIX}/${SECOND_FONT_PATH}`]: {
        headers: { "access-control-allow-origin": "https://evil.example" },
      },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(new RegExp(`${SECOND_FONT_PATH}.*Access-Control-Allow-Origin`, "s"));
    });
  });

  it("fails when a response carries the wrong Cache-Control for the pinned policy", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/index.css`]: { headers: { "cache-control": ALIAS_CACHE_CONTROL } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${PREFIX}/index\\.css.*Cache-Control "${ALIAS_CACHE_CONTROL}", expected "${PINNED_CACHE_CONTROL}" \\(pinned policy\\)`,
          "s",
        ),
      );
    });
  });

  it("fails when a response carries the wrong Cache-Control for the alias policy", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "alias", "v1"), {
      [`v1/tokens.json`]: { headers: { "cache-control": PINNED_CACHE_CONTROL } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: "v1", mode: "alias" }),
      ).rejects.toThrow(
        new RegExp(
          `v1/tokens\\.json.*Cache-Control "${PINNED_CACHE_CONTROL}", expected "${ALIAS_CACHE_CONTROL}" \\(alias policy\\)`,
          "s",
        ),
      );
    });
  });

  it("fails when Cache-Control is missing", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/tokens.json`]: { headers: { "cache-control": null } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(`${PREFIX}/tokens\\.json.*missing the Cache-Control header`, "s"),
      );
    });
  });

  it("fails when the version banner is missing from index.css", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/index.css`]: { body: ":root{}\n" },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${PREFIX}/index\\.css.*is missing banner.*@manjunathhk/design-tokens v1\\.2\\.3`,
          "s",
        ),
      );
    });
  });

  it("fails when controls.js is missing the version banner", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/controls.js`]: { body: "(() => {})();\n" },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${PREFIX}/controls\\.js.*is missing banner.*@manjunathhk/design-tokens v1\\.2\\.3`,
          "s",
        ),
      );
    });
  });

  it("fails when controls.js carries another version's banner", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "alias", "v1"), {
      [`v1/controls.js`]: { body: "/*! @manjunathhk/design-tokens v1.2.2 */\n(() => {})();\n" },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: "v1", mode: "alias" }),
      ).rejects.toThrow(new RegExp(`v1/controls\\.js.*is missing banner.*v1\\.2\\.3`, "s"));
    });
  });

  it("fails when controls.js is not served as JavaScript", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/controls.js`]: { headers: { "content-type": "application/octet-stream" } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${PREFIX}/controls\\.js.*Content-Type "application/octet-stream", expected "text/javascript"`,
          "s",
        ),
      );
    });
  });

  it("fails when Content-Type is wrong", async () => {
    const fixture = withOverrides(fixtureFor(manifest, "pinned"), {
      [`${PREFIX}/tokens.json`]: { headers: { "content-type": "application/octet-stream" } },
    });
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(
          `${PREFIX}/tokens\\.json.*Content-Type "application/octet-stream", expected "application/json"`,
          "s",
        ),
      );
    });
  });

  it("fails when an asset is missing (404)", async () => {
    const fixture: Fixture = Object.fromEntries(
      Object.entries(fixtureFor(manifest, "pinned")).filter(
        ([path]) => path !== `${PREFIX}/tokens.json`,
      ),
    );
    await withServer(fixture, async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(
        new RegExp(`${PREFIX}/tokens\\.json.*returned HTTP 404, expected 200`, "s"),
      );
    });
  });

  it("fails when the manifest has no font entry to verify CORS with", async () => {
    const fontless = uploadManifest(["index.css", "tokens.json"], VERSION);
    await withServer(fixtureFor(fontless, "pinned"), async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest: fontless, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(/Manifest has no \.woff2 entry to verify font CORS/);
    });
  });

  it("fails when the manifest has no entries", async () => {
    const empty: UploadManifest = { ...buildManifest(), entries: [] };
    await withServer(fixtureFor(manifest, "pinned"), async (baseUrl) => {
      await expect(
        verifyCdnResponses({ manifest: empty, baseUrl, prefix: PREFIX, mode: "pinned" }),
      ).rejects.toThrow(/has no entries; nothing to verify/);
    });
  });
});

describe("verify-cdn CLI as the workflows invoke it", () => {
  it("runs the release.yml/promote.yml invocation shape and propagates failure", async () => {
    const manifest = buildManifest();
    const dir = mkdtempSync(join(tmpdir(), "verify-cdn-"));
    try {
      const manifestPath = join(dir, "upload-manifest.json");
      writeFileSync(manifestPath, JSON.stringify(manifest));

      await withServer(fixtureFor(manifest, "alias", "v1"), async (baseUrl) => {
        const good = await runVerifier([manifestPath, baseUrl, "v1", "alias"]);
        expect(good.status).toBe(0);
        expect(good.stderr).toBe("");
        expect(good.stdout).toMatch(new RegExp(`Verified ${manifest.entries.length} CDN URLs at `));
      });

      const wrongOrigin = withOverrides(fixtureFor(manifest, "alias", "v1"), {
        [`v1/${FIRST_FONT_PATH}`]: {
          headers: { "access-control-allow-origin": "https://evil.example" },
        },
      });
      await withServer(wrongOrigin, async (baseUrl) => {
        const bad = await runVerifier([manifestPath, baseUrl, "v1", "alias"]);
        expect(bad.status).not.toBe(0);
        expect(bad.stderr).toContain("CDN verification failed");
        expect(bad.stderr).toContain(`v1/${FIRST_FONT_PATH}`);
        expect(bad.stderr).toContain('"https://evil.example"');
      });

      const unknownMode = await runVerifier([manifestPath, "http://127.0.0.1:1", "v1", "staging"]);
      expect(unknownMode.status).not.toBe(0);
      expect(unknownMode.stderr).toContain('Unknown mode "staging"; expected "pinned" or "alias".');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});

/**
 * Spawns the verifier the way the workflows do (tsx CLI + arguments) and
 * resolves with its exit status and output. Asynchronous on purpose: a
 * blocking spawnSync would freeze this process's event loop and deadlock the
 * fixture server that the child fetches from.
 */
function runVerifier(
  args: readonly string[],
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, "scripts/verify-cdn.ts", ...args], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ status: code, stdout, stderr }));
  });
}

describe("workflow verification steps invoke the shared verifier", () => {
  const releaseWorkflow = readFileSync(
    join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  const promoteWorkflow = readFileSync(
    join(repoRoot, ".github", "workflows", "promote.yml"),
    "utf8",
  );
  const promoteAction = readFileSync(
    join(repoRoot, ".github", "actions", "promote-alias", "action.yml"),
    "utf8",
  );

  it("points release.yml's pinned verification at the verifier with the pinned policy", () => {
    expect(stepRun(releaseWorkflow, "Verify pinned CDN assets")).toBe(
      'npx tsx scripts/verify-cdn.ts /tmp/upload-manifest.json "${CDN_BASE_URL}" "v${{ steps.meta.outputs.version }}" pinned',
    );
  });

  it("points the shared promote-alias action's verification at the verifier with the alias policy", () => {
    expect(stepRun(promoteAction, "Verify alias CDN assets")).toContain(
      'npx tsx scripts/verify-cdn.ts "$MANIFEST" "$CDN_BASE_URL" "v$MAJOR" alias',
    );
  });

  it("routes both workflows' alias update through the shared action (D51)", () => {
    for (const [name, workflow] of [
      ["release.yml", releaseWorkflow],
      ["promote.yml", promoteWorkflow],
    ] as const) {
      expect(workflow, name).toContain("uses: ./.github/actions/promote-alias");
      expect(workflow, name).not.toContain("purge_cache");
      expect(workflow, name).not.toContain("aliasKey");
    }
  });

  it("leaves no inline verifier behind", () => {
    for (const [name, file] of [
      ["release.yml", releaseWorkflow],
      ["promote.yml", promoteWorkflow],
      ["promote-alias/action.yml", promoteAction],
    ] as const) {
      expect(file, name).not.toContain("checkedFontCors");
    }
  });
});

function buildManifest(): UploadManifest {
  return uploadManifest(FILES, VERSION);
}

function stepRun(workflow: string, stepName: string): string {
  const lines = workflow.split("\n");
  const stepIndex = lines.findIndex((line) => line.trim() === `- name: ${stepName}`);
  if (stepIndex < 0) throw new Error(`Step not found: ${stepName}`);
  const runIndex = lines.findIndex((line, index) => index > stepIndex && line.trim() === "run: |");
  if (runIndex < 0) throw new Error(`Step ${stepName} has no block-style run script.`);
  const indent = " ".repeat((lines[runIndex] ?? "").search(/\S/) + 2);
  const script: string[] = [];
  for (let index = runIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "" || !line.startsWith(indent)) break;
    script.push(line.slice(indent.length));
  }
  return script.join("\n").trim();
}
