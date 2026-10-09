import { readFileSync } from "node:fs";

/** Token-in-use examples for the specimen (D53). Never shipped in dist/. */

export const EXAMPLES_DIR = "src/examples";

export const FORCED_STATES = ["hover", "focus-visible", "active"] as const;
export type ForcedState = (typeof FORCED_STATES)[number];

export interface Example {
  id: string;
  title: string;
  note: string;
  html: string;
  /** Inert copies rendered under the live example, one per state. */
  states: readonly ForcedState[];
  /** Other groups whose CSS the example also needs. */
  needs: readonly string[];
  /** Height of each copy, for content positioned out of flow (menu, dialog, toast). */
  minHeight: string;
  /** One preview per width; "100%" is the full column. */
  widths: readonly string[];
}

export interface ExampleGroup {
  id: string;
  title: string;
  note: string;
  css: string;
  examples: Example[];
}

export interface Gap {
  pattern: string;
  missing: string;
  fallback: string;
}

interface ExampleSpec {
  id: string;
  title: string;
  note: string;
  states?: readonly ForcedState[];
  needs?: readonly string[];
  minHeight?: string;
  widths?: readonly string[];
}

interface GroupSpec {
  id: string;
  title: string;
  note: string;
  examples: ExampleSpec[];
}

export const GROUPS: GroupSpec[] = [
  {
    id: "actions",
    title: "Actions",
    note: "Buttons and links that look like buttons. One primary action per view.",
    examples: [
      {
        id: "buttons",
        title: "Button variants",
        note: "Primary, secondary, quiet, and destructive outlined and filled.",
        states: FORCED_STATES,
      },
      {
        id: "icons",
        title: "Buttons with icons",
        note: "Icons take the label colour. An icon-only button needs an aria-label.",
        states: FORCED_STATES,
      },
      {
        id: "links",
        title: "Links styled as buttons",
        note: "Use a link when the action navigates, a button when it does something.",
        states: FORCED_STATES,
      },
      {
        id: "disabled",
        title: "Disabled buttons",
        note: "Prefer explaining why an action is unavailable over disabling it silently.",
      },
    ],
  },
  {
    id: "forms",
    title: "Forms",
    note: "Labels above controls, help and messages below. Controls use border-control, which meets 3:1.",
    examples: [
      {
        id: "text-field",
        title: "Text fields",
        note: "Label, input, optional marker and help text tied with aria-describedby.",
        states: ["focus-visible"],
      },
      {
        id: "validation",
        title: "Validation messages",
        note: "The message carries the meaning; the border colour only reinforces it.",
      },
      {
        id: "textarea-select",
        title: "Select and textarea",
        note: "Native controls, styled like text fields.",
        states: ["focus-visible"],
      },
      {
        id: "choices",
        title: "Checkboxes and radios",
        note: "Native controls tinted with accent-color, grouped in a fieldset with a legend.",
        states: ["focus-visible"],
      },
      {
        id: "range",
        title: "Range",
        note: "A native slider with its value in an output element.",
        states: ["focus-visible"],
      },
      {
        id: "disabled",
        title: "Disabled fields",
        note: "Drawn with existing tokens; see Not yet expressible.",
      },
    ],
  },
  {
    id: "feedback",
    title: "Feedback",
    note: "Status colours always come with an icon or words, never colour alone.",
    examples: [
      {
        id: "alerts",
        title: "Alerts",
        note: "Info, success, warning and danger. Use role=alert only for danger.",
      },
      {
        id: "badges",
        title: "Badges and tags",
        note: "Short labels for status or category.",
      },
      {
        id: "toast",
        title: "Toast",
        note: "Fixed to the bottom corner on z-index.toast; shown here inside its preview.",
        minHeight: "8rem",
      },
      {
        id: "progress",
        title: "Progress",
        note: "Native progress, determinate and indeterminate.",
      },
      {
        id: "loading",
        title: "Loading",
        note: "A spinner beside words, and a skeleton in the shape of the content. Under reduced motion both stand still; the words carry the state.",
      },
      {
        id: "empty-state",
        title: "Empty state",
        note: "Says what is missing and offers the next step. Uses the Actions CSS for its button.",
        needs: ["actions"],
      },
    ],
  },
  {
    id: "content",
    title: "Content",
    note: "Cards, long-form text and data tables. base.css already sets reading widths and tabular numerals.",
    examples: [
      {
        id: "cards",
        title: "Cards on a subtle section",
        note: "surface cards raised with shadow.raised on bg-subtle. The title is the link.",
        states: ["hover", "focus-visible"],
      },
      {
        id: "prose",
        title: "Prose",
        note: "Headings, links, lists, a quotation, inline code, keys and a code block.",
      },
      {
        id: "table",
        title: "Data table",
        note: "Caption, column headers, row headers and right-aligned numbers.",
      },
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    note: "The current page is marked with aria-current, and shown by more than colour.",
    examples: [
      {
        id: "top-nav",
        title: "Top navigation",
        note: "Sticky on z-index.nav. The current page gets the accent and an underline bar.",
        states: ["hover", "focus-visible"],
      },
      {
        id: "breadcrumbs",
        title: "Breadcrumbs",
        note: "Separators are drawn by CSS, so screen readers do not announce them.",
      },
      {
        id: "tabs",
        title: "Tabs",
        note: "Markup and styles only; arrow-key behaviour is the site's script.",
        states: ["hover", "focus-visible"],
      },
      {
        id: "pagination",
        title: "Pagination",
        note: "The current page is filled with the accent; an unavailable link is dashed.",
        states: ["hover", "focus-visible"],
      },
      {
        id: "skip-link",
        title: "Skip link",
        note: "Hidden until keyboard focus. Press Tab inside the preview to see the live one.",
        states: ["focus-visible"],
        minHeight: "3.5rem",
      },
    ],
  },
  {
    id: "overlay",
    title: "Overlay",
    note: "Layers above the page. Modal dialogs use the top layer; other overlays use z-index.overlay.",
    examples: [
      {
        id: "dialog",
        title: "Dialog",
        note: "Shown open in place; a site opens it with showModal(). Uses the Actions CSS for its buttons.",
        needs: ["actions"],
        states: ["hover", "focus-visible"],
        minHeight: "13rem",
      },
      {
        id: "menu",
        title: "Menu",
        note: "Shown open under its button. Uses the Actions CSS for the button.",
        needs: ["actions"],
        states: ["hover", "focus-visible"],
        minHeight: "15rem",
      },
    ],
  },
  {
    id: "page",
    title: "Page",
    note: "A small site built from the tokens, at phone width and at full width. It reflows at breakpoint.sm and breakpoint.lg.",
    examples: [
      {
        id: "site",
        title: "Mock site",
        note: "Sticky header, hero in the display face, a bg-subtle band with .mk-grid-bg, cards and a footer. Uses the Actions CSS for its buttons.",
        needs: ["actions"],
        widths: ["375px", "100%"],
      },
    ],
  },
];

export const GAPS: Gap[] = [
  {
    pattern: "Filled destructive button hover",
    missing: "A hover shade of color.danger.",
    fallback: "Hover underlines the label.",
  },
  {
    pattern: "Filled status badges",
    missing:
      "Text colours for use on success, warning and info fills, checked at 4.5:1 against them.",
    fallback:
      "Outlined in the status colour, which already meets 4.5:1 on bg, bg-subtle and surface.",
  },
  {
    pattern: "Tinted alert backgrounds",
    missing: "A subtle tint per status colour, like color.accent-subtle for accent.",
    fallback:
      "Alerts sit on surface with a status-coloured edge, icon and title. Not planned: at 14% alpha, success and warning text fail 4.5:1 on their own tint in light mode.",
  },
  {
    pattern: "Dialog backdrop",
    missing: "A scrim colour to dim the page behind a modal dialog.",
    fallback:
      "The backdrop blurs the page (backdrop-filter) without dimming it. To be added when a site uses modal dialogs.",
  },
  {
    pattern: "Disabled controls",
    missing: "A disabled foreground and background pair.",
    fallback:
      "bg-subtle fill, text-muted label and a dashed border-control outline. Not planned: WCAG 2.2 exempts disabled controls from contrast.",
  },
];

const read = (file: string) => readFileSync(`${EXAMPLES_DIR}/${file}`, "utf8");

/** Reads every example's HTML and every group's CSS from src/examples/. */
export function loadExamples(): ExampleGroup[] {
  return GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    note: group.note,
    css: read(`${group.id}/${group.id}.css`),
    examples: group.examples.map((spec) => ({
      id: spec.id,
      title: spec.title,
      note: spec.note,
      html: read(`${group.id}/${spec.id}.html`),
      states: spec.states ?? [],
      needs: spec.needs ?? [],
      minHeight: spec.minHeight ?? "0",
      widths: spec.widths ?? ["100%"],
    })),
  }));
}

/** Custom properties a stylesheet reads, in source order, without repeats. */
export const usedProperties = (css: string) => [
  ...new Set([...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1] ?? "")),
];

/** Splits a selector list on its top-level commas only. */
function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const char = list[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(list.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * Gives every selector that uses :hover, :focus-visible or :active a twin
 * matching [data-force="<state>"], so an inert copy shows the state without
 * interaction. Comments are dropped; the snippet keeps the original source.
 */
export function forceStates(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(
      /(^|[{};])(\s*)([^{};@]+?)(\s*)\{/g,
      (_match, lead: string, space: string, list: string, gap: string) => {
        const selectors = splitSelectors(list);
        const twins = selectors.flatMap((selector) =>
          FORCED_STATES.filter((state) => new RegExp(`:${state}(?![a-z-])`).test(selector)).map(
            (state) =>
              selector.replace(new RegExp(`:${state}(?![a-z-])`, "g"), `[data-force="${state}"]`),
          ),
        );
        return `${lead}${space}${[...selectors, ...twins].join(", ")}${gap}{`;
      },
    );
}

/** Marks every interactive element for one forced state and keeps ids and radio groups unique. */
export function forceHtml(html: string, state: ForcedState): string {
  return html.replace(/<(a|button|input|select|textarea)\b/g, `<$1 data-force="${state}"`).replace(
    /\s(id|for|name|aria-describedby|aria-labelledby)="([^"]*)"/g,
    (_match, attr: string, value: string) =>
      ` ${attr}="${value
        .split(/\s+/)
        .map((part) => `${part}--${state}`)
        .join(" ")}"`,
  );
}
