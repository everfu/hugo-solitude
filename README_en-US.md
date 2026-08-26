[简体中文](README.md) | English | [繁體中文](README_zh-Hant.md) | [Español](README_es-ES.md)

<div align="center">
  <img width="50%" src="https://raw.githubusercontent.com/everfu/hugo-solitude/hugo/.github/logo.avif" alt="Solitude">
  <hr>
  <p>An elegant, complete Hugo theme for content creators—with no Node.js required.</p>
</div>

Solitude for Hugo is a native Hugo implementation of [Hexo Theme Solitude](https://github.com/everfu/hexo-theme-solitude). It is built with Hugo templates, Pipes, Menus, Taxonomies, and Page Collections.

It retains the familiar visual language, content cards, sidebars, special pages, and interactions while consolidating site configuration into Hugo's standard settings and `params.solitude`. New sites can start directly from [`exampleSite`](exampleSite).

## Features

- Complete home, post, archive, category, tag, pagination, 404, and responsive layouts
- Special pages for About, Links, Equipment, Music, Message, Brevity, and Recent Comments
- Native RSS, sitemap, robots.txt, Related Content, table of contents, word count, and reading time
- PJAX, light and dark modes, local search, keyboard shortcuts, context menu, lightbox, music, and comment integrations
- Twikoo, Waline, Valine, Giscus, and Artalk comment providers
- Hugo shortcodes corresponding to the capabilities of `hexo-solitude-tag 2.0`
- On-demand Shiki loading in the browser, with paired light and dark themes, line numbers, and expandable long code blocks
- Modular CSS and TypeScript built with Hugo `css.Build` and `js.Build`
- No Node.js, npm, PostCSS, Sass, or Stylus required during the build

## Requirements

- Hugo v0.164.0 or later
- Git (when installing the theme as a submodule)

## Installation

From the root of your Hugo site, add the theme under `themes/solitude`:

```bash
git submodule add -b hugo https://github.com/everfu/hugo-solitude.git themes/solitude
```

Enable the theme in your site's `hugo.yaml` and declare the output formats used by Solitude:

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

Copy [`exampleSite/hugo.yaml`](exampleSite/hugo.yaml) for a complete starting configuration, then adjust it for your site.

## Quick preview

Run the example site from the theme repository root:

```bash
hugo server --source exampleSite --themesDir ../.. --theme solitude
```

Create a production build:

```bash
hugo --source exampleSite --themesDir ../.. --theme solitude --gc --minify
```

The example site includes homepage recommendations, sidebar combinations, posts, special pages, comment containers, shortcodes, and local data files, making it a runnable starting point for a new site.

## Configuration and content

Use Hugo's standard configuration for native Hugo features. Solitude-specific options live under `params.solitude`. The theme keeps the familiar `nav`, `post`, `aside`, `comment`, and `search` hierarchy where possible, but it does not read deprecated Hexo fields.

Posts can use front matter such as:

```yaml
title: My first post
date: 2026-08-26
lastmod: 2026-08-26
description: A short post summary
cover: /img/cover.webp
categories: [Notes]
tags: [Hugo, Solitude]
comment: true
aside: true
toc: true
```

Replace Hexo's `updated` with Hugo's `lastmod`. Buildable examples of every shortcode are available in [`exampleSite/content/posts/shortcodes.md`](exampleSite/content/posts/shortcodes.md).

### Custom styles

Theme styles are built from the single `assets/css/solitude/main.css` entry and organized into foundation, layout, component, page, shortcode, and integration modules.

To override styles, create `assets/css/custom.css` in your site. Hugo compiles and loads it separately after the theme stylesheet, so you do not need to copy theme files or use `!important`.

### Special-page data

Complete local data examples for About, Links, Equipment, and Brevity are available at:

- [`exampleSite/data/about.yaml`](exampleSite/data/about.yaml)
- [`exampleSite/data/links.yaml`](exampleSite/data/links.yaml)
- [`exampleSite/data/kit.yaml`](exampleSite/data/kit.yaml)
- [`exampleSite/data/brevity.yaml`](exampleSite/data/brevity.yaml)

Array settings are replaced as a whole. When customizing navigation, footer links, recommendations, or similar lists, include the complete array you want to keep.

### Syntax highlighting

Shiki is loaded only when a page contains code blocks:

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

Set `max_height: 0` for unlimited height. Both themes are generated together and switch instantly with the site theme without re-highlighting the code.

### Comments and analytics

The theme supports Twikoo, Waline, Valine, Giscus, and Artalk. Valine can also provide post comment counts, page views, recent comments, and comment barrages.

Production sites should use their own service configuration and security domains. The Hugo branch no longer bundles busuanzi, Google AdSense, legacy CDN version concatenation, or `css_prefix`. For analytics outside Valine, connect a modern analytics service at the site level.

## Browser extension API

The theme exposes `window.Solitude` with `navigate`, `refresh`, `copy`, `toggleTheme`, `loadScript`, `loadStyle`, `on`, `listen`, and `onPageCleanup`.

Lifecycle events include `ready`, `beforeNavigate`, `afterNavigate`, and `themeChange`. Register page-level listeners through `listen` or `onPageCleanup` so they are released consistently during PJAX navigation.

## Migrating from Hexo

The Hugo branch keeps one canonical entry for each capability and does not provide runtime Hexo compatibility. Back up your existing site before migrating, and pay particular attention to:

- Mapping Hexo settings to Hugo's standard configuration and `params.solitude`
- Moving `updated`, permalinks, and legacy archive URLs to Hugo front matter
- Replacing `{% ... %}` theme tags with Hugo shortcodes
- Migrating About, Links, Equipment, and Brevity to their new data structures
- Replacing duplicate lightbox switches with `lightbox: fancybox | mediumZoom | false`

## License

[Apache-2.0](LICENSE). Derivative works must retain the theme copyright notice. The theme design is licensed by [@张洪 Heo](https://github.com/zhheo).
