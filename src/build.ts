import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { baseCss, indexCss, tokensCss, tokensScss } from "./css.js";
import { tokensDts, tokensJson, tokensMjs } from "./data.js";
import { copyFontAssets, fontOutput } from "./fonts.js";
import { specimenHtml } from "./specimen.js";
import { loadTokens } from "./tokens.js";

const set = await loadTokens();
const base = readFileSync("src/base.css", "utf8");
const fonts = fontOutput(set.version);
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
copyFontAssets("dist");
const outputs: Record<string, string> = {
  "tokens.css": tokensCss(set),
  "base.css": baseCss(set, base),
  "fonts.css": fonts.css,
  "index.css": indexCss(set, fonts.body, base),
  "tokens.json": tokensJson(set),
  "tokens.mjs": tokensMjs(set),
  "tokens.d.ts": tokensDts(set),
  "_tokens.scss": tokensScss(set),
};
for (const [file, content] of Object.entries(outputs)) writeFileSync(`dist/${file}`, content);
mkdirSync("docs", { recursive: true });
writeFileSync("docs/index.html", specimenHtml(set));
console.log(`Built @manjunathhk/design-tokens v${set.version} into dist/`);
