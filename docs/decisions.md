# Decisions

Decisions taken after [brief.md](brief.md) was written. Where the brief and
this file disagree, this file wins. [AGENTS.md](../AGENTS.md) overrides both.

Every session reads this file before starting. A PR that makes a new
decision adds it here in the same PR. Never rewrite an entry: supersede it
with a new one and mark the old one "Superseded by D-n".

Format: what was decided, why, and where it applies.

---

## D1. Light and dark live in separate files

2026-09-24. `tokens/semantic/color.light.json` and `color.dark.json`, same
keys in both. Style Dictionary runs once per mode, so no custom mode
transform is needed; the build fails naming the token and file if one mode
lacks a token the other has; palette diffs stay one file per mode.

## D2. `color.border-control` added; `border-strong` stays decorative

2026-09-24. The brief's `border-strong` (#BFBAAF / #334052) measures 1.70 and
1.76 against bg, below the brief's own 3:1 rule. It keeps those values as a
decorative rule (WCAG 1.4.11 does not require 3:1 for decoration). The new
`color.border-control` (#87816F light, #5E6D83 dark, at least 3.09:1 on bg,
bg-subtle and surface) is for control outlines. The 3:1 contrast test
targets `border-control` and `focus-ring` against all three backgrounds.

## D3. Success and warning values approved

2026-09-24. Success #1F6B45 light / #86C99A dark; warning #8C5300 light /
#F0B860 dark. Lowest ratio against bg, bg-subtle and surface: 5.14, 8.46,
4.98, 9.16. Approved in PR #2.

## D4. Token naming

2026-09-24. Approved in PR #2. Line height and letter spacing sit under
`font` (`--mk-font-line-height-*`, `--mk-font-letter-spacing-*`); spacing is
`--mk-spacing-N`; z-index is `--mk-z-index-*`. These are public API from
1.0.0.

## D5. Non-colour tokens have no primitive tier

2026-09-24. Spacing, radius, type, motion and similar tokens hold raw values
in the semantic tier. The brief asks for colour primitives only; a second
layer for 4px steps adds nothing.

## D6. Colours with alpha are derived, not duplicated

2026-09-24. `accent-subtle` and `grid-line` reference a primitive and carry
`$extensions["in.manjunathhk"].alpha`; a build transform emits `rgba()`.
`accent-subtle` therefore follows `accent` automatically.

## D7. Shadow: one value for both modes, revisit on the specimen page

2026-09-24. `shadow.raised` is shared. Whether dark mode needs its own value
is judged visually on the specimen page. Adding a dark variant later is
MINOR.

## D8. `index.css` is concatenated, not `@import`

2026-09-24. Supersedes brief section 5 on index.css. It contains fonts,
tokens and base in one file: one request instead of an `@import` chain of
four, and a smaller window for mixed versions during an alias update. Font
`url()` paths stay valid because index.css sits next to fonts.css.
fonts.css, tokens.css and base.css still ship as separate files.

## D9. Release candidates go to npm under the `next` dist-tag

2026-09-24. Supersedes brief section 8 step 7 for pre-releases. rc tags are
published to npm with `--tag next` so the npm and provenance leg is proven
before 1.0.0. They are still never promoted to the CDN alias.

## D10. npm trusted publishing (OIDC) instead of `NPM_TOKEN`

2026-09-24. Supersedes the `NPM_TOKEN` secret in brief section 8. The
release workflow authenticates to npm with GitHub OIDC; there is no
long-lived npm token. Provenance is automatic. Requires this repository to
be public and the package's trusted publisher configured on npmjs.com (a
human step, documented in docs/cdn.md or the README).

## D11. Licence: MIT

2026-09-24. The package's own code is MIT. IBM Plex fonts stay under the
SIL OFL 1.1, shipped in `dist/LICENSES/`.

## D12. Style Dictionary pinned to 4.4

Superseded by D21.

2026-09-24. The brief specifies v4. `npm audit` reports GHSA-vj5c-m527-mpff
(prototype pollution in `convertTokenData`, `>=4.3.0 <5.4.4`, no 4.x fix).
Accepted: it runs only at build time over committed token files, we do not
call that function, and nothing untrusted is parsed. Revisit when moving to
v5.

## D13. TypeScript pinned to 6.0

2026-09-24. TypeScript 7 is current, but typescript-eslint 8 supports only
`<6.1`. Move when typescript-eslint supports 7.

## D14. GitHub Flow, releases are tags on `main`

2026-09-24. `main` is the only long-lived branch. Work happens on
short-lived branches (Claude sessions use `claude/*`), merged by PR into
`main`; squash merges are fine. A release is a human-pushed tag on a `main`
commit: `vX.Y.Z-rc.N` first, then `vX.Y.Z`. The version bump and CHANGELOG
entry land in a "Release X.Y.Z" PR before tagging. A fix for an older major
after a new one ships goes on a `vN.x` branch cut from the last `vN` tag,
created only when needed. GitFlow was considered and rejected: one
maintainer, tag-gated releases and immutable pinned CDN versions leave
nothing for `develop` and `release/*` to protect, and its back-merges break
under squash merges.

## D15. Specimen page deploys on release tags

2026-09-24. pages.yml publishes the specimen on final release tags only, so
the public page always matches a released version. Every PR uploads the
built specimen as a CI artifact for previewing an unreleased change.

## D16. One GitHub issue per unit of work, one conversation per issue

2026-09-24. Each issue body stands alone (scope, acceptance criteria,
references to the brief and to these decisions). Its PR closes it. The
1.0.0 work is tracked in #3 to #11.

## D17. Release automation (release-please or similar): open

Superseded by D18.

2026-09-24. Under discussion. Until decided, versions are bumped by hand in
the release PR and a human pushes the tag. Tracked in #12.

## D18. No release automation for 1.0.0; Changesets preferred later

2026-09-24. Supersedes D17. Versions and CHANGELOG entries are bumped by
hand in a "Release X.Y.Z" PR and a human pushes the tag. release-please was
rejected: the bot creates the tag (against AGENTS.md), tags made with
`GITHUB_TOKEN` do not trigger release.yml, it publishes the GitHub Release
before the CDN is verified, rc-to-final needs config edits, and inferring
bumps from commit types does not enforce "value change = MINOR". If
automation is wanted after 1.0.0, evaluate Changesets: each PR declares its
bump explicitly, CI can enforce it, and a human still pushes the tag.

## D19. Agent workflow files are in scope as contributor tooling

2026-09-24. `docs/workflow/implement-issue.md` holds the tool-agnostic
procedure for implementing an issue. AGENTS.md points every agent at it, and
`.claude/skills/implement/SKILL.md` is a thin Claude Code wrapper that makes
it `/implement <n>`. These guide contributors; they are not shipped and do
not widen the package's scope. Keep the procedure in the workflow file only,
so it never drifts between tools.

## D20. Contract test details

2026-09-24. Issue #4. The API diff runs as its own CI step
(`npm run api-diff`), not inside `npm test`, because it needs the npm
registry; its comparison logic is unit-tested in `npm test`. It compares
against the `latest` dist-tag, so `next` pre-releases (D9) are never the
baseline. The naming test derives primitive names from
`tokens/primitive/color.json` rather than a hard-coded list. The
`dist/tokens.css` snapshot includes the version banner, so the release PR
updates it along with the version.

## D21. Style Dictionary 5

2026-09-24. Supersedes D12 and brief section 3's "Style Dictionary v4".
Issue #20. `style-dictionary` is `^5.5.5`, which fixes GHSA-vj5c-m527-mpff
(fixed in 5.4.4); `npm audit` is clean. The v4 API we use is unchanged in
v5 and `dist/tokens.css` is byte-identical. One behaviour change needed
handling: v5 catches errors thrown by transforms and, unless
`log.verbosity` is `"verbose"`, replaces them with a generic count. The
build now runs verbose so a failing D6 alpha transform still names the
token, its file (and so its mode) and the bad value. `warnings: "error"`
still makes any warning fatal, so verbose adds no output to a clean build.

## D22. Shape of the JS and JSON outputs

2026-09-24. Issue #5. `tokens.json` is
`{ version, light, dark, shared, breakpoints }`, each group flat and keyed
by dotted token path (`"color.accent"`, `"breakpoint.md"`). Breakpoints get
their own `breakpoints` key rather than sitting in `shared`, so `shared`
plus one mode is exactly what `tokens.css` emits. `tokens.mjs` exports the
same five constants; `tokens.d.ts` types values as `string` or `number`,
not literals, so a value change (MINOR) never changes a type. The package
root (`.`) resolves to `tokens.mjs` with a `types` condition and to
`index.css` under the `style` condition; every file also has its own
subpath export. The JS output is ESM only (Node 24 can `require()` it);
its types resolve under `moduleResolution` `node16`, `nodenext` or
`bundler`, not legacy `node10`. Flat keys were chosen over nested objects
because they map 1:1 to the CSS names; changing the shape after 1.0.0 is
MAJOR. The API diff guards only CSS names today; covering the JSON keys,
breakpoints included, is #24.

## D23. base.css selectors use `:where()`

2026-09-24. Issue #5. Every base.css selector except `::selection` (a
pseudo-element cannot sit in `:where()`) and `.mk-grid-bg` is wrapped in
`:where()`, so the base has zero specificity and any site rule wins without
`!important`. stylelint bans hex, named colours and colour functions in
`src/base.css`; the `transparent` keyword is allowed, for the grid's
gradient stops.

## D24. Output checks live in `npm test`

2026-09-24. Issue #5. The exports, banner, SCSS and `npm pack --dry-run`
checks run in Vitest (`test/outputs.test.ts`), so CI runs them in its test
step and a contributor runs them locally with `npm test`. `sass` is a dev
dependency only to compile `_tokens.scss` in that test.

## D25. IBM Telemetry disabled in CI

2026-09-24. Issue #6. The `@ibm/plex-sans`, `@ibm/plex-sans-condensed` and
`@ibm/plex-mono` devDependencies each run
`postinstall: ibmtelemetry --config=telemetry.yml`. By its own docs this
activates specifically in CI/container environments and reports anonymised
usage data to an IBM endpoint. `ci.yml` sets `IBM_TELEMETRY_DISABLED: "true"`
at the job level so `npm ci` never makes that call; these packages ship no
runtime code either way, so nothing else about the build changes. Anyone
installing inside a local container should export the same variable.

## D26. Cross-origin Playwright smoke test

2026-09-24. Issue #7. Two `node:http` servers start inside `test.beforeAll`:
port 7341 serves the fixture page (`test/e2e/fixture/index.html`), port 7342
serves `dist/` with `Access-Control-Allow-Origin: *` (mirroring R2's CORS
policy), and port 7343 serves `dist/` without CORS headers (used only in the
negative check). `<link rel="stylesheet">` carries no `crossorigin` attribute
because CSS is fetched as no-cors and applied regardless; CORS headers are
required only for fonts, which browsers always fetch in CORS mode when the
font origin differs from the page origin. `document.fonts.load()` is used
instead of DOM injection to force all three IBM Plex families to load, because
the browser otherwise lazy-loads only families used by visible text. The
negative CORS check uses `Promise.allSettled` so an unexpected rejection does
not hang the test. The Playwright job in CI runs separately from the vitest
job; it uses `npm run test:e2e` (`playwright test`) and installs the Chromium
browser with `--with-deps`.

## D27. Specimen generation and shadow review

2026-09-24. Issue #8. `docs/index.html` is generated at build time from the
token set and never committed; CI uploads that HTML as a PR artifact for
review, and `pages.yml` deploys it only for final release tags (`vX.Y.Z`,
never rc). The specimen includes a minimal `data-theme` toggle for review only
(not shipped runtime JS). Visual review of `shadow.raised` in dark mode keeps
the shared value from D7 for now; if a dark variant is needed later, that stays
a MINOR token addition.

## D28. Release procedure consolidated in docs/workflow/release.md

2026-09-25. The release checklist was scattered across cdn.md's flow summary,
decisions.md (D9, D14, D15, D18) and the release.yml/promote.yml mechanics.
`docs/workflow/release.md` consolidates it into one step-by-step procedure,
mirroring `implement-issue.md`'s format (D19); AGENTS.md points to it.
Written while first provisioning the R2 bucket by hand, which also surfaced
that Cloudflare's dashboard had moved since docs/cdn.md was written: bucket
public access is two separate toggles (Bucket Access vs Custom Domains) not
one, CORS is a form not a raw JSON paste, and Cache Rules moved from Rules to
Caching in the sidebar with Edge/Browser TTL now left unset rather than
explicitly set to respect the origin. docs/cdn.md §1-3 updated to match.

## D29. Release PR flow is two PRs, not one: refines D14

2026-09-25. `release.yml` requires the pushed tag (minus its `v`) to
exactly equal `package.json`'s `version` string. One PR can't cover both
tags: the rc tag needs `package.json` at `X.Y.Z-rc.N`, the final tag needs
it at plain `X.Y.Z`. In practice that is two PRs — a "Release X.Y.Z" PR
that bumps to the rc version and writes the CHANGELOG entry, then, once
the rc is validated, a small "Finalize X.Y.Z" PR that drops the `-rc.N`
suffix before the final tag. D14's "the version bump and CHANGELOG entry
land in a Release X.Y.Z PR" undersold this; it still holds for the rc PR,
just not as the whole story. Surfaced by a Copilot review comment on PR
#32; `docs/workflow/release.md` documents the corrected two-PR flow.

## D30. `/release` automation boundary: refines D18

2026-09-25. `/release` (`.claude/skills/release/SKILL.md`,
`docs/workflow/release.md`) automates the release procedure up to, but
never across, the boundary AGENTS.md already draws:

- Given a target version, it checks the requested bump against the diff
  since the last tag using AGENTS.md's rules (MAJOR: removed/renamed
  emitted token; MINOR: added token or changed value; PATCH: build/doc
  fix) before using it. On a mismatch it stops, says why, and proposes the
  version the diff calls for, rather than silently overriding the human or
  silently proceeding with a bump it believes is wrong. With no prior tag
  (this repo's first release, currently `0.0.0`) there is nothing to diff,
  so it skips this check and takes the given version as-is rather than
  guessing at `1.0.0` vs. a `0.x` pre-release; it also writes the
  CHANGELOG's first entry as a plain "Initial release" heading instead of
  drafting one from every PR ever merged. This mirrors `api-diff.ts`'s own
  pre-publish behavior (D20): it already no-ops when the package isn't on
  npm yet or has no `latest` dist-tag.
- It drafts the Release PR (rc bump, CHANGELOG section drafted from PRs
  merged since the last tag, snapshot refresh) and the Finalize PR (D29's
  two-PR flow). Both are reviewed and merged like any other PR — nothing
  lands unattended.
- It runs rc and final validation (pull npm `next`/`latest`, hit
  pinned/alias CDN URLs, check banner/content-type/font-CORS) as read-only
  checks that touch no credential.
- It can dispatch `promote.yml`'s `workflow_dispatch` for rollback: the
  workflow authenticates with its own repository secrets exactly as it
  does when a human clicks the button in the Actions UI, so this doesn't
  put an R2 or Cloudflare credential in an agent's hands.

Unchanged from AGENTS.md and D18, and not reopened by this decision:
pushing the rc or final tag, running `npm publish` directly, and any
direct handling of an R2 or Cloudflare credential. Tag-pushing specifically
can't move to an agent even if it were allowed to: a tag created with an
agent's default `GITHUB_TOKEN` does not trigger `release.yml` — GitHub
suppresses a workflow run triggered by another workflow's default token —
so moving it would need a PAT or app-token workaround that reintroduces the
exact credential-handling problem AGENTS.md avoids. D18's other objections
to release-please don't apply here either: the GitHub Release is still
created after CDN verification (ordering is unchanged from the human
procedure), and the bump is checked against the emitted-token contract in
AGENTS.md, never inferred from commit history.

## D31. R2's `list-objects-v2` omits `KeyCount` on an empty prefix

2026-09-25. `release.yml`'s pinned-prefix guard queried
`--query 'KeyCount' --output text` and refused to upload even against a
genuinely empty `v1.0.0-rc.1/` prefix (confirmed empty in the R2
dashboard: 0 B, no objects). Real AWS S3 always returns `KeyCount`, even
`0`, but Cloudflare R2's S3-compatible API omits the field entirely when
no objects match; the AWS CLI's JMESPath query then resolves to null,
which `--output text` prints as the literal string `None`, and
`"None" != "0"` wrongly trips the guard on every fresh prefix. Fixed by
querying ``length(Contents || `[]`)`` instead, which is null-safe by
construction and needs no assumption about which fields R2 chooses to
include. `promote.yml`'s existing-objects check already used this shape
(`Contents[].Key` parsed and `Array.isArray`-checked in Node) and did not
have the bug.

## D32. `node --input-type=module <<'NODE' args...` silently never ran the script

2026-09-25. Four steps across `release.yml` and `promote.yml` (pinned and
alias CDN verification, the GitHub Release notes builder) fed a script via
a heredoc on stdin while also passing shell arguments after the heredoc
delimiter: `node --input-type=module <<'NODE' "$ARG1" ...`. Node's CLI
treats the first non-flag positional argument as the entry-point script
path to load, not as `process.argv` for a script read from stdin, whether
or not a heredoc is also attached to stdin. For the two CDN-verification
steps, that first argument was always `/tmp/upload-manifest.json`, a real
file, so Node silently `require()`'d it as an inert JSON module and exited
0 — the HTTP status/content-type/banner/font-CORS checks never ran, in any
release so far, and every run still reported success. For the release-notes
step the lone argument was the bare version string (e.g. `1.0.0`), which
resolves to no real file, so that one failed loudly instead of silently.
Discovered when `v1.0.0`'s tag run failed at "Build GitHub Release notes";
the CDN-verification steps had been passing vacuously since the very first
release.yml run. Fixed by using Node's documented `-` stdin sentinel
(`node --input-type=module - "$ARG1" ... <<'NODE'`), which explicitly reads
the entry point from stdin and correctly populates `process.argv` from the
trailing arguments. The two heredocs with no trailing arguments (the
Cloudflare purge calls) were never affected. `release.yml`'s own CDN
verification for this fix must be trusted going forward only once a run
with this fix has actually shown the check executing (a thrown assertion
on a deliberately wrong banner/URL would prove it, not just a green step).

## D33. First-ever npm publish needs a one-time manual bootstrap

2026-09-25. D10's OIDC trusted-publishing setup (`docs/cdn.md` §5)
assumes the package already exists on npm: Trusted Publishers is
configured on a package's own Settings page, which npm does not create
until that package has published at least once. For the `v1.0.0-rc.1`
and `v1.0.0-rc.2` tags this meant `release.yml`'s `npm publish` step 404'd
(`PUT .../@manjunathhk%2Fdesign-tokens` not found) even though
`id-token: write` and the workflow were both correct — there was simply
nothing yet to attach trust to. npm's "Staged Packages" page looked like
a plausible bootstrap path and is not; it is an unrelated manual-approval
feature for packages that already exist.

Resolved with a one-time manual publish from a human's own machine using
a scoped, 2FA-protected Granular Access Token (deleted immediately after)
and `--no-provenance` (provenance generation needs a recognized CI OIDC
provider; a local machine has none). `v1.0.0-rc.2`'s R2/CDN upload had
already succeeded before the npm failure, so this published that exact
same version rather than burning a `v1.0.0-rc.3` — see `docs/cdn.md` §5a for the
full runbook, now folded into `docs/workflow/release.md` step 1 and 3 as
a documented, expected first-release speed bump rather than a surprise.
Once the package exists, Trusted Publishers configures normally and every
later release (rc or final) publishes via OIDC with no further manual
step. Also observed and not a bug: npm sets `dist-tags.latest` to a
package's first-ever published version regardless of `--tag`, since a
package must always have a `latest` tag; self-corrects on the next
normal (non-`next`) publish. And: the public `registry.npmjs.org` read
API can lag several minutes behind npm's own website immediately after a
brand-new package's first publish — a `404` there in that window is
propagation lag, not a failed publish (confirm on the website first).

## D34. Pages publishes the specimen only

2026-09-25. Issue #42. `pages.yml` uploaded all of `docs/` as the Pages
artifact, which also served the brief, these decisions, the CDN runbook,
`r2-cors.json` and the workflow docs from `manjunathhk.github.io`. The
workflow now copies the generated `docs/index.html` into a `_site/`
staging directory and uploads only that. A plain `cp` fails the job if the
specimen wasn't built, so a broken build can never publish an empty site.
Moving the specimen output out of `docs/` was considered and rejected: the
build, the specimen test, the CI artifact and `.gitignore` all name
`docs/index.html`, and the brief places it there.

## D35. npm install-scripts warnings stay unconfigured for now

2026-09-25. Issue #19. The `actions/setup-node@v7` move was already done in
commit `f79524f`; this PR records its outcome: `ci`/`playwright` logs no
longer emit DEP0040 (`punycode`) or DEP0169 (`url.parse`), and `.nvmrc`
resolution plus npm cache hits still work. On this PR, rows 3 and 4 from the
issue are already resolved by D21 (`style-dictionary` `^5.5.5`): `npm ci`
shows `found 0 vulnerabilities` and no `glob@10.5.0` deprecation warning.

Owner choice for row 5 is option (a): leave `allowScripts` unset. Today npm 11
only warns, so adding configuration has no effect yet. The warning list has
also changed since the issue text: the current five packages are
`@ibm/plex-{mono,sans,sans-condensed}`, `@parcel/watcher`, and `esbuild`
(not style-dictionary/glob). The three IBM Plex packages run
`ibmtelemetry` postinstalls, but CI already disables that telemetry via
`IBM_TELEMETRY_DISABLED: "true"` (D25); if npm later enforces `allowScripts`,
that enforcement would also block those telemetry hooks, which is desirable.
`npm ci --ignore-scripts && npm run build && npm test` passes on this PR, so
enforcement would not break the build or test path.

## D36. Shareable stylelint export contract

2026-09-25. Issue #11. Owner decision. `@manjunathhk/design-tokens/stylelint`
is in scope as the brief §10 optional deliverable. It is a lint-time config,
not runtime JavaScript, and does not widen repository scope beyond that issue.

The exported rules are:

- `color-no-hex`;
- `color-named: "never"`;
- `function-disallowed-list` with one case-insensitive regex entry that bans
  all colour functions:
  `/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)$/i`.

`transparent`, `currentcolor` and system colours remain allowed. `color-mix()`
stays banned even when arguments are token-based, aligning with D6: derived
colours belong in tokens. Starting strict is deliberate: loosening later is
MINOR, but shipping permissive and tightening later would be MAJOR.

Versioning for this config is public API from its first release: stricter
changes (new banned values or rules) are MAJOR; looser changes are MINOR.

## D37. Windows is a supported contributor environment

2026-09-29. Issue #54. Owner decision. Windows is supported alongside Linux CI.

- `.gitattributes` sets `* text=auto eol=lf`, so working trees are LF on every OS
  without changing a contributor's global Git configuration; Prettier's default
  `endOfLine: lf` then matches.
- `.abacusai/` (local agent metadata) is in `.gitignore` and `.prettierignore`;
  it is never published because `package.json` `files` lists only `dist`.
- The npm pack test runs npm through a shell on Windows, where `npm` is a
  `.cmd` shim.
- CI adds `ci-windows` and `playwright-windows` jobs as separate jobs, so the
  required check names `ci` and `playwright` are unchanged. Adding the new jobs
  to branch protection is a human action.

## D38. Pseudo-element reset and reduced-motion selectors in base.css: refines D23

2026-09-29. Issue #49. Selectors Level 4 forgiving parsing drops
pseudo-elements inside `:where(...)` (`:where(*, *::before, *::after)`),
leaving pseudo-elements unmatched. Universal reset and reduced-motion rules
target pseudo-elements via `:where(*), :where(*)::before, :where(*)::after`.
This gives pseudo-elements the lowest possible specificity in CSS (0, 0, 1),
allowing any consumer element, class, or id selector to override them without
`!important`, preserving the override intent of D23.

## D39. `.agents/skills/implement/SKILL.md` extends D19 to non-Claude agents

2026-09-29. Owner decision. D19's `.claude/skills/implement/SKILL.md` gives
Claude Code a real slash command with a parsed `<n>` argument; other coding
agents match skills by matching a natural-language `description` against the
request, with no argument-parsing mechanism.
`.agents/skills/implement/SKILL.md` is a thin wrapper for those agents: its
`description` lists the trigger phrasing (including "/implement issue #<n>",
which such an agent reads as plain text, not a parsed command) and its body
tells the agent to find the issue number in the request text itself, then
follow `docs/workflow/implement-issue.md`. The procedure stays in that one
file only, unchanged from D19.

## D40. tsx heredocs need the same `-` stdin sentinel as node

2026-09-29. Issue #50. D32 fixed the `node --input-type=module` heredoc
invocations but missed `promote.yml`'s manifest step, which feeds a script to
`npx tsx` the same way: `npx tsx <<'TSX' "$VERSION"`. tsx resolves the first
positional argument as the entry-point file, so every promotion attempt fails
loudly at that step with `ERR_MODULE_NOT_FOUND` for a file named after the
version (for example `1.1.0`), and the stdin script never runs. Fixed with
the same stdin sentinel D32 used: `npx tsx - "$VERSION" <<'TSX'`, which reads
the entry point from stdin and puts the version in `process.argv[2]`.
`test/promote-manifest-invocation.test.ts` is the credential-free regression
check: it runs both invocation shapes against a local pinned-keys fixture —
the fixed shape must write a manifest whose content is asserted (version in
pinned keys and the major alias, not merely exit 0) and the old shape must
fail with `ERR_MODULE_NOT_FOUND` and no manifest — and it guards the
workflow line itself, so reverting the sentinel fails CI.

## D41. promote.yml takes final X.Y.Z versions only, passed as environment values

2026-09-29. Issue #51. `promote.yml`'s validate step interpolated
`inputs.version` straight into shell source and its regex accepted
pre-releases, so a `1.1.0-rc.1` dispatch could have promoted a
pre-release pinned prefix to the `/v1/` alias, against D9 and the README
release policy. Both fixed, with rollback to an earlier final version
preserved and no new release modes:

- The dispatch input reaches the workflow only as an env value
  (`VERSION_INPUT: ${{ inputs.version }}`) and is validated by
  `scripts/promote-version.ts` before any path is built or any storage or
  purge step runs. It must be semver's final `X.Y.Z` core (no leading
  zeros, no build metadata): a leading `v`, pre-releases, whitespace, path
  separators and shell metacharacters are rejected with the failing value
  named in the error.
- Downstream steps read the validated `version`/`major` step outputs via
  env vars too, so no `${{ }}` expression is interpolated into any run
  script. `test/promote-version-input.test.ts` guards that shape (every
  expression in promote.yml must sit in a mapping value) plus the accepted
  and rejected inputs, all credential-free.
- `concurrency.group` dropped the input (`promote` instead of
  `promote-${{ inputs.version }}`): promotions rewrite the same `/vMAJOR/`
  alias, so they serialize, and the raw input now appears on exactly one
  line, the guard-tested env value.

## D42. Serialize alias updates across release and promote workflows

2026-09-30. Issue #52. Both `release.yml` and `promote.yml` write to the
`/vMAJOR/` alias, but their concurrency groups did not serialize: `release.yml`
used per-tag concurrency (`release-${{ github.ref_name }}`), and `promote.yml`
used a single global group (`promote`). This allowed different releases or a
release and rollback to write the alias concurrently, risking interleaved
writes and purge/verification races.

Fixed by using a shared global concurrency group `alias-update` in both
workflows. The issue allowed "a coarser shared lock" if justified; a single
global lock is simpler and safer than per-major groups (which would require
string manipulation in GitHub Actions expressions, unsupported by actionlint).

Both workflows use `cancel-in-progress: false` to prevent cancellation
mid-copy. The concurrency group is evaluated at the workflow level before any
steps run.

Queue and cancellation semantics: GitHub Actions with `cancel-in-progress:
false` keeps at most one pending run per concurrency group. When a new run is
queued, any previously pending run is cancelled, but in-progress runs are
allowed to complete. This means:

- If release A is in-progress and release B is queued, then release C is
  queued, release B is cancelled and release C waits for A to finish.
- The concurrency group prevents concurrent writes to the alias, which was the
  risk.
- Releases are human-initiated and ordered by intent (a human pushes tags in
  the order they want them released).
- Explicit rollbacks via `promote.yml` are always possible and take precedence
  (a human can dispatch a rollback to an earlier version at any time).

A credential-free test (`test/compare-versions.test.ts`) covers version
comparison logic for future ordering checks if needed. The workflow
expressions are guarded by the existing `promote-version-input.test.ts` test,
which verifies that all `${{ inputs.version }}` expressions sit in mapping
values (env), never in executable scripts.

## D43. CDN verification is one shared tested verifier covering CORS origin and Cache-Control

2026-09-30. Issue #55. The pinned/alias verification blocks in `release.yml`
and the alias verification in `promote.yml` were inline heredocs that (a)
accepted any nonempty `Access-Control-Allow-Origin` on fonts, so a wrong or
drifted origin passed CI while browsers would reject the font load, (b) only
checked the first `.woff2` entry and silently skipped the rest, (c) never
checked the served `Cache-Control` at all, even though the upload sets a
strict pinned-versus-alias contract, and (d) existed in three near-identical
copies � the exact shape that let D32's vacuous verification happen once
already. The served contract is now verified by one script,
`scripts/verify-cdn.ts`, invoked by all three steps with the upload manifest
itself (built by `scripts/upload-manifest.ts`) as the source of expected
values:

- Every entry is fetched over HTTP with the manifest's pinned or alias
  Cache-Control expectation selected by the invocation's mode argument.
  Wrong or missing directives fail with the URL and both header values.
- Every `.woff2` entry is fetched the way a browser fetches a font (D26):
  with an `Origin` request header, and the response
  `Access-Control-Allow-Origin` must be exactly `*` � the project's
  configured wildcard policy committed as `docs/r2-cors.json`. An echo of
  the request origin would be valid CORS for that one origin only and means
  the deployed policy drifted from the committed one, so it fails. Changing
  the CORS policy means changing `docs/r2-cors.json` and this check
  together. A manifest with no `.woff2` entry still fails loudly.
- The status, Content-Type and version-banner checks from the old blocks
  are preserved (banner comes from the manifest's `version` field, so the
  verifier takes no version argument).

The verifier is proven by `test/verify-cdn.test.ts` against local
`node:http` fixture servers, credential-free: success for correct pinned
and alias responses, and failure for wrong origin, missing CORS header, a
second font with a bad header while the first is fine (the old
first-font-only gap), wrong and missing Cache-Control for both policies,
missing banner, wrong MIME type, missing asset, and an empty or fontless
manifest. One test runs the exact CLI shape the workflows invoke
(`npx tsx scripts/verify-cdn.ts <manifest> <base-url> <prefix> <mode>`)
against those fixtures and asserts failure propagates to a non-zero exit;
further tests assert each of the three workflow steps invokes the verifier
and that no inline verifier copy remains. The child is spawned
asynchronously: a blocking `spawnSync` in the test freezes the event loop
the fixture server needs to answer the child's fetch, deadlocking it.

## D44. Pages waits for successful final release completion before specimen deploy: refines D15/D27

2026-10-02. Issue #56. `pages.yml` previously deployed on any final-looking tag
push without depending on `release.yml`. That allowed a specimen publish even if
the matching release later failed (for example during CDN or npm publish),
violating D15/D27's intent that the public specimen represent a released
version.

The workflow stays tag-triggered (`v*.*.*`) and keeps the existing rc skip
(`if: !contains(github.ref_name, '-')`), so the environment tag-rule setup from
#43 remains applicable. Before any specimen build/deploy step, `pages.yml` now
polls the Actions API for the `release.yml` run with the same tag SHA and
requires `conclusion == success`; otherwise it fails and publishes nothing.

Rerun/competition behavior is explicit:

- Rerunning `release.yml` does not auto-trigger Pages; rerun `pages.yml` on that
  tag if you need specimen republish.
- Each pages run checks release success for only its own tag SHA, so one final
  tag cannot publish specimen content for another tag.

## D45. API diff enforces token value and stylelint config bump policy

2026-10-02. Issue #53. The release-policy validation is not just a naming
check: it must also enforce the documented contract that value changes and
new token additions are MINOR, while removals/renames remain MAJOR and the
exported `@manjunathhk/design-tokens/stylelint` rules follow D36.

The compatibility guard compares the local build against the npm `latest` tag,
not a pre-release dist-tag, and treats same-version unchanged builds as a
no-op. Prerelease-to-final and final-to-final comparisons are deliberate and
accepted as equivalent when no actual API diff exists; a true change still
requires the documented bump relative to the published baseline.

Token comparisons cover both CSS custom-property names and their emitted
values, and each JSON token path plus its value. For Stylelint, the exported
config is treated as a narrow public contract: stricter rules (new bans or
higher restriction) are MAJOR; looser rules are MINOR. This is checked by
reading the generated `dist/stylelint.mjs` file directly, so it stays
credential-free and testable without npm registry access.

Docs or build-only changes are intentionally excluded from these bump checks;
only token/API or lint-config deltas can fail them. The regression tests live
in `test/api-diff.test.ts` and cover additions, value changes, removals,
prerelease handling, and the stricter/looser stylelint rule cases.

## D46. Portfolio standard light/dark is the shared source-of-truth for all sites

2026-10-02. Issue #57/#58. Owner decision: the existing portfolio design is the
authorized shared foundation for every site and app in this package. The
portfolio is not redesigned to match a separate "Paper & Denim" concept, and the
IBM Plex / Paper & Denim palette research is superseded for this package's
public default. The brief's historical choices remain in the record as input,
but they are not the source of truth once this direction is selected.

This documentation issue records the implementation contract only. It does not
change the generated dist files or ship any new token values. The exact live-site
capture still needs a networked owner check: this sandbox could not resolve
`manjunathhk.in` (`socket.gaierror: [Errno -5] No address associated with
hostname`), so any final live-asset capture must be confirmed from a machine with
DNS access. The values below are the approved mapping from the issue statement and
owner-approved direction only; they are not a new invented palette and they are
not implemented in this PR.

### Superseded decisions and font policy

This decision does not supersede D11's package licence statement. D11 remains in
force for the repository's own MIT code; only the IBM Plex-specific font note in
that entry is superseded when the actual font migration lands, and the IBM Plex
font-specific test/CI mechanics in D25 and D26 are likewise superseded only at
that migration point.

This decision supersedes the IBM Plex-specific design direction for the package's
default foundation while leaving the historical brief and the underlying font
installation notes as context. The approved portfolio direction therefore requires
Inter and JetBrains Mono to be recorded as the default design source for
subsequent token work, with the earlier IBM Plex entries treated as historical
implementation details that are not the source of truth for the new package
contract.

The portfolio font source must be recorded as follows:

- Source: the served portfolio stylesheet and computed styles loaded in standard
  light and dark modes, using the exact deployed asset rather than a hash-stable
  assumption.
- Licence: record the font licences and asset subset when the site is checked from
  a networked environment; do not assume package assets match the live site.
- Coverage: Inter 300-700 and JetBrains Mono 400-600, matching the live-site
  request contract.
- Style handling: italic/bold consumers are retained only where the live site uses
  them; this package does not infer a new set of italic or bold defaults from an
  older IBM Plex implementation.
- Scope: docs-only PR only; no generated font bundle or shipped asset changes.

### Source-to-token mapping

The portfolio's standard light/dark theme is the source for this migration, but
not every value below has been live-captured yet. The values in the following table
are therefore marked as "from issue, unverified" until the owner confirms them on
a networked machine. This doc deliberately does not invent replacement colours or
new action tokens.

| Token path             | Source declaration or retained value                            | Proposed or retained basis                                                                    | Status                                                |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `color.bg`             | `#F1F0E5` light / `#2D2521` dark                                | issue-known portfolio values, not yet live-captured                                           | from issue, unverified                                |
| `color.bg-subtle`      | `#EBD6CB` light / `#1F1A17` dark                                | issue-known portfolio values, not yet live-captured                                           | from issue, unverified                                |
| `color.surface`        | `#FFFFFF` light / `#3C332E` dark                                | issue-known portfolio values, not yet live-captured                                           | from issue, unverified                                |
| `color.text`           | `#56453F` light / `#F1F0E5` dark                                | issue-known portfolio values, not yet live-captured                                           | from issue, unverified                                |
| `color.accent`         | decorative brown `#A37764` light / `#C39E88` dark               | portfolio decorative accent only; must not be used as a semantic action/link role             | decorative-only value, not an accessible action token |
| `color.on-accent`      | pending explicit owner approval                                 | must meet 4.5:1 on `color.accent` in both modes                                               | not implemented                                       |
| `color.focus-ring`     | pending explicit owner approval                                 | must meet 3:1 against `bg`, `bg-subtle` and `surface`                                         | not implemented                                       |
| `color.border-control` | pending explicit owner approval                                 | must meet the 3:1 non-text rule against `bg`, `bg-subtle` and `surface`                       | not implemented                                       |
| `color.border`         | retained from package default; no new value here                | no source capture in this issue                                                               | retained public value                                 |
| `color.border-strong`  | decorative only; distinct from `color.border-control`           | must remain separate from the 3:1 control rule                                                | decorative, not control                               |
| `color.text-secondary` | no proposed value in this issue                                 | live-source capture or owner approval required before implementation                          | not implemented                                       |
| `color.text-muted`     | no proposed value in this issue                                 | live-source capture or owner approval required before implementation                          | not implemented                                       |
| `color.danger`         | current package values (`#B42318` light / `#FF8A7A` dark)       | existing status colour; must be re-measured against the portfolio backgrounds before adoption | retest required                                       |
| `color.success`        | current package values (`#1F6B45` light / `#86C99A` dark)       | existing status colour; must be re-measured against the portfolio backgrounds before adoption | retest required                                       |
| `color.warning`        | current package values (`#8C5300` light / `#F0B860` dark)       | existing status colour; must be re-measured against the portfolio backgrounds before adoption | retest required                                       |
| `font.family.display`  | `Inter`, `Segoe UI`, `sans-serif`                               | portfolio base/display family                                                                 | from issue, unverified                                |
| `font.family.sans`     | `Inter`, `Segoe UI`, `sans-serif`                               | portfolio body/UI family                                                                      | from issue, unverified                                |
| `font.family.mono`     | `JetBrains Mono`, `SFMono-Regular`, `ui-monospace`, `monospace` | portfolio code family                                                                         | from issue, unverified                                |
| `font.weight.*`        | Inter 300-700; JetBrains Mono 400-600; `clamp()`-driven sizing  | portfolio typography source                                                                   | from issue, unverified                                |
| `font.size.*`          | `clamp()`-based scale instead of fixed-only values              | portfolio sizing model                                                                        | from issue, unverified                                |
| `spacing.*`            | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |
| `radius.*`             | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |
| `layout.*`             | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |
| `breakpoint.*`         | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |
| `motion.*`             | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |
| `shadow.raised`        | single public key retained                                      | no rename or mode-specific shadow key; fidelity compromise is allowed in dark mode            | approved shared key                                   |
| `z-index.*`            | retained current package values                                 | no new values in this issue                                                                   | retained package contract                             |

This table is intentionally conservative. The decorative portfolio brown is not
carried into the semantic `color.accent` role in this doc, and if the owner wants
that colour in the package later it must be added as a separate decorative token
(such as `color.brand-accent`) under a follow-up approved change; it is not added
here as a replacement for the semantic link/action role.

### Contrast revalidation and approval gate

The issue requires re-measuring every pair in `src/contrast.ts` across both modes.
The role split is explicit:

- `color.accent` is decorative only and is not a valid text or action colour.
- `color.on-accent`, `color.focus-ring`, and `color.border-control` are the only
  roles allowed to satisfy the 4.5:1 text and 3:1 non-text accessibility rules.
- the final owner-approved values for those roles must be recorded before any
  implementation starts.

The known failures when the portfolio backgrounds are substituted are:

- `#A37764` on `#F1F0E5` = 3.41:1, below the 4.5:1 minimum for text.
- `#FFFFFF` on `#A37764` = 3.90:1, below the 4.5:1 minimum for text-on-fill.
- `#C39E88` on `#2D2521` = 6.13:1 for text, but `#F1F0E5` on `#C39E88` = 2.14:1,
  which is not acceptable for a filled action or button state.
- `color.text-muted` fails on `bg-subtle` in light mode under the current package
  value (`#5C6576` = 4.20:1, below 4.5:1).
- `color.warning` fails on `bg-subtle` in light mode under the current package
  value (`#8C5300` = 4.48:1, below 4.5:1).
- `color.border-control` fails on `bg` and `surface` in dark mode under the current
  package value (`#5E6D83` = 2.85:1 and 2.34:1, below 3:1), and on `bg-subtle`
  in light mode (`#87816F` = 2.78:1, below 3:1).

Those values confirm the rule: the decorative accent is not the accessible link or
action role. The implementation must keep `color.accent` separate from the
accessible action/link colour and must not treat the decorative value as a valid
`on-accent` or `focus-ring` candidate. There are no invented replacements in this
record: any exact replacement values for `text-muted`, `warning`, and
`border-control`, plus the approved `on-accent`/link/action colour pair, must be
proposed by the owner and measured before implementation.

### Shadow handling and fidelity compromise

`shadow.raised` stays as the public key with no rename and no removal. The design
contract is:

- keep one shared public token name across modes;
- do not introduce a mode-specific `shadow.raised.dark` or a rename that would
  change the public API and require a MAJOR decision; and
- accept a fidelity compromise in dark mode if necessary, while preserving the
  public key.

This keeps the API stable without silently changing the public shape, which the
issue explicitly called out as a break.

### Final completion gate

This issue closes when the mapping decisions and the required colour approvals are
recorded in this document. The final gate remains:

- the owner records the exact approved values for the accessible action/link and
  focus/control roles;
- the owner confirms the live source asset and computed styles from a networked
  environment; and
- `#58` stays open until those exact values are recorded and the spec is
  implementation-ready.

Until then, D46 is the authoritative documentation of the approved direction, but
it does not implement or publish new token values or generated assets.
