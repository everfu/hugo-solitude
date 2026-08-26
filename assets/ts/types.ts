export type SearchProvider = "local" | "algolia" | "docsearch" | false;
export type CoverColorProvider = "local" | "api" | "ave" | false;
export type CommentProvider = "twikoo" | "waline" | "valine" | "artalk" | "giscus";

export interface FeatureModules {
  search: SearchProvider;
  friend_links: boolean;
  keyboard: boolean;
  music: boolean;
  right_menu: boolean;
  translate: boolean;
  covercolor: CoverColorProvider;
}

export interface KeyboardShortcutConfiguration {
  name?: string;
  modifier: "shift" | "mod" | string;
  key: string;
  action?: string;
  url?: string;
}

export interface KeyboardConfiguration {
  enable: boolean;
  list: KeyboardShortcutConfiguration[];
}

export interface CommentConfiguration {
  use: string;
  commentBarrage?: boolean;
  lazyload?: boolean;
  count?: boolean;
  sidebar?: boolean;
  pv?: boolean;
  avatar?: string;
  newest_comment?: {
    enable?: boolean;
    storage?: number;
    limit?: number;
  };
}

export interface ValineConfiguration {
  appId?: string;
  appKey?: string;
  serverURLs?: string;
  avatar?: string;
  visitor?: boolean;
  style?: boolean;
  option?: Record<string, unknown>;
}

export interface AssetConfiguration {
  twikoo?: string;
  waline?: string;
  waline_css?: string;
  valine?: string;
  blueimp_md5?: string;
  artalk?: string;
  artalk_css?: string;
  [name: string]: string | undefined;
}

export interface HighlightConfiguration {
  enable?: boolean;
  copy?: boolean;
  line_numbers?: boolean;
  max_height?: number;
  themes?: {
    light?: string;
    dark?: string;
  };
}

export interface SolitudeSiteConfiguration {
  root: string;
  runtime: string | false;
  localsearch: Record<string, unknown>;
  algolia: Record<string, unknown>;
  feature_modules: FeatureModules;
  keyboard?: KeyboardConfiguration;
  comment: CommentConfiguration;
  valine?: ValineConfiguration;
  cdn: AssetConfiguration;
  highlight?: HighlightConfiguration;
  lazyload: { enable: boolean; error?: string };
  lightbox: string | false;
  friend_links: { async: boolean; path: string; total: number };
  lang: Record<string, any>;
  [name: string]: any;
}

export interface SolitudePageConfiguration {
  is_post: boolean;
  is_page: boolean;
  is_home: boolean;
  page: string;
  toc: boolean;
  comment: boolean;
  color: string | false;
}

export interface SolitudeLifecycleEvents {
  ready: { config: SolitudeSiteConfiguration; page: SolitudePageConfiguration };
  beforeNavigate: undefined;
  afterNavigate: { page: SolitudePageConfiguration };
  themeChange: { theme: "light" | "dark" };
}
