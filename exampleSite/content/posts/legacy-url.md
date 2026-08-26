---
title: 从 Hexo 迁移到 Hugo：URL 与 Front Matter
date: 2026-08-21T10:00:00+08:00
lastmod: 2026-08-21T10:00:00+08:00
slug: "20260818"
abbrlink: "20260818"
aliases:
  - /archives/2026/08/18/legacy-url/
description: 将 Hexo 的文章元数据和 abbrlink 地址迁移到 Hugo，并为历史链接保留兼容入口。
cover: /img/demo/cover-legacy-url-v2.webp
categories: [迁移指南]
tags: [Hexo, Hugo, URL]
series: [官方示例]
toc: true
comment: true
locate: 迁移指南
---

从 Hexo 迁移到 Hugo 时，Markdown 正文通常可以直接复用，真正需要仔细处理的是 Front Matter、固定链接和旧地址。Solitude Hugo 保留常用文章参数，同时使用 Hugo 的原生字段表达更新日期和 URL 兼容关系。

## Front Matter 字段映射

| Hexo | Hugo | 说明 |
| --- | --- | --- |
| `date` | `date` | 文章发布日期 |
| `updated` | `lastmod` | 最后更新时间 |
| `abbrlink` | `slug` | 用原短链接值生成文章地址 |
| `categories` | `categories` | 进入 Hugo 分类 Taxonomy |
| `tags` | `tags` | 进入 Hugo 标签 Taxonomy |
| `top` | `weight` 或自定义字段 | 根据站点排序策略决定 |

`cover`、`description`、`comment`、`aside`、`toc`、`series` 等 Solitude 参数可以继续放在文章 Front Matter 中。

## 保留 abbrlink 地址

示例站在 `hugo.yaml` 中使用：

```yaml
uglyURLs:
  posts: true

permalinks:
  posts: /p/:slug
```

文章把原 Hexo `abbrlink` 复制到 `slug`：

```yaml
---
title: 从 Hexo 迁移到 Hugo
slug: "20260818"
abbrlink: "20260818"
aliases:
  - /archives/2026/08/18/legacy-url/
---
```

最终文章地址仍是 `/p/20260818.html`，分类和标签则继续使用 Hugo 的目录地址。保留 `abbrlink` 字段可以记录迁移来源，真正参与 Hugo 路由生成的是 `slug`。

## 为其他旧地址添加 aliases

`aliases` 中可以列出曾经公开过的文章路径。Hugo 会为这些地址生成跳转页，让搜索引擎和外部引用继续到达新文章。

如果旧站同时存在 `.html` 地址和以 `/` 结尾的目录地址，应在部署平台检查最终重定向规则。Hugo 可以生成静态 alias，但 CDN 或托管平台是否自动补全目录索引，取决于部署环境。

## 迁移内容组件

Hugo 不解析旧的 Hexo 标签语法。文章中的 Solitude 外挂标签应改成 Hugo shortcode；例如提示框使用 `note`，标签页使用 `tabs` 与 `tab`，图表和 Mermaid 继续使用对应的同名 shortcode。完整可构建写法可参考《Solitude Hugo Shortcode 使用指南》。
