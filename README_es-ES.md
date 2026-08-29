[简体中文](README.md) | [English](README_en-US.md) | [繁體中文](README_zh-Hant.md) | Español

<div align="center">
  <img width="50%" src="https://raw.githubusercontent.com/everfu/hugo-solitude/hugo/.github/logo.avif" alt="Solitude">
  <hr>
  <p>Un tema de Hugo elegante, completo y sin Node.js, creado para quienes publican contenido.</p>
</div>

Solitude para Hugo es una implementación nativa para Hugo de [Hexo Theme Solitude](https://github.com/everfu/hexo-theme-solitude). Está construida con plantillas, Pipes, Menus, Taxonomies y Page Collections de Hugo.

Conserva el lenguaje visual, las tarjetas de contenido, las barras laterales, las páginas especiales y las interacciones conocidas, al tiempo que unifica la configuración del sitio mediante las opciones estándar de Hugo y `params.solitude`. Los sitios nuevos pueden partir directamente de [`exampleSite`](exampleSite).

## Características

- Diseños completos y adaptables para inicio, artículos, archivos, categorías, etiquetas, paginación y 404
- Páginas especiales para About, Links, Equipment, Music, Message, Brevity y Recent Comments
- RSS, sitemap, robots.txt, Related Content, tabla de contenido, recuento de palabras y tiempo de lectura nativos
- PJAX, modos claro y oscuro, búsqueda local, atajos de teclado, menú contextual, lightbox, música e integraciones de comentarios
- Proveedores de comentarios Twikoo, Waline, Valine, Giscus y Artalk
- Shortcodes de Hugo equivalentes a las funciones de `hexo-solitude-tag 2.0`
- Carga de Shiki bajo demanda en el navegador, con temas claro y oscuro, números de línea y expansión de bloques de código largos
- CSS y TypeScript modulares compilados con `css.Build` y `js.Build` de Hugo
- El proceso de compilación no depende de Node.js, npm, PostCSS, Sass ni Stylus

## Requisitos

- Hugo v0.164.0 o posterior
- Git (si se instala el tema como submódulo)

## Instalación

Desde la raíz de tu sitio Hugo, añade el tema en `themes/solitude`:

```bash
git submodule add -b hugo https://github.com/everfu/hugo-solitude.git themes/solitude
```

Activa el tema en el archivo `hugo.yaml` del sitio y declara los formatos de salida que utiliza Solitude:

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

Copia [`exampleSite/hugo.yaml`](exampleSite/hugo.yaml) para obtener una configuración inicial completa y adáptala a tu sitio.

## Vista previa rápida

Ejecuta el sitio de ejemplo desde la raíz del repositorio del tema:

```bash
hugo server --source exampleSite --themesDir ../.. --theme solitude
```

Genera una compilación de producción:

```bash
hugo --source exampleSite --themesDir ../.. --theme solitude --gc --minify
```

El sitio de ejemplo incluye recomendaciones en la página de inicio, combinaciones de barras laterales, artículos, páginas especiales, contenedores de comentarios, shortcodes y archivos de datos locales, por lo que sirve como punto de partida ejecutable para un sitio nuevo.

## Configuración y contenido

Usa la configuración estándar de Hugo para sus funciones nativas. Las opciones específicas de Solitude se encuentran en `params.solitude`. El tema conserva, siempre que es posible, la jerarquía conocida de `nav`, `post`, `aside`, `comment` y `search`, pero no lee campos de Hexo obsoletos.

Los artículos pueden usar un front matter como este:

```yaml
title: Mi primer artículo
date: 2026-08-26
lastmod: 2026-08-26
description: Resumen del artículo
cover: /img/cover.webp
categories: [Notas]
tags: [Hugo, Solitude]
comment: true
aside: true
toc: true
home: true
```

Configura `home: false` para excluir una entrada de la lista, las recomendaciones y la barra lateral de entradas recientes de la página de inicio. Las entradas siguen visibles si se omite el campo o se establece en `true`; los archivos, taxonomías, la búsqueda, RSS y la página de la entrada siguen disponibles. Sustituye `updated` de Hexo por `lastmod` de Hugo. Los ejemplos compilables de todos los shortcodes están en [`exampleSite/content/posts/shortcodes.md`](exampleSite/content/posts/shortcodes.md).

### Estilos personalizados

Los estilos del tema se compilan desde la única entrada `assets/css/solitude/main.css` y se organizan en módulos de base, diseño, componentes, páginas, shortcodes e integraciones.

Para sobrescribir estilos, crea `assets/css/custom.css` en tu sitio. Hugo lo compila y carga por separado después de la hoja de estilos del tema, por lo que no es necesario copiar archivos del tema ni usar `!important`.

### Datos de páginas especiales

Los ejemplos completos de datos locales para About, Links, Equipment y Brevity se encuentran en:

- [`exampleSite/data/about.yaml`](exampleSite/data/about.yaml)
- [`exampleSite/data/links.yaml`](exampleSite/data/links.yaml)
- [`exampleSite/data/kit.yaml`](exampleSite/data/kit.yaml)
- [`exampleSite/data/brevity.yaml`](exampleSite/data/brevity.yaml)

Los arrays de configuración se sustituyen por completo. Al personalizar la navegación, los enlaces del pie, las recomendaciones u otras listas, incluye el array completo que quieras conservar.

### Resaltado de código

Shiki solo se carga cuando una página contiene bloques de código:

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

Usa `max_height: 0` para no limitar la altura. Ambos temas se generan a la vez y cambian de inmediato con el tema del sitio sin volver a resaltar el código.

### Comentarios y analítica

El tema admite Twikoo, Waline, Valine, Giscus y Artalk. Valine también puede proporcionar recuentos de comentarios, visitas de páginas, comentarios recientes y barrages de comentarios.

Los sitios de producción deben usar su propia configuración de servicios y dominios seguros. La rama Hugo ya no incluye busuanzi, Google AdSense, la concatenación antigua de versiones de CDN ni `css_prefix`. Para la analítica ajena a Valine, conecta un servicio moderno a nivel del sitio.

## API de extensión del navegador

El tema expone `window.Solitude` con `navigate`, `refresh`, `copy`, `toggleTheme`, `loadScript`, `loadStyle`, `on`, `listen` y `onPageCleanup`.

Los eventos del ciclo de vida incluyen `ready`, `beforeNavigate`, `afterNavigate` y `themeChange`. Registra los listeners de cada página mediante `listen` o `onPageCleanup` para liberarlos de forma uniforme durante la navegación PJAX.

## Migración desde Hexo

La rama Hugo conserva una única entrada canónica para cada función y no ofrece compatibilidad con Hexo en tiempo de ejecución. Haz una copia de seguridad del sitio antes de migrar y presta especial atención a:

- Asignar la configuración de Hexo a las opciones estándar de Hugo y `params.solitude`
- Trasladar `updated`, los enlaces permanentes y las URL antiguas de archivos al front matter de Hugo
- Sustituir las etiquetas `{% ... %}` del tema por shortcodes de Hugo
- Migrar About, Links, Equipment y Brevity a sus nuevas estructuras de datos
- Sustituir los interruptores de lightbox duplicados por `lightbox: fancybox | mediumZoom | false`

## Licencia

[Apache-2.0](LICENSE). Las obras derivadas deben conservar el aviso de copyright del tema. El diseño del tema está autorizado por [@张洪 Heo](https://github.com/zhheo).
