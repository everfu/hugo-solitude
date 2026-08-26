import { applyThemeColor, getCoverSource, resolveColor, rgbToHex } from "./shared";

const extractLocalColor = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.addEventListener("load", () => {
    try {
      const color = window.ColorThief?.getColorSync(image);
      if (!color) throw new Error("Color Thief is unavailable");
      resolve(rgbToHex(color.array(), 0.8));
    } catch (error) {
      reject(error);
    }
  }, { once: true });
  image.addEventListener("error", () => reject(new Error(`Unable to load ${source}`)), { once: true });
  image.src = source;
});

export const coverColor = (music = false) => {
  const configured = !music && Solitude.page.color;
  if (configured && /^#[0-9a-f]{6}$/i.test(configured)) return applyThemeColor(configured);
  return resolveColor(getCoverSource(music), extractLocalColor, music);
};
