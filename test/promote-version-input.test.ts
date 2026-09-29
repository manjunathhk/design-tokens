import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePromoteVersion } from "../scripts/promote-version.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const scriptPath = join(repoRoot, "scripts", "promote-version.ts");
const workflowPath = join(repoRoot, ".github", "workflows", "promote.yml");

const REJECTED: readonly (readonly [input: string, reason: string])[] = [
  // The exact pre-release from issue #51, plus pre-release variants.
  ["1.1.0-rc.1", "is a pre-release"],
  ["1.1.0-beta.11", "is a pre-release"],
  ["1.1.0-rc.1+build.5", "is a pre-release"],
  // Leading v, in both cases.
  ["v1.1.0", "without the v prefix"],
  ["V1.1.0", "without the v prefix"],
  // Whitespace anywhere.
  ["", "is empty"],
  [" 1.1.0", "contains whitespace"],
  ["1.1.0 ", "contains whitespace"],
  ["1.1.0\t", "contains whitespace"],
  ["1.1.0\n", "contains whitespace"],
  // Malformed values, including semver violations like leading zeros.
  ["1.2", "is not a final X.Y.Z version"],
  ["1.2.3.4", "is not a final X.Y.Z version"],
  ["1..0", "is not a final X.Y.Z version"],
  ["1.2.x", "is not a final X.Y.Z version"],
  ["01.1.0", "is not a final X.Y.Z version"],
  ["1.1.0+build.5", "is not a final X.Y.Z version"],
  // Path separators and shell metacharacters.
  ["1.1.0/", "is not a final X.Y.Z version"],
  ["1.1.0/../v1", "is not a final X.Y.Z version"],
  ["../1.1.0", "is not a final X.Y.Z version"],
  ["1.1.0; touch /tmp/pwned", "contains whitespace"],
  ["1.1.0 && touch /tmp/pwned", "contains whitespace"],
  ["$(touch /tmp/pwned)", "contains whitespace"],
  ["`touch /tmp/pwned`", "contains whitespace"],
];

describe("parsePromoteVersion", () => {
  it("accepts final X.Y.Z versions and derives the major for rollback", () => {
    expect(parsePromoteVersion("1.1.0")).toEqual({ version: "1.1.0", major: 1 });
    expect(parsePromoteVersion("0.0.1")).toEqual({ version: "0.0.1", major: 0 });
    expect(parsePromoteVersion("10.20.30")).toEqual({ version: "10.20.30", major: 10 });
  });

  it("rejects pre-releases, malformed values, path separators and shell metacharacters precisely", () => {
    for (const [input, reason] of REJECTED) {
      const label = `input ${JSON.stringify(input)}`;
      let message = "";
      try {
        parsePromoteVersion(input);
      } catch (error: unknown) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message, `${label} was not rejected`).toContain(reason);
      expect(message, `${label} is not named in the error`).toContain(JSON.stringify(input));
    }
  });
});

function runValidator(input: string | undefined) {
  const env = { ...process.env };
  delete env.VERSION_INPUT;
  if (input !== undefined) env.VERSION_INPUT = input;
  return spawnSync(process.execPath, [tsxCli, scriptPath], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("promote-version CLI", () => {
  it("emits GITHUB_OUTPUT lines for an accepted final version", () => {
    const run = runValidator("1.1.0");
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("version=1.1.0\nmajor=1\n");
  });

  it("fails 1.1.0-rc.1 with the pre-release reason and emits no output for downstream steps", () => {
    const run = runValidator("1.1.0-rc.1");
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("is a pre-release");
    expect(run.stderr).toContain(JSON.stringify("1.1.0-rc.1"));
    expect(run.stderr).toContain("never promoted");
  });

  it("fails a v-prefixed input with the prefix reason", () => {
    const run = runValidator("v1.1.0");
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("without the v prefix");
  });

  it("fails when the input is not routed through the VERSION_INPUT environment variable", () => {
    const run = runValidator(undefined);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("VERSION_INPUT");
  });
});

describe("promote.yml input handling", () => {
  const lines = readWorkflowLines();

  it("reads the dispatch input only as the validate step's environment value", () => {
    const expressions = lines.filter((line) => line.includes("${{ inputs."));
    expect(expressions).toHaveLength(1);
    expect(expressions[0]?.trim()).toBe("VERSION_INPUT: ${{ inputs.version }}");
  });

  it("interpolates no expression into an executable run script — env values only", () => {
    for (const line of lines) {
      if (!line.includes("${{")) continue;
      expect(line.trim(), `expression outside a mapping value: ${line.trim()}`).toMatch(
        /^[\w-]+:\s/,
      );
    }
  });

  it("validates the input before the storage and purge steps run", () => {
    const validateIndex = lines.findIndex((line) => line.includes("scripts/promote-version.ts"));
    const storageIndex = lines.findIndex((line) => line.includes("aws s3"));
    const purgeIndex = lines.findIndex((line) => line.includes("purge_cache"));
    expect(validateIndex).toBeGreaterThan(-1);
    expect(storageIndex).toBeGreaterThan(validateIndex);
    expect(purgeIndex).toBeGreaterThan(validateIndex);
  });
});

function readWorkflowLines(): string[] {
  return readFileSync(workflowPath, "utf8").split("\n");
}
