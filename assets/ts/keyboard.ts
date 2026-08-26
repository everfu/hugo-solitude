import { Solitude } from "./core/api";
import type { KeyboardShortcutConfiguration } from "./types";

type ShortcutModifier = "shift" | "mod";
type ShortcutHandler = (shortcut: NormalizedShortcut) => unknown;

type NormalizedShortcut = Omit<
  KeyboardShortcutConfiguration,
  "modifier" | "key" | "action" | "url"
> & {
  index: number;
  modifier: ShortcutModifier;
  key: string;
  action?: string;
  url?: URL;
};

const STORAGE_KEY = "keyboard";
const BUILTIN_ACTIONS = new Set([
  "toggleKeyboard",
  "showConsole",
  "musicToggle",
  "toggleTheme",
  "openSearch",
  "randomPost",
]);
const handlers = new Map<string, ShortcutHandler>();
const isApplePlatform = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
const panel = document.getElementById("keyboard-tips");
let shortcuts: NormalizedShortcut[] = [];
let active = false;
let listenersBound = false;

const warn = (message: string, value?: unknown) => {
  console.warn(`[Solitude keyboard] ${message}`, value ?? "");
};

const getSiteRoot = () => {
  try {
    return new URL(String(Solitude.config.root || "/"), window.location.origin);
  } catch {
    return new URL("/", window.location.origin);
  }
};

const resolveShortcutUrl = (value: unknown) => {
  const source = String(value || "").trim();
  if (!source) return null;
  try {
    const url = new URL(source, getSiteRoot());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      warn("Unsupported shortcut URL protocol; entry ignored:", source);
      return null;
    }
    return url;
  } catch {
    warn("Invalid shortcut URL; entry ignored:", source);
    return null;
  }
};

const normalizeShortcuts = (list: unknown) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const normalized: NormalizedShortcut[] = [];

  list.forEach((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object") {
      warn(`Entry ${index + 1} is not an object and was ignored.`);
      return;
    }

    const item = rawItem as KeyboardShortcutConfiguration;
    const modifier = String(item.modifier || "").trim().toLowerCase();
    const key = String(item.key || "").trim().toUpperCase();
    const action = String(item.action || "").trim();
    const hasUrl = String(item.url || "").trim() !== "";
    const hasAction = action !== "";
    const name = String(item.name || "").trim();

    if ((modifier !== "shift" && modifier !== "mod") || !key) {
      warn(`Entry ${index + 1} has an invalid modifier or key and was ignored.`, item);
      return;
    }
    if (hasAction === hasUrl) {
      warn(`Entry ${index + 1} must define exactly one of action or url.`, item);
      return;
    }
    if (hasAction && !BUILTIN_ACTIONS.has(action) && !name) {
      warn(`Custom action "${action}" needs a display name and was ignored.`);
      return;
    }
    if (hasUrl && !name) {
      warn(`URL entry ${index + 1} needs a display name and was ignored.`);
      return;
    }

    const combination = `${modifier}:${key}`;
    if (seen.has(combination)) {
      warn(`Duplicate shortcut ${combination} was ignored; the first entry wins.`);
      return;
    }

    const url = hasUrl ? resolveShortcutUrl(item.url) : null;
    if (hasUrl && !url) return;

    seen.add(combination);
    normalized.push({
      ...item,
      index,
      modifier: modifier as ShortcutModifier,
      key,
      action: hasAction ? action : undefined,
      url: url || undefined,
    });
  });

  return normalized;
};

const syncRenderedRows = () => {
  const validIndexes = new Set(shortcuts.map((shortcut) => shortcut.index));
  panel?.querySelectorAll<HTMLElement>("[data-shortcut-index]").forEach((row) => {
    const index = Number(row.dataset.shortcutIndex);
    if (!validIndexes.has(index)) row.remove();
  });
};

const setPanelVisible = (visible: boolean) => {
  panel?.classList.toggle("show", visible && active);
  panel?.setAttribute("aria-hidden", String(!(visible && active)));
};

const syncConsoleButton = () => {
  const item = document.getElementById("consoleKeyboard");
  const button = item?.querySelector("button");
  item?.classList.toggle("on", active);
  button?.setAttribute("aria-pressed", String(active));
};

const readStoredState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
};

const writeStoredState = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage may be unavailable in private or restricted browsing contexts.
  }
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable]:not([contenteditable='false'])"
    )
  );
};

const matchesShortcut = (event: KeyboardEvent, shortcut: NormalizedShortcut) => {
  if (event.altKey || event.shiftKey !== (shortcut.modifier === "shift")) {
    return false;
  }

  if (shortcut.modifier === "shift") {
    if (event.ctrlKey || event.metaKey) return false;
  } else if (isApplePlatform) {
    if (!event.metaKey || event.ctrlKey) return false;
  } else if (!event.ctrlKey || event.metaKey) {
    return false;
  }

  return event.key.toUpperCase() === shortcut.key;
};

const navigateShortcut = (url: URL) => {
  if (url.origin !== window.location.origin) {
    window.open(url.href, "_blank", "noopener,noreferrer");
    return;
  }
  Solitude.navigate(`${url.pathname}${url.search}${url.hash}`);
};

const executeShortcut = (shortcut: NormalizedShortcut) => {
  if (shortcut.url) {
    navigateShortcut(shortcut.url);
    return;
  }

  const handler = shortcut.action ? handlers.get(shortcut.action) : undefined;
  if (!handler) {
    warn(`No handler is registered for action "${shortcut.action}".`);
    return;
  }

  try {
    Promise.resolve(handler(shortcut)).catch((error) => {
      warn(`Action "${shortcut.action}" failed:`, error);
    });
  } catch (error) {
    warn(`Action "${shortcut.action}" failed:`, error);
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!active || event.repeat || isEditableTarget(event.target)) return;

  if (
    event.key === "Shift" &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    setPanelVisible(true);
    return;
  }

  const shortcut = shortcuts.find((item) => matchesShortcut(event, item));
  if (!shortcut) return;
  event.preventDefault();
  executeShortcut(shortcut);
};

const handleKeyup = (event: KeyboardEvent) => {
  if (event.key === "Shift") setPanelVisible(false);
};

const handleWindowBlur = () => setPanelVisible(false);

const bindListeners = () => {
  if (listenersBound) return;
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("keyup", handleKeyup);
  window.addEventListener("blur", handleWindowBlur);
  listenersBound = true;
};

const unbindListeners = () => {
  if (!listenersBound) return;
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("keyup", handleKeyup);
  window.removeEventListener("blur", handleWindowBlur);
  listenersBound = false;
};

const setActive = (enabled: boolean, persist = true) => {
  active = Boolean(enabled);
  if (active) bindListeners();
  else unbindListeners();
  setPanelVisible(false);
  syncConsoleButton();
  if (persist) writeStoredState(active);
};

const updateThemeShortcutLabel = () => {
  panel
    ?.querySelectorAll<HTMLElement>(
      '[data-shortcut-action="toggleTheme"][data-shortcut-custom-label="false"]'
    )
    .forEach((row) => {
      const content = row.querySelector<HTMLElement>(".content");
      if (!content) return;
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      content.textContent = isDark
        ? row.dataset.themeLightLabel || content.textContent
        : row.dataset.themeDarkLabel || content.textContent;
    });
};

const registerShortcutAction = (name: string, handler: ShortcutHandler) => {
  const actionName = String(name || "").trim();
  if (!actionName || typeof handler !== "function") {
    warn("registerShortcutAction requires a name and a function.");
    return () => {};
  }
  handlers.set(actionName, handler);
  return () => {
    if (handlers.get(actionName) === handler) handlers.delete(actionName);
  };
};

if (document.documentElement.dataset.solitudeKeyboard !== "true") {
  document.documentElement.dataset.solitudeKeyboard = "true";
  shortcuts = normalizeShortcuts(Solitude.config.keyboard?.list);
  syncRenderedRows();

  Solitude.registerShortcutAction = registerShortcutAction;
  Solitude.switchKeyboard = () => setActive(!active);

  registerShortcutAction("toggleKeyboard", () => Solitude.switchKeyboard());
  registerShortcutAction("showConsole", () => Solitude.showConsole?.());
  registerShortcutAction("musicToggle", () => Solitude.musicToggle?.());
  registerShortcutAction("toggleTheme", () => Solitude.toggleTheme?.());
  registerShortcutAction("openSearch", () => {
    if (typeof Solitude.openSearch === "function") {
      Solitude.openSearch();
      return;
    }
    const trigger = document.querySelector<HTMLElement>(
      "#search-button > .search, .DocSearch-Button"
    );
    trigger?.click();
  });
  registerShortcutAction("randomPost", () => Solitude.randomPost?.());

  document.addEventListener("solitude:themeChange", updateThemeShortcutLabel);
  updateThemeShortcutLabel();
  setActive(readStoredState(), false);
}
