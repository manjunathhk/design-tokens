/**
 * Fails if an emitted token name was removed or renamed since the latest
 * published version, unless package.json has a higher MAJOR version.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const PACKAGE = "@manjunathhk/design-tokens";
const REGISTRY = "https://registry.npmjs.org";
const CSS_PATH = "dist/tokens.css";
const JSON_PATH = "dist/tokens.json";
const JSON_GROUPS = ["light", "dark", "shared", "breakpoints"] as const;

/** Custom property names declared in a stylesheet, sorted. */
export function tokenNames(css: string): string[] {
  return [...new Set([...css.matchAll(/(--[^\s:;]+)\s*:/g)].map((m) => m[1] ?? ""))].sort();
}

export interface TokensJson {
  version: string;
  light: Record<string, unknown>;
  dark: Record<string, unknown>;
  shared: Record<string, unknown>;
  breakpoints: Record<string, unknown>;
}

/** "group.key" names for every key in every group of a tokens.json object, sorted. */
export function jsonNames(json: TokensJson): string[] {
  return JSON_GROUPS.flatMap((group) =>
    Object.keys(json[group]).map((key) => `${group}.${key}`),
  ).sort();
}

const major = (version: string) => Number(version.split(".")[0]);

export interface Diff {
  removed: string[];
  added: string[];
  ok: boolean;
}

export function diffNames(
  published: { version: string; names: string[] },
  local: { version: string; names: string[] },
): Diff {
  const localSet = new Set(local.names);
  const publishedSet = new Set(published.names);
  const removed = published.names.filter((n) => !localSet.has(n));
  const added = local.names.filter((n) => !publishedSet.has(n));
  return {
    removed,
    added,
    ok: removed.length === 0 || major(local.version) > major(published.version),
  };
}

/** Reads one file from an npm tarball (gzipped ustar). */
export function readFromTarball(tgz: Buffer, path: string): string | undefined {
  const tar = gunzipSync(tgz);
  const field = (block: Buffer, start: number, length: number) =>
    block
      .subarray(start, start + length)
      .toString("utf8")
      .replace(/\0.*$/s, "");
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const name = field(header, 0, 100);
    if (!name) break;
    const prefix = field(header, 345, 155);
    const size = parseInt(field(header, 124, 12).trim() || "0", 8);
    const fullName = prefix ? `${prefix}/${name}` : name;
    offset += 512;
    if (fullName.replace(/^[^/]+\//, "") === path) {
      return tar.subarray(offset, offset + size).toString("utf8");
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return undefined;
}

async function main(): Promise<void> {
  const local = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
  const localNames = tokenNames(readFileSync(CSS_PATH, "utf8"));
  const localJsonNames = jsonNames(JSON.parse(readFileSync(JSON_PATH, "utf8")) as TokensJson);

  const res = await fetch(`${REGISTRY}/${PACKAGE.replace("/", "%2F")}`);
  if (res.status === 404) {
    console.log(`Notice: ${PACKAGE} is not on npm yet; nothing to compare against. Passing.`);
    return;
  }
  if (!res.ok) throw new Error(`npm registry returned ${res.status} for ${PACKAGE}.`);
  const meta = (await res.json()) as {
    "dist-tags"?: { latest?: string };
    versions: Record<string, { dist: { tarball: string } }>;
  };
  const latest = meta["dist-tags"]?.latest;
  if (!latest) {
    console.log(`Notice: ${PACKAGE} has no "latest" version on npm yet. Passing.`);
    return;
  }
  const tarballUrl = meta.versions[latest]?.dist.tarball;
  if (!tarballUrl) throw new Error(`npm metadata for ${PACKAGE}@${latest} has no tarball URL.`);
  const tgz = await fetch(tarballUrl);
  if (!tgz.ok) throw new Error(`Downloading ${tarballUrl} failed with ${tgz.status}.`);
  const tarball = Buffer.from(await tgz.arrayBuffer());
  const css = readFromTarball(tarball, CSS_PATH);
  if (css === undefined) throw new Error(`${PACKAGE}@${latest} has no ${CSS_PATH}.`);

  const cssDiff = diffNames(
    { version: latest, names: tokenNames(css) },
    { version: local.version, names: localNames },
  );
  console.log(
    `API diff (CSS) against ${PACKAGE}@${latest} (local ${local.version}): ` +
      `${cssDiff.added.length} added, ${cssDiff.removed.length} removed.`,
  );
  for (const n of cssDiff.added) console.log(`  + ${n}`);
  for (const n of cssDiff.removed) console.log(`  - ${n}`);

  const publishedJsonRaw = readFromTarball(tarball, JSON_PATH);
  let jsonDiff: Diff = { removed: [], added: [], ok: true };
  if (publishedJsonRaw === undefined) {
    console.log(
      `Notice: ${PACKAGE}@${latest} has no ${JSON_PATH} (published before it shipped); ` +
        `comparing CSS only.`,
    );
  } else {
    jsonDiff = diffNames(
      { version: latest, names: jsonNames(JSON.parse(publishedJsonRaw) as TokensJson) },
      { version: local.version, names: localJsonNames },
    );
    console.log(
      `API diff (tokens.json) against ${PACKAGE}@${latest} (local ${local.version}): ` +
        `${jsonDiff.added.length} added, ${jsonDiff.removed.length} removed.`,
    );
    for (const n of jsonDiff.added) console.log(`  + ${n}`);
    for (const n of jsonDiff.removed) console.log(`  - ${n}`);
  }

  const errors: string[] = [];
  if (!cssDiff.ok) {
    errors.push(`CSS custom properties: ${cssDiff.removed.join(", ")}.`);
  }
  if (!jsonDiff.ok) {
    errors.push(`tokens.json keys: ${jsonDiff.removed.join(", ")}.`);
  }
  if (errors.length > 0) {
    throw new Error(
      `Removed or renamed since ${latest} — ${errors.join(" ")} ` +
        `This is a breaking change: bump package.json to ${major(latest) + 1}.0.0 or restore them.`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
