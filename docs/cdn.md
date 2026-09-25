# CDN and release setup

This runbook is for `design.manjunathhk.in` backed by the `mk-design-cdn` R2 bucket.
It covers Cloudflare setup, GitHub secrets, npm trusted publishing, and dry-runs.

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
4. Leave **Edge TTL** and **Browser TTL** unset — don't click "Add setting" on
   either. Unset is what makes Cloudflare respect the origin `Cache-Control`
   header, which is what `upload-manifest.ts` sets per object. Do not add a
   Cache Response Rule to rewrite headers at the edge; R2 already serves the
   right ones.
5. Deploy.

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

`release.yml` uses `id-token: write` and runs `npm publish`/`npm publish --tag next` with no token secret.

## 5a) Bootstrapping trust for a brand-new package (first release only)

Step 5's **Settings → Trusted publishers** page only exists on a package
that has already been published at least once — there is nothing to
configure it on beforehand. npm's **Staged Packages** sidebar item looks
related but is not: that's a separate manual-approval workflow for
packages that already exist and have staged publishing turned on: it
will not help create a new package, and its "no packages waiting for
review" state is not diagnostic of anything here.

**Symptom:** `release.yml`'s `npm publish` step fails on the very first
rc or final tag, even with a correct `id-token: write` permission and no
code problem:

```
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/@scope%2Fname
```

**One-time fix**, before the first tag push can succeed end to end:

1. npmjs.com → **Access Tokens** → **Generate New Token** → **Granular
   Access Token**.
   - Uncheck **Bypass two-factor authentication** — this is an
     interactive, human-run publish, not CI; you don't need to bypass
     your own 2FA.
   - Permissions: **Read and write (publish and stage)**, not "stage
     only" (which queues a version instead of publishing it).
   - Select packages: scope it to the specific package/scope if the
     picker allows; if the name isn't selectable yet (nothing published
     under it), use **All packages** and delete the token immediately
     after use below.
2. From your own machine, on the exact tag you want to publish:
   ```sh
   git fetch origin --tags
   git checkout v<version>
   npm ci
   npm run build
   npm login   # or configure the token in ~/.npmrc
   npm publish --access public --tag next --no-provenance
   ```
   `--no-provenance` is required for this one manual publish:
   `package.json`'s `publishConfig.provenance: true` (D10/D11) tells npm
   to auto-attach a provenance attestation, which only works when npm
   detects it's running inside a supported CI OIDC provider. A local
   machine reports `provider: null` and the publish fails with `EUSAGE`
   otherwise. Every subsequent publish from `release.yml` still
   generates provenance normally — GitHub Actions _is_ a supported
   provider — this flag only applies to the bootstrap publish itself.
   Use `--tag next` for an rc, or omit it (defaults to `latest`) if
   you're bootstrapping directly on a final version.
3. Delete the access token — it has done its one job.
4. The package now exists. Go to its page → **Settings → Trusted
   publishers** and configure it exactly as in step 5 above. npm may
   have already pre-populated an entry here from your account's linked
   GitHub identity and `package.json`'s `repository` field — check that
   what's there matches (owner/repo, workflow file `release.yml`)
   before assuming you need to add a new one.

If R2/CDN already succeeded for this tag before npm publish failed
(check the tag's `release.yml` run step by step), don't burn a new rc
number to retry: the pinned prefix is already valid, so just complete
the npm side manually for that exact same version as above, then
continue with `/release verify`.

Two npm behaviors you'll likely see immediately after, that are not
signs of anything wrong:

- **`dist-tags.latest` gets set to your first-ever published version**,
  even if you published with `--tag next`. A package must always have a
  `latest` tag and there's nothing else yet for it to point to. This
  self-corrects the moment a real final version publishes normally
  (without `--tag next`) — no action needed.
- **The public `registry.npmjs.org` read API can lag several minutes
  behind npm's own website** after a brand-new package's first publish,
  which shows it immediately on your account's Packages page. `npm view
<pkg> dist-tags` or a direct fetch of `registry.npmjs.org/<pkg>` may
  404 for a few minutes even though the package genuinely exists — use
  the website's Packages page as the source of truth while waiting, and
  retry the registry check rather than assuming the publish failed.

## 6) Release flow summary

- Push pre-release tag (`vX.Y.Z-rc.N`) on a `main` commit.
  - Workflow validates tag/version, tests, uploads pinned `/vX.Y.Z-rc.N/`, verifies HTTPS headers/banner/CORS, publishes npm with `--tag next`, and stops.
- Push final tag (`vX.Y.Z`) on a `main` commit.
  - Workflow uploads pinned `/vX.Y.Z/`, verifies it, promotes to alias `/vX/`, purges explicit alias URLs, verifies alias, publishes npm, and creates GitHub Release notes from `CHANGELOG.md`.

## 7) Rollback runbook

Use **Actions → promote → Run workflow** with input `version` (example `1.3.0`).

`promote.yml` re-runs alias promote + purge + alias verification for an already-published pinned version without republishing npm.

## 8) Emergency fallback

If CDN has an incident, switch consumer sites to jsDelivr temporarily:

`https://cdn.jsdelivr.net/npm/@manjunathhk/design-tokens@<major>/dist/index.css`

Use this only as fallback; default URL remains `design.manjunathhk.in`.

## 9) Dry-run paths without credentials

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

## 10) Alias propagation note

Alias updates (`/vMAJOR/`) can briefly serve mixed files while edge caches update.
That is acceptable for tokens/base assets because files are version-bannered and quickly converged via purge + short alias TTL.
If strict atomicity is needed later, move `/vMAJOR/` to a small Worker that maps to the latest pinned path.
