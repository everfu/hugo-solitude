export const initActionDelegation = (api) => {
  if (document.documentElement.dataset.solitudeActions === "true") return;
  document.documentElement.dataset.solitudeActions = "true";

  const dispatch = (event) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest("[data-solitude-action]");
    if (!element) return;
    const action = api[element.dataset.solitudeAction];
    if (typeof action !== "function") return;

    if (element.dataset.solitudePrevent === "true") event.preventDefault();
    if (element.dataset.solitudeStop === "true") event.stopPropagation();

    let argument;
    if (element.dataset.solitudeTarget) argument = element.dataset.solitudeTarget;
    else if (element.dataset.solitudeUrl) argument = element.dataset.solitudeUrl;
    else if (element.dataset.solitudeValue) argument = element.dataset.solitudeValue;
    else if (element.dataset.solitudeEvent === "true") argument = event;

    action.call(api, argument, event, element);
  };

  document.addEventListener("click", dispatch);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest("[data-solitude-action]");
    if (!element || /^(A|BUTTON|INPUT)$/.test(element.tagName)) return;
    event.preventDefault();
    element.click();
  });

  document.addEventListener("error", (event) => {
    const element = event.target;
    if (!(element instanceof Element)) return;
    if (element.matches("[data-solitude-hide-ads]")) {
      document
        .querySelectorAll(".google-ads-warp")
        .forEach((item) => { item.style.display = "none"; });
    }
    const fallback = element.dataset.solitudeFallback;
    if (fallback && element.getAttribute("src") !== fallback) {
      element.removeAttribute("data-solitude-fallback");
      element.setAttribute("src", fallback);
    }
  }, true);
};
