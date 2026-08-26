import type { SolitudePageConfiguration, SolitudeSiteConfiguration } from "../types";

const parseConfig = <T>(id: string, fallback: T): T => {
  const element = document.getElementById(id);
  if (!element) return fallback;
  try {
    return JSON.parse(element.content?.textContent || element.textContent || "{}");
  } catch (error) {
    console.error(`Invalid Solitude configuration in #${id}:`, error);
    return fallback;
  }
};

const promoteSerializedKey = (
  record: object | undefined,
  canonical: string,
  serialized: string,
) => {
  if (!record) return;
  const values = record as Record<string, any>;
  if (!(serialized in values)) return;
  if (!(canonical in values)) values[canonical] = values[serialized];
  delete values[serialized];
};

const normalizeProviderKeys = (record: object | undefined) => {
  promoteSerializedKey(record, "appId", "appid");
  promoteSerializedKey(record, "apiKey", "apikey");
  promoteSerializedKey(record, "appKey", "appkey");
  promoteSerializedKey(record, "indexName", "indexname");
  promoteSerializedKey(record, "serverURL", "serverurl");
  promoteSerializedKey(record, "serverURLs", "serverurls");
  promoteSerializedKey(record, "envId", "envid");
  promoteSerializedKey(record, "accessToken", "accesstoken");
};

const normalizeConfig = (config: SolitudeSiteConfiguration) => {
  promoteSerializedKey(config.comment, "commentBarrage", "commentbarrage");
  promoteSerializedKey(config.console, "recentComment", "recentcomment");
  promoteSerializedKey(config.right_menu, "ctrlOriginalMenu", "ctrloriginalmenu");
  normalizeProviderKeys(config.valine);
  normalizeProviderKeys(config.twikoo);
  normalizeProviderKeys(config.waline);
  normalizeProviderKeys(config.algolia);
  normalizeProviderKeys(config.search?.algolia);
  normalizeProviderKeys(config.search?.docsearch);
  return config;
};

export const getConfig = () =>
  normalizeConfig(
    parseConfig<SolitudeSiteConfiguration>(
      "site-config",
      {} as SolitudeSiteConfiguration,
    ),
  );
export const getPageConfig = () => parseConfig<SolitudePageConfiguration>("config-diff", {} as SolitudePageConfiguration);
