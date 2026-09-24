# Implementing a GitHub issue

The procedure any coding agent (or person) follows to implement one issue in
this repository. It is tool-agnostic: Claude Code runs it as `/implement <n>`,
other agents reach it through AGENTS.md, and a person can follow it by hand.

## 1. Load the context

Read, in this order: `AGENTS.md`, `docs/decisions.md`, `docs/brief.md`.
Precedence where they disagree: AGENTS.md, then decisions.md, then the brief.

## 2. Read the issue

Fetch issue `<n>` with whatever GitHub access you have (`gh issue view <n>`,
a GitHub integration, or the web page). If it names issues it depends on,
check they are closed. If one is still open, stop and say which.

## 3. Restate, then decide whether to ask

Post the issue's acceptance criteria and your plan in five lines or fewer.

Stop and ask the owner only for what the contract reserves for them:

- any colour value that is not already in the brief or decisions.md;
- removing or renaming an emitted token;
- changing AGENTS.md;
- anything touching publishing, tags, R2 or credentials;
- a real ambiguity in the issue: name it and propose an option.

Otherwise proceed without waiting.

## 4. Branch

Use the branch your environment assigns. If none is assigned, create
`issue-<n>-<short-slug>` from an up-to-date `main`.

## 5. Implement and prove it

- Keep to the issue's scope. Anything else worth doing becomes a new issue,
  not part of this PR.
- Run `npm run lint`, `npm run typecheck`, `npm run build` and `npm test`.
- For every new check, break the thing it guards once, confirm it fails with
  a precise message, then restore it. Say what you broke in the PR.

## 6. Record decisions

A choice the issue left open goes into `docs/decisions.md` as a new entry in
the same PR. Never rewrite an entry; supersede it.

## 7. Open the pull request

- Title: what the change does. Body starts with `Closes #<n>`.
- List the checks you ran and their result.
- Put anything the owner must approve at the top, under "Needs your
  approval".

## 8. Drive it to green

Watch CI until it passes. Fix failures in this PR; never skip or disable a
test to get green.
