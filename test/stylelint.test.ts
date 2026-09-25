import { readdirSync, readFileSync } from "node:fs";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

type StylelintConfig = {
  rules: Record<string, unknown>;
};

const fixtureFiles = (kind: "pass" | "fail") =>
  readdirSync(`test/fixtures/stylelint/${kind}`)
    .filter((name) => name.endsWith(".css"))
    .map((name) => `test/fixtures/stylelint/${kind}/${name}`);

const lintFixture = async (file: string, config: StylelintConfig) =>
  stylelint.lint({
    code: readFileSync(file, "utf8"),
    codeFilename: file,
    config,
  });

describe("stylelint shareable config", () => {
  it("resolves @manjunathhk/design-tokens/stylelint", async () => {
    const mod = (await import("@manjunathhk/design-tokens/stylelint")) as {
      default: StylelintConfig;
    };
    expect(mod.default.rules["color-no-hex"]).toBe(true);
  });

  it("passes all allowed fixtures", async () => {
    const mod = (await import("@manjunathhk/design-tokens/stylelint")) as {
      default: StylelintConfig;
    };
    for (const file of fixtureFiles("pass")) {
      const result = await lintFixture(file, mod.default);
      expect(result.errored, file).toBe(false);
    }
  });

  it("fails all disallowed fixtures", async () => {
    const mod = (await import("@manjunathhk/design-tokens/stylelint")) as {
      default: StylelintConfig;
    };
    for (const file of fixtureFiles("fail")) {
      const result = await lintFixture(file, mod.default);
      expect(result.errored, file).toBe(true);
    }
  });
});
