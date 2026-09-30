import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { UploadManifest } from "./upload-manifest.js";

/**
 * The Origin header the verifier sends on font requests, exactly as a browser
 * does when fetching fonts cross-origin (D26). Any origin works: the project's
 * committed CORS policy (docs/r2-cors.json) is the wildcard.
 */
export const CORS_REQUEST_ORIGIN = "https://example.com";

/**
 * The project's configured wildcard policy: Access-Control-Allow-Origin must
 * be exactly "*" so every consumer origin may load the fonts. An echo of the
 * request origin would be valid CORS for that one origin only and would mean
 * the deployed policy drifted from docs/r2-cors.json, so it fails here.
 */
export const WILDCARD_ALLOW_ORIGIN = "*";

export type VerifyCdnMode = "pinned" | "alias";

export interface VerifyCdnInput {
  manifest: UploadManifest;
  baseUrl: string;
  prefix: string;
  mode: VerifyCdnMode;
}

export function parseVerifyCdnArgs(argv: readonly string[]): {
  manifestPath: string;
  baseUrl: string;
  prefix: string;
  mode: VerifyCdnMode;
} {
  const [manifestPath, baseUrl, prefix, mode] = argv;
  if (!manifestPath || !baseUrl || !prefix || !mode) {
    throw new Error(
      "Usage: tsx scripts/verify-cdn.ts <manifest.json> <base-url> <prefix> <pinned|alias>",
    );
  }
  if (mode !== "pinned" && mode !== "alias") {
    throw new Error(`Unknown mode ${JSON.stringify(mode)}; expected "pinned" or "alias".`);
  }
  return { manifestPath, baseUrl, prefix, mode };
}

function normalizeDirective(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function verifyCdnResponses({
  manifest,
  baseUrl,
  prefix,
  mode,
}: VerifyCdnInput): Promise<void> {
  const entries = manifest.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      `Manifest for version ${JSON.stringify(manifest.version)} has no entries; nothing to verify.`,
    );
  }

  const banner = `/*! @manjunathhk/design-tokens v${manifest.version} */`;
  const problems: string[] = [];
  let fontEntries = 0;

  for (const entry of entries) {
    const url = `${baseUrl}/${prefix}/${entry.path}`;
    const isFont = entry.path.endsWith(".woff2");
    const init: RequestInit = isFont ? { headers: { Origin: CORS_REQUEST_ORIGIN } } : {};

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      problems.push(`${url}: request failed: ${reason}.`);
      continue;
    }

    if (response.status !== 200) {
      problems.push(`${url}: returned HTTP ${response.status}, expected 200.`);
      continue;
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith(entry.contentType.toLowerCase())) {
      problems.push(
        `${url}: returned Content-Type ${contentType ? `"${contentType}"` : "<missing>"}, expected "${entry.contentType}".`,
      );
    }

    if (entry.path === "index.css") {
      const body = await response.text();
      if (!body.includes(banner)) {
        problems.push(`${url}: is missing banner ${banner}.`);
      }
    }

    const expectedCacheControl =
      mode === "pinned" ? entry.pinnedCacheControl : entry.aliasCacheControl;
    const cacheControl = (response.headers.get("cache-control") ?? "").trim();
    if (!cacheControl) {
      problems.push(
        `${url}: is missing the Cache-Control header, expected "${expectedCacheControl}".`,
      );
    } else if (normalizeDirective(cacheControl) !== normalizeDirective(expectedCacheControl)) {
      problems.push(
        `${url}: returned Cache-Control "${cacheControl}", expected "${expectedCacheControl}" (${mode} policy).`,
      );
    }

    if (isFont) {
      fontEntries += 1;
      const allowOrigin = (response.headers.get("access-control-allow-origin") ?? "").trim();
      if (allowOrigin !== WILDCARD_ALLOW_ORIGIN) {
        problems.push(
          `${url}: request sent Origin ${CORS_REQUEST_ORIGIN} but returned Access-Control-Allow-Origin ${
            allowOrigin ? `"${allowOrigin}"` : "<missing>"
          }, expected "${WILDCARD_ALLOW_ORIGIN}" per docs/r2-cors.json.`,
        );
      }
    }
  }

  if (fontEntries === 0) {
    problems.push("Manifest has no .woff2 entry to verify font CORS.");
  }

  if (problems.length > 0) {
    throw new Error(
      `CDN verification failed with ${problems.length} problem(s):\n- ${problems.join("\n- ")}`,
    );
  }
}

async function main(): Promise<void> {
  const { manifestPath, baseUrl, prefix, mode } = parseVerifyCdnArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as UploadManifest;
  await verifyCdnResponses({ manifest, baseUrl, prefix, mode });
  process.stdout.write(`Verified ${manifest.entries.length} CDN URLs at ${baseUrl}/${prefix}/.\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
