import { Solitude } from "../core/api";

const initializeDocSearch = async () => {
  const container = document.getElementById("docsearch");
  const options = Solitude.config.search?.docsearch || Solitude.config.docsearch || {};
  if (!container || container.dataset.initialized === "true") return;
  container.dataset.initialized = "true";

  try {
    if (Solitude.config.cdn?.docsearch_css) {
      await Solitude.loadStyle(Solitude.config.cdn.docsearch_css, { id: "docsearch-css" });
    }
    await Solitude.loadScript(Solitude.config.cdn?.docsearch_js);
    const docsearch = (window as any).docsearch;
    if (typeof docsearch !== "function" || !options.appId || !options.apiKey || !options.indexName) {
      throw new Error("DocSearch configuration is incomplete");
    }
    docsearch({
      container: "#docsearch",
      placeholder: options.placeholder || Solitude.config.lang?.search?.placeholder,
      ...options,
      ...(options.option || {}),
    });
    const trigger = document.querySelector<HTMLElement>("#search-button > .search");
    Solitude.listen(trigger, "click", () => {
      document.querySelector<HTMLElement>(".DocSearch-Button")?.click();
    });
  } catch (error) {
    container.hidden = false;
    container.classList.add("docsearch-unavailable");
    container.textContent = "DocSearch 暂不可用，请检查 appId、apiKey 与 indexName。";
    console.warn(error);
  }
};

initializeDocSearch();
document.addEventListener("solitude:afterNavigate", initializeDocSearch);
