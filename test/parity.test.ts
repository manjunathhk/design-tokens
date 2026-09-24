import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkModeParity, MODES, type Mode, type Token } from "../src/tokens.js";

/** Leaf tokens of a DTCG file, read straight from disk (no Style Dictionary). */
function leaves(node: Record<string, unknown>, path: string[] = []): Token[] {
  if ("$value" in node) {
    const path_ = path.join(".");
    return [{ path: path_, name: path_, value: String(node.$value), type: "color" }];
  }
  return Object.entries(node)
    .filter(([key]) => !key.startsWith("$"))
    .flatMap(([key, child]) => leaves(child as Record<string, unknown>, [...path, key]));
}

const readMode = (mode: Mode) =>
  leaves(JSON.parse(readFileSync(`tokens/semantic/color.${mode}.json`, "utf8")));

const token = (path: string, value: string): Token => ({ path, name: path, value, type: "color" });

describe("light/dark parity", () => {
  it("color.light.json and color.dark.json define the same tokens", () => {
    const modes = Object.fromEntries(MODES.map((m) => [m, readMode(m)])) as Record<Mode, Token[]>;
    expect(() => checkModeParity(modes)).not.toThrow();
  });

  it("names the token, the value and the file that lacks it", () => {
    const light = [token("color.bg", "#FFFFFF"), token("color.extra", "#000000")];
    const dark = [token("color.bg", "#000000")];
    expect(() => checkModeParity({ light, dark })).toThrow(
      "Token color.extra has a light value (#000000) but no dark value in tokens/semantic/color.dark.json.",
    );
    expect(() => checkModeParity({ light: dark, dark: light })).toThrow(
      "Token color.extra has a dark value (#000000) but no light value in tokens/semantic/color.light.json.",
    );
  });
});
