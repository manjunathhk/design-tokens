import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflow = readFileSync(join(repoRoot, ".github", "workflows", "pages.yml"), "utf8");

describe("pages workflow release gating", () => {
  it("triggers on release tags", () => {
    expect(workflow).toContain("push:");
    expect(workflow).toContain("tags:");
    expect(workflow).toContain('- "v*.*.*"');
  });

  it("waits for a successful release.yml run for the exact tag sha before building", () => {
    expect(workflow).toContain("actions: read");
    expect(workflow).toContain("name: Wait for successful release workflow for this tag");
    expect(workflow).toContain('const sha = process.env.GITHUB_SHA ?? "";');
    expect(workflow).toContain('const tag = process.env.GITHUB_REF_NAME ?? "";');
    expect(workflow).toContain("/actions/workflows/release.yml/runs");
    expect(workflow).toContain('url.searchParams.set("event", "push");');
    expect(workflow).toContain(".filter((run) => run.head_sha === sha)");
    expect(workflow).toContain('if (releaseRun.conclusion !== "success") {');
  });

  it("still stages a specimen-only Pages artifact and fails if docs/index.html is missing", () => {
    expect(workflow).toContain("mkdir _site");
    expect(workflow).toContain("cp docs/index.html _site/index.html");
    expect(workflow).toContain("path: _site/");
  });
});
