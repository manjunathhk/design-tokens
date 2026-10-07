import { banner } from "./css.js";
import { measureContrast, type ContrastResult } from "./contrast.js";
import { MODES, type Mode, type Token, type TokenSet } from "./tokens.js";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const tokenValue = (tokens: Token[], path: string) =>
  String(tokens.find((token) => token.path === path)?.value ?? "");

const tokenSection = (tokens: Token[], prefix: string) =>
  tokens
    .filter((token) => token.path.startsWith(prefix))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));

const declarations = (tokens: Token[], indent: string) =>
  tokens.map((token) => `${indent}--${token.name}: ${token.value};`).join("\n");

function tokenRules(set: TokenSet): string {
  return `:root {
${declarations([...set.modes.light, ...set.shared], "  ")}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${declarations(set.modes.dark, "    ")}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${declarations(set.modes.dark, "  ")}
  color-scheme: dark;
}`;
}

const modeTitle = (mode: Mode) => mode[0]?.toUpperCase() + mode.slice(1);

const swatches = (set: TokenSet, mode: Mode) =>
  tokenSection(set.modes[mode], "color.").map((token) => {
    const value = escapeHtml(String(token.value));
    return `<div class="swatch-card">
      <span class="chip" style="background:${value};"></span>
      <div class="meta"><strong>${escapeHtml(token.path)}</strong><code>${value}</code></div>
    </div>`;
  });

const contrastRows = (rows: ContrastResult[], mode: Mode) =>
  rows
    .filter((row) => row.mode === mode)
    .map(
      (row) => `<tr>
        <td>${escapeHtml(`color.${row.fg}`)}</td>
        <td><code>${escapeHtml(row.fgValue)}</code></td>
        <td>${escapeHtml(`color.${row.bg}`)}</td>
        <td><code>${escapeHtml(row.bgValue)}</code></td>
        <td class="num">${row.ratio.toFixed(2)}</td>
        <td>&ge; ${row.min}</td>
        <td>${row.ratio >= row.min ? '<span class="pass">&#10003; pass</span>' : '<span class="fail">&#10007; fail</span>'}</td>
      </tr>`,
    );

const contrastSummary = (rows: ContrastResult[], mode: Mode) => {
  const modeRows = rows.filter((row) => row.mode === mode);
  const failing = modeRows.filter((row) => row.ratio < row.min).length;
  const lowest = Math.min(...modeRows.map((row) => row.ratio));
  return failing === 0
    ? `${modeRows.length} pairs pass &middot; lowest ${lowest.toFixed(2)}`
    : `${failing} of ${modeRows.length} pairs fail`;
};

const typeRows = (set: TokenSet) =>
  tokenSection(set.shared, "font.size.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span style="font-size: ${escapeHtml(String(token.value))}; line-height: 1.2;">The quick brown fox</span></td>
    </tr>`,
  );

const spacingRows = (set: TokenSet) =>
  tokenSection(set.shared, "spacing.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span class="spacing-sample" style="width:${escapeHtml(String(token.value))};"></span></td>
    </tr>`,
  );

const radiusRows = (set: TokenSet) =>
  tokenSection(set.shared, "radius.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span class="radius-sample" style="border-radius:${escapeHtml(String(token.value))};"></span></td>
    </tr>`,
  );

const motionRows = (set: TokenSet) =>
  tokenSection(set.shared, "motion.duration.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span class="motion-sample" style="transition-duration:${escapeHtml(String(token.value))}; transition-timing-function:${escapeHtml(tokenValue(set.shared, "motion.ease"))};"></span></td>
    </tr>`,
  );

export function specimenHtml(set: TokenSet): string {
  const shadow = tokenValue(set.shared, "shadow.raised");
  const major = set.version.split(".")[0] ?? "1";
  const contrast = measureContrast(set);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@manjunathhk/design-tokens specimen</title>
  <style>
${banner(set.version)}
${tokenRules(set)}
html { scroll-padding-top: 4.5rem; scroll-behavior: smooth; font-family: var(--mk-font-family-sans); font-size: var(--mk-font-size-base); line-height: var(--mk-font-line-height-normal); }
body { margin: 0; background: var(--mk-color-bg); color: var(--mk-color-text); }
h1, h2, h3 { margin: 0; font-family: var(--mk-font-family-display); line-height: var(--mk-font-line-height-snug); letter-spacing: var(--mk-font-letter-spacing-heading); text-wrap: balance; }
h1 { font-size: var(--mk-font-size-2xl); letter-spacing: var(--mk-font-letter-spacing-display); }
h2 { font-size: var(--mk-font-size-xl); }
h3 { font-size: var(--mk-font-size-lg); }
p { margin: 0; max-width: 65ch; text-wrap: pretty; }
.lede { color: var(--mk-color-text-secondary); }
.toc { position: sticky; top: 0; z-index: var(--mk-z-index-nav); display: flex; flex-wrap: wrap; gap: var(--mk-spacing-2) var(--mk-spacing-5); align-items: center; padding: var(--mk-spacing-3) var(--mk-layout-gutter); background: var(--mk-color-bg); border-bottom: 1px solid var(--mk-color-border); font-size: var(--mk-font-size-sm); }
.toc a { color: var(--mk-color-text-secondary); text-decoration: none; }
.toc a:hover { color: var(--mk-color-accent); text-decoration: underline; }
.toc .theme { margin-left: auto; display: flex; gap: var(--mk-spacing-3); align-items: center; border: 0; padding: 0; }
.toc .theme legend { float: left; margin-right: var(--mk-spacing-3); padding: 0; color: var(--mk-color-text-muted); }
:focus-visible { outline: 2px solid var(--mk-color-focus-ring); outline-offset: 2px; }
main { display: grid; gap: var(--mk-spacing-12); max-width: 80rem; margin: 0 auto; padding: var(--mk-spacing-10) var(--mk-layout-gutter) var(--mk-spacing-24); }
section { background: var(--mk-color-surface); border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius-lg); padding: var(--mk-spacing-6); }
.stack { display: grid; gap: var(--mk-spacing-4); align-content: start; }
.grid { display: grid; gap: var(--mk-spacing-6); grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid var(--mk-color-border); text-align: left; padding: var(--mk-spacing-2) var(--mk-spacing-3); vertical-align: middle; }
thead th { font-size: var(--mk-font-size-xs); font-weight: var(--mk-font-weight-semibold); text-transform: uppercase; letter-spacing: var(--mk-font-letter-spacing-label); color: var(--mk-color-text-muted); white-space: nowrap; }
tbody th { font-family: var(--mk-font-family-mono); font-size: var(--mk-font-size-sm); font-weight: var(--mk-font-weight-medium); }
tbody tr:hover { background: var(--mk-color-accent-subtle); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.pass { color: var(--mk-color-success); font-weight: var(--mk-font-weight-semibold); white-space: nowrap; }
.fail { color: var(--mk-color-danger); font-weight: var(--mk-font-weight-semibold); white-space: nowrap; }
code, pre { font-family: var(--mk-font-family-mono); font-size: var(--mk-font-size-sm); }
pre { margin: 0; white-space: pre-wrap; padding: var(--mk-spacing-3); border-radius: var(--mk-radius-md); background: var(--mk-color-bg-subtle); }
details { border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius-md); padding: 0 var(--mk-spacing-4); }
details[open] { padding-bottom: var(--mk-spacing-4); }
summary { cursor: pointer; padding: var(--mk-spacing-3) 0; font-weight: var(--mk-font-weight-semibold); }
summary small { margin-left: var(--mk-spacing-3); font-weight: var(--mk-font-weight-regular); color: var(--mk-color-text-muted); }
.swatch-grid { display: grid; gap: var(--mk-spacing-4); grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); }
.swatch-card { border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius-lg); overflow: hidden; background: var(--mk-color-surface); }
.swatch-card .chip { display: block; height: 5.5rem; border-bottom: 1px solid var(--mk-color-border); }
.swatch-card .meta { display: grid; gap: var(--mk-spacing-1); padding: var(--mk-spacing-3); font-size: var(--mk-font-size-sm); overflow-wrap: anywhere; }
.swatch-card code { font-size: var(--mk-font-size-xs); color: var(--mk-color-text-secondary); }
.spacing-sample { display: inline-block; height: 1rem; background: var(--mk-color-accent); border-radius: var(--mk-radius-pill); }
.radius-sample { display: inline-block; width: 4rem; height: 2rem; border: 1px solid var(--mk-color-border-control); background: var(--mk-color-bg-subtle); }
.motion-sample { display: inline-block; width: 4rem; height: 1rem; border-radius: var(--mk-radius-pill); background: var(--mk-color-accent); transition-property: transform; }
.motion-sample:hover { transform: translateX(1rem); }
.preview-card { padding: var(--mk-spacing-4); border-radius: var(--mk-radius-lg); border: 1px solid var(--mk-color-border); box-shadow: var(--mk-shadow-raised); }
.preview-card.on-bg { background: var(--mk-color-bg); }
.preview-card.on-subtle { background: var(--mk-color-bg-subtle); }
.preview-grid { display: grid; gap: var(--mk-spacing-4); grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
@media (max-width: 40rem) { .toc .theme { margin-left: 0; } section { padding: var(--mk-spacing-4); } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  </style>
</head>
<body>
  <nav class="toc" aria-label="Sections">
    <strong>Token specimen</strong>
    <a href="#colour">Colour</a>
    <a href="#type">Type</a>
    <a href="#spacing">Spacing</a>
    <a href="#radius">Radius</a>
    <a href="#shadow">Shadow</a>
    <a href="#motion">Motion</a>
    <a href="#usage">Usage</a>
    <fieldset class="theme">
      <legend>Theme</legend>
      <label><input type="radio" name="theme" value="system" checked> system</label>
      <label><input type="radio" name="theme" value="light"> light</label>
      <label><input type="radio" name="theme" value="dark"> dark</label>
    </fieldset>
  </nav>
  <main>
    <header class="stack">
      <h1>Token specimen</h1>
      <p class="lede">Version <code>${set.version}</code>. Every semantic token in both modes. The theme switch is for review only.</p>
    </header>

    <section class="stack" id="colour">
      <h2>Colour swatches and contrast ratios</h2>
      <p class="lede">Swatches show the emitted value. Each mode lists every foreground and background pair the contrast contract checks.</p>
      <div class="grid">
        ${MODES.map(
          (mode) => `<article class="stack">
            <h3>${modeTitle(mode)} swatches</h3>
            <div class="swatch-grid">${swatches(set, mode).join("")}</div>
          </article>`,
        ).join("")}
      </div>
      <div class="stack">
        ${MODES.map(
          (mode) => `<details>
            <summary>${modeTitle(mode)} contrast ratios<small>${contrastSummary(contrast, mode)}</small></summary>
            <div class="table-wrap"><table>
              <thead><tr><th>FG token</th><th>FG value</th><th>BG token</th><th>BG value</th><th class="num">Ratio</th><th>Rule</th><th>Result</th></tr></thead>
              <tbody>${contrastRows(contrast, mode).join("")}</tbody>
            </table></div>
          </details>`,
        ).join("")}
      </div>
    </section>

    <section class="stack" id="type">
      <h2>Type scale</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${typeRows(set).join("")}</tbody>
      </table></div>
    </section>

    <section class="stack" id="spacing">
      <h2>Spacing</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${spacingRows(set).join("")}</tbody>
      </table></div>
    </section>

    <section class="stack" id="radius">
      <h2>Radius</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${radiusRows(set).join("")}</tbody>
      </table></div>
    </section>

    <section class="stack" id="shadow">
      <h2>Shadow review (D7)</h2>
      <p><code>shadow.raised</code> = <code>${shadow}</code></p>
      <div class="preview-grid">
        <div class="preview-card on-bg">
          <strong>Card on <code>color.bg</code></strong>
          <p>Raised depth on the page background.</p>
        </div>
        <div class="preview-card on-subtle">
          <strong>Card on <code>color.bg-subtle</code></strong>
          <p>The same token on the subtle background. Switch theme to review both modes.</p>
        </div>
      </div>
    </section>

    <section class="stack" id="motion">
      <h2>Motion</h2>
      <p><code>motion.ease</code> = <code>${tokenValue(set.shared, "motion.ease")}</code> (hover samples)</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${motionRows(set).join("")}</tbody>
      </table></div>
    </section>

    <section class="stack" id="usage">
      <h2>Consumption snippets</h2>
      <h3>CDN link</h3>
      <pre>&lt;link rel="stylesheet" href="https://design.manjunathhk.in/v${major}/index.css"&gt;</pre>
      <h3>npm CSS import</h3>
      <pre>@import "@manjunathhk/design-tokens/index.css";</pre>
      <h3>Theme override</h3>
      <pre>&lt;html data-theme="dark"&gt;&lt;/html&gt;</pre>
    </section>
  </main>

  <script>
    for (const control of document.querySelectorAll('input[name="theme"]')) {
      control.addEventListener("change", () => {
        const root = document.documentElement;
        const value = control.value;
        if (value === "system") root.removeAttribute("data-theme");
        else root.setAttribute("data-theme", value);
      });
    }
  </script>
</body>
</html>
`;
}
