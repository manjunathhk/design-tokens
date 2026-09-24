import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const CSS_FILE = "dist/tokens.css";

it(`${CSS_FILE} matches the snapshot`, () => {
  if (!existsSync(CSS_FILE)) throw new Error(`${CSS_FILE} not found. Run npm run build first.`);
  expect(readFileSync(CSS_FILE, "utf8")).toMatchSnapshot();
});
