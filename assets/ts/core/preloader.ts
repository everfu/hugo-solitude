export const initPreloader = (api) => {
  if (document.documentElement.dataset.solitudePreloader === "true") return;
  document.documentElement.dataset.solitudePreloader = "true";

  let loaded = false;
  let fallbackTimer;
  const loadingBox = () => document.getElementById("loading-box");

  const sync = () => {
    const body = document.getElementById("body");
    if (body) body.classList.toggle("pace-done", loaded);
  };
  const end = () => {
    if (loaded) return;
    loadingBox()?.classList.add("loaded");
    loaded = true;
    clearTimeout(fallbackTimer);
    sync();
  };
  const start = () => {
    loadingBox()?.classList.remove("loaded");
    loaded = false;
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(end, 5000);
    sync();
  };

  api.endLoading = end;
  window.addEventListener("load", end, { once: true });
  window.addEventListener("pjax:send", start);
  document.addEventListener("pjax:complete", end);
  fallbackTimer = setTimeout(end, 5000);
  if (document.readyState === "complete") end();
};
