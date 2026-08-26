import { Solitude } from "./api";

const rerunPjaxScripts = () => {
  document.querySelectorAll<HTMLScriptElement>("script[data-pjax]").forEach((item) => {
    const replacement = document.createElement("script");
    Array.from(item.attributes).forEach((attribute) => replacement.setAttribute(attribute.name, attribute.value));
    replacement.textContent = item.textContent || "";
    item.replaceWith(replacement);
  });
};

const closePersistentOverlays = () => {
  document.body.style.overflow = "";
  document.getElementById("sidebar-menus")?.classList.remove("open");
  const menuMask = document.getElementById("menu-mask");
  if (menuMask) menuMask.style.display = "none";
  document.getElementById("console")?.classList.remove("show");
  const searchMask = document.getElementById("search-mask");
  const searchDialog = document.querySelector<HTMLElement>("#local-search .search-dialog, #algolia-search .search-dialog");
  if (searchMask) searchMask.style.display = "none";
  if (searchDialog) searchDialog.style.display = "none";
  document.documentElement.classList.remove("search-open");
};

const initPjax = () => {
  const PjaxConstructor = (window as any).Pjax;
  if (!PjaxConstructor || Solitude.pjax) return;
  const instance = new PjaxConstructor({
    elements: 'a:not([target="_blank"]):not([data-no-pjax])',
    selectors: [
      "title",
      "#body-wrap",
      "#site-config",
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:type"]',
      ".js-pjax",
      "#config-diff",
      ".rs_show",
      ".rs_hide",
    ],
    cacheBust: false,
    analytics: false,
    scrollRestoration: false,
  });
  instance.onSwitch = function onSwitch() {
    this.state.numPendingSwitches--;
    if (this.state.numPendingSwitches === 0) {
      document.dispatchEvent(new Event("resize", { bubbles: true }));
      document.dispatchEvent(new Event("scroll", { bubbles: true }));
      this.afterAllSwitches();
    }
  };
  Solitude.pjax = instance;
  rerunPjaxScripts();
  document.addEventListener("pjax:send", () => {
    closePersistentOverlays();
    document.dispatchEvent(new CustomEvent("solitude:beforeNavigate"));
    Solitude.disposePage?.();
    Object.values((window.globalFn as any)?.pjax || {}).forEach((dispose: any) => dispose?.());
    if (window.globalFn) (window.globalFn as any).pjax = {};
  });
  document.addEventListener("pjax:complete", async () => {
    await Solitude.refresh?.();
    rerunPjaxScripts();
    if (Solitude.config.lazyload.enable) window.lazyLoadInstance?.update?.();
    document.dispatchEvent(new CustomEvent("solitude:afterNavigate", { detail: { page: Solitude.page } }));
  });
  document.addEventListener("pjax:error", (event: any) => {
    if (event.request?.status === 404) Solitude.navigate("/404.html");
  });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPjax, { once: true });
else initPjax();
