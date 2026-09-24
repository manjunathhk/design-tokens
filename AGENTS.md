# AGENTS.md: contract for any coding agent in this repository

This repository publishes @manjunathhk/design-tokens: design tokens and a small
base stylesheet shared by all of Manjunath's websites. CI enforces this
contract. A change that breaks it does not merge.

## Scope is fixed
- Tokens, base.css, fonts.css, tests, specimen page, docs. Nothing else.
- Never add UI components, utility-class frameworks, runtime JavaScript,
  CSS-in-JS or palette switchers. If a request needs one, stop and say so.

## Tokens
- Source of truth is tokens/**/*.json in DTCG format ($value, $type,
  $description). Never hand-edit dist/.
- Two tiers: primitive (raw values, never emitted to CSS) and semantic
  (emitted, references resolved). Consumers only ever see semantic tokens.
- Every emitted CSS custom property starts with --mk- and is kebab-case.
- Never invent colour values. Colours come from the brief or from an approved
  PR description. Every colour change must keep the contrast tests passing.
- Every semantic colour has both a light and a dark value.

## Compatibility
- Removing or renaming an emitted token is a breaking change and requires a
  MAJOR version bump. The API-diff test enforces this.
- Adding a token or changing a value is MINOR. Build or doc fixes are PATCH.
- Font url() paths are relative to the CSS file that declares them.

## Code
- TypeScript for build scripts and tests, strict mode, no unused symbols.
- Prettier formatting; ESLint and stylelint clean.
- No speculative abstractions, no configuration options nobody asked for.
- Precise error messages: name the token, the mode and the failing value.

## CI is the reviewer
Every PR must pass: build, contrast contract, naming contract, snapshot,
API diff, Playwright consumption smoke test, lint and format.

## Releases and the CDN
- Only a human pushes release tags. Agents never run npm publish, never
  upload to or delete from R2, never create tags, and never edit the release
  or promote workflows' publishing steps without being asked.
- Pinned CDN versions (/vX.Y.Z/) are immutable: nothing may overwrite or
  delete them. Only the alias prefix (/vMAJOR/) is ever rewritten, and only by
  release.yml or promote.yml.
- Agents never ask for, handle, print or commit Cloudflare or npm credentials.
  Account setup is done by a human from docs/cdn.md.
- Every file uploaded to R2 carries an explicit Content-Type and
  Cache-Control header.

## Workflow
- Read docs/decisions.md before starting. It records what was decided after
  docs/brief.md and wins where they disagree. A PR that makes a new decision
  records it there in the same PR.
- GitHub Flow: short-lived branches off main, merged into main by PR. One
  GitHub issue per unit of work; its PR closes it.
- A release is a tag on a main commit, pushed by a human (see Releases).
- To implement an issue, follow docs/workflow/implement-issue.md.

## When unsure
Stop and ask. Say what is ambiguous and propose an option. Do not guess.