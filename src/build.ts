import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tokensCss } from "./css.js";
import { loadTokens } from "./tokens.js";

const set = await loadTokens();
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
writeFileSync("dist/tokens.css", tokensCss(set));
console.log(`Built @manjunathhk/design-tokens v${set.version} into dist/`);
