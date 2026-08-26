/* eslint-env browser */
(() => {
  const runtimeKey = '__solitudeShortcodeRuntime';
  const owner = document.currentScript || document.querySelector('script[data-solitude-tag-runtime]');
  const initialConfig = {
    chartjs: owner?.dataset.chartjs || 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.js',
    abcjs: owner?.dataset.abcjs || 'https://cdn.jsdelivr.net/npm/abcjs@6.6.4/dist/abcjs-basic-min.js'
  };
  const existing = window[runtimeKey];
  if (existing) {
    existing.configure(initialConfig);
    existing.init();
    return;
  }

  const config = {...initialConfig};
  const scriptRequests = new Map();
  const repositoryRequests = new Map();
  let initialization;

  const loadScript = url => {
    if (scriptRequests.has(url)) return scriptRequests.get(url);
    const request = window.Solitude?.getScript
      ? window.Solitude.getScript(url)
      : new Promise((resolve, reject) => {
        const absoluteUrl = new URL(url, document.baseURI).href;
        const found = [...document.scripts].find(item => item.src === absoluteUrl);
        if (found?.dataset.loaded === 'true' || found?.readyState === 'complete') {
          resolve(found);
          return;
        }
        const script = found || document.createElement('script');
        script.src = url;
        script.async = true;
        script.addEventListener('load', () => {
          script.dataset.loaded = 'true';
          resolve(script);
        }, {once: true});
        script.addEventListener('error', () => reject(new Error(`Unable to load ${url}`)), {once: true});
        if (!found) document.head.appendChild(script);
      });
    scriptRequests.set(url, request);
    request.catch(() => scriptRequests.delete(url));
    return request;
  };

  const applyThemeValues = (value, mode) => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => applyThemeValues(item, mode));
    if (Object.prototype.hasOwnProperty.call(value, mode)) return value[mode];
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, applyThemeValues(item, mode)]));
  };

  const destroyCharts = () => {
    if (typeof window.Chart?.getChart !== 'function') return;
    document.querySelectorAll('.chartjs-container canvas').forEach(canvas => {
      window.Chart.getChart(canvas)?.destroy();
    });
  };

  const renderCharts = async () => {
    const containers = [...document.querySelectorAll('.chartjs-container')];
    if (!containers.length) return;
    try {
      if (typeof window.Chart !== 'function') await loadScript(config.chartjs);
      const dark = document.documentElement.dataset.theme === 'dark';
      const mode = dark ? 'dark-mode' : 'light-mode';
      const styles = getComputedStyle(document.documentElement);
      window.Chart.defaults.color = styles.getPropertyValue('--efu-fontcolor').trim() || (dark ? '#f5f5f5' : '#363636');
      window.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.1)';

      containers.forEach((container, index) => {
        try {
          const source = container.querySelector('.chartjs-src');
          if (!source) return;
          const previous = container.querySelector('canvas');
          if (previous) window.Chart.getChart(previous)?.destroy();
          container.querySelector('.chartjs-wrap')?.remove();
          const wrap = document.createElement('div');
          wrap.className = 'chartjs-wrap';
          if (container.dataset.width) wrap.style.width = container.dataset.width;
          const canvas = document.createElement('canvas');
          canvas.id = container.dataset.chartjsId || `chartjs-${index}`;
          wrap.appendChild(canvas);
          source.insertAdjacentElement('afterend', wrap);
          const definition = applyThemeValues(JSON.parse(source.textContent || '{}'), mode);
          Reflect.construct(window.Chart, [canvas.getContext('2d'), definition]);
          container.classList.remove('tag-plugin-error');
        } catch (error) {
          container.classList.add('tag-plugin-error');
          console.error('[solitude-shortcodes] Chart.js render failed:', error);
        }
      });
    } catch (error) {
      containers.forEach(item => item.classList.add('tag-plugin-error'));
      console.error('[solitude-shortcodes] Chart.js load failed:', error);
    }
  };

  const renderScores = async () => {
    const sheets = [...document.querySelectorAll('.abc-music-sheet:not([data-rendered="true"])')];
    if (!sheets.length) return;
    try {
      if (!window.ABCJS) await loadScript(config.abcjs);
      sheets.forEach(sheet => {
        let params = {};
        try {
          params = JSON.parse(sheet.dataset.params || '{}');
        } catch (error) {
          console.warn('[solitude-shortcodes] Invalid ABCJS parameters:', error);
        }
        window.ABCJS.renderAbc(sheet, sheet.textContent, {...params, responsive: 'resize'});
        sheet.querySelectorAll('svg').forEach(svg => {
          const titles = [...svg.querySelectorAll('title')];
          const accessibleName = titles.map(title => title.textContent?.trim()).filter(Boolean).join(' ');
          if (accessibleName) {
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', accessibleName);
          }
          titles.forEach(title => title.remove());
        });
        sheet.dataset.rendered = 'true';
        sheet.classList.remove('tag-plugin-error');
      });
    } catch (error) {
      sheets.forEach(item => item.classList.add('tag-plugin-error'));
      console.error('[solitude-shortcodes] ABCJS render failed:', error);
    }
  };

  const renderMermaid = async (force = false) => {
    const diagrams = [...document.querySelectorAll(force ? '.mermaid' : '.mermaid:not([data-processed="true"])')];
    if (!diagrams.length || !window.mermaid) return;
    try {
      const dark = document.documentElement.dataset.theme === 'dark';
      diagrams.forEach(diagram => {
        if (!diagram.dataset.mermaidSource) diagram.dataset.mermaidSource = diagram.textContent || '';
        if (force) {
          diagram.textContent = diagram.dataset.mermaidSource;
          diagram.removeAttribute('data-processed');
        }
      });
      window.mermaid.initialize({startOnLoad: false, theme: dark ? 'dark' : 'default'});
      await window.mermaid.run({nodes: diagrams});
      diagrams.forEach(diagram => diagram.classList.remove('tag-plugin-error'));
    } catch (error) {
      diagrams.forEach(diagram => diagram.classList.add('tag-plugin-error'));
      console.error('[solitude-shortcodes] Mermaid render failed:', error);
    }
  };

  const requestRepository = endpoint => {
    if (repositoryRequests.has(endpoint)) return repositoryRequests.get(endpoint);
    const request = fetch(endpoint, {headers: {Accept: 'application/json'}})
      .then(response => {
        if (!response.ok) throw new Error(`Repository request failed with ${response.status}`);
        return response.json();
      })
      .catch(error => {
        repositoryRequests.delete(endpoint);
        throw error;
      });
    repositoryRequests.set(endpoint, request);
    return request;
  };

  const renderRepository = async card => {
    const endpoint = card.dataset.repoEndpoint;
    if (!endpoint) return;
    card.dataset.repoLoaded = 'pending';
    card.setAttribute('aria-busy', 'true');
    try {
      const data = await requestRepository(endpoint);
      const provider = card.dataset.repoProvider;
      let stars = data.stargazers_count;
      if (provider === 'gitlab') stars = data.star_count;
      if (provider === 'gitea') stars = data.stars_count;
      const forks = data.forks_count;
      const language = data.language || (provider === 'gitlab' && Array.isArray(data.topics) ? data.topics[data.topics.length - 1] : '');
      const title = card.querySelector('.repo-title');
      const description = card.querySelector('.repo-desc');
      const starsElement = card.querySelector('.repo-stars');
      const forksElement = card.querySelector('.repo-forks');
      const status = card.querySelector('.repo-status');
      if (title) title.textContent = data.name || title.textContent;
      if (description) description.textContent = data.description || '这个仓库暂时没有简介。';
      if (starsElement) starsElement.textContent = Number.isFinite(Number(stars)) ? Number(stars).toLocaleString() : '0';
      if (forksElement) forksElement.textContent = Number.isFinite(Number(forks)) ? Number(forks).toLocaleString() : '0';
      const languageIcon = card.querySelector('.repo-language');
      if (language && languageIcon) {
        languageIcon.src = `https://skillicons.dev/icons?i=${encodeURIComponent(String(language).toLowerCase().replace('.', ''))}`;
        languageIcon.alt = String(language);
        languageIcon.hidden = false;
      }
      if (status) status.textContent = '已更新';
      card.classList.add('is-loaded');
      card.classList.remove('tag-plugin-error');
      card.setAttribute('aria-busy', 'false');
      card.dataset.repoLoaded = 'true';
    } catch (error) {
      const description = card.querySelector('.repo-desc');
      const status = card.querySelector('.repo-status');
      if (description) description.textContent = '仓库信息暂时无法加载，请稍后重试。';
      if (status) status.textContent = '加载失败';
      card.classList.add('tag-plugin-error');
      card.setAttribute('aria-busy', 'false');
      card.dataset.repoLoaded = 'error';
      console.warn('[solitude-shortcodes] Repository request failed; using fallback card:', error);
    }
  };

  const renderRepositories = () => {
    const cards = [...document.querySelectorAll('.repo-card[data-repo-endpoint]:not([data-repo-loaded="pending"]):not([data-repo-loaded="true"])')];
    return Promise.all(cards.map(renderRepository));
  };

  const renderTabs = () => {
    document.querySelectorAll<HTMLElement>('[data-solitude-tabs]:not([data-tabs-ready="true"])').forEach(container => {
      const panels = [...container.querySelectorAll<HTMLElement>(':scope > .tab-contents > .tab-item-content')];
      if (!panels.length) return;
      const nav = document.createElement('ul');
      nav.className = 'nav-tabs';
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', '内容标签页');
      nav.setAttribute('aria-orientation', 'horizontal');
      const buttons: HTMLButtonElement[] = [];
      const activateTab = (activeIndex, moveFocus = false) => {
        nav.querySelectorAll<HTMLElement>('.tab').forEach((tab, index) => {
          const active = index === activeIndex;
          tab.classList.toggle('active', active);
          const button = buttons[index];
          if (button) {
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
          }
        });
        panels.forEach((panel, index) => {
          const active = index === activeIndex;
          panel.classList.toggle('active', active);
          panel.hidden = !active;
        });
        if (moveFocus) {
          buttons[activeIndex]?.focus();
          buttons[activeIndex]?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      };
      panels.forEach((panel, index) => {
        const item = document.createElement('li');
        item.className = `tab${index === 0 ? ' active' : ''}`;
        item.setAttribute('role', 'presentation');
        const button = document.createElement('button');
        if (!panel.id) panel.id = `${container.id || 'tabs'}-panel-${index}`;
        button.type = 'button';
        button.textContent = panel.dataset.tabTitle || `Tab ${index + 1}`;
        button.id = `${container.id || 'tabs'}-tab-${index}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', panel.id);
        button.setAttribute('aria-selected', String(index === 0));
        button.tabIndex = index === 0 ? 0 : -1;
        button.addEventListener('click', () => activateTab(index));
        button.addEventListener('keydown', event => {
          let nextIndex;
          if (event.key === 'ArrowRight') nextIndex = (index + 1) % panels.length;
          if (event.key === 'ArrowLeft') nextIndex = (index - 1 + panels.length) % panels.length;
          if (event.key === 'Home') nextIndex = 0;
          if (event.key === 'End') nextIndex = panels.length - 1;
          if (nextIndex === undefined) return;
          event.preventDefault();
          activateTab(nextIndex, true);
        });
        buttons.push(button);
        item.appendChild(button);
        nav.appendChild(item);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id);
      });
      container.prepend(nav);
      activateTab(0);
      container.dataset.tabsReady = 'true';
    });
  };

  const renderTypeit = () => {
    document.querySelectorAll('[data-typeit]:not([data-typeit-ready="true"])').forEach(element => {
      const TypeIt = window.TypeIt;
      if (typeof TypeIt !== 'function') return;
      const text = element.textContent || '';
      element.textContent = '';
      Reflect.construct(TypeIt, [element, { strings: [text], speed: Number(element.dataset.speed) || 80 }]).go();
      element.dataset.typeitReady = 'true';
    });
  };

  const init = () => {
    if (initialization) return initialization;
    const request = Promise.allSettled([
      renderCharts(),
      renderScores(),
      renderMermaid(),
      renderRepositories(),
      Promise.resolve(renderTabs()),
      Promise.resolve(renderTypeit())
    ]).finally(() => {
      if (initialization === request) initialization = undefined;
    });
    initialization = request;
    return request;
  };

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.tag-hide-button');
    if (!button) return;
    const content = document.getElementById(button.getAttribute('aria-controls'));
    if (!content) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    content.hidden = expanded;
  });
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.dataset.fallback || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = image.dataset.fallback;
  }, true);
  document.addEventListener('solitude:beforeNavigate', destroyCharts);
  document.addEventListener('pjax:complete', init);
  document.addEventListener('solitude:themeChange', () => {
    renderCharts();
    renderMermaid(true);
  });
  window.addEventListener('DOMContentLoaded', init, {once: true});

  window[runtimeKey] = {
    configure(next) {
      Object.assign(config, next);
    },
    destroyCharts,
    init
  };
  if (document.readyState !== 'loading') init();
})();
