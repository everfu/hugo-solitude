import { Solitude } from "./core/api";
import { initActionDelegation } from "./core/actions";
import { lifecycle } from "./core/lifecycle";
import { initPreloader } from "./core/preloader";

let coverColor = () => {};
let initializeMusicPlayer = () => {};

const loadFeatureModules = async () => {
  const features = Solitude.config.feature_modules || {};
  const requests = [];

  if (features.search === "local") requests.push(import("./search/local"));
  if (features.search === "algolia") requests.push(import("./search/algolia"));
  if (features.search === "docsearch") requests.push(import("./search/docsearch"));
  if (features.friend_links) requests.push(import("./friend_links"));
  if (features.keyboard) requests.push(import("./keyboard"));
  if (features.right_menu) requests.push(import("./right_menu"));
  if (features.translate) requests.push(import("./tw_cn"));
  if (features.music) {
    requests.push(import("./music").then((module) => {
      initializeMusicPlayer = module.initializeMusicPlayer;
    }));
  }
  if (features.covercolor) {
    const coverColorLoaders = {
      local: () => import("./covercolor/local"),
      api: () => import("./covercolor/api"),
      ave: () => import("./covercolor/ave"),
    };
    const loader = coverColorLoaders[features.covercolor];
    if (loader) requests.push(loader().then((module) => {
      coverColor = module.coverColor;
      Solitude.coverColor = coverColor;
    }));
  }

  await Promise.all(requests);
};

const sidebarFn = () => {
  const $toggleMenu = document.getElementById("toggle-menu");
  const $mobileSidebarMenus = document.getElementById("sidebar-menus");
  const $menuMask = document.getElementById("menu-mask");
  const $body = document.body;

  const toggleMobileSidebar = (isOpen) => {
    $body.style.overflow = isOpen ? "hidden" : "";
    Solitude[isOpen ? "fadeIn" : "fadeOut"]($menuMask, 0.5);
    $mobileSidebarMenus.classList.toggle("open", isOpen);
  };

  const closeMobileSidebar = () => {
    if ($mobileSidebarMenus.classList.contains("open")) {
      toggleMobileSidebar(false);
    }
  };

  if (!$toggleMenu || !$mobileSidebarMenus || !$menuMask) return;

  lifecycle.listen($toggleMenu, "click", () => toggleMobileSidebar(true));
  lifecycle.listen($menuMask, "click", closeMobileSidebar);

  let resizeFrame;
  lifecycle.listen(window, "resize", () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (
        Solitude.isHidden($toggleMenu) &&
        $mobileSidebarMenus.classList.contains("open")
      ) {
        closeMobileSidebar();
      }
    });
  });
  lifecycle.add(() => cancelAnimationFrame(resizeFrame));
};

const initAsideTagCloudOverflow = () => {
  const tagClouds = [
    ...document.querySelectorAll<HTMLElement>(
      "#aside-content .card-tag-cloud",
    ),
  ];
  if (!tagClouds.length) return;

  const frames = new Set<number>();
  const updateOverflowState = (tagCloud: HTMLElement) => {
    tagCloud.classList.toggle(
      "is-overflowing",
      !tagCloud.classList.contains("all-tags") &&
        tagCloud.scrollHeight > tagCloud.clientHeight,
    );
  };
  const scheduleUpdate = (tagCloud: HTMLElement) => {
    const frame = requestAnimationFrame(() => {
      frames.delete(frame);
      updateOverflowState(tagCloud);
    });
    frames.add(frame);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => scheduleUpdate(entry.target as HTMLElement));
  });

  tagClouds.forEach((tagCloud) => {
    resizeObserver.observe(tagCloud);
    scheduleUpdate(tagCloud);
  });

  lifecycle.add(() => {
    resizeObserver.disconnect();
    frames.forEach(cancelAnimationFrame);
  });
};

const scrollFn = () => {
  const $rightside = document.getElementById("rightside");
  const $header = document.getElementById("page-header");
  let initTop = window.scrollY || document.documentElement.scrollTop;

  const updateHeaderAndRightside = (isDown, currentTop) => {
    const isAtTop = currentTop <= 0;
    $header.classList.toggle("nav-at-top", isAtTop);

    if (!isAtTop) {
      $header.classList.toggle("nav-visible", !isDown);
      $header.classList.add("nav-fixed");
      if ($rightside) {
        $rightside.style.opacity = "1";
        $rightside.style.transform = "translateX(-58px)";
      }
    } else {
      $header.classList.remove("nav-fixed", "nav-visible");
      if ($rightside) {
        $rightside.style.opacity = "";
        $rightside.style.transform = "";
      }
    }
  };

  const handleScroll = () => {
    initThemeColor();
    const currentTop = window.scrollY || document.documentElement.scrollTop;
    const isDown = currentTop > initTop;
    initTop = currentTop;
    updateHeaderAndRightside(isDown, currentTop);
  };

  let ticking = false;
  const onScroll = () => {
    const currentTop = window.scrollY || document.documentElement.scrollTop;
    if (currentTop <= 0) {
      initTop = 0;
      updateHeaderAndRightside(false, 0);
      return;
    }
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  };

  lifecycle.listen(window, "scroll", onScroll, { passive: true });
  updateHeaderAndRightside(false, initTop);
};

const percent = () => {
  const docEl = document.documentElement;
  const body = document.body;
  const scrollPos = window.pageYOffset || docEl.scrollTop;
  const totalScrollableHeight =
    Math.max(
      body.scrollHeight,
      docEl.scrollHeight,
      body.offsetHeight,
      docEl.offsetHeight,
      body.clientHeight,
      docEl.clientHeight
    ) - docEl.clientHeight;
  const scrolledPercent = totalScrollableHeight > 0
    ? Math.round((scrollPos / totalScrollableHeight) * 100)
    : 0;
  const navToTop = document.querySelector("#nav-totop");
  const percentDisplay = document.querySelector("#nav-totop #percent");
  const endTarget =
    document.getElementById("post-comment") || document.getElementById("footer");
  const isNearEnd = endTarget
    ? window.scrollY + docEl.clientHeight >= endTarget.offsetTop
    : false;

  navToTop?.classList.toggle("long", isNearEnd || scrolledPercent > 90);
  if (percentDisplay) percentDisplay.textContent =
    isNearEnd || scrolledPercent > 90
      ? Solitude.config.lang.backtop
      : scrolledPercent;

  document
    .querySelectorAll(".needEndHide")
    .forEach((item) =>
      item.classList.toggle("hide", totalScrollableHeight - scrollPos < 100)
    );
};

const showTodayCard = () => {
  const el = document.getElementById("todayCard");
  const topGroup = document.querySelector(".topGroup");
  lifecycle.listen(topGroup, "mouseleave", () => el?.classList.remove("hide"));
};

const initHomeCenter = () => {
  const container = document.getElementById("home_center");
  if (!container || container.dataset.initialized === "true") return;
  container.dataset.initialized = "true";

  const banners = [...container.querySelectorAll(".home-center-banner-item")];
  const items = [...container.querySelectorAll(".home-center-item")];
  const indicators = [
    ...container.querySelectorAll(".home-center-indicator"),
  ];
  const banner = container.querySelector(".home-center-banner");
  const titleLink = container.querySelector(".home-center-title-link");
  const titleTag = container.querySelector(".home-center-title-tag span");
  const categoryBar = document.getElementById("category-bar");
  const profileCard = document.querySelector<HTMLElement>(
    "#aside-content .card-info"
  );
  let activeIndex = 0;
  let scrollFrame;

  const getCachedColor = (src) => {
    try {
      const cache = JSON.parse(localStorage.getItem("Solitude")) || {};
      const item = cache.postcolor?.[src];
      if (item && (!item.expiration || item.expiration > Date.now())) {
        return item.value;
      }
    } catch (error) {
      return null;
    }
    return null;
  };

  const cacheColor = (src, color) => {
    try {
      const cache = JSON.parse(localStorage.getItem("Solitude")) || {};
      cache.postcolor = cache.postcolor || {};
      cache.postcolor[src] = {
        value: color,
        expiration: Date.now() + 43200000,
      };
      localStorage.setItem("Solitude", JSON.stringify(cache));
    } catch (error) {
      // Color caching is optional; rendering must continue without storage.
    }
  };

  const rgbToThemeHex = ([r, g, b]) =>
    `#${[r, g, b]
      .map((value) =>
        Math.floor(value * 0.8)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")}`;

  const getAverageColor = (image) => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const color = [0, 0, 0];
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 128) continue;
      color[0] += pixels[index];
      color[1] += pixels[index + 1];
      color[2] += pixels[index + 2];
      count++;
    }
    return count ? color.map((value) => Math.round(value / count)) : null;
  };

  const normalizeHomeCenterColor = (value) => {
    const match = value?.match(/^#([0-9a-f]{6})$/i);
    if (!match) return value;
    const number = parseInt(match[1], 16);
    const rgb = [number >> 16, (number >> 8) & 0xff, number & 0xff];
    const brightness = Math.round(
      (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
    );
    if (brightness >= 125) return value;
    return `#${rgb
      .map((channel) => Math.min(channel + 50, 255).toString(16).padStart(2, "0"))
      .join("")}`;
  };

  const getReadableProfileTextColor = (value) => {
    const match = value?.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return "";
    const hex = match[1].length === 3
      ? [...match[1]].map((channel) => channel.repeat(2)).join("")
      : match[1];
    const channels = [0, 2, 4].map((offset) =>
      parseInt(hex.slice(offset, offset + 2), 16) / 255
    );
    const luminance = channels
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      )
      .reduce(
        (sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index],
        0
      );
    const whiteContrast = 1.05 / (luminance + 0.05);
    const blackContrast = (luminance + 0.05) / 0.05;
    return whiteContrast >= blackContrast
      ? "var(--efu-white)"
      : "var(--efu-black)";
  };

  const applyItemColor = (index, color) => {
    if (!color || !banners[index]) return;
    const colorOp = `color-mix(in srgb, ${color} 14%, transparent)`;
    const colorDeep = `color-mix(in srgb, ${color} 87%, transparent)`;
    banners[index].style.setProperty("--home-center-theme", color);
    banners[index].style.setProperty("--home-center-theme-op", colorOp);
    banners[index].style.setProperty("--home-center-theme-op-deep", colorDeep);
    items[index]?.style.setProperty("--item-theme", color);
    items[index]?.style.setProperty("--item-theme-op", colorOp);
    items[index]?.style.setProperty("--item-theme-op-deep", colorDeep);
    if (activeIndex === index) select(index);
  };

  const extractItemColor = (index, sourceImage) => {
    if (banners[index].dataset.color) return;
    const src = sourceImage.currentSrc || sourceImage.src;
    if (!src) return;
    const cachedColor = getCachedColor(src);
    if (cachedColor) {
      applyItemColor(index, normalizeHomeCenterColor(cachedColor));
      return;
    }

    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => {
      if (!container.isConnected) return;
      try {
        const dominantColor = window.ColorThief?.getColorSync(image);
        const rgb = dominantColor ? dominantColor.array() : getAverageColor(image);
        if (!rgb) return;
        const color = rgbToThemeHex(rgb);
        cacheColor(src, color);
        applyItemColor(index, normalizeHomeCenterColor(color));
      } catch (error) {
        // Canvas access can fail for image hosts without CORS support.
      }
    };
    image.onerror = () => {};
    image.src = src;
  };

  const navigate = (link, event) => {
    if (!link) return;
    if (event?.metaKey || event?.ctrlKey) {
      window.open(link, "_blank");
    } else if (Solitude.pjax?.loadUrl) {
      Solitude.navigate(link);
    } else {
      window.location.href = link;
    }
  };

  const select = (index) => {
    if (!banners[index]) return;
    activeIndex = index;
    banners.forEach((banner, bannerIndex) => {
      const isActive = bannerIndex === index;
      banner.classList.toggle("active", isActive);
      banner.setAttribute("aria-hidden", String(!isActive));
      banner.tabIndex = isActive ? 0 : -1;
    });
    items.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-current", String(isActive));
    });
    indicators.forEach((indicator, indicatorIndex) =>
      indicator.classList.toggle("active", indicatorIndex === index)
    );
    const selected = banners[index];
    const selectedStyle = getComputedStyle(selected);
    const color = selectedStyle.getPropertyValue("--home-center-theme").trim();
    const colorOp = selectedStyle
      .getPropertyValue("--home-center-theme-op")
      .trim();
    const colorDeep = selectedStyle
      .getPropertyValue("--home-center-theme-op-deep")
      .trim();
    titleLink.textContent = selected.dataset.title;
    titleLink.href = selected.dataset.link;
    titleTag.textContent = selected.dataset.label;
    container.style.setProperty("--current-theme", color);
    container.style.setProperty("--current-theme-op", colorOp);
    container.style.setProperty("--current-theme-op-deep", colorDeep);
    [categoryBar, profileCard].forEach((target) => {
      target?.style.setProperty("--current-banner-theme", color);
      target?.style.setProperty("--current-banner-theme-op", colorOp);
      target?.style.setProperty("--current-banner-theme-op-deep", colorDeep);
    });
    const profileTextColor = getReadableProfileTextColor(color);
    if (profileTextColor) {
      profileCard?.style.setProperty(
        "--profile-card-text-color",
        profileTextColor
      );
    }
  };

  items.forEach((item, index) => {
    item.addEventListener("mouseenter", () => select(index));
    item.addEventListener("focusin", () => select(index));
  });
  banners.forEach((item, index) => {
    let pointerType = "";
    item.addEventListener(
      "pointerdown",
      (event) => (pointerType = event.pointerType),
      true
    );
    item.addEventListener("click", (event) => {
      if (pointerType === "touch" && window.innerWidth <= 768) {
        event.preventDefault();
        select(index);
      } else {
        navigate(item.dataset.link, event);
      }
      pointerType = "";
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate(item.dataset.link, event);
      }
    });
  });
  indicators.forEach((indicator, index) => {
    indicator.addEventListener("click", (event) => {
      event.preventDefault();
      select(index);
      banner.scrollTo({ left: banner.clientWidth * index, behavior: "smooth" });
    });
  });
  banner.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (window.innerWidth > 768 || !banner.clientWidth) return;
      select(Math.round(banner.scrollLeft / banner.clientWidth));
    });
  });
  select(0);
  banners.forEach((item, index) => {
    const configuredColor = item.dataset.color?.trim();
    if (configuredColor) {
      applyItemColor(index, configuredColor);
      return;
    }
    const image = item.querySelector(".home-center-cover-img");
    if (!image) return;
    if (image.complete && image.naturalWidth) {
      extractItemColor(index, image);
    } else {
      image.addEventListener("load", () => extractItemColor(index, image), {
        once: true,
      });
    }
  });
};

const initTooltip = () => {
  const tooltip =
    document.querySelector(".custom-tooltip") ||
    document.body.appendChild(
      Object.assign(document.createElement("div"), {
        className: "custom-tooltip",
      })
    );

  tooltip.style.opacity = "0";
  tooltip.style.backdropFilter = "none";
  if (!window.matchMedia("(hover: hover)").matches) return;

  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );

  document.querySelectorAll("[heotip]").forEach((element) => {
    if (element.dataset.tooltipInitialized === "true") return;
    element.dataset.tooltipInitialized = "true";

    element.addEventListener("mouseenter", () => {
      tooltip.textContent = element.getAttribute("heotip");
      tooltip.style.left = "0";
      tooltip.style.top = "0";
      tooltip.style.backdropFilter = "blur(10px)";
      tooltip.style.opacity = "1";

      const targetRect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gap = 10;
      const maxLeft = window.innerWidth - tooltipRect.width - rootFontSize;
      const centeredLeft =
        targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      const left = Math.max(rootFontSize, Math.min(centeredLeft, maxLeft));
      const preferredTop =
        targetRect.top >= tooltipRect.height + gap
          ? targetRect.top - tooltipRect.height - gap
          : targetRect.bottom + gap;
      const maxTop = window.innerHeight - tooltipRect.height - rootFontSize;
      const top = Math.max(rootFontSize, Math.min(preferredTop, maxTop));

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    element.addEventListener("mouseleave", () => {
      tooltip.style.backdropFilter = "none";
      tooltip.style.opacity = "0";
    });
  });
};

const initObserver = () => {
  const commentElement = document.getElementById("post-comment");
  const paginationElement = document.getElementById("pagination");
  const commentBarrageElement = document.querySelector(".comment-barrage");

  if (commentElement && paginationElement) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        paginationElement.classList.toggle("show-window", entry.isIntersecting);
        if (Solitude.config.comment?.commentBarrage && commentBarrageElement) {
          commentBarrageElement.style.bottom = entry.isIntersecting
            ? "-200px"
            : "";
        }
      });
    });
    observer.observe(commentElement);
    lifecycle.add(() => observer.disconnect());
  }
};

const addCopyright = () => {
  if (!Solitude.config.copyright) return;
  const { limit, author, link, source, info } = Solitude.config.copyright;

  document.body.addEventListener("copy", (e) => {
    e.preventDefault();
    const copyText = window.getSelection().toString();
    const text =
      copyText.length > limit
        ? `${copyText}\n\n${author}\n${link}${window.location.href}\n${source}\n${info}`
        : copyText;
    e.clipboardData.setData("text", text);
  });
};

const asideStatus = () => {
  const status = Solitude.saveToLocal.get("aside-status");
  document.documentElement.classList.toggle("hide-aside", status === "hide");
};

function initThemeColor() {
  const currentTop = window.scrollY || document.documentElement.scrollTop;
  const themeColor =
    currentTop > 0
      ? "--efu-card-bg"
      : Solitude.page.is_post
      ? "--efu-main"
      : "--efu-background";
  applyThemeColor(
    getComputedStyle(document.documentElement).getPropertyValue(themeColor)
  );
}

Solitude.initThemeColor = initThemeColor;

function applyThemeColor(color) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const appleMobileWebAppMeta = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  themeColorMeta?.setAttribute("content", color);
  appleMobileWebAppMeta?.setAttribute("content", color);
  if (window.matchMedia("(display-mode: standalone)").matches) {
    document.body.style.backgroundColor = color;
  }
}

const handleThemeChange = (mode) => {
  const themeChange = window.globalFn?.themeChange || {};
  Object.values(themeChange).forEach((fn) => fn(mode));
  lifecycle.emit("themeChange", { theme: mode });
};

const actions = {
  lastWittyWord: "",
  wasPageHidden: false,
  musicPlaying: false,
  consoleNavState: null,
  randomPost() {
    const posts = Solitude.config.random_posts || [];
    if (!posts.length) return;
    Solitude.navigate(posts[Solitude.randomNum(posts.length)]);
  },
  noop() {},
  navigateTo(url) {
    Solitude.navigate(url);
  },
  openExternal(url) {
    if (url) window.open(url, "_blank", "noopener");
  },
  toggleTargetClass(target, event, element) {
    const selector = target || element?.dataset.solitudeTarget;
    const className = element?.dataset.solitudeClass || "show";
    document.querySelector(selector)?.classList.toggle(className);
  },
  setTargetClass(target, event, element) {
    const selector = target || element?.dataset.solitudeTarget;
    const className = element?.dataset.solitudeClass || "show";
    const enabled = element?.dataset.solitudeEnabled !== "false";
    document
      .querySelectorAll(selector)
      .forEach((item) => item.classList.toggle(className, enabled));
  },
  runConfiguredAction(command) {
    const source = String(command || "").trim().replace(/;$/, "");
    const call = source.match(/^(?:Solitude\.)?([A-Za-z_$][\w$]*)\(\)$/);
    if (call && typeof Solitude[call[1]] === "function") {
      Solitude[call[1]]();
    } else {
      const navigation = source.match(/^(?:pjax\.loadUrl|Solitude\.navigate)\((['"])(.*?)\1\)$/);
      if (navigation) Solitude.navigate(navigation[2]);
    }
    Solitude.hideRightMenu?.();
  },
  scrollTo(elementId) {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      const targetPosition =
        targetElement.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scroll({ top: targetPosition, behavior: "smooth" });
    }
  },
  syncMusicState(isPlaying) {
    const $music = document.getElementById("nav-music");
    const $console = document.getElementById("consoleMusic");
    this.musicPlaying = Boolean(isPlaying);

    if ($music) {
      const capsule = $music as HTMLElement & {
        collapseTimer?: number;
      };
      if (capsule.collapseTimer) window.clearTimeout(capsule.collapseTimer);
      capsule.collapseTimer = 0;
      capsule.classList.toggle("playing", this.musicPlaying);

      if (this.musicPlaying) {
        capsule.classList.remove("collapsing");
        capsule.classList.add("stretch");
      } else if (
        capsule.classList.contains("stretch") ||
        capsule.classList.contains("collapsing")
      ) {
        capsule.classList.add("collapsing");
        capsule.classList.remove("stretch");
        capsule.collapseTimer = window.setTimeout(() => {
          capsule.classList.remove("collapsing");
          capsule.collapseTimer = 0;
        }, 360);
      } else {
        capsule.classList.remove("collapsing", "stretch");
      }
    }
    $console?.classList.toggle("on", this.musicPlaying);

    if (Solitude.rightMenu?.menuItems?.music?.[0]) {
      const $rmText = document.querySelector("#menu-music-toggle span");
      const $rmIcon = document.querySelector("#menu-music-toggle i");
      if ($rmText) {
        const label = this.musicPlaying
          ? Solitude.config.right_menu.music.stop
          : Solitude.config.right_menu.music.start;
        Solitude.rightMenu.setLabel($rmText, label);
      }
      if ($rmIcon) {
        $rmIcon.className = `solitude fas ${this.musicPlaying ? "fa-pause" : "fa-play"}`;
      }
    }
  },
  musicScrubberBind() {
    const $music = document.getElementById("nav-music");
    const $hitarea = $music?.querySelector(".music-capsule-hitarea");
    const $tooltip = $music?.querySelector(".music-progress-tooltip");
    const $status = $music?.querySelector(".music-progress-status");
    if (
      !$music ||
      !$hitarea ||
      !$tooltip ||
      $music.dataset.scrubberBound === "true"
    ) return;

    $music.dataset.scrubberBound = "true";
    const dragThreshold = 8;
    const keyboardSeekStep = 5;
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let previewTime = 0;
    let previewDuration = 0;
    let previewSource = "";
    let isScrubbing = false;
    let suppressClick = false;
    let feedbackTimer = 0;

    const getAPlayer = () =>
      $music.querySelector("meting-js")?.aplayer || null;
    const getDuration = (aplayer) => {
      const duration = Number(aplayer?.audio?.duration);
      return Number.isFinite(duration) && duration > 0 ? duration : 0;
    };
    const formatTime = (seconds) => {
      const value = Math.max(0, Number(seconds) || 0);
      const minutes = Math.floor(value / 60);
      const remaining = Math.floor(value % 60);
      return `${minutes}:${String(remaining).padStart(2, "0")}`;
    };
    const setFeedback = (time, duration, announce = false) => {
      const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;
      const label = `${formatTime(time)} / ${formatTime(duration)}`;
      $music.style.setProperty("--capsule-scrub-position", `${ratio * 100}%`);
      $tooltip.textContent = label;
      if (announce && $status) $status.textContent = label;
      return ratio;
    };
    const updatePreview = (aplayer, clientX) => {
      const rect = $music.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      previewTime = ratio * previewDuration;
      aplayer.disableTimeupdate = true;
      aplayer.bar?.set?.("played", ratio, "width");
      aplayer.lrc?.update?.(previewTime);
      if (aplayer.template?.ptime) {
        aplayer.template.ptime.textContent = formatTime(previewTime);
      }
      setFeedback(previewTime, previewDuration);
    };
    const restoreActualProgress = (aplayer) => {
      const duration = getDuration(aplayer);
      const currentTime = Math.min(
        duration,
        Math.max(0, Number(aplayer?.audio?.currentTime) || 0)
      );
      const ratio = duration > 0 ? currentTime / duration : 0;
      aplayer.bar?.set?.("played", ratio, "width");
      aplayer.lrc?.update?.(currentTime);
      if (aplayer.template?.ptime) {
        aplayer.template.ptime.textContent = formatTime(currentTime);
      }
      setFeedback(currentTime, duration);
    };
    const resetPointerState = () => {
      if (
        activePointerId !== null &&
        $hitarea.hasPointerCapture?.(activePointerId)
      ) {
        $hitarea.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
      isScrubbing = false;
      previewTime = 0;
      previewDuration = 0;
      previewSource = "";
      $music.classList.remove("scrubbing", "keyboard-scrubbing");
    };
    const cancelScrub = () => {
      window.clearTimeout(feedbackTimer);
      const aplayer = getAPlayer();
      if (isScrubbing && aplayer) {
        aplayer.disableTimeupdate = false;
        restoreActualProgress(aplayer);
      }
      resetPointerState();
    };
    const showKeyboardFeedback = (time, duration) => {
      window.clearTimeout(feedbackTimer);
      setFeedback(time, duration, true);
      $music.classList.add("scrubbing", "keyboard-scrubbing");
      feedbackTimer = window.setTimeout(() => {
        $music.classList.remove("scrubbing", "keyboard-scrubbing");
      }, 900);
    };

    $hitarea.addEventListener("pointerdown", (event) => {
      if (
        !event.isPrimary ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) return;
      const aplayer = getAPlayer();
      const duration = getDuration(aplayer);
      if (!duration) return;
      window.clearTimeout(feedbackTimer);
      $music.classList.remove("scrubbing", "keyboard-scrubbing");
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      previewDuration = duration;
      previewSource = String(aplayer.audio?.currentSrc || aplayer.audio?.src || "");
      isScrubbing = false;
    });
    document.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId) return;
      const deltaX = Math.abs(event.clientX - startX);
      const deltaY = Math.abs(event.clientY - startY);
      if (!isScrubbing) {
        if (deltaY >= dragThreshold && deltaY > deltaX) {
          resetPointerState();
          return;
        }
        if (deltaX < dragThreshold || deltaX <= deltaY) return;
        isScrubbing = true;
        $music.classList.add("scrubbing");
        $hitarea.setPointerCapture?.(event.pointerId);
      }
      const aplayer = getAPlayer();
      const currentSource = String(
        aplayer?.audio?.currentSrc || aplayer?.audio?.src || ""
      );
      if (!aplayer || (previewSource && currentSource !== previewSource)) {
        return cancelScrub();
      }
      event.preventDefault();
      updatePreview(aplayer, event.clientX);
    });
    document.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activePointerId) return;
      const aplayer = getAPlayer();
      const currentSource = String(
        aplayer?.audio?.currentSrc || aplayer?.audio?.src || ""
      );
      if (
        isScrubbing &&
        aplayer &&
        (!previewSource || currentSource === previewSource)
      ) {
        updatePreview(aplayer, event.clientX);
        aplayer.seek(previewTime);
        aplayer.disableTimeupdate = false;
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 0);
      } else if (isScrubbing && aplayer) {
        aplayer.disableTimeupdate = false;
        restoreActualProgress(aplayer);
      }
      resetPointerState();
    });
    document.addEventListener("pointercancel", cancelScrub);
    document.addEventListener("click", (event) => {
      if (!suppressClick || !event.target?.closest?.("#nav-music")) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    $hitarea.addEventListener("keydown", (event) => {
      const aplayer = getAPlayer();
      const duration = getDuration(aplayer);
      if (!duration) return;
      const currentTime = Math.min(
        duration,
        Math.max(0, Number(aplayer.audio?.currentTime) || 0)
      );
      const targets = {
        ArrowLeft: currentTime - keyboardSeekStep,
        ArrowRight: currentTime + keyboardSeekStep,
        Home: 0,
        End: duration,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = Math.min(duration, Math.max(0, targets[event.key]));
      aplayer.seek(target);
      showKeyboardFeedback(target, duration);
    });
    document.addEventListener("solitude:beforeNavigate", cancelScrub);
  },
  musicBind() {
    const $meting = document.querySelector("#nav-music meting-js");
    const aplayer = $meting?.aplayer;
    if (!aplayer) {
      this.isMusicBind = false;
      return null;
    }

    this.isMusicBind = true;
    if (!aplayer.solitudeCapsuleBound) {
      aplayer.on("play", () => this.syncMusicState(true));
      aplayer.on("pause", () => this.syncMusicState(false));
      aplayer.on("ended", () => this.syncMusicState(false));
      aplayer.on("loadeddata", () => {
        if (typeof coverColor === "function") coverColor(true);
        this.syncMusicState(Boolean(aplayer.audio && !aplayer.audio.paused));
      });
      aplayer.solitudeCapsuleBound = true;
    }

    this.syncMusicState(Boolean(aplayer.audio && !aplayer.audio.paused));
    return aplayer;
  },
  handleMusicClick(event) {
    if (event.target?.closest?.(".music-control-btn")) return;
    if (!this.musicPlaying) this.musicToggle();
  },
  musicToggle(isMeting = true) {
    const aplayer = this.musicBind();
    if (!aplayer) return;

    const shouldPlay = Boolean(aplayer.audio?.paused);
    if (!isMeting) {
      this.syncMusicState(shouldPlay);
      return;
    }

    shouldPlay ? aplayer.play() : aplayer.pause();
  },
  musicSkipBack() {
    document.querySelector("#nav-music meting-js")?.aplayer?.skipBack();
  },
  musicSkipForward() {
    document.querySelector("#nav-music meting-js")?.aplayer?.skipForward();
  },
  switchCommentBarrage() {
    const commentBarrageElement = document.querySelector(".comment-barrage");
    const consoleCommentBarrage = document.querySelector(
      "#consoleCommentBarrage"
    );
    if (!commentBarrageElement) return;

    const isDisplayed =
      window.getComputedStyle(commentBarrageElement).display === "flex";
    commentBarrageElement.style.display = isDisplayed ? "none" : "flex";
    consoleCommentBarrage?.classList.toggle("on", !isDisplayed);
    Solitude.saveToLocal.set("commentBarrageSwitch", !isDisplayed, 0.2);
    if (Solitude.rightMenu?.menuItems.barrage) {
      Solitude.rightMenu.barrage(isDisplayed);
    }
  },
  switchHideAside() {
    const htmlClassList = document.documentElement.classList;
    const consoleHideAside = document.querySelector("#consoleHideAside");
    const isHideAside = htmlClassList.contains("hide-aside");
    Solitude.saveToLocal.set("aside-status", isHideAside ? "show" : "hide", 1);
    htmlClassList.toggle("hide-aside");
    consoleHideAside.classList.toggle("on", !isHideAside);
  },
  initConsoleState() {
    const consoleHideAside = document.querySelector("#consoleHideAside");
    if (!consoleHideAside) return;
    consoleHideAside.classList.toggle(
      "on",
      document.documentElement.classList.contains("hide-aside")
    );
  },
  changeWittyWord() {
    const greetings = Solitude.config.aside.witty_words || [];
    if (greetings.length === 0) {
      document.getElementById("sayhi").textContent = "Solitude";
      this.lastWittyWord = null;
      return;
    }
    const greetingElement = document.getElementById("sayhi");
    let randomGreeting;
    if (greetings.length === 1) {
      randomGreeting = greetings[0];
    } else {
      do {
        randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      } while (randomGreeting === this.lastWittyWord);
    }
    greetingElement.textContent = randomGreeting;
    this.lastWittyWord = randomGreeting;
  },
  switchDarkMode() {
    const isDarkMode =
      document.documentElement.getAttribute("data-theme") === "dark";
    const newMode = isDarkMode ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newMode);
    Solitude.saveToLocal.set("theme", newMode, 0.02);
    Solitude.snackbarShow(Solitude.config.lang.theme[newMode], false, 2000);
    if (Solitude.rightMenu) {
      Solitude.rightMenu.mode(!isDarkMode);
      Solitude.rightMenu.hideRightMenu();
    }
    handleThemeChange(newMode);
  },
  hideTodayCard: () =>
    document.getElementById("todayCard").classList.add("hide"),
  toTop: () => Solitude.scrollToDest(0),
  showConsole() {
    const consoleElement = document.getElementById("console");
    if (!consoleElement || consoleElement.classList.contains("show")) return;

    const header = document.getElementById("page-header");
    if (header) {
      this.consoleNavState = {
        fixed: header.classList.contains("nav-fixed"),
        visible: header.classList.contains("nav-visible"),
      };
      header.classList.add("nav-fixed");
      header.classList.remove("nav-visible");
      header.classList.add("console-open");
    }

    consoleElement.classList.add("show");
    document
      .querySelector("#nav-console .console_switchbutton")
      ?.classList.add("console-open");
  },
  hideConsole() {
    const consoleElement = document.getElementById("console");
    if (!consoleElement?.classList.contains("show")) return;

    consoleElement.classList.remove("show");
    document
      .querySelector("#nav-console .console_switchbutton")
      ?.classList.remove("console-open");

    const header = document.getElementById("page-header");
    if (header && this.consoleNavState) {
      header.classList.remove("console-open");
      header.classList.toggle("nav-fixed", this.consoleNavState.fixed);
      header.classList.toggle("nav-visible", this.consoleNavState.visible);
    }
    this.consoleNavState = null;
  },
  toggleConsole() {
    const consoleElement = document.getElementById("console");
    if (consoleElement?.classList.contains("show")) {
      this.hideConsole();
    } else {
      this.showConsole();
    }
  },
  onConsoleCardGroupClick(event) {
    if (event.target.closest?.(".console-card")) return;
    this.hideConsole();
  },
  onNavBlankClickCloseConsole(event) {
    if (!document.getElementById("console")?.classList.contains("show")) return;
    if (
      event.target.closest?.(
        "a, button, .back-home-button, .menus_item, #page-name"
      )
    ) {
      return;
    }
    this.hideConsole();
  },
  refreshWaterFall() {
    const allElements = [...document.querySelectorAll(".waterfall")];
    const elements = allElements.filter(
      (element) => element.dataset.solitudeWaterfall !== "true"
    );
    if (!elements.length) return;
    elements.forEach((element) => {
      element.dataset.solitudeWaterfall = "true";
    });

    const timers = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          const timer = setTimeout(() => {
            timers.delete(timer);
            if (!entry.target.isConnected) return;
            waterfall(entry.target).then(() => {
              if (entry.target.isConnected) entry.target.classList.add("show");
            });
          }, 300);
          timers.add(timer);
        }
      });
    });
    elements.forEach((element) => observer.observe(element));
    lifecycle.add(() => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    });
  },
  addRuntime() {
    if (!Solitude.config.runtime) return;
    const runtime =
      Solitude.timeDiff(new Date(Solitude.config.runtime), new Date()) +
      Solitude.config.lang.day;
    document
      .querySelectorAll(".runtimeshow, #runtimeshow")
      .forEach((element) => (element.textContent = runtime));
  },
  toTalk(txt) {
    const inputs = [
      "#wl-edit",
      ".el-textarea__inner",
      "#veditor",
      ".atk-textarea",
    ];
    inputs.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.dispatchEvent(
          new Event("input", { bubble: true, cancelable: true })
        );
        el.value = "> " + txt.replace(/\n/g, "\n> ") + "\n\n";
        Solitude.scrollToDest(
          Solitude.getEleTop(document.getElementById("post-comment")),
          300
        );
        el.focus();
        el.setSelectionRange(-1, -1);
      }
    });
    Solitude.snackbarShow(Solitude.config.lang.totalk, false, 2000);
  },
  initbbtalk() {
    const bberTalkElement = document.querySelector("#bber-talk");
    if (bberTalkElement) {
      new Swiper(".swiper-container", {
        direction: "vertical",
        loop: true,
        autoplay: {
          delay: 3000,
          pauseOnMouseEnter: true,
        },
      });
    }
  },
  addPhotoFigcaption() {
    document
      .querySelectorAll(
        ".article-container img:not(.gallery-item img, .inline-img)"
      )
      .forEach((image) => {
        const captionText = image.getAttribute("alt");
        const figure = image.closest("figure");
        const hasFigureCaption = figure?.querySelector("figcaption");
        const hasGeneratedCaption =
          image.getAttribute("data-solitude-caption-ready") === "true" ||
          image.nextElementSibling?.matches(".img-alt");
        if (!captionText || hasFigureCaption || hasGeneratedCaption) return;

        image.setAttribute("data-solitude-caption-ready", "true");
        image.insertAdjacentHTML(
          "afterend",
          `<div class="img-alt is-center">${Solitude.escapeHtml(
            captionText
          )}</div>`
        );
      });
  },
  scrollToComment: () =>
    Solitude.scrollToDest(
      Solitude.getEleTop(document.getElementById("post-comment")),
      300
    ),
  setTimeState() {
    const el = document.getElementById("sayhi");
    if (el) {
      const hours = new Date().getHours();
      const lang = Solitude.config.aside.state;

      const localData = getLocalData([
        "twikoo",
        "WALINE_USER_META",
        "WALINE_USER",
        "_v_Cache_Meta",
        "ArtalkUser",
      ]);

      function getLocalData(keys) {
        for (let key of keys) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              return JSON.parse(data);
            } catch (error) {
              localStorage.removeItem(key);
            }
          }
        }
        return null;
      }
      const nick = localData ? localData.nick || localData.display_name : null;

      const prefix = this.wasPageHidden
        ? Solitude.config.aside.witty_comment.back + nick
        : Solitude.config.aside.witty_comment.prefix + nick;

      const greetings = [
        { start: 0, end: 5, text: nick ? prefix : lang.goodnight },
        { start: 6, end: 10, text: nick ? prefix : lang.morning },
        { start: 11, end: 14, text: nick ? prefix : lang.noon },
        { start: 15, end: 18, text: nick ? prefix : lang.afternoon },
        { start: 19, end: 24, text: nick ? prefix : lang.night },
      ];
      const greeting = greetings.find(
        (g) => hours >= g.start && hours <= g.end
      );
      el.innerText = greeting.text;
    }
  },
  tagPageActive() {
    const decodedPath = decodeURIComponent(window.location.pathname);
    const isTagPage = /\/tags\/.*?\//.test(decodedPath);
    if (isTagPage) {
      const tag = decodedPath.split("/").slice(-2, -1)[0];
      const tagElement = document.getElementById(tag);
      if (tagElement) {
        document.querySelectorAll("a.select").forEach((link) => {
          link.classList.remove("select");
        });
        tagElement.classList.add("select");
      }
    }
  },
  categoriesBarActive() {
    const categoryBar = document.querySelector("#category-bar");
    const currentPath = decodeURIComponent(window.location.pathname);
    const isHomePage = currentPath === Solitude.config.root;
    if (categoryBar) {
      const categoryItems = categoryBar.querySelectorAll(".category-bar-item");
      categoryItems.forEach((item) => item.classList.remove("select"));
      const activeItemId = isHomePage
        ? "category-bar-home"
        : currentPath.split("/").slice(-2, -1)[0];
      const activeItem = document.getElementById(activeItemId);
      if (activeItem) {
        activeItem.classList.add("select");
      }
    }
  },
  scrollCategoryBarToRight() {
    const scrollBar = document.getElementById("category-bar-items");
    const nextElement = document.getElementById("category-bar-next");
    if (scrollBar) {
      const isScrollBarAtEnd = () =>
        scrollBar.scrollLeft + scrollBar.clientWidth >=
        scrollBar.scrollWidth - 8;
      const scroll = () => {
        scrollBar.scroll({
          left: isScrollBarAtEnd() ? 0 : scrollBar.clientWidth,
          behavior: "smooth",
        });
      };
      if (scrollBar.dataset.solitudeScrollBound !== "true") {
        scrollBar.dataset.solitudeScrollBound = "true";
        lifecycle.listen(scrollBar, "scroll", () => {
          clearTimeout(this.timeoutId);
          this.timeoutId = setTimeout(() => {
            if (nextElement) {
              nextElement.style.transform = isScrollBarAtEnd()
                ? "rotate(180deg)"
                : "";
            }
          }, 150);
        }, { passive: true });
      }
      scroll();
    }
  },
  openAllTags() {
    document
      .querySelectorAll(".card-allinfo .card-tag-cloud")
      .forEach((tagCloudElement) => tagCloudElement.classList.add("all-tags"));
    document.getElementById("more-tags-btn")?.remove();
  },
  listenToPageInputPress() {
    const toGroup = document.querySelector(".toPageGroup");
    const pageText = document.getElementById("toPageText");
    if (!pageText) return;
    const pageButton = document.getElementById("toPageButton");
    const pageNumbers = document.querySelectorAll(".page-number");
    const lastPageNumber = +(pageNumbers[pageNumbers.length - 1]?.textContent || 1);
    if (lastPageNumber === 1) {
      if (toGroup) toGroup.style.display = "none";
      return;
    }
    lifecycle.listen(pageText, "keydown", (event) => {
      if (event.key === "Enter") {
        Solitude.toPage();
        Solitude.navigate(pageButton.href);
      }
    });
    lifecycle.listen(pageText, "input", () => {
      pageText.value = pageText.value.replace(/[^0-9]/g, "");
      if (pageText.value === "0") pageText.value = "";
      pageButton.classList.toggle(
        "haveValue",
        pageText.value !== "" && pageText.value !== "0"
      );
      if (+pageText.value > lastPageNumber) {
        pageText.value = lastPageNumber;
      }
    });
  },
  addNavBackgroundInit() {
    const scrollTop = document.documentElement.scrollTop;
    if (scrollTop !== 0) {
      document
        .getElementById("page-header")
        .classList.add("nav-fixed", "nav-visible");
    }
  },
  toPage() {
    const pageNumbers = document.querySelectorAll(".page-number");
    const maxPageNumber = parseInt(
      pageNumbers[pageNumbers.length - 1].innerHTML
    );
    const inputElement = document.getElementById("toPageText");
    const inputPageNumber = parseInt(inputElement.value);
    document.getElementById("toPageButton").href =
      !isNaN(inputPageNumber) &&
      inputPageNumber <= maxPageNumber &&
      inputPageNumber > 1
        ? window.location.href.replace(/\/page\/\d+\/$/, "/") +
          "page/" +
          inputPageNumber +
          "/"
        : "/";
  },
  owoBig(owoSelector) {
    let owoBig = document.getElementById("owo-big");
    if (!owoBig) {
      owoBig = document.createElement("div");
      owoBig.id = "owo-big";
      document.body.appendChild(owoBig);
    }
    const showOwoBig = (event) => {
      const target = event.target;
      const owoItem = target.closest(owoSelector.item);
      if (owoItem && target.closest(owoSelector.body)) {
        const imgSrc = owoItem.querySelector("img")?.src;
        if (imgSrc) {
          owoBig.innerHTML = `<img src="${imgSrc}" style="max-width: 100%; height: auto;">`;
          owoBig.style.display = "block";
          positionOwoBig(owoItem);
        }
      }
    };
    const hideOwoBig = (event) => {
      if (
        event.target.closest(owoSelector.item) &&
        event.target.closest(owoSelector.body)
      ) {
        owoBig.style.display = "none";
      }
    };
    const positionOwoBig = (owoItem) => {
      const itemRect = owoItem.getBoundingClientRect();
      owoBig.style.left = `${itemRect.left - owoBig.offsetWidth / 4}px`;
      owoBig.style.top = `${itemRect.top}px`;
    };
    lifecycle.listen(document, "mouseover", showOwoBig);
    lifecycle.listen(document, "mouseout", hideOwoBig);
  },
  changeTimeFormat(selector) {
    selector.forEach((item) => {
      const timeVal = item.getAttribute("datetime");
      item.textContent = Solitude.diffDate(timeVal, true);
      item.style.display = "inline";
    });
  },
  switchComments() {
    const switchBtn = document.getElementById("switch-btn");
    if (!switchBtn) return;
    let switchDone = false;
    const commentContainer = document.getElementById("post-comment");
    const handleSwitchBtn = () => {
      commentContainer.classList.toggle("move");
      if (!switchDone && typeof loadTwoComment === "function") {
        switchDone = true;
        loadTwoComment();
      }
    };
    Solitude.addEventListenerPjax(switchBtn, "click", handleSwitchBtn);
  },
  homeTypeit() {
    if (typeof home_subtitle === "undefined") return;
    const ty = new TypeIt(".banners-title-small", {
      speed: 200,
      waitUntilVisible: true,
      loop: true,
      lifeLike: true,
    });
    home_subtitle.forEach((item) => {
      ty.type(item).pause(500).delete(item);
    });
    ty.go();
    lifecycle.add(() => ty.destroy?.());
  },
};

Object.assign(Solitude, actions);
Solitude.toggleTheme = () => Solitude.switchDarkMode();

class toc {
  static init() {
    const tocContainer = document.getElementById("card-toc");
    if (!tocContainer) return;
    const el = tocContainer.querySelectorAll("#TableOfContents a, .toc a");
    if (!el.length) {
      tocContainer.style.display = "none";
      return;
    }
    el.forEach((e) => {
      e.addEventListener("click", (event) => {
        event.preventDefault();
        Solitude.scrollToDest(
          Solitude.getEleTop(
            document.getElementById(
              decodeURI(
                (event.target.className === "toc-text"
                  ? event.target.parentNode.hash
                  : event.target.hash
                ).replace("#", "")
              )
            )
          ),
          300
        );
      });
    });
    this.active(el);
  }

  static active(toc) {
    const $article = document.querySelector(".article-container");
    const $tocContent = document.getElementById("toc-content");
    const list = $article.querySelectorAll("h1,h2,h3,h4,h5,h6");
    let detectItem = "";

    const autoScroll = (el) => {
      const activePosition = el.getBoundingClientRect().top;
      const sidebarScrollTop = $tocContent.scrollTop;
      if (activePosition > document.documentElement.clientHeight - 100) {
        $tocContent.scrollTop = sidebarScrollTop + 150;
      }
      if (activePosition < 100) {
        $tocContent.scrollTop = sidebarScrollTop - 150;
      }
    };

    const findHeadPosition = (top) => {
      if (top === 0) return false;
      let currentIndex = "";
      list.forEach((ele, index) => {
        if (top > Solitude.getEleTop(ele) - 80) {
          currentIndex = index;
        }
      });
      if (detectItem === currentIndex) return;
      detectItem = currentIndex;
      document
        .querySelectorAll("#TableOfContents .active, .toc .active")
        .forEach((i) => {
        i.classList.remove("active");
        });
      const activeitem = toc[detectItem];
      if (activeitem) {
        let parent = toc[detectItem].parentNode;
        activeitem.classList.add("active");
        autoScroll(activeitem);
        for (
          ;
          parent && !parent.matches("#TableOfContents, .toc");
          parent = parent.parentNode
        ) {
          if (parent.matches("li")) parent.classList.add("active");
        }
      }
    };

    const tocScrollFn = Solitude.throttle(() => {
      const currentTop = window.scrollY || document.documentElement.scrollTop;
      findHeadPosition(currentTop);
    }, 100);
    lifecycle.listen(window, "scroll", tocScrollFn, { passive: true });
  }
}

class tabs {
  static init() {
    this.clickFnOfTabs();
  }

  static clickFnOfTabs() {
    document
      .querySelectorAll(".article-container .tab > button")
      .forEach((item) => {
        item.addEventListener("click", function () {
          const $tabItem = this.parentNode;
          if (!$tabItem.classList.contains("active")) {
            const $tabContent = $tabItem.parentNode.nextElementSibling;
            const $siblings = Solitude.siblings($tabItem, ".active")[0];
            $siblings && $siblings.classList.remove("active");
            $tabItem.classList.add("active");
            const tabId = this.getAttribute("data-href").replace("#", "");
            [...$tabContent.children].forEach((item) => {
              item.classList.toggle("active", item.id === tabId);
            });
          }
        });
      });
  }

  static expireAddListener() {
    const { expire } = Solitude.config;
    if (!expire) return;
    const list = document.querySelectorAll(".post-meta-date time");
    const post_date = list.length
      ? list[list.length - 1]
      : document.querySelector(".datetime");
    if (!post_date) return;
    const ex = Math.ceil(
      (new Date().getTime() -
        new Date(post_date.getAttribute("datetime")).getTime()) /
        1000 /
        60 /
        60 /
        24
    );
    if (expire.time > ex) return;
    const ele = document.createElement("div");
    ele.className = "expire";
    ele.innerHTML = `<i class="solitude fas fa-circle-exclamation"></i>${
      expire.text_prev
    }${-(expire.time - ex)}${expire.text_next}`;
    const articleContainer = document.querySelector(".article-container");
    articleContainer.insertAdjacentElement(
      expire.position === "top" ? "afterbegin" : "beforeend",
      ele
    );
  }
}

const scrollFnToDo = () => {
  const { toc } = Solitude.page;

  if (toc) {
    const $cardTocLayout = document.getElementById("card-toc");
    const $cardToc = $cardTocLayout.querySelector(".toc-content");
    const tocItemClickFn = (e) => {
      const target = e.target.closest(".toc-link");
      if (!target) return;

      e.preventDefault();
      Solitude.scrollToDest(
        Solitude.getEleTop(
          document.getElementById(
            decodeURI(target.getAttribute("href")).replace("#", "")
          )
        ),
        300
      );
      if (window.innerWidth < 900) {
        $cardTocLayout.classList.remove("open");
      }
    };
    Solitude.addEventListenerPjax($cardToc, "click", tocItemClickFn);
  }
};

const forPostFn = () => {
  scrollFnToDo();
};

const initPostCoverTilt = () => {
  const cover = document.querySelector(".post-cover-aside");
  const canTilt = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (!cover || !canTilt || reduceMotion) return;

  const updateTilt = (event) => {
    const rect = cover.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 10;
    const rotateY = (x - 0.5) * 10;

    cover.style.setProperty("--post-cover-glow-x", `${(x * 100).toFixed(2)}%`);
    cover.style.setProperty("--post-cover-glow-y", `${(y * 100).toFixed(2)}%`);
    cover.style.setProperty("--post-cover-rotate-x", `${rotateX.toFixed(2)}deg`);
    cover.style.setProperty("--post-cover-rotate-y", `${rotateY.toFixed(2)}deg`);
    cover.style.setProperty("--post-cover-img-x", `${(-rotateY).toFixed(2)}px`);
    cover.style.setProperty("--post-cover-img-y", `${rotateX.toFixed(2)}px`);
  };

  const resetTilt = () => {
    cover.style.setProperty("--post-cover-rotate-x", "0deg");
    cover.style.setProperty("--post-cover-rotate-y", "0deg");
    cover.style.setProperty("--post-cover-img-x", "0px");
    cover.style.setProperty("--post-cover-img-y", "0px");
  };

  lifecycle.listen(cover, "pointerenter", updateTilt);
  lifecycle.listen(cover, "pointermove", updateTilt);
  lifecycle.listen(cover, "pointerleave", resetTilt);
  lifecycle.listen(cover, "pointercancel", resetTilt);
};

const getAboutValue = (source, path) => {
  if (!path) return source;
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], source);
};

const initAboutPage = () => {
  const aboutPage = document.getElementById("about-page");
  if (!aboutPage) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const words = Array.from(aboutPage.querySelectorAll("[data-about-word]"));
  if (words.length > 1 && !reduceMotion) {
    let wordIndex = 0;
    const rotateWord = () => {
      const previous = words[wordIndex];
      wordIndex = (wordIndex + 1) % words.length;
      const next = words[wordIndex];
      words.forEach((word) => {
        word.removeAttribute("data-show");
        word.removeAttribute("data-up");
      });
      previous.setAttribute("data-up", "");
      next.setAttribute("data-show", "");
    };
    const wordTimer = window.setInterval(rotateWord, 2000);
    lifecycle.add(() => window.clearInterval(wordTimer));
  }

  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  if (canHover && !reduceMotion) {
    aboutPage.querySelectorAll(".author-content-item").forEach((card) => {
      let glow = card.querySelector(":scope > .about-pointer-glow");
      if (!glow) {
        glow = document.createElement("div");
        glow.className = "about-pointer-glow";
        glow.setAttribute("aria-hidden", "true");
        card.prepend(glow);
      }
      card.classList.add("about-glow-host");

      const updateGlowPosition = (event) => {
        const rect = card.getBoundingClientRect();
        glow.style.left = `${event.clientX - rect.left}px`;
        glow.style.top = `${event.clientY - rect.top}px`;
      };

      lifecycle.listen(card, "pointerenter", updateGlowPosition);
      lifecycle.listen(card, "pointermove", updateGlowPosition);
    });
  }

  aboutPage.querySelectorAll("[data-about-stats]").forEach(async (host) => {
    const configNode = host.querySelector("[data-about-stats-config]");
    if (!configNode?.textContent) return;

    let config;
    try {
      config = JSON.parse(configNode.textContent);
    } catch {
      return;
    }
    const url = config?.source?.url?.trim?.();
    if (!url) return;

    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    lifecycle.signal.addEventListener("abort", abortRequest, { once: true });
    const timeout = window.setTimeout(abortRequest, 5000);
    lifecycle.add(() => {
      window.clearTimeout(timeout);
      lifecycle.signal.removeEventListener("abort", abortRequest);
      requestController.abort();
    });

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: requestController.signal,
      });
      if (!response.ok) return;
      const payload = await response.json();
      const data = getAboutValue(payload, config.source.response_path);
      config.metrics?.forEach((metric) => {
        const rawValue = getAboutValue(data, metric.field);
        const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
        if (!Number.isFinite(value)) return;
        const output = Array.from(host.querySelectorAll("[data-about-metric]"))
          .find((node) => node.dataset.aboutMetric === metric.field);
        if (output) output.textContent = value.toLocaleString();
      });
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.debug("Solitude About statistics kept fallback values.");
      }
    } finally {
      window.clearTimeout(timeout);
      lifecycle.signal.removeEventListener("abort", abortRequest);
    }
  });
};

const initGalleryMasonry = () => {
  const galleries = [...document.querySelectorAll(".tag-gallery")];
  if (!galleries.length) return;

  const frames = new Set();
  const observers = [];

  galleries.forEach((gallery) => {
    const items = [...gallery.children].filter((item) =>
      item.classList.contains("gallery-item")
    );
    if (!items.length) return;

    const layout = () => {
      if (!gallery.isConnected) return;
      const style = window.getComputedStyle(gallery);
      const rowHeight = Number.parseFloat(style.gridAutoRows) || 1;
      const rowGap = Number.parseFloat(style.rowGap) || 0;

      items.forEach((item) => {
        item.style.gridRowEnd = "auto";
      });
      gallery.classList.add("is-masonry-ready");
      items.forEach((item) => {
        const itemHeight = item.getBoundingClientRect().height;
        const span = Math.max(
          1,
          Math.ceil((itemHeight + rowGap) / (rowHeight + rowGap))
        );
        item.style.gridRowEnd = `span ${span}`;
      });
    };

    const scheduleLayout = () => {
      const frame = requestAnimationFrame(() => {
        frames.delete(frame);
        layout();
      });
      frames.add(frame);
    };

    const resizeObserver = new ResizeObserver(scheduleLayout);
    resizeObserver.observe(gallery);
    items.forEach((item) => resizeObserver.observe(item));
    observers.push(resizeObserver);

    gallery.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        lifecycle.listen(image, "load", scheduleLayout, { once: true });
        lifecycle.listen(image, "error", scheduleLayout, { once: true });
      }
    });
    scheduleLayout();
  });

  lifecycle.add(() => {
    observers.forEach((observer) => observer.disconnect());
    frames.forEach(cancelAnimationFrame);
  });
};

Solitude.refresh = async () => {
  lifecycle.disposePage();
  const { is_home, is_page, page, is_post } = Solitude.page;
  const { runtime, lazyload, lightbox, randomlink, covercolor, expire } =
    Solitude.config;
  const timeSelector = ".datetime, .webinfo-item time, .post-meta-date time";
  document.body.setAttribute("data-type", page);
  document.body.setAttribute("data-right-menu", String(Boolean(Solitude.config.right_menu)));
  await loadFeatureModules();
  Solitude.changeTimeFormat(document.querySelectorAll(timeSelector));
  runtime && Solitude.addRuntime();
  [
    scrollFn,
    sidebarFn,
    initAsideTagCloudOverflow,
    initTooltip,
    () => Solitude.addPhotoFigcaption(),
    () => Solitude.setTimeState(),
    () => Solitude.tagPageActive(),
    () => Solitude.categoriesBarActive(),
    () => Solitude.listenToPageInputPress(),
    () => Solitude.musicScrubberBind(),
    () => Solitude.musicBind(),
    () => Solitude.addNavBackgroundInit(),
    initGalleryMasonry,
    () => Solitude.refreshWaterFall(),
  ].forEach((fn) => fn());
  lazyload.enable && Solitude.lazyloadImg();
  lightbox &&
    Solitude.lightbox(
      document.querySelectorAll(
        ".article-container img:not(.flink-avatar,.gallery-group img, .no-lightbox)"
      )
    );
  randomlink && Solitude.randomLinksList?.();
  Solitude.config.friend_links.async && Solitude.friendLinks?.init();
  if (is_post) {
    initPostCoverTilt();
  }
  Solitude.switchComments();
  initObserver();
  if (is_home) {
    showTodayCard();
    initHomeCenter();
    Solitude.homeTypeit();
  }
  typeof updatePostsBasedOnComments === "function" &&
    updatePostsBasedOnComments();
  if (is_post || is_page) {
    if (document.querySelector("[data-code-block]")) {
      const { initializeCodeBlocks } = await import("./code-highlight");
      void initializeCodeBlocks(lifecycle.signal);
    }
    tabs.init();
  }
  if (is_post && expire) {
    tabs.expireAddListener();
  }
  if (covercolor.enable) coverColor();
  if (Solitude.page.toc) toc.init();
  if (page === "music") {
    initializeMusicPlayer();
    lifecycle.add(() => Solitude.musicPlayer?.destroy?.());
  }
  if (page === "archives") {
    const { archivePageController, initArchivePage } = await import("./archive-page");
    initArchivePage();
    lifecycle.add(() => archivePageController.destroy());
  }
  initAboutPage();
  forPostFn();
};

const initializeApp = async () => {
  initActionDelegation(Solitude);
  initPreloader(Solitude);
  addCopyright();
  await Solitude.refresh();
  asideStatus();
  window.onscroll = percent;
  Solitude.initConsoleState();
  lifecycle.emit("ready", { config: Solitude.config, page: Solitude.page });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    Solitude.wasPageHidden = true;
  }
});

window.onkeydown = (e) => {
  const { code, ctrlKey, shiftKey } = e;
  if (
    code === "F12" ||
    (ctrlKey && shiftKey && (code === "KeyI" || code === "KeyC"))
  ) {
    Solitude.snackbarShow(Solitude.config.lang.f12, false, 3000);
  }
  if (code === "Escape") {
    Solitude.hideConsole();
  }
};

document.addEventListener("copy", () => {
  Solitude.snackbarShow(Solitude.config.lang.copy.success, false, 3000);
});
