import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { baseCss, indexCss, tokensCss, tokensScss } from "./css.js";
import { tokensDts, tokensJson, tokensMjs } from "./data.js";
import { loadTokens } from "./tokens.js";

const set = await loadTokens();
const base = readFileSync("src/base.css", "utf8");
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
const outputs: Record<string, string> = {
  "tokens.css": tokensCss(set),
  "base.css": baseCss(set, base),
  "index.css": indexCss(set, base),
  "tokens.json": tokensJson(set),
  "tokens.mjs": tokensMjs(set),
  "tokens.d.ts": tokensDts(set),
  "_tokens.scss": tokensScss(set),
};
for (const [file, content] of Object.entries(outputs)) writeFileSync(`dist/${file}`, content);
console.log(`Built @manjunathhk/design-tokens v${set.version} into dist/`);
