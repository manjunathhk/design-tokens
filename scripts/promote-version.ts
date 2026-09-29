import { pathToFileURL } from "node:url";

/**
 * Validation for the `version` input of .github/workflows/promote.yml, which
 * re-promotes an already-published pinned prefix to the /vMAJOR/ alias.
 *
 * Only final X.Y.Z versions are accepted: pre-releases are never promoted to
 * the alias (D9), and the input builds object paths and a concurrency group,
 * so it may contain nothing but the semver core digits. Rejections name the
 * failing value and the reason.
 */
const FINAL_VERSION_PATTERN = /^(?<major>0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const PRERELEASE_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-/;

export interface PromoteVersion {
  version: string;
  major: number;
}

export function parsePromoteVersion(input: string): PromoteVersion {
  const described = JSON.stringify(input);
  if (input === "") {
    throw new Error(
      `Version input ${described} is empty; give a final X.Y.Z version (example: 1.3.0).`,
    );
  }
  if (/\s/.test(input)) {
    throw new Error(
      `Version input ${described} contains whitespace; give a final X.Y.Z version (example: 1.3.0).`,
    );
  }
  if (/^v/i.test(input)) {
    throw new Error(
      `Version input ${described} starts with v; give the version without the v prefix ` +
        "(example: 1.3.0) — the workflow adds v itself when building the pinned prefix.",
    );
  }
  if (PRERELEASE_PATTERN.test(input)) {
    throw new Error(
      `Version input ${described} is a pre-release; only final X.Y.Z versions are promoted to the ` +
        "/vMAJOR/ alias (D9). Pre-releases publish to npm's next dist-tag and are never promoted.",
    );
  }
  const match = FINAL_VERSION_PATTERN.exec(input);
  if (!match) {
    throw new Error(
      `Version input ${described} is not a final X.Y.Z version (example: 1.3.0); only digits ` +
        "separated by dots are accepted — no suffix, path separator or shell metacharacter.",
    );
  }
  return { version: input, major: Number.parseInt(match.groups?.major ?? "", 10) };
}

function main(): void {
  const input = process.env.VERSION_INPUT;
  if (input === undefined) {
    throw new Error(
      "VERSION_INPUT is not set; promote.yml must pass the workflow_dispatch input as the " +
        "VERSION_INPUT environment variable, never as a shell argument.",
    );
  }
  const { version, major } = parsePromoteVersion(input);
  process.stdout.write(`version=${version}\nmajor=${major}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
