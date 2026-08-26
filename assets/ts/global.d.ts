export {};

declare global {
  interface Window {
    Solitude: Record<string, any>;
    globalFn: Record<string, any>;
    Chart?: any;
    ABCJS?: any;
    mermaid?: any;
    TypeIt?: any;
    ColorThief?: any;
    lazyLoadInstance?: any;
    fancyboxRun?: boolean;
    meting_api?: string;
  }
}
