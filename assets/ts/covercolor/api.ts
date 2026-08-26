import { applyThemeColor, getCoverSource, resolveColor } from "./shared";

const fetchApiColor = async (source) => {
  const response = await fetch(`${Solitude.config.covercolor.api}${encodeURIComponent(source)}`);
  if (!response.ok) throw new Error(`Cover color API returned ${response.status}`);
  return (await response.json()).RGB;
};

export const coverColor = (music = false) => {
  const configured = !music && Solitude.page.color;
  if (configured) return applyThemeColor(configured);
  return resolveColor(getCoverSource(music), fetchApiColor, music);
};
