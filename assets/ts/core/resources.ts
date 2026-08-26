const scriptRequests = new Map();
const styleRequests = new Map();

const loadElement = (cache, selector, create, url) => {
  const absoluteUrl = new URL(url, document.baseURI).href;
  if (cache.has(absoluteUrl)) return cache.get(absoluteUrl);

  const existing = [...document.querySelectorAll(selector)].find(
    (element) => element.href === absoluteUrl || element.src === absoluteUrl
  );
  if (existing) {
    const resolved = Promise.resolve(existing);
    cache.set(absoluteUrl, resolved);
    return resolved;
  }

  const request = new Promise((resolve, reject) => {
    const element = existing || create(absoluteUrl);
    const complete = () => {
      element.dataset.loaded = "true";
      resolve(element);
    };
    const fail = () => {
      cache.delete(absoluteUrl);
      reject(new Error(`Unable to load ${absoluteUrl}`));
    };

    element.addEventListener("load", complete, { once: true });
    element.addEventListener("error", fail, { once: true });
    if (!existing) document.head.appendChild(element);
  });

  cache.set(absoluteUrl, request);
  return request;
};

export const loadScript = (url, options = {}) =>
  loadElement(
    scriptRequests,
    "script",
    (src) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = options.async ?? true;
      Object.entries(options.attributes || {}).forEach(([key, value]) =>
        script.setAttribute(key, value)
      );
      return script;
    },
    url
  );

export const loadStyle = (url, options = {}) =>
  loadElement(
    styleRequests,
    "link",
    (href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      if (options.id) link.id = options.id;
      return link;
    },
    url
  );
