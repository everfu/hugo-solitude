# Contributing

Solitude Hugo requires Hugo v0.164.0 or later. Keep the theme build free of Node.js and preserve the public `window.Solitude` API, existing CSS classes, and PJAX lifecycle events.

Before opening a pull request, run:

```bash
hugo --source exampleSite --themesDir ../.. --theme solitude --gc --minify --cleanDestinationDir
```

Add or update example content for every template, shortcode, route, or configuration change. Do not commit `exampleSite/public`, generated resources, local editor settings, or downloaded Hugo binaries.

## Shared brand assets

Shared static assets originate in Astro Solitude. See [the synchronization guide](docs/shared-assets.md)
and [the asset inventory](docs/shared-assets.json). Asset synchronization is a maintainer operation;
the Hugo theme build remains independent of Node.js and the other repositories.
