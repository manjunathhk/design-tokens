# Cutting a release

The procedure for releasing `@manjunathhk/design-tokens`: tagging `main`,
publishing to npm, and updating the CDN. Tool-agnostic like
`implement-issue.md`, but most of it is human-only per `AGENTS.md`: agents
never push tags, run `npm publish`, or touch R2/Cloudflare credentials. An
agent's role here stops at step 2.

## 1. Preconditions

- Everything you want released is merged to `main` and green.
- You know the target version (semver: MAJOR for removing/renaming an
  emitted token, MINOR for adding a token or changing a value, PATCH for
  build/doc fixes — see `AGENTS.md`).

## 2. Land the Release PR

Hand-bump, in one PR, on a branch off `main`:

- `package.json` `version` → the **rc** version, e.g. `1.3.0-rc.1`.
  `release.yml` requires the pushed tag (minus its `v`) to match this
  string exactly, so it has to carry the `-rc.N` suffix here, not the
  final `1.3.0`.
- `CHANGELOG.md` → add the `## [1.3.0]` section (final version, no `-rc`
  suffix in the heading) with real notes. `release.yml` only checks for
  this section on the **final** tag, not the rc, but write it now so it's
  ready.
- The `dist/tokens.css` version-banner snapshot, if the build produces one.

Normal PR, normal CI. No version-bump automation runs here (D18): a human
decides the bump and writes the notes.

**(Human only from here.)**

## 3. Push the release-candidate tag

From a clean checkout of the merged commit:

```sh
git tag v1.3.0-rc.1
git push origin v1.3.0-rc.1
```

Triggers `release.yml`. For an `-rc.N` tag it:

- validates the tag matches `package.json` exactly and the tagged commit
  is on `main` — hard-fails otherwise, no drift possible;
- runs the full gate: lint, typecheck, build, unit tests, API-diff,
  Playwright e2e;
- uploads to the **pinned** `/v1.3.0-rc.1/` prefix only, refusing if that
  prefix already has objects (pinned paths are immutable);
- verifies the upload over HTTP (status, content-type, version banner,
  font CORS);
- publishes to npm under the `next` dist-tag via OIDC — no token secret.

An rc never touches the `/vMAJOR/` alias or npm's `latest` tag.

## 4. Validate the rc

Pull `next` from npm and/or hit the pinned CDN URLs directly. Fix forward
with a new rc (`-rc.2`, ...) if anything's wrong — don't reuse a pinned
prefix.

## 5. Land the Finalize PR

A small follow-up PR, on a new branch off `main`: bump `package.json`
`version` from `1.3.0-rc.1` to `1.3.0` — dropping the `-rc.N` suffix is
required, since the final tag's validation needs an exact match against
this new string. No CHANGELOG change needed; the `## [1.3.0]` section
already landed in step 2.

## 6. Push the final tag

On the Finalize PR's merged commit:

```sh
git tag v1.3.0
git push origin v1.3.0
```

`release.yml` re-runs the full gate, uploads pinned `/v1.3.0/`, verifies
it, then:

- promotes it to alias `/v1/` (copies pinned objects to alias keys);
- purges those alias URLs on Cloudflare;
- verifies the alias resolves;
- publishes to npm as `latest`;
- creates the GitHub Release, body pulled from `CHANGELOG.md`'s
  `## [1.3.0]` section.

The tag push _is_ the release — there is no separate release button or
draft step.

## 7. Verify

Check the alias URL (`design.manjunathhk.in/v1/...`) resolves post-purge,
and that npm shows the new version as `latest`.

## 8. Roll back a bad alias promotion

If the alias promotion needs redoing but the pinned version is already
published and doesn't need republishing: **Actions → promote → Run
workflow**, input the version without `v` (e.g. `1.3.0`). It re-runs
promote + purge + alias verification against the existing pinned objects,
refusing if that pinned prefix has zero objects. It does not touch npm.

## 9. What's manual, always

Per `AGENTS.md`, these are never automated and never done by an agent:

- deciding the version bump and writing the CHANGELOG notes (D18 —
  release-please and similar were rejected: bots would create the tag,
  `GITHUB_TOKEN`-made tags don't trigger `release.yml`, and inferring
  bumps from commit types doesn't enforce "value change = MINOR");
- pushing the tag;
- anything touching Cloudflare or npm credentials.
