[简体中文](README.md)｜[English](README_en-US.md)｜繁體中文｜[Español](README_es-ES.md)

<div align="center">
  <img width="50%" src="https://raw.githubusercontent.com/everfu/hugo-solitude/main/.github/logo.avif" alt="Solitude">
  <hr>
  <p>為內容創作者打造的優雅、完整且無需 Node.js 的 Hugo 主題。</p>
</div>

Solitude for Hugo 是 [Hexo Theme Solitude](https://github.com/everfu/hexo-theme-solitude) 的原生 Hugo 實作，使用 Hugo Templates、Pipes、Menus、Taxonomies 與 Page Collections 建構。

主題保留熟悉的視覺語言、內容卡片、側欄、特殊頁面和互動能力，同時將網站設定統一到 Hugo 標準設定與 `params.solitude` 下。新網站可以直接從 [`exampleSite`](exampleSite) 開始。

## 特性

- 完整的首頁、文章、封存、分類、標籤、分頁、404 與響應式版面
- About、Links、Equipment、Music、Message、Brevity、Recent Comments 等特殊頁面
- 原生 RSS、Sitemap、robots.txt、Related Content、目錄、字數與閱讀時間
- PJAX、明暗模式、本機搜尋、快捷鍵、右鍵選單、燈箱、音樂與評論整合
- Twikoo、Waline、Valine、Giscus 與 Artalk 評論服務
- 與 `hexo-solitude-tag 2.0` 能力對應的 Hugo shortcodes
- 瀏覽器端按需載入 Shiki，支援明暗雙主題、行號與長程式碼展開
- 使用 Hugo `css.Build` 與 `js.Build` 編譯模組化 CSS 和 TypeScript
- 建構過程不依賴 Node.js、npm、PostCSS、Sass 或 Stylus

## 環境需求

- Hugo v0.164.0 或更新版本
- Git（使用 submodule 安裝時需要）

## 安裝

在 Hugo 網站根目錄中，將主題加入 `themes/solitude`：

```bash
git submodule add -b hugo https://github.com/everfu/hugo-solitude.git themes/solitude
```

在網站的 `hugo.yaml` 中啟用主題，並宣告 Solitude 使用的輸出格式：

```yaml
theme: solitude

outputs:
  home: [HTML, RSS, Search, Links]
  section: [HTML, RSS]
  taxonomy: [HTML, RSS]
  term: [HTML, RSS]

params:
  solitude:
    search:
      enable: true
      type: local
```

完整設定可以從 [`exampleSite/hugo.yaml`](exampleSite/hugo.yaml) 複製，再依網站需求修改。

## 快速預覽

在主題儲存庫根目錄執行範例網站：

```bash
hugo server --source exampleSite --themesDir ../.. --theme solitude
```

產生正式環境建構：

```bash
hugo --source exampleSite --themesDir ../.. --theme solitude --gc --minify
```

範例網站包含首頁推薦、側欄組合、文章、特殊頁面、評論容器、shortcodes 與本機資料檔案，可作為新網站可直接執行的起點。

## 設定與內容

Hugo 標準能力使用標準設定，Solitude 專屬能力統一位於 `params.solitude`。主題盡可能沿用原有的 `nav`、`post`、`aside`、`comment` 與 `search` 層級，但不會讀取已棄用的 Hexo 欄位。

文章可以直接使用以下 front matter：

```yaml
title: 我的第一篇文章
date: 2026-08-26
lastmod: 2026-08-26
description: 文章摘要
cover: /img/cover.webp
categories: [隨筆]
tags: [Hugo, Solitude]
comment: true
aside: true
toc: true
home: true
```

設定 `home: false` 可讓文章不出現在首頁文章列表、首頁推薦和首頁最近文章側欄中；該欄位省略或設為 `true` 時正常顯示，歸檔、分類、搜尋、RSS 與文章頁面不受影響。Hexo 的 `updated` 應改為 Hugo 的 `lastmod`。全部 shortcode 的可建構範例位於 [`exampleSite/content/posts/shortcodes.md`](exampleSite/content/posts/shortcodes.md)。

### 自訂樣式

主題樣式從 `assets/css/solitude/main.css` 單一入口建構，並依基礎、版面、元件、頁面、shortcode 與整合模組維護。

網站如需覆寫樣式，請建立自己的 `assets/css/custom.css`。Hugo 會在主題樣式之後獨立編譯並載入，無需複製主題檔案或使用 `!important`。

### 特殊頁面資料

About、Links、Equipment 與 Brevity 的完整本機資料範例位於：

- [`exampleSite/data/about.yaml`](exampleSite/data/about.yaml)
- [`exampleSite/data/links.yaml`](exampleSite/data/links.yaml)
- [`exampleSite/data/kit.yaml`](exampleSite/data/kit.yaml)
- [`exampleSite/data/brevity.yaml`](exampleSite/data/brevity.yaml)

陣列設定採用整體覆寫。自訂導覽、頁尾連結、推薦內容等列表時，需要寫出希望保留的完整陣列。

### 程式碼醒目提示

只有頁面包含程式碼區塊時才會載入 Shiki：

```yaml
params:
  solitude:
    highlight:
      enable: true
      copy: true
      line_numbers: true
      max_height: 360
      themes:
        light: github-light
        dark: github-dark
    cdn:
      shiki: https://esm.sh/shiki@4.4.3
```

`max_height: 0` 表示不限制高度。明暗主題會同時產生，並隨網站主題即時切換，無需重新醒目提示。

### 評論與統計

主題支援 Twikoo、Waline、Valine、Giscus 與 Artalk。Valine 還可以提供文章評論數、瀏覽次數、最近評論和評論彈幕。

正式網站應使用自己的服務設定和安全網域。Hugo 分支不再內建 busuanzi、Google AdSense、舊 CDN 版本拼接和 `css_prefix`；Valine 以外的瀏覽統計建議在網站端接入現代分析服務。

## 瀏覽器擴充 API

主題提供 `window.Solitude`，包含 `navigate`、`refresh`、`copy`、`toggleTheme`、`loadScript`、`loadStyle`、`on`、`listen` 與 `onPageCleanup`。

生命週期事件包括 `ready`、`beforeNavigate`、`afterNavigate` 與 `themeChange`。頁面層級的監聽器應透過 `listen` 或 `onPageCleanup` 註冊，以便在 PJAX 切頁時統一釋放。

## 從 Hexo 遷移

Hugo 分支只保留每項能力的唯一規範入口，不在執行階段相容 Hexo。遷移前請備份原網站，並重點檢查：

- 將 Hexo 設定對應到 Hugo 標準設定和 `params.solitude`
- 將 `updated`、永久連結和舊封存網址遷移到 Hugo front matter
- 將 `{% ... %}` 主題標籤替換為 Hugo shortcodes
- 依新資料結構遷移 About、Links、Equipment 與 Brevity 頁面
- 使用 `lightbox: fancybox | mediumZoom | false` 取代重複的燈箱開關

## 授權條款

[Apache-2.0](LICENSE)。二次創作請保留主題版權資訊。主題設計由 [@張洪 Heo](https://github.com/zhheo) 授權。
