import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflow = readFileSync(join(repoRoot, ".github", "workflows", "release.yml"), "utf8");

/** Position of a step in release.yml, failing with the step name if it is missing. */
function stepIndex(name: string): number {
  const index = workflow.indexOf(name);
  if (index < 0) throw new Error(`release.yml has no step ${JSON.stringify(name)}.`);
  return index;
}

describe("release workflow (D50)", () => {
  it("publishes final vX.Y.Z tags only, with no pre-release path", () => {
    expect(workflow).toContain(
      '[[ ! "$VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$ ]]',
    );
    expect(workflow).not.toContain("is_rc");
    expect(workflow).not.toContain("--tag next");
  });

  it("checks the CHANGELOG section before any upload or publish", () => {
    expect(stepIndex("name: Build GitHub Release notes from CHANGELOG")).toBeLessThan(
      stepIndex("name: Upload pinned prefix to R2"),
    );
  });

  it("publishes to npm after the pinned CDN is verified and before the alias moves", () => {
    const publish = stepIndex("name: Publish to npm");
    expect(stepIndex("name: Verify pinned CDN assets")).toBeLessThan(publish);
    expect(publish).toBeLessThan(stepIndex("name: Promote to alias, purge and verify"));
    expect(workflow.match(/npm publish/g)).toHaveLength(1);
  });

  it("can be rerun: identical pinned objects and published npm versions are skipped", () => {
    expect(workflow).toContain('if [[ "$remote_etag" != "$local_md5" ]]; then');
    expect(workflow).toContain("refusing overwrite");
    expect(workflow).toContain("200) echo");
    expect(workflow).toContain("404) npm publish ;;");
  });

  it("deploys the specimen only after the release job succeeds, specimen-only (D15, D34, D51)", () => {
    expect(stepIndex("name: Create GitHub Release")).toBeLessThan(
      stepIndex("name: Stage specimen for GitHub Pages"),
    );
    expect(workflow).toContain("cp docs/index.html _site/index.html");
    expect(workflow).toContain("path: _site/");
    expect(workflow).toMatch(/\n {2}pages:\n {4}needs: release\n/);
    expect(workflow).toContain("uses: actions/deploy-pages@v5");
  });
});
