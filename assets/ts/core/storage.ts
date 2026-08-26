export const saveToLocal = {
  set(key: string, value: unknown, ttlDays: number) {
    if (ttlDays === 0) return;
    const expiry = Date.now() + ttlDays * 86_400_000;
    localStorage.setItem(key, JSON.stringify({ value, expiry }));
  },
  get<T = unknown>(key: string): T | undefined {
    const source = localStorage.getItem(key);
    if (!source) return undefined;
    try {
      const item = JSON.parse(source);
      if (!item.expiry || Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return undefined;
      }
      return item.value as T;
    } catch {
      localStorage.removeItem(key);
      return undefined;
    }
  },
};
