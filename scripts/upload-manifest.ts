import { readdirSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const PINNED_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const ALIAS_CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".mjs": "text/javascript",
  ".txt": "text/plain",
  ".d.ts": "text/plain",
  ".scss": "text/plain",
};

export interface UploadManifestEntry {
  path: string;
  pinnedKey: string;
  aliasKey: string;
  contentType: string;
  pinnedCacheControl: string;
  aliasCacheControl: string;
}

export interface UploadManifest {
  version: string;
  major: number;
  entries: UploadManifestEntry[];
}

export function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".d.ts")) {
    const dtsType = CONTENT_TYPES[".d.ts"];
    if (!dtsType) throw new Error(`No explicit Content-Type for ${filePath}.`);
    return dtsType;
  }
  const dot = filePath.lastIndexOf(".");
  const ext = dot >= 0 ? filePath.slice(dot) : "";
  const type = CONTENT_TYPES[ext];
  if (!type) throw new Error(`No explicit Content-Type for ${filePath}.`);
  return type;
}

export function listDistFiles(distDir = "dist"): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [posix.join(...relative(distDir, fullPath).split(/\\/g))];
    });
  return walk(distDir).sort();
}

export function uploadManifest(files: readonly string[], version: string): UploadManifest {
  const major = Number.parseInt(version, 10);
  if (!Number.isInteger(major) || major < 0) {
    throw new Error(`Version must start with a major number: ${version}.`);
  }

  const entries = [...files].sort().map((path) => ({
    path,
    pinnedKey: `v${version}/${path}`,
    aliasKey: `v${major}/${path}`,
    contentType: contentTypeFor(path),
    pinnedCacheControl: PINNED_CACHE_CONTROL,
    aliasCacheControl: ALIAS_CACHE_CONTROL,
  }));

  return { version, major, entries };
}

function parseVersionArg(argv: readonly string[]): string {
  const versionArg = argv.find((arg) => arg.startsWith("--version="));
  if (versionArg) return versionArg.slice("--version=".length);
  const versionIndex = argv.indexOf("--version");
  const value = versionIndex >= 0 ? argv[versionIndex + 1] : undefined;
  if (!value) throw new Error("Usage: tsx scripts/upload-manifest.ts --version <X.Y.Z[-tag]>");
  return value;
}

async function main(): Promise<void> {
  const version = parseVersionArg(process.argv.slice(2));
  const files = listDistFiles();
  process.stdout.write(`${JSON.stringify(uploadManifest(files, version), null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
