const EVENT_PREFIX = "solitude:";

class Lifecycle {
  #pageController = new AbortController();
  #disposers = new Set();

  get signal() {
    return this.#pageController.signal;
  }

  add(disposer) {
    if (typeof disposer !== "function") return () => {};
    this.#disposers.add(disposer);
    return () => this.#disposers.delete(disposer);
  }

  listen(target, type, handler, options = {}) {
    if (!target?.addEventListener) return () => {};
    const normalized =
      typeof options === "boolean" ? { capture: options } : { ...options };
    normalized.signal ??= this.signal;
    target.addEventListener(type, handler, normalized);
    return () => target.removeEventListener(type, handler, normalized);
  }

  disposePage() {
    this.#pageController.abort();
    this.#disposers.forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        console.error("Failed to dispose a Solitude page resource:", error);
      }
    });
    this.#disposers.clear();
    this.#pageController = new AbortController();
  }

  emit(type, detail) {
    document.dispatchEvent(
      new CustomEvent(`${EVENT_PREFIX}${type}`, { detail })
    );
  }

  on(type, handler) {
    const eventName = `${EVENT_PREFIX}${type}`;
    document.addEventListener(eventName, handler);
    return () => document.removeEventListener(eventName, handler);
  }
}

export const lifecycle = new Lifecycle();
