# Decisions

The rules in force for this repository, grouped by area. [AGENTS.md](../AGENTS.md)
is the contract and overrides this file; this file holds the detail behind it.

Each rule keeps the number it was first recorded under (`Dn`), so references
in code and tests still resolve. Numbers that no longer appear were superseded
or only recorded one-off history; that history is in git (`git log -p --
docs/decisions.md`, and `docs/brief.md` before #84).

A PR that changes a rule edits it here, in place, in the same PR. A new rule
takes the next free number.

---

## What this is

The single source of the colour scheme and visual foundations for all of
Manjunath's websites, which run on different stacks (Angular, WordPress,
static HTML, .NET Razor) and hosts. Two delivery channels:

- **npm**, `@manjunathhk/design-tokens`, for sites with a build step.
- **CDN**, Cloudflare R2 bucket `mk-design-cdn` behind
  `https://design.manjunathhk.in`, for sites that link a stylesheet:
  `/vMAJOR/` is the alias that follows the latest release of that major;
  `/vX.Y.Z/` is pinned and never changes.
- jsDelivr serving the npm package is the documented emergency fallback only,
  never a default.

Semantic versioning is what makes "change once, reflect everywhere" safe:
consumers on `@1` or `/v1/` receive every non-breaking change and never a
breaking one.

## Tokens

- **Format and tiers.** DTCG JSON (`$value`, `$type`, `$description`) under
  `tokens/`. Colour has two tiers: `tokens/primitive/color.json` holds raw
  values and is never emitted; `tokens/semantic/*.json` references them and is
  the only tier consumers see.
- **D1. Light and dark live in separate files**, `color.light.json` and
  `color.dark.json`, with the same keys. The build fails naming the token and
  file if one mode lacks a token the other has.
- **D4. Naming.** Every emitted property is `--mk-` kebab-case. Line height and
  letter spacing sit under `font` (`--mk-font-line-height-*`,
  `--mk-font-letter-spacing-*`); spacing is `--mk-spacing-N`; z-index is
  `--mk-z-index-*`.
- **D5. Non-colour tokens have no primitive tier.** Spacing, radius, type,
  motion and similar tokens hold raw values in the semantic tier.
- **D6. Colours with alpha are derived.** `accent-subtle` and `grid-line`
  reference a primitive and carry `$extensions["in.manjunathhk"].alpha`; a
  build transform emits `rgba()`, so `accent-subtle` follows `accent`.
- **Theme selection.** `tokens.css` emits light values on `:root`, dark values
  under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
  and again on `:root[data-theme="dark"]`, each with `color-scheme`. A site
  forces a theme with `data-theme` on `<html>`; without it the OS decides.
- **Breakpoints** are emitted to JSON, JS and SCSS only, never as custom
  properties (they cannot be used in media queries).

### Values

- **D47. Colour palette.** Colours come from the owner's portfolio
  `_light.scss` / `_dark.scss`. In light mode `text`, `text-secondary`,
  `text-muted`, `accent`, `border-control`, `focus-ring`, `success` and
  `warning` are all `#56453F`, approved by the owner because the portfolio's
  own values fail the contrast contract; the flat hierarchy is by design until
  a distinct approved value exists. `color.accent` is the accessible
  link/action role in both modes. The token files are the record of every
  current value.
- **D2. `border-control` and `border-strong` are different roles.**
  `border-control` outlines controls and must meet 3:1; `border-strong` is a
  decorative rule with no contrast requirement.
- **D7. One `shadow.raised` for both modes.** A dark variant, if ever needed,
  is a MINOR addition; renaming or splitting the key is not allowed.
- **D48. Fonts.** Inter (400/500/600/700, 400 italic) for `sans` and
  `display`, JetBrains Mono (400/500/700, 400 italic) for `mono`. Binaries come
  from the exactly pinned `@fontsource/inter` and `@fontsource/jetbrains-mono`
  devDependencies: Latin subset, woff2, `font-display: swap`, OFL texts in
  `dist/LICENSES/`. Add a weight only together with a token that uses it.
- **D49. Non-colour values** (spacing, layout, radius, breakpoints, motion,
  shadow, z-index) are unchanged from 1.0.0. Changing one needs the exact
  portfolio declaration from the owner, and is MINOR.

### Contrast contract

`src/contrast.ts`, in both modes, printed as a table in CI:

- 4.5:1 for `text`, `text-secondary`, `text-muted`, `accent`, `danger`,
  `success` and `warning` against `bg`, `bg-subtle` and `surface`;
- 4.5:1 for `on-accent` against `accent`;
- 3:1 for `border-control` and `focus-ring` against `bg`, `bg-subtle` and
  `surface`.

## Outputs

Every CSS and JSON output starts with a version banner
(`/*! @manjunathhk/design-tokens vX.Y.Z */`; JSON has a `version` field), so
CDN verification can prove which version a URL serves.

- **D8. `index.css` is concatenated**, not an `@import` chain: fonts, tokens
  and base in one request. `fonts.css`, `tokens.css` and `base.css` also ship
  separately. Font `url()` paths are relative to the CSS file, so the same
  files work from any CDN version folder, npm and jsDelivr.
- **D22. JSON and JS shape.** `tokens.json` is
  `{ version, light, dark, shared, breakpoints }`, each group flat and keyed by
  dotted path (`"color.accent"`). `tokens.mjs` exports the same five constants
  (ESM only); `tokens.d.ts` types values as `string` or `number`, never
  literals, so a value change never changes a type. The package root resolves
  to `tokens.mjs` (with `types`) and to `index.css` under `style`; every file
  has its own subpath export. Changing this shape is MAJOR.
- **D23, D38. `base.css` has zero specificity.** Every selector except
  `::selection` and `.mk-grid-bg` is wrapped in `:where()`. Pseudo-elements
  cannot sit inside `:where()`, so resets target them as
  `:where(*)::before, :where(*)::after`. Any site rule wins without
  `!important`. stylelint bans colour literals in `src/base.css`;
  `transparent` is allowed.
- **D36. Shareable stylelint config** at `@manjunathhk/design-tokens/stylelint`
  bans `color-no-hex`, named colours and every colour function
  (`/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)$/i`), including
  `color-mix()` with token arguments: derived colours belong in tokens.
  `transparent`, `currentcolor` and system colours stay allowed. A stricter
  rule is MAJOR, a looser one MINOR. `stylelint >=16` is an optional peer
  dependency.
- **D11. Licence.** The package's own code is MIT; the fonts are SIL OFL 1.1.

## Build and tooling

- **D21. Style Dictionary 5**, run with `log.verbosity: "verbose"` so a failing
  transform still names the token, file and value, and `warnings: "error"` so
  any warning fails the build.
- **D13. TypeScript stays on 6.0** until typescript-eslint supports 7.
- **D37. Windows is a supported contributor environment.** `.gitattributes`
  forces LF; the npm pack test runs npm through a shell on Windows;
  `ci-windows` and `playwright-windows` run beside `ci` and `playwright`.
- **Node 24 LTS** (`.nvmrc`).

## Tests

All run in CI on every PR (Linux and Windows) and again in `release.yml`.

- **Naming:** every emitted property matches `^--mk-[a-z0-9]+(-[a-z0-9]+)*$`;
  no primitive name and no breakpoint leaks into CSS. Primitive names are read
  from `tokens/primitive/color.json`, not hard-coded.
- **Parity:** light and dark define the same tokens (D1).
- **Snapshot** of `dist/tokens.css` and `tokens.json`, banner included, so the
  Release PR updates it with the version.
- **D24. Output checks** (exports map, banners, SCSS compile, `npm pack
--dry-run`) live in `npm test`.
- **D20, D45. API diff** (`npm run api-diff`) is its own CI step because it
  needs the npm registry; its logic is unit-tested in `npm test`. It compares
  the build against npm `latest`: a removed or renamed CSS name or JSON key
  needs a MAJOR bump; an added token or changed value needs at least MINOR; a
  stricter stylelint config is MAJOR, a looser one MINOR. Doc and build-only
  changes are not checked.
- **D26. Cross-origin Playwright smoke test.** Local servers serve the fixture
  page and `dist/` on different ports, with and without
  `Access-Control-Allow-Origin: *`, so the test proves computed colours in
  light, dark and both `data-theme` overrides, that every font face loads
  cross-origin with CORS, and that it fails without it.
- **D27. Specimen.** `docs/index.html` is generated by the build (swatches,
  contrast ratios, type scale, spacing, radius, motion, snippets), never
  committed; CI uploads it as a PR artifact for review.

## Release and CDN

- **D14. GitHub Flow.** `main` is the only long-lived branch; work is on
  short-lived branches merged by PR. A fix for an older major, after a new one
  ships, goes on a `vN.x` branch cut from the last `vN` tag, only when needed.
- **D50. One tag per release, no release candidates.** A Release PR bumps
  `package.json` and adds the `## [X.Y.Z]` CHANGELOG section; a human pushes
  `vX.Y.Z` on the merged commit. `release.yml`:
  1. rejects anything but a final `vX.Y.Z` tag that matches `package.json`,
     sits on `main` and has a CHANGELOG section, before any side effect;
  2. runs the full gate;
  3. uploads the pinned prefix and verifies it;
  4. publishes to npm;
  5. promotes to the alias, purges and verifies it;
  6. creates the GitHub Release;
  7. deploys the specimen.

  A failed run is rerun on the same tag. A pinned key that already holds
  identical content (ETag equals local MD5) is skipped and a differing one
  fails before anything is written; a version already on npm is skipped. A new
  version is needed only when the fix changes `dist/`. `promote.yml` still
  rejects pre-release input because the old rc prefixes remain in R2.

- **Pinned is immutable.** Nothing overwrites or deletes `/vX.Y.Z/`; only the
  alias `/vMAJOR/` is rewritten, by `release.yml` or `promote.yml`. Pinned
  objects carry `public, max-age=31536000, immutable`; alias objects
  `public, max-age=300, s-maxage=3600`. Every upload sets an explicit
  Content-Type.
- **D51. One way to write the alias.** `.github/actions/promote-alias` copies
  pinned to alias, purges those URLs on Cloudflare and verifies them; both
  `release.yml` and `promote.yml` use it, and neither carries its own copy.
- **D42. Alias writes are serialized** by the shared concurrency group
  `alias-update` in both workflows, with `cancel-in-progress: false`.
- **D43. One tested CDN verifier.** `scripts/verify-cdn.ts` checks, for every
  manifest entry: status, Content-Type, version banner, the pinned or alias
  Cache-Control, and for every font `Access-Control-Allow-Origin: *`,
  requested with an `Origin` header the way a browser does. `*` matches
  `docs/r2-cors.json`; change both together.
- **D41. `promote.yml` input** reaches the workflow only as an env value and is
  validated by `scripts/promote-version.ts` (final `X.Y.Z` only) before any
  storage or purge step.
- **D32, D40. Heredoc scripts with arguments use the `-` stdin sentinel**
  (`node --input-type=module - "$ARG" <<'NODE'`, `npx tsx - "$ARG" <<'TSX'`).
  Without it, Node and tsx treat the first argument as the script path, and
  the heredoc never runs.
- **D10. npm trusted publishing (OIDC).** No npm token exists; provenance is
  automatic. Setup is in `docs/cdn.md`.
- **D15, D34. Specimen on GitHub Pages** is deployed by the `pages` job in
  `release.yml`, which `needs` the release job, so only a fully successful
  release publishes it. Only `docs/index.html` is served, never the rest of
  `docs/`.
- **D30. `/release` automation boundary.** An agent may check the requested
  bump against the diff and propose a correction, draft the Release PR, run
  read-only verification, and dispatch `promote.yml` (which uses its own
  secrets). Pushing the tag, running `npm publish` directly and handling R2 or
  Cloudflare credentials stay human. A tag pushed with a workflow's
  `GITHUB_TOKEN` would not trigger `release.yml` anyway.
- **D18. No release-bot automation.** Versions and CHANGELOG entries are
  written in the Release PR. release-please was rejected: its bot creates
  tags, infers bumps from commit types instead of the emitted-token contract,
  and publishes before the CDN is verified.

## Working on the repo

- **D16. One GitHub issue per unit of work.** The issue body stands alone
  (scope, acceptance criteria); its PR closes it.
- **D19. Agent procedure lives in `docs/workflow/`.**
  `implement-issue.md` and `release.md` are tool-agnostic; the Claude Code
  skills in `.claude/skills/` are thin wrappers around them. They guide
  contributors and are never shipped. Claude Code is the only agent tooling
  maintained (D51).
- **D51. Simplified in #84.** Copilot instructions, the `.agents/` skill, the
  original brief, the IBM telemetry setting, the unused
  `compare-versions.ts` and the separate `pages.yml` are gone. This file
  became a statement of the rules in force rather than an append-only log.
