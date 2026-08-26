---
title: 开始使用 Solitude Hugo
date: 2026-08-25T10:00:00+08:00
lastmod: 2026-08-25T10:00:00+08:00
slug: getting-started
abbrlink: 10001
description: 从安装主题到完成第一次生产构建，建立一个可继续扩展的 Solitude Hugo 站点。
cover: /img/demo/cover-getting-started-v2.webp
categories: [快速开始]
tags: [Hugo, Solitude]
series: [官方示例]
recommend: true
toc: true
comment: true
locate: 项目文档
---

Solitude 是一款注重内容体验的 Hugo 主题。它使用 Go Templates 组织页面，通过 Hugo Pipes 处理样式和 TypeScript；站点构建只需要 Hugo，不需要额外安装 Node.js、PostCSS、Sass 或 Stylus。

## 准备环境

请安装 Hugo `v0.164.0` 或更高版本。官方发行版已经包含主题需要的模板和资源处理能力，可以通过下面的命令确认版本：

```shell
hugo version
```

## 安装主题

在 Hugo 站点根目录把 Solitude 添加为 Git submodule：

```shell
git submodule add -b hugo https://github.com/everfu/hugo-solitude.git themes/solitude
```

随后在站点的 `hugo.yaml` 中启用主题，并声明搜索与友链数据使用的输出格式：

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

主题仓库中的 `exampleSite/hugo.yaml` 是完整配置起点。复制时建议保留配置层级，再逐项替换站点名称、导航、首页推荐、侧栏和页脚内容。

## 创建第一篇文章

Solitude 使用 Hugo 标准内容模型。文章放在 `content/posts/`，分类、标签、封面和目录都由 Front Matter 控制：

```yaml
---
title: 我的第一篇文章
date: 2026-08-25T10:00:00+08:00
slug: hello-solitude
description: 使用 Solitude Hugo 发布的第一篇内容。
cover: /img/my-cover.webp
categories: [记录]
tags: [Hugo, Solitude]
toc: true
comment: true
---
```

正文继续使用标准 Markdown。标题会生成文章目录，分类和标签会进入 Hugo Taxonomies，主题还会直接读取字数、阅读时间、相关文章和上一篇/下一篇。

## 本地预览与生产构建

在普通站点中运行：

```shell
hugo server
```

如果正在主题仓库中预览随附示例站，应同时加载主题根配置：

```shell
hugo server --source exampleSite --themesDir ../.. --theme solitude
```

生产构建使用同一套内容和配置：

```shell
hugo --gc --minify
```

生成结果包括首页、文章、分类、标签、归档、RSS、Sitemap、`search.xml` 与 `links.json`。接下来可以阅读《配置首页推荐与侧栏组合》和《用数据文件构建特色页面》，继续完善站点内容。
