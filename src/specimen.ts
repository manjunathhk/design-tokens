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

const modeTitle = (mode: Mode) => mode[0]?.toUpperCase() + mode.slice(1);

const swatches = (set: TokenSet, mode: Mode) =>
  tokenSection(set.modes[mode], "color.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span class="swatch" style="background:${escapeHtml(String(token.value))};"></span></td>
    </tr>`,
  );

const contrastRows = (rows: ContrastResult[], mode: Mode) =>
  rows
    .filter((row) => row.mode === mode)
    .map(
      (row) => `<tr>
        <td>${escapeHtml(`color.${row.fg}`)}</td>
        <td><code>${escapeHtml(row.fgValue)}</code></td>
        <td>${escapeHtml(`color.${row.bg}`)}</td>
        <td><code>${escapeHtml(row.bgValue)}</code></td>
        <td>${row.ratio.toFixed(2)}</td>
        <td>&ge; ${row.min}</td>
      </tr>`,
    );

const typeRows = (set: TokenSet) =>
  tokenSection(set.shared, "font.size.").map(
    (token) => `<tr>
      <th scope="row">${escapeHtml(token.path)}</th>
      <td><code>${escapeHtml(String(token.value))}</code></td>
      <td><span style="font-size: ${escapeHtml(String(token.value))}; line-height: 1.2;">The quick brown fox</span></td>
    </tr>`,
  );

const weightSamples = (set: TokenSet) =>
  tokenSection(set.shared, "font.weight.")
    .map(
      (token) =>
        `<span style="font-weight: ${escapeHtml(String(token.value))};">${escapeHtml(token.path.replace("font.weight.", ""))} ${escapeHtml(String(token.value))}</span> &middot; `,
    )
    .join("");

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

/**
 * `foundation` is the generated index.css (fonts, tokens, base) with font URLs
 * inlined, so the page renders exactly what consumers get. Only layout rules
 * for the specimen itself are written here, and they use var(--mk-*) only.
 */
export function specimenHtml(set: TokenSet, foundation: string): string {
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
${foundation}
body { padding: var(--mk-spacing-8); }
h1 { font-size: var(--mk-font-size-2xl); }
h2 { font-size: var(--mk-font-size-xl); }
h3 { font-size: var(--mk-font-size-lg); }
.weights, .family-sample { margin: 0; }
.mono-sample { font-family: var(--mk-font-family-mono); }
main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2rem; max-width: 80rem; margin: 0 auto; }
section { background: var(--mk-color-surface); border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius-lg); padding: 1.25rem; }
.stack { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr)); }
table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
th, td { border-bottom: 1px solid var(--mk-color-border); text-align: left; padding: 0.45rem; vertical-align: middle; }
code, pre { font-size: var(--mk-font-size-sm); }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; padding: 0.75rem; border-radius: var(--mk-radius-md); background: var(--mk-color-bg-subtle); }
.swatch { display: inline-block; width: 3rem; height: 1.5rem; border: 1px solid var(--mk-color-border); border-radius: var(--mk-radius-sm); }
.spacing-sample { display: inline-block; height: 1rem; background: var(--mk-color-accent); border-radius: var(--mk-radius-pill); }
.radius-sample { display: inline-block; width: 4rem; height: 2rem; border: 1px solid var(--mk-color-border-control); background: var(--mk-color-bg-subtle); }
.motion-sample { display: inline-block; width: 4rem; height: 1rem; border-radius: var(--mk-radius-pill); background: var(--mk-color-accent); }
.motion-sample:hover { transform: translateX(1rem); }
.preview-card { background: var(--mk-color-surface); padding: 1rem; border-radius: var(--mk-radius-lg); border: 1px solid var(--mk-color-border); box-shadow: ${shadow}; }
.preview-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr)); }
  </style>
</head>
<body>
  <main>
    <section class="stack">
      <h1>Token specimen</h1>
      <p>Version <code>${set.version}</code>. Toggle theme on this page for review only.</p>
      <fieldset>
        <legend>Theme preview</legend>
        <label><input type="radio" name="theme" value="system" checked> system</label>
        <label><input type="radio" name="theme" value="light"> light</label>
        <label><input type="radio" name="theme" value="dark"> dark</label>
      </fieldset>
    </section>

    <section class="stack">
      <h2>Colour swatches and contrast ratios</h2>
      <div class="grid">
        ${MODES.map(
          (mode) => `<article class="stack">
            <h3>${modeTitle(mode)} swatches</h3>
            <table>
              <thead><tr><th>Token</th><th>Value</th><th>Swatch</th></tr></thead>
              <tbody>${swatches(set, mode).join("")}</tbody>
            </table>
          </article>`,
        ).join("")}
      </div>
      <div class="grid">
        ${MODES.map(
          (mode) => `<article class="stack">
            <h3>${modeTitle(mode)} contrast ratios</h3>
            <table>
              <thead><tr><th>FG token</th><th>FG value</th><th>BG token</th><th>BG value</th><th>Ratio</th><th>Rule</th></tr></thead>
              <tbody>${contrastRows(contrast, mode).join("")}</tbody>
            </table>
          </article>`,
        ).join("")}
      </div>
    </section>

    <section class="stack">
      <h2>Typography</h2>
      <p class="family-sample"><code>font.family.sans</code> and <code>font.family.display</code>: Inter</p>
      <p class="weights">${weightSamples(set)}<em>Regular italic</em></p>
      <p class="mono-sample"><code>font.family.mono</code>: JetBrains Mono, 0123456789 {} [] =&gt; !== // fn()</p>
      <p>Headings on this page use <code>font.size.2xl</code>, <code>xl</code> and <code>lg</code>; resize the window to see the <code>clamp()</code> scale respond.</p>
    </section>

    <section class="stack">
      <h2>Type scale</h2>
      <table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${typeRows(set).join("")}</tbody>
      </table>
    </section>

    <section class="stack">
      <h2>Spacing</h2>
      <table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${spacingRows(set).join("")}</tbody>
      </table>
    </section>

    <section class="stack">
      <h2>Radius</h2>
      <table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${radiusRows(set).join("")}</tbody>
      </table>
    </section>

    <section class="stack">
      <h2>Shadow review (D7, D49)</h2>
      <p><code>shadow.raised</code> = <code>${shadow}</code></p>
      <div class="preview-grid">
        <div class="preview-card">
          <strong>Raised card</strong>
          <p>Uses <code>shadow.raised</code> on the active theme's surface.</p>
        </div>
        <div class="preview-card">
          <strong>Raised card, second sample</strong>
          <p>Switch the theme above to review the same shared shadow in dark mode.</p>
        </div>
      </div>
    </section>

    <section class="stack">
      <h2>Motion</h2>
      <p><code>motion.ease</code> = <code>${tokenValue(set.shared, "motion.ease")}</code> (hover samples)</p>
      <table>
        <thead><tr><th>Token</th><th>Value</th><th>Sample</th></tr></thead>
        <tbody>${motionRows(set).join("")}</tbody>
      </table>
    </section>

    <section class="stack">
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
