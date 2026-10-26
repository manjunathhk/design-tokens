---
name: frontend-guidelines
description: Apply the shared frontend development guidelines when implementing or reviewing UI in personal websites consuming @manjunathhk/design-tokens, including Angular, WordPress, static HTML, and Razor. Use for UI changes, styling, theme behavior, responsiveness, accessibility, or frontend code review.
---

# Frontend guidelines

Read [docs/frontend-guidelines.md](../../../docs/frontend-guidelines.md) **in full** before applying this skill. That file is the single source of the guidelines; do not maintain a second copy here.

1. Identify whether work is in this **design-tokens** repository or in a **consuming application**.
2. If in this repository, follow root `AGENTS.md` and `docs/decisions.md` first: **do not add UI components or app-specific styling to this package**. This skill is guidance for downstream apps.
3. In a consuming application, inspect its own agent instructions, stack, current token consumption and real exported names. Respect its local architecture.
4. Apply the MUST rules in the guidelines, and use judgment for SHOULD recommendations.
5. Before finishing, report actual validation results and any checks not performed.

When working from a different repository, obtain the guidelines from the canonical file at:
https://github.com/manjunathhk/design-tokens/blob/main/docs/frontend-guidelines.md

If that file cannot be accessed, request the content rather than inventing or silently substituting rules.
