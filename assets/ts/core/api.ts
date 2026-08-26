import { getConfig, getPageConfig } from "./config";
import { lifecycle } from "./lifecycle";
import { loadScript, loadStyle } from "./resources";
import { saveToLocal } from "./storage";

document.documentElement.dataset.solitudeRuntime = "booting";

const api = window.Solitude || {};

Object.defineProperties(api, {
  config: { configurable: true, get: getConfig },
  page: { configurable: true, get: getPageConfig },
});

Object.assign(api, {
  saveToLocal,
  loadScript(url, options) {
    if (/barrage(?:\.min)?\.js(?:\?|$)/.test(url)) api.installLegacyAdapter?.();
    return loadScript(url, options);
  },
  loadStyle,
  on: lifecycle.on.bind(lifecycle),
  listen: lifecycle.listen.bind(lifecycle),
  onPageCleanup: lifecycle.add.bind(lifecycle),
  addGlobalFn(key, fn, name = false, parent = window) {
    const globalFn = parent.globalFn || {};
    const keyObject = globalFn[key] || {};
    if (name && keyObject[name]) return;
    const id = name || Object.keys(keyObject).length;
    keyObject[id] = fn;
    globalFn[key] = keyObject;
    parent.globalFn = globalFn;
  },
  addEventListenerPjax(element, event, handler, options = false) {
    if (!element?.addEventListener) return;
    element.addEventListener(event, handler, options);
    api.addGlobalFn("pjax", () => element.removeEventListener(event, handler, options));
  },
  diffDateFormat(elements) {
    elements?.forEach((item) => {
      const date = new Date(item.getAttribute("datetime") || item.textContent || "");
      if (!Number.isNaN(date.valueOf())) item.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
    });
  },
  installLegacyAdapter() {
    const aliases = { utils: api, sco: api, GLOBAL_CONFIG: api.config };
    Object.entries(aliases).forEach(([name, value]) => {
      if (!(name in window)) Object.defineProperty(window, name, { configurable: true, value });
    });
  },
  disposePage: lifecycle.disposePage.bind(lifecycle),
  navigate(url) {
    if (!url) return;
    const instance = api.pjax;
    if (instance?.loadUrl) instance.loadUrl(url);
    else window.location.assign(url);
  },
});

api.getCSS = (url, id = false) => api.loadStyle(url, id ? { id } : {});
api.getScript = (url, attributes = {}) => api.loadScript(url, { attributes });

window.Solitude = api;
document.documentElement.dataset.solitudeRuntime = "ready";

export { api as Solitude };
