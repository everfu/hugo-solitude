import { Solitude } from "./core/api";

(() => {
  const config = Solitude.config.friend_links;
  let request = null;

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }
    return element;
  };

  const resolveSiteUrl = (value) => {
    if (!value) return "";
    const url = String(value);
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;

    const root = Solitude.config.root || "/";
    if (url.startsWith("/")) {
      return root === "/" ? url : `${root.replace(/\/$/, "")}${url}`;
    }
    return `${root}${url}`;
  };

  const createImage = (src, alt, className) => {
    const image = createElement("img", className);
    image.alt = alt || "";
    image.loading = "lazy";
    const resolvedSrc = resolveSiteUrl(src);

    if (Solitude.config.lazyload.enable) {
      image.src = config.placeholder || config.default_avatar;
      image.dataset.lazySrc = resolvedSrc;
    } else {
      image.src = resolvedSrc;
    }
    image.addEventListener(
      "error",
      () => {
        image.removeAttribute("data-lazy-src");
        image.src = config.default_avatar;
      },
      { once: true }
    );
    return image;
  };

  const shuffle = (items) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }
    return shuffled;
  };

  const createTag = (item) => {
    if (!item.tag) return null;
    const tag = createElement("span", "site-card-tag", item.tag);
    if (item.color === "vip" || item.color === "speed") {
      tag.classList.add(item.color);
      tag.append(createElement("i", "light"));
    } else if (item.color) {
      tag.style.backgroundColor = item.color;
    }
    return tag;
  };

  const createItemLink = (
    item,
    group,
    { disconnected = false, normal = false, defaultOrder = 0 } = {}
  ) => {
    const wrapper = createElement(
      "div",
      `flink-list-item${normal ? " flink-lazy-pending" : ""}`
    );
    if (normal && item.tag) {
      String(item.tag)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((className) => wrapper.classList.add(className));
    }
    if (normal) wrapper.dataset.defaultOrder = String(defaultOrder);
    const tag = disconnected ? null : createTag(item);
    if (tag && !normal) wrapper.append(tag);

    const anchor = createElement("a", "cf-friends-link");
    anchor.href = disconnected ? "javascript:void(0);" : resolveSiteUrl(item.link);
    anchor.title = item.name || "";
    if (!disconnected) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer nofollow";
    }
    const avatar = disconnected
      ? config.default_avatar
      : `${item.avatar || ""}${group.suffix || ""}`;
    anchor.append(
      createImage(avatar, item.name, "flink-avatar cf-friends-avatar"),
      createElement("div", "img-alt is-center", item.name)
    );

    const info = createElement("div", "flink-item-info");
    info.append(createElement("span", "flink-item-name cf-friends-name", item.name));
    const description = createElement("span", "flink-item-desc", item.descr);
    description.title = item.descr || "";
    info.append(description);
    anchor.append(info);
    wrapper.append(anchor);
    return wrapper;
  };

  const createItemGroup = (
    group,
    { disconnected = false, normal = false, id = "", initialSort = "default" } = {}
  ) => {
    const list = createElement(
      "div",
      disconnected
        ? "flink-list cf-friends-lost-contact mini"
        : normal
          ? "flink-list normal-five-row-horizontal js-normal-sortable"
          : "flink-list"
    );
    if (id) list.id = id;
    if (normal) list.dataset.initialSort = initialSort;
    const fragment = document.createDocumentFragment();
    const entries = group.link_list.map((item, defaultOrder) => ({
      item,
      defaultOrder,
    }));
    const orderedEntries = initialSort === "random" ? shuffle(entries) : entries;
    orderedEntries.forEach(({ item, defaultOrder }) =>
      fragment.append(
        createItemLink(item, group, { disconnected, normal, defaultOrder })
      )
    );
    list.append(fragment);
    return list;
  };

  const createGroupHeading = (group, count) => {
    const heading = createElement(
      "h2",
      "",
      `${group.class_name || ""} (${count})`
    );
    if (!group.title_link || !group.title_link_text) return heading;

    const titleBar = createElement("div", "power_title_bar");
    const linkWrapper = createElement("div", "title-h2-a-right");
    const link = createElement("a", "", group.title_link_text);
    link.href = resolveSiteUrl(group.title_link);
    linkWrapper.append(link);
    titleBar.append(heading, linkWrapper);
    return titleBar;
  };

  const createNormalHeading = (group, count, listId, sortMode) => {
    const row = createElement("div", "flink-normal-title-row");
    const content = createElement("div", "flink-normal-title-content");
    content.append(
      createElement("h2", "", `${group.class_name || ""} (${count})`),
      createElement("div", "flink-desc", group.descr || "")
    );

    const controls = createElement("div", "flink-normal-scroll-controls");
    controls.dataset.target = listId;
    const sort = createElement("button", "flink-normal-sort-btn");
    sort.type = "button";
    sort.dataset.target = listId;
    sort.dataset.sortMode = sortMode;
    sort.setAttribute("aria-label", config.sort_label);
    sort.append(
      createElement(
        "span",
        "",
        sortMode === "default" ? config.default_sort : config.random_sort
      )
    );
    controls.append(sort);

    [
      ["left", config.scroll_left, "solitude fas fa-chevron-left"],
      ["right", config.scroll_right, "solitude fas fa-chevron-right"],
    ].forEach(([direction, label, iconClass]) => {
      const button = createElement("button", "flink-normal-scroll-btn");
      button.type = "button";
      button.dataset.direction = direction;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.append(createElement("i", iconClass));
      controls.append(button);
    });

    row.append(content, controls);
    return row;
  };

  const bindNormalControls = (target) => {
    target.querySelectorAll(".flink-normal-sort-btn").forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => {
        const list = document.getElementById(button.dataset.target);
        if (!list) return;
        const items = Array.from(list.children);
        const nextMode =
          button.dataset.sortMode === "default" ? "random" : "default";
        const orderedItems =
          nextMode === "random"
            ? shuffle(items)
            : items.sort(
                (left, right) =>
                  Number(left.dataset.defaultOrder) -
                  Number(right.dataset.defaultOrder)
              );
        list.append(...orderedItems);
        list.scrollTo({ left: 0, behavior: "smooth" });
        button.dataset.sortMode = nextMode;
        button.querySelector("span").textContent =
          nextMode === "default" ? config.default_sort : config.random_sort;
      });
    });

    target.querySelectorAll(".flink-normal-scroll-controls").forEach((controls) => {
      if (controls.dataset.bound === "true") return;
      controls.dataset.bound = "true";
      controls.querySelectorAll(".flink-normal-scroll-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const list = document.getElementById(controls.dataset.target);
          if (!list) return;
          const direction = button.dataset.direction === "left" ? -1 : 1;
          list.scrollBy({
            left: direction * Math.max(280, list.clientWidth * 0.8),
            behavior: "smooth",
          });
        });
      });
    });
  };

  const createCard = (item, group) => {
    const card = createElement("div", "site-card");
    const tag = createTag(item);
    if (tag) card.append(tag);

    const imageLink = createElement("a", "img");
    imageLink.href = resolveSiteUrl(item.link);
    imageLink.title = item.name || "";
    imageLink.target = "_blank";
    imageLink.rel = "noopener noreferrer nofollow";
    imageLink.append(
      createImage(`${item.topimg || ""}${group.topimg_suffix || ""}`, item.name, "flink-avatar")
    );

    const infoLink = createElement("a", "info cf-friends-link");
    infoLink.href = resolveSiteUrl(item.link);
    infoLink.title = item.name || "";
    infoLink.target = "_blank";
    infoLink.rel = "noopener noreferrer nofollow";
    const avatar = createElement("div", "site-card-avatar");
    avatar.append(
      createImage(
        `${item.avatar || ""}${group.suffix || ""}`,
        item.name,
        "flink-avatar cf-friends-avatar"
      ),
      createElement("div", "img-alt is-center", item.name)
    );
    const text = createElement("div", "site-card-text");
    text.append(createElement("span", "title cf-friends-name", item.name));
    const description = createElement("span", "desc", item.descr);
    description.title = item.descr || "";
    text.append(description);
    infoLink.append(avatar, text);
    card.append(imageLink, infoLink);
    return card;
  };

  const createCardGroup = (group) => {
    const list = createElement("div", "site-card-group");
    const fragment = document.createDocumentFragment();
    group.link_list.forEach((item) => fragment.append(createCard(item, group)));
    list.append(fragment);
    return list;
  };

  const load = () => {
    if (!request) {
      request = fetch(config.path, { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          if (!data || !Array.isArray(data.links)) {
            throw new TypeError("Invalid friend links data");
          }
          return data;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };

  const createError = (retry, compact = false) => {
    const status = createElement(
      "div",
      `friend-links-status is-error${compact ? " is-compact" : ""}`
    );
    status.setAttribute("role", "alert");
    status.append(createElement("span", "", config.error));
    const button = createElement("button");
    button.type = "button";
    button.append(
      createElement("i", "solitude fas fa-arrows-rotate"),
      createElement("span", "", config.retry)
    );
    button.addEventListener("click", retry, { once: true });
    status.append(button);
    return status;
  };

  const refreshLazyload = () => {
    if (!Solitude.config.lazyload.enable) return;
    if (window.lazyLoadInstance) window.lazyLoadInstance.update();
  };

  const renderList = async (target) => {
    try {
      const data = await load();
      if (!target.isConnected || target.dataset.friendLinksLoaded === "true") return;
      const fragment = document.createDocumentFragment();
      let normalIndex = 0;
      data.links.forEach((group) => {
        const links = Array.isArray(group.link_list) ? group.link_list : [];
        const normalizedGroup = { ...group, link_list: links };
        if (group.type === "card") {
          fragment.append(
            createGroupHeading(group, links.length),
            createElement("div", "flink-desc", group.descr || ""),
            createCardGroup(normalizedGroup)
          );
        } else if (group.type === "item") {
          const listId = `normal-flink-list-${normalIndex}`;
          const initialSort =
            group.sort === "default" || normalIndex === 0 ? "default" : "random";
          fragment.append(
            createNormalHeading(group, links.length, listId, initialSort),
            createItemGroup(normalizedGroup, {
              normal: true,
              id: listId,
              initialSort,
            })
          );
          normalIndex += 1;
        } else if (group.type === "discn") {
          fragment.append(
            createGroupHeading(group, links.length),
            createElement("div", "flink-desc", group.descr || ""),
            createItemGroup(normalizedGroup, { disconnected: true })
          );
        }
      });
      target.replaceChildren(fragment);
      target.dataset.friendLinksLoaded = "true";
      bindNormalControls(target);
      refreshLazyload();
    } catch (error) {
      if (!target.isConnected) return;
      console.error("Unable to load friend links:", error);
      target.replaceChildren(createError(() => renderList(target)));
    }
  };

  const renderBanner = async (target) => {
    try {
      const data = await load();
      if (!target.isConnected || target.dataset.friendLinksLoaded === "true") return;
      const links = data.links
        .filter((group) => group.type !== "discn")
        .flatMap((group) => (Array.isArray(group.link_list) ? group.link_list : []))
        .slice(0, 30);
      const wrapper = createElement("div", "tags-group-wrapper");
      const pairs = [];
      links.forEach((link, index) => {
        if (index % 2 === 0) pairs.push([link]);
        else pairs[pairs.length - 1].push(link);
      });
      const fragment = document.createDocumentFragment();
      [0, 1].forEach(() => {
        pairs.forEach((pair) => {
          const pairElement = createElement("div", "tags-group-icon-pair");
          pair.forEach((item) => {
            const anchor = createElement("a", "tags-group-icon");
            anchor.href = resolveSiteUrl(item.link);
            anchor.title = item.name || "";
            anchor.append(
              createImage(
                `${item.avatar || ""}${data.banner_suffix || ""}`,
                item.name
              ),
              createElement("span", "tags-group-title", item.name)
            );
            pairElement.append(anchor);
          });
          fragment.append(pairElement);
        });
      });
      wrapper.append(fragment);
      target.replaceChildren(wrapper);
      target.dataset.friendLinksLoaded = "true";
      refreshLazyload();
    } catch (error) {
      if (!target.isConnected) return;
      console.error("Unable to load friend links banner:", error);
      target.replaceChildren(createError(() => renderBanner(target)));
    }
  };

  const renderFooter = async () => {
    const target = document.getElementById("friend-links-in-footer");
    if (!target) return;
    try {
      const data = await load();
      if (!target.isConnected) return;
      const links = data.links.flatMap((group) =>
        (Array.isArray(group.link_list) ? group.link_list : []).map((item) => ({
          name: item.name,
          link: item.link,
        }))
      );
      const fragment = document.createDocumentFragment();
      const available = [...links];
      const count = Math.min(3, available.length);
      for (let index = 0; index < count; index += 1) {
        const selectedIndex = Solitude.randomNum(available.length);
        const selected = available.splice(selectedIndex, 1)[0];
        const anchor = createElement("a", "footer-item", selected.name);
        anchor.href = resolveSiteUrl(selected.link);
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer nofollow";
        fragment.append(anchor);
      }
      const more = createElement("a", "footer-item", config.more);
      more.href = config.more_url;
      fragment.append(more);
      target.replaceChildren(fragment);
    } catch (error) {
      if (!target.isConnected) return;
      console.error("Unable to load random friend links:", error);
      target.replaceChildren(createError(renderFooter, true));
    }
  };

  const init = () => {
    const list = document.querySelector("[data-friend-links-list]");
    const banner = document.querySelector("[data-friend-links-banner]");
    if (list) renderList(list);
    if (banner) renderBanner(banner);
  };

  Solitude.travelling = async () => {
    try {
      const data = await load();
      const links = data.links.flatMap((group) =>
        (Array.isArray(group.link_list) ? group.link_list : []).map((item) => ({
          name: item.name,
          link: item.link,
        }))
      );
      if (!links.length) throw new Error("No friend links available");
      const link = links[Solitude.randomNum(links.length)];
      Snackbar.show({
        text: config.random.replace(/\$\{name}/, link.name),
        duration: 8000,
        pos: "top-center",
        actionText: config.to,
        onActionClick: (element) => {
          element.style.opacity = 0;
          window.open(resolveSiteUrl(link.link), "_blank");
        },
      });
    } catch (error) {
      console.error("Unable to select a random friend link:", error);
      Snackbar.show({ text: config.error, duration: 3000, pos: "top-center" });
    }
  };

  Solitude.randomLinksList = renderFooter;
  Solitude.friendLinks = { init, load };
})();
