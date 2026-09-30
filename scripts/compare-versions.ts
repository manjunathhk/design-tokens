import { pathToFileURL } from "node:url";

/**
 * Semantic version comparison for release ordering.
 *
 * Prevents an older queued release from silently superseding a newer one
 * when both target the same /vMAJOR/ alias. Used in release.yml to check
 * if the current release is newer than the last promoted version.
 *
 * Returns:
 *   1 if current > last (safe to promote)
 *   0 if current == last (already promoted, skip)
 *  -1 if current < last (older release, abort)
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): SemanticVersion {
  const parts = version.split(".");
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}. Expected X.Y.Z.`);
  }
  const parsed = parts.map((p) => {
    const num = Number.parseInt(p, 10);
    if (!Number.isInteger(num) || num < 0) {
      throw new Error(`Invalid version component: ${p}. Expected non-negative integer.`);
    }
    return num;
  });
  const [major, minor, patch] = parsed;
  if (major === undefined || minor === undefined || patch === undefined) {
    throw new Error(`Invalid version format: ${version}. Expected X.Y.Z.`);
  }
  return { major, minor, patch };
}

export function compareVersions(current: string, last: string): -1 | 0 | 1 {
  const curr = parseVersion(current);
  const prev = parseVersion(last);

  if (curr.major !== prev.major || curr.minor !== prev.minor || curr.patch !== prev.patch) {
    if (
      curr.major > prev.major ||
      (curr.major === prev.major && curr.minor > prev.minor) ||
      (curr.major === prev.major && curr.minor === prev.minor && curr.patch > prev.patch)
    ) {
      return 1;
    }
    return -1;
  }
  return 0;
}

function main(): void {
  const current = process.argv[2];
  const last = process.argv[3];

  if (!current || !last) {
    throw new Error("Usage: tsx scripts/compare-versions.ts <current> <last>");
  }

  const result = compareVersions(current, last);
  process.stdout.write(`${result}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
