import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

for (const file of ["dist/tokens.css", "dist/tokens.json"]) {
  it(`${file} matches the snapshot`, () => {
    if (!existsSync(file)) throw new Error(`${file} not found. Run npm run build first.`);
    expect(readFileSync(file, "utf8")).toMatchSnapshot();
  });
}
