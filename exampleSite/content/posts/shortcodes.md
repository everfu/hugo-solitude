---
title: Solitude Hugo Shortcode 使用指南
date: 2026-08-22T10:00:00+08:00
lastmod: 2026-08-25T10:00:00+08:00
slug: shortcode-showcase
description: 从基本写法、参数说明到实际效果，系统了解 Solitude Hugo 内置 shortcode。
cover: /img/demo/cover-shortcodes-v2.webp
categories: [内容组件]
tags: [Shortcode, Markdown, Hugo]
series: [官方示例]
recommend: true
toc: true
comment: true
locate: 组件示例
---

Shortcode 是 Hugo 在 Markdown 之外提供的内容组件语法。Solitude 用它承载提示框、标签页、图库、图表等富内容；迁移旧文章时，也应把 Hexo 外挂标签改写为对应的 Hugo shortcode。

{{< note type="info" >}}
本文既是使用手册，也是可构建的效果页。每个组件都按 **用途 → 写法 → 参数 → 效果** 展开，代码可以直接复制到 Markdown 文件中。
{{< /note >}}

## 开始之前

Hugo shortcode 有两种边界符：`{{</* shortcode */>}}` 适合普通参数，`{{%/* shortcode */%}}` 会先处理内部 Markdown。Solitude 的块级组件已经按各自用途处理正文，通常直接使用尖括号写法即可。

| 内容类型 | 推荐组件 | 适合场景 |
| --- | --- | --- |
| 行内强调 | `span`、`label`、`keyboard` | 一句话中的状态、术语或快捷键 |
| 块级提示 | `note`、`subnote`、`fold` | 说明、警告、补充资料 |
| 导航与引用 | `button`、`link`、`card` | 行动入口、站内外资源 |
| 结构化内容 | `tabs`、`timeline`、`gallery`、`series` | 分组、步骤、图片与文章集合 |
| 动态内容 | `mermaid`、`chartjs`、`typeit` | 流程、数据与动态文字 |

{{< note type="warning" style="simple" >}}
Shortcode 名称和参数区分大小写。块级组件还要成对书写结束标签，否则 Hugo 会在构建阶段直接报错。
{{< /note >}}

## 文本与状态

### 彩色文本与标签

`p` 用于整段文字，`span` 用于行内文字，`label` 用于短小的状态标记。颜色参数可使用 `blue`、`green`、`orange`、`red`、`purple` 等主题色名称。

**写法**

```go-html-template
{{</* p color="blue" */>}}这是一段蓝色文字{{</* /p */>}}
正文中的 {{</* span color="red" */>}}重点文字{{</* /span */>}}
{{</* label color="green" */>}}已完成{{</* /label */>}}
```

**效果**

{{< p color="blue" >}}这是一段蓝色文字，用于在正文中形成较强的段落提示。{{< /p >}}

正文中的 {{< span color="red" >}}重点文字{{< /span >}} 可以和普通内容自然排列。

{{< label color="green" >}}已完成{{< /label >}}
{{< label color="blue" >}}信息{{< /label >}}
{{< label color="orange" >}}注意{{< /label >}}
{{< label color="purple" >}}扩展{{< /label >}}

### 提示框

`note` 是主要提示组件，`subnote` 适合在一个主题下继续补充次级信息。

**写法**

```go-html-template
{{</* note type="info" style="flat" */>}}
提示内容，支持 Markdown。
{{</* /note */>}}

{{</* subnote type="warning" */>}}次级提示{{</* /subnote */>}}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| `type` | 否 | `info`、`success`、`warning`、`danger`、`primary` 或默认样式 |
| `style` | 否 | `flat`、`simple`、`modern`；默认使用 `flat` |
| 正文 | 是 | 支持 Markdown 的提示内容 |

**效果**

{{< note type="info" >}}信息提示适合解释前置条件或补充背景。{{< /note >}}
{{< note type="success" style="modern" >}}构建与内容检查已经通过，可以继续发布流程。{{< /note >}}
{{< note type="warning" style="simple" >}}修改配置后请重新构建站点，避免继续使用旧的资源指纹。{{< /note >}}
{{< note type="danger" >}}危险提示应只用于确实需要读者立即注意的问题。{{< /note >}}
{{< subnote type="warning" >}}这是紧跟主要内容的次级提醒。{{< /subnote >}}

### 选择、快捷键与隐藏文字

这组组件适合展示只读状态和行内补充信息。`checkbox` 与 `radio` 仅负责表达，不会提交表单。

```go-html-template
{{</* checkbox checked=true */>}}已完成事项{{</* /checkbox */>}}
{{</* radio checked=false */>}}未选择事项{{</* /radio */>}}
{{</* keyboard */>}}⌘ K{{</* /keyboard */>}}
{{</* spoiler */>}}移入或聚焦后显示{{</* /spoiler */>}}
{{</* bubble position="left" */>}}气泡消息{{</* /bubble */>}}
```

{{< checkbox checked=true >}}已完成事项{{< /checkbox >}}
{{< checkbox checked=false style="blue" >}}尚未完成事项{{< /checkbox >}}
{{< radio checked=true >}}已选择事项{{< /radio >}}
{{< checkbox checked=true style="plus" >}}新增检查项{{< /checkbox >}}

按下 {{< keyboard >}}⌘ K{{< /keyboard >}} 打开搜索；答案是 {{< spoiler >}}隐藏内容{{< /spoiler >}}。{{< bubble position="left" >}}气泡消息{{< /bubble >}}

## 链接、按钮与媒体

### 按钮与链接卡片

`button` 提供主题按钮，并通过 `option` 组合颜色、描边和整行样式；`link` 将链接呈现为带说明的资源卡片。站外链接会自动在新窗口打开并附带安全属性。

**写法**

```go-html-template
{{</* button url="https://gohugo.io/" text="Hugo 官网" icon="fas fa-link" */>}}
{{</* button url="/" text="描边按钮" icon="fas fa-house" option="blue outline" */>}}
{{</* link url="/" title="站内链接" desc="返回示例站首页" */>}}
```

| 参数 | 适用组件 | 说明 |
| --- | --- | --- |
| `url` | 全部 | 目标地址 |
| `text` | `button` | 按钮文字 |
| `icon` | `button` | 图标类名 |
| `option` | `button` | 可组合 `outline`、颜色、`block` 等样式 |
| `title` / `desc` | `link` | 卡片标题与说明 |

**效果**

{{< button url="https://gohugo.io/" text="Hugo 官网" icon="fas fa-arrow-up-right-from-square" >}}
{{< button url="/" text="描边按钮" icon="fas fa-house" option="blue outline" >}}
{{< button url="/" text="适合移动端换行的整行按钮" icon="fas fa-arrow-right" option="block" >}}

{{< link url="https://gohugo.io/" title="Hugo" desc="The world’s fastest framework for building websites" >}}
{{< link url="/" title="站内链接与超长标题在窄屏下的截断和换行验证" desc="返回示例站首页，检查移动端触控面积与键盘焦点状态。" >}}

### 图片

`img` 用于带说明的块级图片，`inlineImg` 用于跟随文字排列的小图片。

```go-html-template
{{</* img src="/img/default.avif" alt="示例图片" caption="主题默认封面" */>}}
{{</* inlineImg src="/img/logo.png" alt="Logo" height="24px" */>}}
```

{{< img src="/img/demo/cover-shortcodes-v2.webp" alt="Solitude Shortcode 示例封面" caption="本地 Shortcode 示例素材" >}}

Solitude {{< inlineImg src="/img/logo.png" alt="Solitude Logo" height="24px" >}} 与 Hugo 可以出现在同一行文字中。

### 视频与音频

YouTube、哔哩哔哩、原生音频和原生视频分别使用独立组件。外部媒体是否可播放仍取决于来源站点、网络环境与浏览器策略。

```go-html-template
{{</* youtube id="dQw4w9WgXcQ" */>}}
{{</* bvideo bvid="BV1xx411c7mD" */>}}
{{</* audio url="/media/example.mp3" name="示例音频" */>}}
{{</* video url="/media/example.mp4" poster="/img/default.avif" */>}}
```

{{< youtube id="dQw4w9WgXcQ" >}}
{{< bvideo bvid="BV1xx411c7mD" >}}
{{< audio url="/media/shortcodes/t-rex-roar.mp3" name="本地示例音频" >}}
{{< video url="/media/shortcodes/flower.mp4" poster="/img/demo/cover-shortcodes-v2.webp" >}}

## 折叠、隐藏与卡片

### 折叠面板

`fold` 使用原生 `details` 结构，支持鼠标、触摸和键盘操作。添加 `open=true` 可让内容默认展开。

```go-html-template
{{</* fold title="展开内容" open=true */>}}
折叠区域内支持 **Markdown**。
{{</* /fold */>}}
```

{{< fold title="展开内容" >}}折叠区域内支持 **Markdown**。{{< /fold >}}

{{< fold title="默认展开的长标题折叠面板，用于检查移动端省略和多行正文布局" open=true >}}
展开状态同样使用柔和表面、清晰分隔和可见的键盘焦点，不依赖鼠标悬停。
{{< /fold >}}

### 点击后显示

三个隐藏组件的区别只在呈现方式：`hideInline` 适合一句话，`hideBlock` 适合独立内容块，`hideToggle` 适合带标题的可切换区域。

```go-html-template
{{</* hideInline text="查看答案" */>}}答案{{</* /hideInline */>}}
{{</* hideBlock text="展开内容" */>}}块级内容{{</* /hideBlock */>}}
{{</* hideToggle title="阅读更多" */>}}可切换内容{{</* /hideToggle */>}}
```

哪个组件适合藏在一句话里？{{< hideInline text="查看答案" >}}hideInline{{< /hideInline >}}

{{< hideBlock text="点击展开" >}}块级隐藏内容可以包含 **Markdown**。{{< /hideBlock >}}
{{< hideToggle title="可切换内容" >}}这里同样支持 Markdown，并保留明确的展开状态。{{< /hideToggle >}}

### 内容卡片

`card` 用于推荐项目、文章或资源。封面是可选项，没有封面时会自动切换到纯内容布局。

```go-html-template
{{</* card title="Hugo 卡片" url="https://gohugo.io/"
    cover="/img/default.avif" tag="资源" star="5" */>}}
卡片说明
{{</* /card */>}}
```

| 参数 | 说明 |
| --- | --- |
| `title` | 卡片标题，也可使用 `name` |
| `url` | 可选的跳转地址 |
| `cover` | 可选封面，也可使用 `bg` |
| `tag` / `star` | 分类标签与评分 |
| `width` / `height` | 可选尺寸，建议优先沿用默认响应式宽度 |

{{< card title="Hugo 卡片" url="https://gohugo.io/" cover="/img/demo/cover-shortcodes-v2.webp" tag="封面卡片" star="5" >}}展示主题与重点内容{{< /card >}}
{{< card title="无封面卡片" url="https://gohugo.io/" tag="纯内容" star="4" >}}简洁，也保持完整层级{{< /card >}}

## 数据与可视化

### Mermaid 流程图

`mermaid` 直接接收 Mermaid 语法，适合流程图、时序图、状态图等结构化图形。

```go-html-template
{{</* mermaid */>}}
flowchart LR
  Hexo --> Hugo
  Hugo --> HTML
{{</* /mermaid */>}}
```

{{< mermaid >}}
flowchart LR
  Hexo --> Hugo
  Hugo --> HTML
{{< /mermaid >}}

### Chart.js 图表

`chartjs` 支持 `id`、`layout`、`width` 和 `description` 参数。正文必须是合法 JSON。

```go-html-template
{{</* chartjs description="三期构建趋势" */>}}
{"type":"line","data":{"labels":["一","二","三"],"datasets":[{"label":"趋势","data":[1,3,2]}]}}
{{</* /chartjs */>}}
```

{{< chartjs description="三期构建趋势" >}}
{"type":"line","data":{"labels":["一","二","三"],"datasets":[{"label":"趋势","data":[1,3,2]}]}}
{{< /chartjs >}}

### 乐谱与动态文字

`score` 使用 ABC 记谱文本，`typeit` 用 `speed` 控制逐字显示速度。

```go-html-template
{{</* typeit speed="60" */>}}TypeIt 动态文本{{</* /typeit */>}}
```

{{< score >}}
X:1
T:Hugo migration
M:4/4
K:C
C D E F|G A B c|
{{< /score >}}

{{< typeit speed="60" >}}TypeIt 动态文本{{< /typeit >}}

## 仓库与站点资源

### 仓库卡片

四个仓库组件使用同样的 `repo="组织/仓库"` 写法；自建 Gitea 还需要提供 `host`。仓库数据由浏览器访问对应平台 API，因此加载状态可能受网络或频率限制影响。

```go-html-template
{{</* github repo="gohugoio/hugo" */>}}
{{</* gitlab repo="gitlab-org/gitlab" */>}}
{{</* gitee repo="mirrors/hugo" */>}}
{{</* gitea repo="go-gitea/gitea" host="https://gitea.com" */>}}
```

{{< github repo="gohugoio/hugo" >}}
{{< gitlab repo="gitlab-org/gitlab" >}}
{{< gitee repo="mirrors/hugo" >}}
{{< gitea repo="go-gitea/gitea" host="https://gitea.com" >}}

### 友链列表

`flink` 的正文是 YAML 数据。一个组件可以包含多个分组，每个分组下可以继续放置多个站点。

```go-html-template
{{</* flink */>}}
- class_name: 官方资源
  class_desc: Hugo 官方网站
  link_list:
    - name: Hugo
      link: https://gohugo.io/
      avatar: https://gohugo.io/images/hugo-logo-wide.svg
      descr: 世界上最快的网站构建框架
{{</* /flink */>}}
```

{{< flink >}}
- class_name: 官方资源
  class_desc: Hugo 官方网站
  link_list:
    - name: Hugo
      link: https://gohugo.io/
      avatar: https://gohugo.io/images/hugo-logo-wide.svg
      descr: 世界上最快的网站构建框架
{{< /flink >}}

## 布局与内容集合

### 图库与图库分组

`gallery` 负责瀑布流容器，内部使用 `galleryItem` 放置不同宽高的图片；`columns` 可指定桌面端列数。`galleryGroup` 则用于创建带封面、说明和链接的图库入口。

```go-html-template
{{</* gallery columns="2" */>}}
{{</* galleryItem src="/img/default.avif" alt="Gallery 1" */>}}
{{</* galleryItem src="/img/default.avif" alt="Gallery 2" */>}}
{{</* galleryItem src="/img/default.avif" alt="Gallery 3" */>}}
{{</* galleryItem src="/img/default.avif" alt="Gallery 4" */>}}
{{</* /gallery */>}}
```

{{< gallery columns="2" >}}
{{< galleryItem src="/img/demo/about/music-listening-v2.webp" alt="音乐主题示例图片" >}}
{{< galleryItem src="/img/demo/generated/solitude-crystal-orbit.png" alt="Solitude 水晶轨道" >}}
{{< galleryItem src="/img/demo/about/personality-enfj-v2.png" alt="ENFJ 性格主题图片" >}}
{{< galleryItem src="/img/demo/about/personal-photo-selfie-wide.png" alt="宽幅生活照片" >}}
{{< galleryItem src="/img/demo/about/game-apex-v1.webp" alt="游戏主题示例图片" >}}
{{< /gallery >}}

{{< galleryGroup title="图库分组" img="/img/demo/cover-shortcodes-v2.webp" url="/" >}}用于聚合同一主题下的一组图片。{{< /galleryGroup >}}

### 标签页

`tabs` 作为容器，每个 `tab` 提供标题和内容。为同一篇文章里的每组标签页设置唯一 `id`，可以避免状态互相影响。

```go-html-template
{{</* tabs id="demo-tabs" */>}}
{{</* tab title="第一个" */>}}第一个标签页{{</* /tab */>}}
{{</* tab title="第二个" */>}}第二个标签页{{</* /tab */>}}
{{</* /tabs */>}}
```

{{< tabs id="demo-tabs" >}}
{{< tab title="第一个" >}}第一个标签页{{< /tab >}}
{{< tab title="第二个" >}}第二个标签页{{< /tab >}}
{{< tab title="用于验证横向滚动的较长标签标题" >}}窄屏下标签导航可以横向滚动，并保留完整的键盘操作。{{< /tab >}}
{{< /tabs >}}

### 时间线

时间线由 `timeline` 和一个或多个 `timenode` 组成。时间与标题应保持简短，详细说明放在节点正文中。

```go-html-template
{{</* timeline title="迁移时间线" */>}}
{{</* timenode time="2026-08-21" title="Hugo 版本" */>}}
完成原生主题迁移。
{{</* /timenode */>}}
{{</* /timeline */>}}
```

{{< timeline title="迁移时间线" >}}
{{< timenode time="2026-08-21" title="Hugo 版本" >}}完成原生主题迁移。{{< /timenode >}}
{{< timenode time="2026-08-25" title="文档重组" >}}补充写法、参数与真实效果，让组件更容易检索和复用。{{< /timenode >}}
{{< /timeline >}}

### 系列文章与视频集合

`series` 会读取文章 Front Matter 中同名的 `series`，并按日期生成文章列表。`videos` 则把正文中的每行地址渲染为一个原生视频播放器。

```go-html-template
{{</* series name="官方示例" */>}}

{{</* videos col="2" */>}}
/media/shortcodes/flower.mp4
/media/shortcodes/friday.mp4
{{</* /videos */>}}
```

{{< series name="官方示例" >}}

{{< videos col="2" >}}
/media/shortcodes/flower.mp4
/media/shortcodes/friday.mp4
{{< /videos >}}

## 使用建议

1. 先用标准 Markdown 完成正文，只在标准语法无法表达时引入 shortcode。
2. 一个组件解决一种内容关系，避免为了装饰而层层嵌套。
3. 图片和媒体补全替代文本或标题，并优先选择稳定、可控的资源地址。
4. 发布前执行完整构建，再在桌面端与移动端检查长标题、代码块、表格和交互组件。

{{< note type="success" style="modern" >}}
如果你正在迁移 Hexo 文章，可以先按组件名称替换旧标签，再对照本文逐项调整参数。这样比一次性改写整篇文章更容易定位构建错误。
{{< /note >}}
