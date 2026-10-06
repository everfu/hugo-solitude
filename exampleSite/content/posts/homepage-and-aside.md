---
title: 配置首页推荐与侧栏组合
date: 2026-08-24T10:00:00+08:00
lastmod: 2026-08-24T10:00:00+08:00
slug: homepage-and-aside
aliases:
  - /p/pagination-four.html
description: 使用现有配置完成首页推荐、作者信息、最新文章、目录和站点统计，不引入额外插件。
cover: /img/demo/cover-pagination-v2.webp
categories: [配置指南]
tags: [首页, 侧栏, Hugo]
series: [官方示例]
recommend: true
toc: true
comment: true
locate: 配置示例
---

线上演示站通过首页推荐和侧栏卡片帮助访客快速理解站点。Hugo 版本已经把这些能力收进主题配置：内容来自站点数据，不需要服务端接口，也不需要额外的侧栏插件。

## 首页标题与推荐内容

首页顶部由 `params.solitude.hometop` 控制。推荐项最多展示五条；配置不足五条时，主题会按发布日期自动补入最近文章。

```yaml
params:
  solitude:
    hometop:
      enable: true
      banner:
        title: 用 Solitude<br>记录与创造
        desc: Hugo 主题演示、配置指南与前端实践
      recommendList:
        - title: 开始使用 Solitude Hugo
          url: /p/getting-started.html
          cover: /img/demo/cover-getting-started-v2.webp
          label: 快速开始
          color: "#3b82f6"
        - title: 配置首页推荐与侧栏组合
          url: /p/homepage-and-aside.html
          cover: /img/demo/cover-pagination-v2.webp
          label: 配置指南
          color: "#16a34a"
```

`url` 应当使用文章最终生成的地址，`cover` 则应放在站点 `static/` 下或指向稳定的远程资源。首页卡片会复用文章标题、分类和封面，因此不必为自动补入的文章重复维护数据。

如果某篇文章不适合出现在首页，可在它的 Front Matter 中设置：

```yaml
home: false
```

该文章会从首页文章列表、手动或自动推荐以及首页“最近文章”侧栏中隐藏，但仍会保留在归档、分类、搜索、RSS 和文章直达页中。

## 组合不同页面的侧栏

侧栏支持四个内置组件：

- `about`：站点或作者信息卡。
- `newestPost`：最近发布的五篇文章。
- `allInfo`：标签与文章数、字数、运行时间等站点信息。
- `newest_comment`：启用受支持评论服务后展示最近评论。

每种页面可以分别声明普通区域和吸顶区域：

```yaml
params:
  solitude:
    aside:
      position: 1
      home:
        noSticky: about
        Sticky: allInfo
      post:
        noSticky: about
        Sticky: newestPost,allInfo
      page:
        noSticky: about
        Sticky: newestPost,allInfo
```

组件名称使用逗号分隔。文章存在 Markdown 标题并且没有设置 `toc: false` 时，目录会自动插入吸顶区域，不需要把 `toc` 写进组件列表。

## 完善信息卡与站点统计

```yaml
params:
  author:
    name: Solitude
  solitude:
    aside:
      my_card:
        author:
          img: https://github.com/everfu.png
          emoji: "😊"
        description: 简洁、优雅、功能丰富的 Hugo 主题。
        content: 这里集中展示页面能力、配置方式与真实使用示例。
        witty_words:
          - 让内容自然成为主角
          - 从一个配置开始
        information:
          - name: GitHub
            url: https://github.com/everfu/hugo-solitude
            icon: fab fa-github
      siteinfo:
        postcount: true
        wordcount: true
        updatetime: true
        runtimeenable: true
        runtime: 2023-04-20 00:00:00
```

文章总数、标签和字数都来自 Hugo 页面集合；运行时间只需要一个固定起始日期。这样生成的卡片会随着内容更新，无需维护重复统计数据。

## 页面级控制

在个别页面的 Front Matter 中设置 `aside: false` 可以关闭侧栏，设置 `toc: false` 可以关闭目录。关于页、友链页以及分类和标签总览使用主题定义的全宽布局，不需要重复声明。
