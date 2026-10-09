/*
 * Site controls (D54): a three-state theme switch and a Fit/Full width toggle.
 * Load as a classic, blocking script in <head> so the saved choice applies
 * before first paint, then mark native buttons:
 *   <button type="button" data-mk-theme-choice="system|light|dark">
 *   <button type="button" data-mk-width-toggle>
 */
(() => {
  const THEME_KEY = "mk-theme";
  const WIDTH_KEY = "mk-width";
  const THEME_BUTTONS = {
    system: '[data-mk-theme-choice="system"]',
    light: '[data-mk-theme-choice="light"]',
    dark: '[data-mk-theme-choice="dark"]',
  } as const;
  const WIDTH_TOGGLE = "[data-mk-width-toggle]";
  type Theme = keyof typeof THEME_BUTTONS;
  const THEMES = Object.keys(THEME_BUTTONS) as Theme[];
  const root = document.documentElement;

  // Storage can be missing or throw (private mode, blocked cookies); the
  // defaults then apply and a choice lasts until the page is left.
  function load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not stored; the choice still applies to this page.
    }
  }

  const storedTheme = load(THEME_KEY);
  let theme: Theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
  let full = load(WIDTH_KEY) === "full";

  function press(selector: string, pressed: boolean): void {
    const value = String(pressed);
    for (const button of document.querySelectorAll(selector)) {
      if (button.getAttribute("aria-pressed") !== value) button.setAttribute("aria-pressed", value);
    }
  }

  function sync(): void {
    for (const choice of THEMES) press(THEME_BUTTONS[choice], choice === theme);
    press(WIDTH_TOGGLE, full);
  }

  function apply(): void {
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    if (full) root.setAttribute("data-mk-width", "full");
    else root.removeAttribute("data-mk-width");
    sync();
  }

  apply();

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    const choice = THEMES.find((c) => target.closest(THEME_BUTTONS[c]));
    if (choice) {
      theme = choice;
      save(THEME_KEY, choice);
    } else if (target.closest(WIDTH_TOGGLE)) {
      full = !full;
      save(WIDTH_KEY, full ? "full" : "fit");
    } else {
      return;
    }
    apply();
  });

  // Buttons parsed or rendered after this script (the page body, Angular,
  // WordPress blocks) get the current aria-pressed as soon as they appear.
  new MutationObserver(sync).observe(root, { childList: true, subtree: true });
})();
