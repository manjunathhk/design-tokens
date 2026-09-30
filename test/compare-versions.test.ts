import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compareVersions, parseVersion } from "../scripts/compare-versions.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const scriptPath = join(repoRoot, "scripts", "compare-versions.ts");

describe("parseVersion", () => {
  it("parses valid X.Y.Z versions", () => {
    expect(parseVersion("1.0.0")).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("0.0.1")).toEqual({ major: 0, minor: 0, patch: 1 });
    expect(parseVersion("10.20.30")).toEqual({ major: 10, minor: 20, patch: 30 });
  });

  it("rejects invalid formats", () => {
    expect(() => parseVersion("1.0")).toThrow("Invalid version format");
    expect(() => parseVersion("1.0.0.0")).toThrow("Invalid version format");
    expect(() => parseVersion("1.0.0-rc.1")).toThrow("Invalid version format");
    expect(() => parseVersion("v1.0.0")).toThrow();
  });

  it("rejects non-integer components", () => {
    expect(() => parseVersion("1.x.0")).toThrow("Invalid version component");
    expect(() => parseVersion("1.0.a")).toThrow("Invalid version component");
    expect(() => parseVersion("1x.0.0")).toThrow("Invalid version component");
    expect(() => parseVersion("1.0.0x")).toThrow("Invalid version component");
  });

  it("rejects negative components", () => {
    expect(() => parseVersion("-1.0.0")).toThrow("Invalid version component");
    expect(() => parseVersion("1.-1.0")).toThrow("Invalid version component");
  });
});

describe("compareVersions", () => {
  it("returns 1 when current > last", () => {
    expect(compareVersions("1.1.0", "1.0.0")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.9")).toBe(1);
  });

  it("returns -1 when current < last", () => {
    expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
    expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.0.9", "1.1.0")).toBe(-1);
  });

  it("returns 0 when current == last", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("10.20.30", "10.20.30")).toBe(0);
  });

  it("compares major version first", () => {
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
    expect(compareVersions("1.99.99", "2.0.0")).toBe(-1);
  });

  it("compares minor version when major is equal", () => {
    expect(compareVersions("1.2.0", "1.1.99")).toBe(1);
    expect(compareVersions("1.1.99", "1.2.0")).toBe(-1);
  });

  it("compares patch version when major and minor are equal", () => {
    expect(compareVersions("1.0.2", "1.0.1")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.2")).toBe(-1);
  });
});

describe("compare-versions CLI", () => {
  it("outputs 1 when current > last", () => {
    const run = spawnSync(process.execPath, [tsxCli, scriptPath, "1.1.0", "1.0.0"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("1\n");
  });

  it("outputs -1 when current < last", () => {
    const run = spawnSync(process.execPath, [tsxCli, scriptPath, "1.0.0", "1.1.0"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("-1\n");
  });

  it("outputs 0 when current == last", () => {
    const run = spawnSync(process.execPath, [tsxCli, scriptPath, "1.0.0", "1.0.0"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("0\n");
  });

  it("fails when arguments are missing", () => {
    const run = spawnSync(process.execPath, [tsxCli, scriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Usage:");
  });

  it("fails when only one argument is provided", () => {
    const run = spawnSync(process.execPath, [tsxCli, scriptPath, "1.0.0"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Usage:");
  });
});
