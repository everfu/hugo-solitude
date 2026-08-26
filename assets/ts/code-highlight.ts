import { Solitude } from "./core/api";

type ShikiModule = {
  codeToHtml: (
    code: string,
    options: {
      lang: string;
      themes: { light: string; dark: string };
      defaultColor: false;
    }
  ) => Promise<string>;
};

type NormalizedHighlightConfiguration = {
  enable: boolean;
  lineNumbers: boolean;
  maxHeight: number;
  themes: { light: string; dark: string };
  shikiUrl: string;
};

const DEFAULT_SHIKI_URL = "https://esm.sh/shiki@4.4.3";
const DEFAULT_THEMES = { light: "github-light", dark: "github-dark" };
const sourceCode = new WeakMap<HTMLElement, string>();
let shikiModulePromise: Promise<ShikiModule> | null = null;
let activeShikiUrl = "";

const normalizeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
};

const getConfiguration = (): NormalizedHighlightConfiguration => {
  const highlight = Solitude.config.highlight || {};
  const maxHeight = normalizeNumber(highlight.max_height) ?? 360;

  return {
    enable: highlight.enable !== false,
    lineNumbers: highlight.line_numbers !== false,
    maxHeight,
    themes: {
      light: highlight.themes?.light || DEFAULT_THEMES.light,
      dark: highlight.themes?.dark || DEFAULT_THEMES.dark,
    },
    shikiUrl: Solitude.config.cdn?.shiki || DEFAULT_SHIKI_URL,
  };
};

const loadShiki = (url: string) => {
  if (!shikiModulePromise || activeShikiUrl !== url) {
    activeShikiUrl = url;
    shikiModulePromise = import(/* @vite-ignore */ url) as Promise<ShikiModule>;
    shikiModulePromise.catch(() => {
      shikiModulePromise = null;
      activeShikiUrl = "";
    });
  }
  return shikiModulePromise;
};

const fallbackCopy = (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
};

const showCopyResult = (button: HTMLButtonElement, success: boolean) => {
  button.dataset.copyState = success ? "success" : "error";
  Solitude.snackbarShow(
    Solitude.config.lang.copy[success ? "success" : "error"],
    false,
    2000
  );
  window.setTimeout(() => delete button.dataset.copyState, 2000);
};

const bindControls = (block: HTMLElement, signal: AbortSignal) => {
  if (block.dataset.codeControlsReady === "true") return;
  block.dataset.codeControlsReady = "true";

  const code = block.querySelector<HTMLElement>(".code-block__fallback code");
  sourceCode.set(block, code?.textContent || "");

  const copyButton = block.querySelector<HTMLButtonElement>("[data-code-copy]");
  copyButton?.addEventListener("click", async () => {
    const text = sourceCode.get(block) || "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showCopyResult(copyButton, true);
      } else {
        showCopyResult(copyButton, fallbackCopy(text));
      }
    } catch {
      showCopyResult(copyButton, fallbackCopy(text));
    }
  }, { signal });

  const expandButton = block.querySelector<HTMLButtonElement>("[data-code-expand]");
  expandButton?.addEventListener("click", () => {
    block.classList.add("is-expanded");
    expandButton.hidden = true;
  }, { signal });
};

const setCollapsibleState = (
  block: HTMLElement,
  maxHeight: number,
  signal: AbortSignal
) => {
  block.style.setProperty("--code-block-max-height", `${maxHeight}px`);
  if (!maxHeight) return;

  requestAnimationFrame(() => {
    if (signal.aborted || !block.isConnected) return;
    const viewport = block.querySelector<HTMLElement>(".code-block__viewport");
    const expandButton = block.querySelector<HTMLButtonElement>("[data-code-expand]");
    const isCollapsible = Boolean(viewport && viewport.scrollHeight > maxHeight);
    block.classList.toggle("is-collapsible", isCollapsible);
    if (expandButton) expandButton.hidden = !isCollapsible;
  });
};

const renderHighlightedCode = async (
  shiki: ShikiModule,
  code: string,
  language: string,
  themes: { light: string; dark: string }
) => {
  const attempts = [
    { lang: language, themes },
    { lang: language, themes: DEFAULT_THEMES },
    { lang: "text", themes: DEFAULT_THEMES },
  ];
  const uniqueAttempts = attempts.filter((attempt, index) =>
    attempts.findIndex((candidate) =>
      candidate.lang === attempt.lang &&
      candidate.themes.light === attempt.themes.light &&
      candidate.themes.dark === attempt.themes.dark
    ) === index
  );

  for (const attempt of uniqueAttempts) {
    try {
      return await shiki.codeToHtml(code, {
        ...attempt,
        defaultColor: false,
      });
    } catch {
      // Try the next language/theme fallback while keeping the raw code visible.
    }
  }
  return null;
};

export const initializeCodeBlocks = async (signal: AbortSignal) => {
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-code-block]")]
    .filter((block) => block.dataset.codeBlockReady !== "true");
  if (!blocks.length) return;

  const configuration = getConfiguration();
  blocks.forEach((block) => {
    bindControls(block, signal);
    block.dataset.codeLightTheme = configuration.themes.light;
    block.dataset.codeDarkTheme = configuration.themes.dark;
    block.classList.toggle("code-block--line-numbers", configuration.lineNumbers);
    setCollapsibleState(block, configuration.maxHeight, signal);
  });

  if (!configuration.enable || signal.aborted) return;

  let shiki: ShikiModule;
  try {
    shiki = await loadShiki(configuration.shikiUrl);
  } catch {
    return;
  }
  if (signal.aborted) return;

  await Promise.all(blocks.map(async (block) => {
    const code = sourceCode.get(block) || "";
    const language = block.dataset.language || "text";
    const html = await renderHighlightedCode(
      shiki,
      code,
      language,
      configuration.themes
    );
    if (!html || signal.aborted || !block.isConnected) return;

    const template = document.createElement("template");
    template.innerHTML = html;
    const highlighted = template.content.querySelector<HTMLElement>("pre.shiki");
    const viewport = block.querySelector<HTMLElement>(".code-block__viewport");
    if (!highlighted || !viewport || signal.aborted || !block.isConnected) return;

    const lightBackground = highlighted.style.backgroundColor;
    const darkBackground = highlighted.style.getPropertyValue("--shiki-dark-bg");
    if (lightBackground) {
      block.style.setProperty("--code-block-light-theme-bg", lightBackground);
    }
    if (darkBackground) {
      block.style.setProperty("--code-block-dark-theme-bg", darkBackground);
    }

    highlighted.tabIndex = 0;
    viewport.replaceChildren(highlighted);
    block.dataset.codeBlockReady = "true";
    setCollapsibleState(block, configuration.maxHeight, signal);
  }));
};
