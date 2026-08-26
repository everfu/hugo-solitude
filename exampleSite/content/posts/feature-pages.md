---
title: 用数据文件构建特色页面
date: 2026-08-23T10:00:00+08:00
lastmod: 2026-08-23T10:00:00+08:00
slug: feature-pages
aliases:
  - /p/pagination-five.html
description: 用 Hugo 数据文件维护关于、友链、装备和即刻短文页面，让内容与模板保持分离。
cover: /img/demo/cover-pagination-page-two-v2.webp
categories: [配置指南]
tags: [数据文件, 特色页面, Hugo]
series: [官方示例]
toc: true
comment: true
locate: 数据示例
---

Solitude 的特色页面使用 Hugo 分支包与数据文件协作：`_index.md` 决定页面地址和类型，`data/` 中的 YAML 保存可重复维护的内容。调整数据即可更新页面，无需复制模板。

## 创建页面入口

以装备页为例，创建 `content/equipment/_index.md`：

```yaml
---
title: 我的装备
type: kit
data: kit
aliases:
  - /kit/
---
```

`type` 用于选择 Solitude 的专用模板；`data` 可以把默认的 `data/kit.yaml` 改成其他文件名。关于、友链和即刻短文分别使用 `about`、`links` 与 `brevity` 类型。

## 关于页的模块顺序

`data/about.yaml` 必须使用模块化的 `sections` 数组，列表顺序就是最终展示顺序：

```yaml
title: 关于 Solitude
sections:
  - type: intro
    greeting: 你好，欢迎了解 Solitude
    name_prefix: 这是
    name: Solitude
    description: 一款专注内容体验的 Hugo 主题

  - type: values
    motto:
      label: 设计原则
      prefix: 内容优先
      content: 克制表达
    expertise:
      label: 主题能力
      prefix: 专注于
      specialist: 阅读体验
      content: 长期维护
      level: 原生
```

主题只接受已经定义的模块类型，未知类型会让构建明确失败。项目示例使用项目历程和技术能力，不使用个人履历作为默认数据。

## 友链数据与展示类型

友链页读取 `data/links.yaml`。每个分组可以使用 `card`、`item` 或 `discn`：

```yaml
links:
  - class_name: 官方资源
    class_desc: Solitude 文档与代码仓库
    type: card
    link_list:
      - name: Solitude Docs
        link: https://solitude.js.org/
        avatar: /img/logo.png
        topimg: /img/demo/cover-getting-started-v2.webp
        descr: Solitude 的安装、配置与迁移文档
```

当条目数量达到 `params.solitude.page.links.async_threshold` 时，主题会从首页生成的 `links.json` 异步读取数据；少量数据则直接输出，二者共享同一份 YAML。

## 装备清单

`data/kit.yaml` 使用分组和条目组织内容：

```yaml
groups:
  - name: 生产力
    description: 提升自己生产效率的硬件设备
    items:
      - name: 群晖 DS920+
        specification: 性价比超高
        description: 很棒的网络存储解决方案以及流媒体传输服务器
        image: https://example.com/synology.png
```

条目中的名称可以点击复制，链接会显示为详情入口。图片建议使用本地资源，保证离线预览和生产构建结果一致。

## 即刻短文

`data/brevity.yaml` 适合记录项目进展或轻量动态：

```yaml
items:
  - date: 2026-08-25T10:00:00+08:00
    content: Solitude Hugo 官方示例站完成内容重写。
    location: 项目仓库
    image:
      - /img/demo/cover-getting-started-v2.webp
```

每条动态可以包含图片、位置、链接、音乐或视频。页面只读取配置允许的最近条数，因此数据文件可以持续追加而无需修改模板。
