/* ============================================================
 * CommitQuest — Theme manager (Light / Dark)
 * ------------------------------------------------------------
 * Single source of truth for every colour the app paints at
 * runtime (heatmap, chart, toasts, confetti). Palettes are
 * keyed by CSS custom-property names so JS never hard-codes
 * a hex value that could drift from the stylesheet.
 *
 * The active theme is:
 *   1. restored from localStorage ("commitquest.theme"),
 *   2. otherwise taken from the OS preference,
 * and applied via `data-theme` on <html> BEFORE first paint
 * (the tiny inline script in index.html calls apply()).
 * ============================================================ */
(function (global) {
  "use strict";
  const CQ = global.CQ || (global.CQ = {});

  const KEY = "commitquest.theme";
  const rootStyle = () => document.documentElement.style;

  /* Palettes per theme — values match the CSS variables. */
  const PALETTES = {
    light: {
      "--c-lemon":  "#a3b800", // olive-lime accent (AA on white)
      "--c-coral":  "#e05a2b",
      "--c-violet": "#6d5ce8",
      "--c-mint":   "#0d9463",
      "--c-ink":    "#17203a",
      "--heat-0":   "#eef1f5",
      "--heat-1":   "#d3ecd9",
      "--heat-2":   "#9ed7ae",
      "--heat-3":   "#57bd74",
      "--heat-4":   "#22903f",
      "--chart-grid": "rgba(23,32,58,.08)",
      "--chart-tick": "#64748b",
      "--toast-bg": "#ffffff",
      "--toast-line": "#e2e8f0",
    },
    dark: {
      "--c-lemon":  "#eaff5c",
      "--c-coral":  "#ff7a59",
      "--c-violet": "#8b7bff",
      "--c-mint":   "#5eead4",
      "--c-ink":    "#e6ebf5",
      "--heat-0":   "#182038",
      "--heat-1":   "#1d3a2f",
      "--heat-2":   "#1f6f43",
      "--heat-3":   "#31a24c",
      "--heat-4":   "#63d158",
      "--chart-grid": "rgba(255,255,255,.05)",
      "--chart-tick": "#64748b",
      "--toast-bg": "#141a30",
      "--toast-line": "#232b47",
    },
  };

  function current() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  /** Push one theme's palette onto :root as inline custom props. */
  function applyVars(theme) {
    const p = PALETTES[theme];
    for (const k in p) rootStyle().setProperty(k, p[k]);
  }

  /** Set + persist + broadcast the theme. */
  function set(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    applyVars(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
    // Tell the rest of the UI layer (chart colours, etc.)
    document.dispatchEvent(new CustomEvent("cq:theme", { detail: { theme } }));
    syncButton(theme);
  }

  function toggle() {
    set(current() === "dark" ? "light" : "dark");
  }

  /** Called very early by the inline head script. */
  function initEarly() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    const prefersDark = global.matchMedia &&
      matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    applyVars(theme);
    return theme;
  }

  /* Toggle button chrome (label + icon) ---------------------- */
  function syncButton(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const label = btn.querySelector(".tt-label");
    const icon  = btn.querySelector(".tt-icon");
    if (label) label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    if (icon)  icon.textContent  = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  }

  /** Read a live custom property (works for both themes). */
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  CQ.theme = {
    KEY, PALETTES,
    initEarly, set, toggle, current, cssVar,
    colors: () => ({
      lemon:  cssVar("--c-lemon",  "#a3b800"),
      coral:  cssVar("--c-coral",  "#e05a2b"),
      violet: cssVar("--c-violet", "#6d5ce8"),
      mint:   cssVar("--c-mint",   "#0d9463"),
      ink:    cssVar("--c-ink",    "#17203a"),
    }),
    heat: () => [0, 1, 2, 3, 4].map(i => cssVar(`--heat-${i}`, PALETTES.light[`--heat-${i}`])),
  };
})(window);
