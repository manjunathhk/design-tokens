# CDN and release setup

This runbook is for `design.manjunathhk.in` backed by the `mk-design-cdn` R2 bucket.
It covers Cloudflare setup, GitHub secrets, npm trusted publishing, GitHub Pages, and dry-runs.

## 1) Create and expose the public R2 bucket

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**.
2. Name: `mk-design-cdn`.
3. Keep this bucket public-only for design-token assets. Never store private files in it.
4. Bucket → **Settings** → **Custom Domains** → **Connect Domain** → `design.manjunathhk.in`.
5. Bucket → **Settings** → **Bucket Access** → leave the `R2.dev subdomain` toggle
   **disabled**. This isn't just tidiness: caching (step 3 below), WAF rules and
   access controls only work behind a custom domain — `r2.dev` doesn't support them.

## 2) Apply R2 CORS policy

1. Open `mk-design-cdn` → **Settings** → **CORS Policy** → **Add CORS policy**.
2. Fill in the fields to match `docs/r2-cors.json`: Allowed Origins `*`, Allowed
   Methods `GET`, `HEAD`, Allowed Headers `*`, Max Age `86400`.
3. Save.

Why `*`: assets are public, credentials are never sent, and we avoid per-origin cache fragmentation.

## 3) Add Cloudflare cache behavior

1. Cloudflare Dashboard → select zone `manjunathhk.in` → **Caching** → **Cache Rules**
   → **Create rule**.
2. Match: field `Hostname`, operator `equals`, value `design.manjunathhk.in`.
3. Cache eligibility: **Eligible for cache**.
4. Leave **Edge TTL** unset.
5. **Browser TTL**: click **Add setting** and choose **Respect origin TTL**.
   Do not leave it unset: an unset Browser TTL falls back to the zone's
   **Browser Cache TTL** (4 hours by default), and Cloudflare then raises any
   shorter origin `max-age` to that value. The alias objects' `max-age=300`
   would be served as `max-age=14400`, and `scripts/verify-cdn.ts` fails the
   release on it (as it did on the first `v1.2.0` run). Setting it here,
   rather than in the zone-wide Browser Cache TTL, leaves the other sites on
   the zone untouched.
6. Do not add a Cache Response Rule to rewrite headers at the edge; R2
   already serves the right ones (`upload-manifest.ts` sets them per object).
7. Deploy.

Pinned paths (`/vX.Y.Z/`) use long immutable cache. Alias paths (`/vMAJOR/`) use short cache.

## 4) Create the two Cloudflare API tokens

These live on two different screens — don't look for both in the same place.

**R2 uploader token** (gives `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`):

1. Cloudflare Dashboard → **R2 Object Storage** → **Manage R2 API Tokens** →
   **Create API Token**.
2. Permissions: **Object Read & Write**.
3. Specify bucket(s): `mk-design-cdn` only — never account-wide.
4. Create, then copy the **Access Key ID** and **Secret Access Key**
   immediately; Cloudflare shows the secret once.

**Cache purge token** (gives `CF_API_TOKEN`):

1. Cloudflare Dashboard → **My Profile** (top-right avatar) → **API Tokens**
   → **Create Token** → **Custom Token**.
2. Permissions: **Zone → Cache Purge → Purge**.
3. Zone Resources: **Include → Specific zone → `manjunathhk.in`** only.
4. Create, then copy the token; Cloudflare shows it once.

**The two IDs** (not tokens — no creation step, just look them up):

- `R2_ACCOUNT_ID`: Cloudflare Dashboard → account home (or the R2 Overview
  page) → **Account ID** in the right-hand sidebar.
- `CF_ZONE_ID`: select zone `manjunathhk.in` → **Overview** → **Zone ID** in
  the right-hand **API** panel.

Add these repository secrets in GitHub (**Settings → Secrets and variables →
Actions → Secrets** tab → **New repository secret**, one per name):

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `CF_ZONE_ID`
- `CF_API_TOKEN`

These are the only remaining release secrets. Do not add `NPM_TOKEN`, and
don't add anything under the **Variables** tab — the workflows only read
`secrets.*`.

## 5) Configure npm trusted publishing (OIDC)

1. Ensure the repository is public.
2. npmjs.com → package `@manjunathhk/design-tokens` → **Settings** → **Trusted publishers**.
3. Add publisher:
   - Provider: GitHub Actions
   - Owner: `manjunathhk`
   - Repository: `design-tokens`
   - Workflow file: `.github/workflows/release.yml`
   - Environment: leave empty unless you intentionally gate publishes via env protection.
4. Save.

`release.yml` uses `id-token: write` and runs `npm publish` with no token secret.

## 6) Configure GitHub Pages for the specimen

The `pages` job in `release.yml` deploys the specimen (`docs/index.html`)
once the release job has succeeded (D15). It needs two one-time repository
settings:

1. GitHub → repository **Settings** → **Pages** → **Build and deployment** →
   **Source**: **GitHub Actions**. Leave the suggested Jekyll and Static HTML
   workflows unconfigured: they deploy on every push to `main`. Leave
   **Custom domain** empty; the specimen is served from
   `https://manjunathhk.github.io/design-tokens/`.
2. **Settings** → **Environments** → `github-pages` → **Deployment branches
   and tags**: keep **Selected branches and tags** and **Add deployment
   branch or tag rule** → Ref type **Tag**, pattern `v*.*.*`.

GitHub creates the `github-pages` environment when you pick the Actions
source, and by default it only allows deploys from the default branch.
Without the tag rule, the `release` job passes and the `pages` job fails
without starting ("Tag 'vX.Y.Z' is not allowed to deploy to github-pages
due to environment protection rules"). After adding the rule, open that
failed run and use **Re-run failed jobs**. There's no need to re-tag.

## 7) Release flow summary

- Push a final tag (`vX.Y.Z`) on a `main` commit. There are no release candidates (D50).
  - Workflow validates the tag, `package.json` version and `CHANGELOG.md` section, runs the gate, uploads pinned `/vX.Y.Z/` and verifies status, Content-Type, banner, per-font CORS and Cache-Control over HTTPS, publishes npm, promotes to alias `/vX/`, purges explicit alias URLs, verifies the alias, and creates the GitHub Release.
  - A failed run is rerun on the same tag: identical pinned objects and an already-published npm version are skipped.
  - The `pages` job then deploys the specimen. It runs only when the release job succeeded, and **Re-run failed jobs** reruns it with the release.

## 8) Rollback runbook

Use **Actions → promote → Run workflow** with input `version` (example `1.3.0`).
The input must be a **final** `X.Y.Z` version: a leading `v`, pre-releases such
as `1.1.0-rc.1` (published before D50), and malformed values are rejected before
any storage or purge step runs.

`promote.yml` re-runs alias promote + purge + alias verification for an already-published pinned version without republishing npm.

## 9) Emergency fallback

If CDN has an incident, switch consumer sites to jsDelivr temporarily:

`https://cdn.jsdelivr.net/npm/@manjunathhk/design-tokens@<major>/dist/index.css`

Use this only as fallback; default URL remains `design.manjunathhk.in`.

## 10) Dry-run paths without credentials

You can validate release inputs locally without Cloudflare/npm credentials:

```sh
npm ci
npm run build
npx tsx scripts/upload-manifest.ts --version 1.0.0
```

And validate workflow syntax with actionlint:

```sh
actionlint
```

## 11) Alias propagation note

Alias updates (`/vMAJOR/`) can briefly serve mixed files while edge caches update.
That is acceptable for tokens/base assets because files are version-bannered and quickly converged via purge + short alias TTL.
If strict atomicity is needed later, move `/vMAJOR/` to a small Worker that maps to the latest pinned path.
