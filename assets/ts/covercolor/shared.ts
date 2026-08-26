import { Solitude } from "../core/api";

const STORAGE_KEY = "Solitude";

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const writeStore = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Theme colors remain usable when storage is unavailable.
  }
};

export const getCachedColor = (source) => {
  const item = readStore().postcolor?.[source];
  if (!item || (item.expiration && item.expiration <= Date.now())) return null;
  return item.value;
};

export const cacheColor = (source, color) => {
  const store = readStore();
  store.postcolor ||= {};
  store.postcolor[source] = {
    value: color,
    expiration: Date.now() + (Number(Solitude.config.covercolor.time) || 43200000),
  };
  writeStore(store);
};

export const getCoverSource = (music = false) => {
  if (!music) {
    return Solitude.page.color || document.getElementById("post-cover")?.src || "";
  }
  const background = document.querySelector("#nav-music .aplayer-pic")?.style.backgroundImage || "";
  return /url\(["']?([^"')]+)["']?\)/.exec(background)?.[1] || "";
};

export const rgbToHex = ([r, g, b], factor = 1) =>
  `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.floor(value * factor))).toString(16).padStart(2, "0"))
    .join("")}`;

const normalizeHex = (value) => {
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
};

export const applyMusicColor = (value) => {
  const color = normalizeHex(value);
  if (color) document.getElementById("nav-music")?.style.setProperty("--efu-music", color);
};

export const applyThemeColor = (value) => {
  const color = normalizeHex(value);
  if (!color) return applyDefaultColor();
  const [r, g, b] = color.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
  const brightness = Math.round((r * 299 + g * 587 + b * 114) / 1000);
  const adjusted = brightness < 125
    ? rgbToHex([Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 50, 255)])
    : color;

  const root = document.documentElement;
  root.style.setProperty("--efu-main", adjusted);
  root.style.setProperty("--efu-main-op", `${adjusted}23`);
  root.style.setProperty("--efu-main-op-deep", `${adjusted}dd`);
  root.style.setProperty("--efu-main-none", `${adjusted}00`);
  Solitude.initThemeColor?.();
};

export const applyDefaultColor = () => {
  const root = document.documentElement;
  root.style.setProperty("--efu-main", "var(--efu-theme)");
  root.style.setProperty("--efu-main-op", "var(--efu-theme-op)");
  root.style.setProperty("--efu-main-op-deep", "var(--efu-theme-op-deep)");
  root.style.setProperty("--efu-main-none", "var(--efu-theme-none)");
  Solitude.initThemeColor?.();
};

export const resolveColor = async (source, fetchColor, music = false) => {
  if (!source) return applyDefaultColor();
  const cached = getCachedColor(source);
  if (cached) return music ? applyMusicColor(cached) : applyThemeColor(cached);

  try {
    const color = await fetchColor(source);
    if (!color) throw new Error("Color provider returned no color");
    cacheColor(source, color);
    if (source !== getCoverSource(music)) return;
    return music ? applyMusicColor(color) : applyThemeColor(color);
  } catch (error) {
    console.error("Unable to resolve cover color:", error);
    if (!music) applyDefaultColor();
  }
};
