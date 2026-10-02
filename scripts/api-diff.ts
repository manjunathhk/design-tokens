/**
 * Fails if an emitted token name was removed or renamed since the latest
 * published version, unless package.json has a higher MAJOR version.
 *
 * For compatibility checks, the baseline is the npm `latest` dist tag. That
 * intentionally excludes `next` pre-releases (D20); same-version unchanged
 * builds are allowed to compare equal and be treated as a no-op.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const PACKAGE = "@manjunathhk/design-tokens";
const REGISTRY = "https://registry.npmjs.org";
const CSS_PATH = "dist/tokens.css";
const JSON_PATH = "dist/tokens.json";
const STYLELINT_PATH = "dist/stylelint.mjs";
const JSON_GROUPS = ["light", "dark", "shared", "breakpoints"] as const;
const KNOWN_COLOR_FUNCTIONS = [
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
] as const;

/** Custom property names declared in a stylesheet, sorted. */
export function tokenNames(css: string): string[] {
  return [...new Set([...css.matchAll(/(--[^\s:;]+)\s*:/g)].map((m) => m[1] ?? ""))].sort();
}

export function cssValueMap(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/(--[^\s:;]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1] ?? "",
      (match[2] ?? "").trim(),
    ]),
  );
}

export function jsonValueMap(json: TokensJson): Record<string, string | number> {
  return Object.fromEntries(
    JSON_GROUPS.flatMap((group) =>
      Object.entries(json[group]).map(([key, value]) => [
        `${group}.${key}`,
        value as string | number,
      ]),
    ),
  );
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

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const normalized = version.trim().replace(/^v/, "").split("-")[0].split("+")[0];
  const parts = normalized.split(".");
  if (parts.length !== 3) {
    throw new Error(
      `Invalid version format: ${version}. Expected X.Y.Z, with optional prerelease.`,
    );
  }
  const [major, minor, patch] = parts.map((part) => Number.parseInt(part, 10));
  if ([major, minor, patch].some((value) => Number.isNaN(value))) {
    throw new Error(
      `Invalid version format: ${version}. Expected X.Y.Z, with optional prerelease.`,
    );
  }
  return { major, minor, patch };
}

const major = (version: string) => parseVersion(version).major;

function bumpLevel(version: string) {
  const parsed = parseVersion(version);
  return { major: parsed.major, minor: parsed.minor, patch: parsed.patch };
}

function versionAtLeast(
  localVersion: string,
  publishedVersion: string,
  minimum: "minor" | "major",
) {
  const local = bumpLevel(localVersion);
  const published = bumpLevel(publishedVersion);
  if (local.major > published.major) return true;
  if (local.major < published.major) return false;
  if (minimum === "major") return false;
  return local.minor > published.minor;
}

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
  const ok =
    removed.length === 0
      ? added.length === 0 || versionAtLeast(local.version, published.version, "minor")
      : versionAtLeast(local.version, published.version, "major");
  return { removed, added, ok };
}

export interface ValueDiff {
  changed: string[];
  ok: boolean;
}

export function diffValues(
  published: { version: string; values: Record<string, string | number> },
  local: { version: string; values: Record<string, string | number> },
): ValueDiff {
  const names = [
    ...new Set([...Object.keys(published.values), ...Object.keys(local.values)]),
  ].sort();
  const changed = names.filter((name) => {
    if (!(name in published.values) || !(name in local.values)) return false;
    return published.values[name] !== local.values[name];
  });
  return {
    changed,
    ok: changed.length === 0 || versionAtLeast(local.version, published.version, "minor"),
  };
}

export interface StylelintRuleChange {
  rule: string;
  change: "stricter" | "looser";
  required: "MAJOR" | "MINOR";
}

export interface StylelintDiff {
  changes: StylelintRuleChange[];
  ok: boolean;
}

function parseStylelintConfig(raw: string): Record<string, unknown> {
  const match = raw.match(/export\s+default\s+({[\s\S]*})\s*;?\s*$/m);
  if (!match) {
    throw new Error("Expected dist/stylelint.mjs to export a default config object.");
  }
  const objectLiteral = match[1];
  return Function(`"use strict"; return (${objectLiteral});`)() as Record<string, unknown>;
}

function colorFunctionSet(value: unknown): Set<string> {
  const patterns = Array.isArray(value) ? value : [value];
  const matches = new Set<string>();

  for (const entry of patterns) {
    const text = typeof entry === "string" ? entry : String(entry ?? "");
    if (text === "") continue;
    const regexMatch = text.match(/^\/(.*)\/([a-z]*)$/i);
    if (!regexMatch) {
      const normalized = text.trim().toLowerCase();
      if (normalized) matches.add(normalized);
      continue;
    }
    const [, pattern, flags] = regexMatch;
    const regex = new RegExp(pattern, flags);
    for (const name of KNOWN_COLOR_FUNCTIONS) {
      if (regex.test(name)) matches.add(name);
    }
  }
  return matches;
}

function ruleStrictness(rule: string, value: unknown): number | undefined {
  if (rule === "color-no-hex") return value === true ? 1 : 0;
  if (rule === "color-named") {
    switch (value) {
      case "never":
        return 4;
      case "never-where-possible":
        return 3;
      case "always-where-possible":
        return 2;
      case "always":
        return 1;
      default:
        return undefined;
    }
  }
  if (rule === "function-disallowed-list") {
    return colorFunctionSet(value).size;
  }
  return undefined;
}

export function diffStylelintConfig(
  published: { version: string; config: string },
  local: { version: string; config: string },
): StylelintDiff {
  const publishedConfig = parseStylelintConfig(published.config) as {
    rules?: Record<string, unknown>;
  };
  const localConfig = parseStylelintConfig(local.config) as { rules?: Record<string, unknown> };
  const publishedRules = publishedConfig.rules ?? {};
  const localRules = localConfig.rules ?? {};
  const rules = new Set([...Object.keys(publishedRules), ...Object.keys(localRules)]);
  const changes: StylelintRuleChange[] = [];

  for (const rule of [...rules].sort()) {
    const prev = publishedRules[rule];
    const current = localRules[rule];
    if (prev === current) continue;

    const previousStrictness = ruleStrictness(rule, prev);
    const currentStrictness = ruleStrictness(rule, current);
    if (previousStrictness === undefined || currentStrictness === undefined) {
      continue;
    }

    if (currentStrictness > previousStrictness) {
      changes.push({ rule, change: "stricter", required: "MAJOR" });
    } else if (currentStrictness < previousStrictness) {
      changes.push({ rule, change: "looser", required: "MINOR" });
    }
  }

  const ok =
    changes.length === 0 ||
    changes.every((change) =>
      change.required === "MAJOR"
        ? versionAtLeast(local.version, published.version, "major")
        : versionAtLeast(local.version, published.version, "minor"),
    );

  return { changes, ok };
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
  const localCss = readFileSync(CSS_PATH, "utf8");
  const localNames = tokenNames(localCss);
  const localCssValues = cssValueMap(localCss);
  const localJsonRaw = readFileSync(JSON_PATH, "utf8");
  const localJson = JSON.parse(localJsonRaw) as TokensJson;
  const localJsonNames = jsonNames(localJson);
  const localJsonValues = jsonValueMap(localJson);
  const localStylelint = readFileSync(STYLELINT_PATH, "utf8");

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

  const publishedCssValues = cssValueMap(css);
  const cssDiff = diffNames(
    { version: latest, names: tokenNames(css) },
    { version: local.version, names: localNames },
  );
  const cssValueDiff = diffValues(
    { version: latest, values: publishedCssValues },
    { version: local.version, values: localCssValues },
  );
  console.log(
    `API diff (CSS) against ${PACKAGE}@${latest} (local ${local.version}): ` +
      `${cssDiff.added.length} added, ${cssDiff.removed.length} removed, ${cssValueDiff.changed.length} value changes.`,
  );
  for (const n of cssDiff.added) console.log(`  + ${n}`);
  for (const n of cssDiff.removed) console.log(`  - ${n}`);
  for (const n of cssValueDiff.changed) console.log(`  ~ ${n}`);

  const publishedJsonRaw = readFromTarball(tarball, JSON_PATH);
  let jsonDiff: Diff = { removed: [], added: [], ok: true };
  let jsonValueDiff: ValueDiff = { changed: [], ok: true };
  if (publishedJsonRaw === undefined) {
    console.log(
      `Notice: ${PACKAGE}@${latest} has no ${JSON_PATH} (published before it shipped); ` +
        `comparing CSS only.`,
    );
  } else {
    const publishedJson = JSON.parse(publishedJsonRaw) as TokensJson;
    jsonDiff = diffNames(
      { version: latest, names: jsonNames(publishedJson) },
      { version: local.version, names: localJsonNames },
    );
    jsonValueDiff = diffValues(
      { version: latest, values: jsonValueMap(publishedJson) },
      { version: local.version, values: localJsonValues },
    );
    console.log(
      `API diff (tokens.json) against ${PACKAGE}@${latest} (local ${local.version}): ` +
        `${jsonDiff.added.length} added, ${jsonDiff.removed.length} removed, ${jsonValueDiff.changed.length} value changes.`,
    );
    for (const n of jsonDiff.added) console.log(`  + ${n}`);
    for (const n of jsonDiff.removed) console.log(`  - ${n}`);
    for (const n of jsonValueDiff.changed) console.log(`  ~ ${n}`);
  }

  const publishedStylelintRaw = readFromTarball(tarball, STYLELINT_PATH);
  let stylelintDiff: StylelintDiff = { changes: [], ok: true };
  if (publishedStylelintRaw === undefined) {
    console.log(
      `Notice: ${PACKAGE}@${latest} has no ${STYLELINT_PATH} (published before stylelint export shipped); ` +
        `comparing only tokens.`,
    );
  } else {
    stylelintDiff = diffStylelintConfig(
      { version: latest, config: publishedStylelintRaw },
      { version: local.version, config: localStylelint },
    );
    console.log(
      `Stylelint diff against ${PACKAGE}@${latest} (local ${local.version}): ` +
        `${stylelintDiff.changes.length} rule changes.`,
    );
    for (const change of stylelintDiff.changes) {
      console.log(`  ${change.change} ${change.rule} (${change.required})`);
    }
  }

  const errors: string[] = [];
  if (!cssDiff.ok) {
    errors.push(
      `CSS custom properties: ${cssDiff.removed.join(", ") || "no removed names"}. ` +
        `This requires a MAJOR bump or restoration.`,
    );
  }
  if (!cssValueDiff.ok) {
    errors.push(
      `CSS values: ${cssValueDiff.changed.join(", ") || "no changed values"}. ` +
        `This requires a MINOR bump or restoration.`,
    );
  }
  if (!jsonDiff.ok) {
    errors.push(
      `tokens.json keys: ${jsonDiff.removed.join(", ") || "no removed keys"}. ` +
        `This requires a MAJOR bump or restoration.`,
    );
  }
  if (!jsonValueDiff.ok) {
    errors.push(
      `tokens.json values: ${jsonValueDiff.changed.join(", ") || "no changed values"}. ` +
        `This requires a MINOR bump or restoration.`,
    );
  }
  if (!stylelintDiff.ok) {
    const detail = stylelintDiff.changes
      .map((change) => `${change.rule} (${change.change}; ${change.required})`)
      .join(", ");
    errors.push(`Stylelint config: ${detail}. This requires the documented bump. `);
  }
  if (errors.length > 0) {
    throw new Error(`Compatibility check failed: ${errors.join(" ")}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
