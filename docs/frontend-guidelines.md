# Frontend development guidelines for consuming applications

Status: guidance for websites consuming `@manjunathhk/design-tokens`. This document does **not** change the package's contracts or authorize UI components in this repository.

## Scope and precedence

Use these guidelines in Angular, WordPress, static HTML and .NET/Razor applications. Each application owns its markup, components, behaviors and release process. Follow the consuming application's own `AGENTS.md`, `CLAUDE.md`, requirements and framework conventions; resolve conflicts before changing code. In the **design-tokens repository**, its root `AGENTS.md` and `docs/decisions.md` take precedence.

**MUST** indicates an implementation requirement when applicable; **SHOULD** is a recommendation to assess in context. Do not redesign unrelated UI just to conform.

## 1. Inspect before implementing — MUST

- Identify the application's framework, existing component patterns, styling approach, tests, and supported browsers.
- Check whether the application already consumes the npm package or CDN and which version is in use.
- Read the relevant [package README](../README.md) and inspect the actual exported token names; never guess names.
- Prefer existing local components and conventions; plan nontrivial changes before coding.

## 2. Tokens and styles — MUST

- Use **semantic** `--mk-*` custom properties for supported colors, typography, spacing, radii, shadows, motion and layout. Never reference internal primitive palette values.
- Do not duplicate the palette, hand-edit `dist/`, or introduce a second independent theme system.
- Do not invent a token name or substitute a hardcoded color when an appropriate semantic token exists.
- App-specific dimensions or styles are allowed where no shared token expresses the requirement; document unusual exceptions. Propose shared tokens upstream only for demonstrated cross-site needs.
- For CSS with linting, consider the published `@manjunathhk/design-tokens/stylelint` config, accounting for the application's existing lint setup.
- Breakpoints are **not CSS custom properties**: use documented values or the published SCSS/JS breakpoint exports as appropriate.

Example (verify names against the installed version):

```css
.profile-card {
  background: var(--mk-color-surface);
  color: var(--mk-color-text);
  border-color: var(--mk-color-border);
}
```

## 3. Components — MUST / SHOULD

- **MUST:** Keep UI component implementations in the consuming application. This repository explicitly does not publish UI components.
- **MUST:** Reuse an existing app component before adding another; preserve app architecture and business behavior.
- **SHOULD:** Favor semantic HTML, small composable components, clear state boundaries and CSS over JavaScript for presentation-only behavior.
- **SHOULD:** Extract a shared library only after repeated cross-application duplication demonstrates a maintenance benefit; do not create one speculatively.
- **MUST:** Ask before introducing a new UI framework, global CSS reset, design system or significant dependency.

## 4. Themes and site controls — MUST

- Support the OS color scheme by default. The package uses `data-theme="light|dark"` on `<html>` for explicit overrides.
- Use semantic tokens so both modes work; test each mode and the system default.
- If using `controls.js`, use its documented `data-mk-theme-choice` and `data-mk-width-toggle` hooks and native buttons; do not duplicate its storage/selection logic.
- Follow the README's **blocking head-script** loading instructions for `controls.js` to prevent initial-theme flash; do not add `async`, `defer`, or `type="module"`.
- The script is opt-in. Do not require it in applications that do not offer theme/width controls.

## 5. Responsive design and accessibility — MUST

- Verify narrow mobile, tablet and desktop layouts, touch interactions, and no unintended horizontal overflow.
- Aim for WCAG 2.2 AA: semantic controls, visible focus, keyboard operability, labels and errors, appropriate contrast, reduced-motion support, and non-color-only status.
- Ensure interactive controls have accessible names; handle focus management for dialogs, menus and overlays.
- Test behavior, not just appearance. Token contrast checks do **not** prove that a complete UI is accessible.

## 6. Performance and implementation quality — SHOULD

- Avoid unnecessary dependencies, large client bundles, costly DOM observers and repeated layout reads.
- Optimize image sizes and loading, keep fonts cacheable, and avoid layout shifts.
- Respect application-specific constraints: Angular idioms; WordPress theme/block boundaries; semantic progressive enhancement in static HTML/Razor.
- Preserve existing design where the task is functional rather than visual.

## 7. Verification and reporting — MUST

For each meaningful frontend change:
1. Run available lint, typecheck and relevant tests; add tests for new behavior when practical.
2. Check light, dark and system themes; verify responsive layouts and keyboard interactions.
3. Check loading, empty, error, disabled and focus states when relevant.
4. Report files changed, commands actually run, test outcomes, unverified items and trade-offs.
5. Never claim browser verification or passing tests unless performed. If tooling is unavailable, state that explicitly.

## Definition of done

- [ ] Requested behavior works without unrelated regressions.
- [ ] Existing application conventions and token exports were respected.
- [ ] Responsive and accessible behavior was checked at relevant sizes and states.
- [ ] Theme behavior was checked where applicable.
- [ ] Relevant tests and quality checks were run, or limitations disclosed.
- [ ] No unnecessary new framework, shared library or hardcoded design palette was introduced.

**Principle:** Share design decisions through tokens. Build UI components where they are used. Extract reusable implementations only when duplication justifies the cost.
