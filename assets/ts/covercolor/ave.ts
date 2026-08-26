import { applyThemeColor, getCoverSource, resolveColor } from "./shared";

const fetchAveColor = async (source) => {
  const response = await fetch(`${source}?imageAve`);
  if (!response.ok) throw new Error(`Image average color returned ${response.status}`);
  const { RGB } = await response.json();
  return RGB ? `#${RGB.replace(/^0x/, "")}` : null;
};

export const coverColor = (music = false) => {
  const configured = !music && Solitude.page.color;
  if (configured) return applyThemeColor(configured);
  return resolveColor(getCoverSource(music), fetchAveColor, music);
};
