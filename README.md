[English](README_en-US.md)｜简体中文｜[繁體中文](README_zh-Hant.md)｜[Español](README_es-ES.md)

<div align="center">
  <img width="50%" src="https://raw.githubusercontent.com/everfu/hugo-solitude/hugo/.github/logo.avif" alt="Solitude">
  <hr>
  <p>为内容创作者打造的优雅、完整且无需 Node.js 的 Hugo 主题。</p>
</div>

Solitude for Hugo 是 [Hexo Theme Solitude](https://github.com/everfu/hexo-theme-solitude) 的原生 Hugo 实现。使用 Hugo 模板、Pipes、Menus、Taxonomies、Page Collections 实现。

熟悉的视觉语言、内容卡片、侧栏、特殊页面和交互能力，同时将站点配置统一到 Hugo 标准配置与 `params.solitude` 下。新站点可以直接从 [`exampleSite`](exampleSite) 开始。

## 特性

- 完整的首页、文章、归档、分类、标签、分页、404 与响应式布局
- About、Links、Equipment、Music、Message、Brevity、Recent Comments 等特殊页面
- 原生 RSS、Sitemap、robots.txt、Related Content、目录、字数与阅读时长
- PJAX、明暗模式、本地搜索、快捷键、右键菜单、灯箱、音乐与评论集成
- Twikoo、Waline、Valine、Giscus 与 Artalk 评论服务
- 与 `hexo-solitude-tag 2.0` 能力对应的 Hugo shortcodes
- 浏览器端按需加载 Shiki，支持亮暗双主题、行号与长代码展开
- 使用 Hugo `css.Build` 与 `js.Build` 编译模块化 CSS 和 TypeScript
- 构建过程不依赖 Node.js、npm、PostCSS、Sass 或 Stylus

## 环境要求

- Hugo v0.164.0 或更高版本
- Git（使用 submodule 安装时需要）

## 安装

在 Hugo 站点根目录中，将主题添加到 `themes/solitude`：

```bash
git submodule add -b hugo https://github.com/everfu/hugo-solitude.git themes/solitude
```

在站点的 `hugo.yaml` 中启用主题，并声明 Solitude 使用的输出格式：

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

完整配置可以从 [`exampleSite/hugo.yaml`](exampleSite/hugo.yaml) 复制，再按站点需要修改。

## 快速预览

在主题仓库根目录运行示例站：

```bash
hugo server --source exampleSite --themesDir ../.. --theme solitude
```

生成生产构建：

```bash
hugo --source exampleSite --themesDir ../.. --theme solitude --gc --minify
```

示例站包含首页推荐、侧栏组合、文章、特殊页面、评论容器、shortcodes 与本地数据文件，可作为新站点的可运行起点。

## 配置与内容

Hugo 标准能力使用标准配置，Solitude 专属能力统一位于 `params.solitude`。主题尽量沿用原有 `nav`、`post`、`aside`、`comment` 与 `search` 层级，但不会读取已废弃的 Hexo 字段。

文章可直接使用以下 front matter：

```yaml
title: 我的第一篇文章
date: 2026-08-26
lastmod: 2026-08-26
description: 文章摘要
cover: /img/cover.webp
categories: [随笔]
tags: [Hugo, Solitude]
comment: true
aside: true
toc: true
home: true
```

设置 `home: false` 可让文章不出现在首页文章列表、首页推荐和首页最近文章侧栏中；该字段缺省或设为 `true` 时正常展示，归档、分类、搜索、RSS 与文章页面不受影响。Hexo 的 `updated` 应改为 Hugo 的 `lastmod`。全部 shortcode 的可构建示例见 [`exampleSite/content/posts/shortcodes.md`](exampleSite/content/posts/shortcodes.md)。

### 自定义样式

主题样式从 `assets/css/solitude/main.css` 单入口构建，并按基础、布局、组件、页面、shortcode 与集成模块维护。

站点如需覆盖样式，请创建自己的 `assets/css/custom.css`。Hugo 会在主题样式之后独立编译并加载它，无需复制主题文件或使用 `!important`。

### 特殊页面数据

About、Links、Equipment 与 Brevity 的完整本地数据示例位于：

- [`exampleSite/data/about.yaml`](exampleSite/data/about.yaml)
- [`exampleSite/data/links.yaml`](exampleSite/data/links.yaml)
- [`exampleSite/data/kit.yaml`](exampleSite/data/kit.yaml)
- [`exampleSite/data/brevity.yaml`](exampleSite/data/brevity.yaml)

数组配置采用整体覆盖。自定义导航、页脚链接、推荐内容等列表时，需要写出希望保留的完整数组。

### 代码高亮

代码高亮仅在页面包含代码块时加载 Shiki：

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

`max_height: 0` 表示不限制高度。亮暗主题会同时生成，并随站点主题即时切换，无需重新高亮。

### 评论与统计

主题支持 Twikoo、Waline、Valine、Giscus 与 Artalk。Valine 还可以提供文章评论数、访问量、最近评论和评论弹幕。

生产站点应使用自己的服务配置和安全域名。Hugo 分支不再内置 busuanzi、Google AdSense、旧 CDN 版本拼接和 `css_prefix`；Valine 之外的访问统计建议接入站点自己的现代分析服务。

## 浏览器扩展 API

主题提供 `window.Solitude`，包含 `navigate`、`refresh`、`copy`、`toggleTheme`、`loadScript`、`loadStyle`、`on`、`listen` 与 `onPageCleanup`。

生命周期事件包括 `ready`、`beforeNavigate`、`afterNavigate` 与 `themeChange`。页面级监听器应通过 `listen` 或 `onPageCleanup` 注册，以便在 PJAX 切页时统一释放。

## 从 Hexo 迁移

Hugo 分支只保留每项能力的唯一规范入口，不在运行时兼容 Hexo。迁移前请备份原站点，并重点检查：

- 将 Hexo 配置映射到 Hugo 标准配置和 `params.solitude`
- 将 `updated`、永久链接和旧归档地址迁移到 Hugo front matter
- 将 `{% ... %}` 主题标签替换为 Hugo shortcodes
- 按新数据结构迁移 About、Links、Equipment 与 Brevity 页面
- 使用 `lightbox: fancybox | mediumZoom | false` 取代重复的灯箱开关

## 许可证

[Apache-2.0](LICENSE)。二次创作请保留主题版权信息。主题设计由 [@张洪 Heo](https://github.com/zhheo) 授权。
