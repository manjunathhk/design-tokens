# Instructions for GitHub Copilot

`AGENTS.md` at the repository root is the binding contract for this repo. Read
it before making any change, and follow it exactly — this file does not
replace it, it makes sure you load it.

Do not restate or copy its rules here; if it changes, this file does not need
to change with it.

## Before opening a PR

- Read `docs/decisions.md`. If your change makes a new decision, record it
  there in the same PR.
- If the issue you're working from asks for anything out of scope (UI
  components, utility-class frameworks, runtime JavaScript, CSS-in-JS,
  palette switchers, speculative config), stop and say so in the PR
  description instead of implementing it.
- If anything is ambiguous — a colour value not given in the brief or issue,
  which tier a token belongs in, whether a change is breaking — stop and ask
  in the PR description. Do not guess and proceed.

## Highest-risk mistakes in this repo

- **Never invent a colour value.** Every colour must trace to the issue, the
  brief, or an approved PR description. State the source in the PR
  description.
- **Never hand-edit `dist/`.** Source of truth is `tokens/**/*.json`.
- Emitted tokens only ever come from the semantic tier; primitives are never
  emitted to CSS.
- Renaming or removing an emitted token is a MAJOR/breaking change and must
  be called out explicitly in the PR description, not left for the API-diff
  test to discover.
- Every semantic colour needs both a light and a dark value.
- If a test needs loosening or skipping to pass, that is a signal your
  change is wrong, not the test. Fix the root cause.

## Out of bounds

- Never run `npm publish`, upload to or delete from R2, create tags, or edit
  the release/promote workflows' publishing steps.
- Never ask for, print, or commit Cloudflare or npm credentials.
