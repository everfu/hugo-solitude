import { Solitude } from "./core/api";
import type { CommentProvider } from "./types";

interface ValineRecord {
  objectId?: string;
  nick?: string;
  mail?: string;
  comment?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NormalizedComment {
  id: string;
  nick: string;
  participantKey: string;
  content: string;
  url: string;
  title: string;
  avatar: string;
  date: string;
}

interface CommentRuntimeConfiguration {
  routes?: Record<string, string>;
  default_avatar?: string;
  barrage_script?: string;
  envelope_script?: string;
}

const routeChunkSize = 40;
const postCardPageSize = 1000;
const postCardAvatarLimit = 5;
const aggregateCacheVersion = 3;
let aggregateRequest: Promise<NormalizedComment[]> | null = null;
let countRequest: Promise<number> | null = null;
let md5Request: Promise<((value: string) => string) | undefined> | null = null;
const postCardRequests = new Map<string, Promise<NormalizedComment[]>>();

const providers = () =>
  String(Solitude.config.comment?.use || "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean) as CommentProvider[];

const runtimeConfig = () =>
  (Solitude.config.comment_runtime || {}) as CommentRuntimeConfiguration;

const valineConfig = () => {
  const config = Solitude.config.valine || {};
  return config;
};

const commentBarrageEnabled = () =>
  Boolean(Solitude.config.comment?.commentBarrage);

const valineReady = () => {
  const config = valineConfig();
  return Boolean(config.appId && config.appKey && config.serverURLs);
};

const commentText = (key: string, fallback: string) =>
  Solitude.config.lang?.comments?.[key] || fallback;

const formatCommentText = (
  key: string,
  fallback: string,
  values: Record<string, string | number>
) =>
  Object.entries(values).reduce(
    (text, [name, value]) =>
      text.split(`\${${name}}`).join(String(value)),
    commentText(key, fallback)
  );

const routeEntries = () => Object.entries(runtimeConfig().routes || {});

const chunks = <T>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const stableSignature = (source: string) => {
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) + hash) ^ source.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};

const requestValine = async (parameters: Record<string, string | number>) => {
  const config = valineConfig();
  const endpoint = new URL(
    `${String(config.serverURLs).replace(/\/$/, "")}/1.1/classes/Comment`
  );
  Object.entries(parameters).forEach(([key, value]) =>
    endpoint.searchParams.set(key, String(value))
  );
  const response = await fetch(endpoint, {
    headers: {
      "X-LC-Id": String(config.appId),
      "X-LC-Key": String(config.appKey),
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`Valine request failed with ${response.status}`);
  return response.json();
};

const loadMd5 = () => {
  if (typeof (window as any).md5 === "function") {
    return Promise.resolve((window as any).md5 as (value: string) => string);
  }
  if (md5Request) return md5Request;
  const source = Solitude.config.cdn?.blueimp_md5;
  md5Request = source
    ? Solitude.loadScript(source)
        .then(() =>
          typeof (window as any).md5 === "function"
            ? ((window as any).md5 as (value: string) => string)
            : undefined
        )
        .catch(() => undefined)
    : Promise.resolve(undefined);
  return md5Request;
};

const avatarUrl = async (mail = "") => {
  const fallback = runtimeConfig().default_avatar || "/img/default_avatar.avif";
  if (!mail.trim()) return fallback;
  const md5 = await loadMd5();
  if (!md5) return fallback;
  const root = String(Solitude.config.comment?.avatar || "https://weavatar.com")
    .replace(/\/$/, "")
    .replace(/\/avatar$/, "");
  return `${root}/avatar/${md5(mail.trim().toLowerCase())}`;
};

const summarize = (source = "") => {
  const image = `[${commentText("image", "Image")}]`;
  const link = `[${commentText("link", "Link")}]`;
  const code = `[${commentText("code", "Code")}]`;
  const emoji = `[${commentText("emoji", "Emoji")}]`;
  return String(source)
    .replace(/```[\s\S]*?```/g, code)
    .replace(/<pre[\s\S]*?<\/pre>/gi, code)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, image)
    .replace(/<img\b[^>]*>/gi, image)
    .replace(/\[[^\]]*\]\([^)]*\)/g, link)
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, link)
    .replace(/:[a-z0-9_\u4e00-\u9fa5]+:/gi, emoji)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
};

const normalizeRecords = async (records: ValineRecord[]) => {
  const routes = runtimeConfig().routes || {};
  const normalized = await Promise.all(
    records.map(async (record) => {
      const url = String(record.url || "");
      if (!routes[url]) return null;
      const nick =
        String(record.nick || "").trim() ||
        commentText("anonymous", "Anonymous");
      const normalizedMail = String(record.mail || "").trim().toLowerCase();
      return {
        id: String(record.objectId || `${url}-${record.createdAt || ""}`),
        nick,
        participantKey: normalizedMail
          ? `mail:${stableSignature(normalizedMail)}`
          : `nick:${nick.toLocaleLowerCase()}`,
        content: summarize(record.comment),
        url,
        title: routes[url],
        avatar: await avatarUrl(record.mail),
        date: String(record.updatedAt || record.createdAt || ""),
      } satisfies NormalizedComment;
    })
  );
  return normalized.filter((item): item is NormalizedComment => Boolean(item));
};

const aggregateLimit = () =>
  Math.max(
    Number(Solitude.config.comment?.newest_comment?.limit || 5),
    Number(Solitude.config.recent_comments?.limit || 50),
    8
  );

const cacheTtl = () => {
  const values = [
    Solitude.config.comment?.newest_comment?.storage,
    Solitude.config.console?.recentComment?.storage,
    Solitude.config.recent_comments?.cache,
  ]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 0;
};

const routeCacheSignature = () => {
  const source = routeEntries()
    .map(([path]) => path)
    .sort()
    .join("|");
  return stableSignature(source);
};

const aggregateCacheKey = () =>
  `valine-hugo-comments:v${aggregateCacheVersion}:${location.host}:${routeCacheSignature()}`;
const countCacheKey = () =>
  `valine-hugo-count:v${aggregateCacheVersion}:${location.host}:${routeCacheSignature()}`;
const postCardCacheKey = (signature: string) =>
  `valine-hugo-post-card:v${aggregateCacheVersion}:${location.host}:${signature}`;

const fetchAggregateComments = () => {
  if (aggregateRequest) return aggregateRequest;
  const routes = routeEntries();
  const allowed = new Set(routes.map(([path]) => path));
  const cached = Solitude.saveToLocal.get<NormalizedComment[]>(aggregateCacheKey());
  if (cached) {
    aggregateRequest = Promise.resolve(cached.filter((item) => allowed.has(item.url)));
    return aggregateRequest;
  }
  aggregateRequest = (async () => {
    if (!routes.length) return [];
    const limit = aggregateLimit();
    const responses = await Promise.all(
      chunks(
        routes.map(([path]) => path),
        routeChunkSize
      ).map((paths) =>
        requestValine({
          where: JSON.stringify({ url: { $in: paths } }),
          order: "-createdAt",
          limit,
        })
      )
    );
    const records = responses.flatMap((response) => response.results || []);
    const unique = [
      ...new Map(records.map((record) => [record.objectId, record])).values(),
    ] as ValineRecord[];
    const result = (await normalizeRecords(unique))
      .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
      .slice(0, limit);
    if (result.length) {
      Solitude.saveToLocal.set(aggregateCacheKey(), result, cacheTtl());
    }
    return result;
  })().catch((error) => {
    aggregateRequest = null;
    throw error;
  });
  return aggregateRequest;
};

const fetchPostCardComments = (paths: string[]) => {
  const availableRoutes = runtimeConfig().routes || {};
  const allowedPaths = [...new Set(paths)]
    .filter((path) => Boolean(availableRoutes[path]))
    .sort();
  if (!allowedPaths.length) return Promise.resolve([]);
  const signature = stableSignature(allowedPaths.join("|"));
  const activeRequest = postCardRequests.get(signature);
  if (activeRequest) return activeRequest;
  const cached = Solitude.saveToLocal.get<NormalizedComment[]>(
    postCardCacheKey(signature)
  );
  if (cached) {
    const result = Promise.resolve(
      cached.filter((comment) => allowedPaths.includes(comment.url))
    );
    postCardRequests.set(signature, result);
    return result;
  }

  const request = (async () => {
    const records: ValineRecord[] = [];
    for (const pathGroup of chunks(allowedPaths, routeChunkSize)) {
      let skip = 0;
      while (true) {
        const response = await requestValine({
          where: JSON.stringify({ url: { $in: pathGroup } }),
          keys: "objectId,nick,mail,url,createdAt,updatedAt",
          order: "-createdAt",
          limit: postCardPageSize,
          skip,
        });
        const page = (response.results || []) as ValineRecord[];
        records.push(...page);
        if (page.length < postCardPageSize) break;
        skip += page.length;
      }
    }
    const unique = [
      ...new Map(
        records.map((record) => [
          record.objectId ||
            `${record.url || ""}-${record.createdAt || ""}-${record.nick || ""}`,
          record,
        ])
      ).values(),
    ];
    const result = (await normalizeRecords(unique)).sort(
      (left, right) => Date.parse(right.date) - Date.parse(left.date)
    );
    Solitude.saveToLocal.set(postCardCacheKey(signature), result, cacheTtl());
    return result;
  })();

  postCardRequests.set(signature, request);
  void request.catch(() => postCardRequests.delete(signature));
  return request;
};

const fetchAggregateCount = () => {
  if (countRequest) return countRequest;
  const cached = Solitude.saveToLocal.get<number>(countCacheKey());
  if (typeof cached === "number") {
    countRequest = Promise.resolve(cached);
    return countRequest;
  }
  const paths = routeEntries().map(([path]) => path);
  countRequest = (async () => {
    if (!paths.length) return 0;
    const responses = await Promise.all(
      chunks(paths, routeChunkSize).map((group) =>
        requestValine({
          where: JSON.stringify({ url: { $in: group } }),
          count: 1,
          limit: 0,
        })
      )
    );
    const count = responses.reduce(
      (total, response) => total + Number(response.count || 0),
      0
    );
    if (count > 0) {
      Solitude.saveToLocal.set(countCacheKey(), count, cacheTtl());
    }
    return count;
  })().catch((error) => {
    countRequest = null;
    throw error;
  });
  return countRequest;
};

const fetchPageComments = async (path: string) => {
  const response = await requestValine({
    where: JSON.stringify({ url: path }),
    order: "-createdAt",
    limit: 1000,
  });
  return normalizeRecords(response.results || []);
};

const setStatus = (container: Element, message: string, state: string) => {
  const status = document.createElement("div");
  status.className = `comment-status is-${state}`;
  status.textContent = message;
  container.replaceChildren(status);
};

const createAvatar = (comment: NormalizedComment) => {
  const image = document.createElement("img");
  image.className = "nolazyload";
  image.src = comment.avatar;
  image.alt = comment.nick;
  image.loading = "lazy";
  image.addEventListener(
    "error",
    () => {
      image.src = runtimeConfig().default_avatar || "/img/default_avatar.avif";
    },
    { once: true }
  );
  return image;
};

const renderPostCardParticipants = async () => {
  const containers = [
    ...document.querySelectorAll<HTMLElement>(
      ".post-card-commenters[data-comment-path]"
    ),
  ].filter((container) => !container.dataset.commentState);
  if (!containers.length) return;

  containers.forEach((container) => {
    container.dataset.commentState = "loading";
  });

  try {
    const comments = await fetchPostCardComments(
      containers.map((container) => container.dataset.commentPath || "")
    );
    const participantsByPath = new Map<
      string,
      Map<string, NormalizedComment>
    >();
    comments.forEach((comment) => {
      const participants =
        participantsByPath.get(comment.url) ||
        new Map<string, NormalizedComment>();
      if (!participants.has(comment.participantKey)) {
        participants.set(comment.participantKey, comment);
      }
      participantsByPath.set(comment.url, participants);
    });

    containers.forEach((container) => {
      if (!container.isConnected) return;
      const pathParticipants = participantsByPath
        .get(container.dataset.commentPath || "")
        ?.values();
      const participants = [...(pathParticipants || [])];
      if (!participants.length) {
        container.dataset.commentState = "empty";
        return;
      }

      const visible = participants.slice(0, postCardAvatarLimit);
      const remaining = participants.length - visible.length;
      const fragment = document.createDocumentFragment();
      visible.forEach((comment) => {
        const item = document.createElement("span");
        item.className = "post-card-commenter";
        item.title = comment.nick;
        item.setAttribute("aria-hidden", "true");
        const avatar = createAvatar(comment);
        avatar.alt = "";
        item.append(avatar);
        fragment.append(item);
      });

      const moreText = remaining
        ? formatCommentText(
            "moreParticipants",
            "${count} more participants",
            { count: remaining }
          )
        : "";
      if (remaining) {
        const more = document.createElement("span");
        more.className = "post-card-commenter-more";
        more.textContent = `+${remaining}`;
        more.title = moreText;
        more.setAttribute("aria-hidden", "true");
        fragment.append(more);
      }

      const names = visible.map((comment) => comment.nick).join(", ");
      const participantText = formatCommentText(
        "participants",
        "Comment participants: ${names}",
        { names }
      );
      container.setAttribute("role", "group");
      container.setAttribute(
        "aria-label",
        moreText ? `${participantText}; ${moreText}` : participantText
      );
      container.replaceChildren(fragment);
      container.hidden = false;
      container.dataset.commentState = "ready";
      container.parentElement
        ?.querySelector<HTMLElement>(".article-meta.tags")
        ?.setAttribute("hidden", "");
    });

    window.lazyLoadInstance?.update?.();
  } catch {
    containers.forEach((container) => {
      if (container.isConnected) container.dataset.commentState = "error";
    });
  }
};

const refreshTimes = (container: Element) => {
  Solitude.changeTimeFormat?.(container.querySelectorAll("time"));
  window.lazyLoadInstance?.update?.();
  Solitude.pjax?.refresh?.();
};

const renderAside = (container: Element, comments: NormalizedComment[]) => {
  const limit = Number(Solitude.config.comment?.newest_comment?.limit || 5);
  const items = comments.slice(0, limit);
  container.setAttribute("aria-busy", "false");
  if (!items.length) {
    setStatus(container, commentText("empty", "No comments yet"), "empty");
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((comment) => {
    const item = document.createElement("a");
    item.className = "aside-list-item";
    item.href = comment.url;
    item.title = comment.title;
    const thumbnail = document.createElement("div");
    thumbnail.className = "thumbnail";
    const avatar = createAvatar(comment);
    avatar.alt = "";
    thumbnail.append(avatar);
    const content = document.createElement("div");
    content.className = "content";
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const author = document.createElement("span");
    author.className = "comment-author";
    author.textContent = comment.nick;
    const time = document.createElement("time");
    time.className = "datetime";
    time.dateTime = comment.date;
    meta.append(author, time);
    const summary = document.createElement("div");
    summary.className = "comment";
    summary.textContent = comment.content || commentText("empty", "No comments yet");
    const source = document.createElement("div");
    source.className = "comment-source";
    const sourceIcon = document.createElement("i");
    sourceIcon.className = "solitude fas fa-file-lines";
    sourceIcon.setAttribute("aria-hidden", "true");
    const sourceTitle = document.createElement("span");
    sourceTitle.textContent = comment.title;
    source.append(sourceIcon, sourceTitle);
    content.append(meta, summary, source);
    item.append(thumbnail, content);
    fragment.append(item);
  });
  container.replaceChildren(fragment);
  refreshTimes(container);
};

const createCommentCard = (comment: NormalizedComment) => {
  const card = document.createElement("div");
  card.className = "comment-card";
  card.title = comment.title;
  card.dataset.solitudeAction = "navigateTo";
  card.dataset.solitudeUrl = comment.url;
  const info = document.createElement("div");
  info.className = "comment-info";
  info.append(createAvatar(comment));
  const user = document.createElement("span");
  user.className = "comment-user";
  user.textContent = comment.nick;
  const userMeta = document.createElement("div");
  userMeta.append(user);
  const time = document.createElement("time");
  time.className = "comment-time";
  time.dateTime = comment.date;
  info.append(userMeta, time);
  const content = document.createElement("div");
  content.className = "comment-content";
  content.textContent = comment.content || commentText("empty", "No comments yet");
  const title = document.createElement("div");
  title.className = "comment-title";
  const icon = document.createElement("i");
  icon.className = "solitude fas fa-comment";
  title.append(icon, document.createTextNode(` ${comment.title}`));
  card.append(info, content, title);
  return card;
};

const renderCards = (
  container: Element,
  comments: NormalizedComment[],
  limit: number
) => {
  const items = comments.slice(0, limit);
  if (!items.length) {
    container.textContent = commentText("empty", "No comments yet");
    return;
  }
  container.replaceChildren(...items.map(createCommentCard));
  Solitude.diffDateFormat?.(container.querySelectorAll("time.comment-time"));
  window.lazyLoadInstance?.update?.();
  Solitude.pjax?.refresh?.();
};

const renderAggregateSurfaces = async () => {
  const aside = [...document.querySelectorAll(".card-recent-comment .aside-list")];
  const consoleList = document.querySelector(".console_recentcomments");
  const recentPage = document.querySelector("#page .console_recentcomments.recent-comments-list");
  if (!aside.length && !consoleList && !recentPage) return;
  try {
    const comments = await fetchAggregateComments();
    aside.forEach((container) => renderAside(container, comments));
    if (consoleList) renderCards(consoleList, comments, 6);
    if (recentPage) {
      renderCards(
        recentPage,
        comments,
        Number(Solitude.config.recent_comments?.limit || 50)
      );
    }
  } catch {
    aside.forEach((container) => {
      container.setAttribute("aria-busy", "false");
      setStatus(
        container,
        commentText("error", "Unable to load comments"),
        "error"
      );
    });
    [consoleList, recentPage]
      .filter((container): container is Element => Boolean(container))
      .forEach((container) => {
        container.textContent = commentText("error", "Unable to load comments");
      });
  }
};

const renderAggregateCount = async () => {
  const target = document.getElementById("valine_allcount");
  if (!target) return;
  try {
    target.textContent = String(await fetchAggregateCount());
  } catch {
    target.textContent = "–";
    target.title = commentText("error", "Unable to load comments");
  }
};

const initializePageBarrage = async (comments: NormalizedComment[]) => {
  if (
    !commentBarrageEnabled() ||
    !document.querySelector(".comment-barrage")
  ) {
    return;
  }
  const script = runtimeConfig().barrage_script;
  if (!script) return;
  await Solitude.loadScript(script);
  (window as any).initializeCommentBarrage?.(
    comments.map((comment) => ({
      content: comment.content,
      nick: comment.nick,
      avatar: comment.avatar,
      id: comment.id,
      url: comment.url,
    }))
  );
};

const escapeHtml = (source: string) =>
  source.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });

const initializeEnvelope = async (comments: NormalizedComment[]) => {
  const container = document.getElementById("barrage");
  if (!container) return;
  container.replaceChildren();
  if (!comments.length) return;
  const script = runtimeConfig().envelope_script;
  if (!script) return;
  await Solitude.loadScript(script);
  const EasyDanmaku = (window as any).EasyDanmaku;
  if (typeof EasyDanmaku !== "function") return;
  const instance = new EasyDanmaku({
    page: location.pathname,
    el: "#barrage",
    line: Number(container.dataset.line || 10),
    speed: Number(container.dataset.speed || 20),
    hover: container.dataset.hover === "true",
    loop: container.dataset.loop === "true",
  });
  instance.batchSend(
    comments.map((comment) => ({
      content: escapeHtml(`${comment.nick}: ${comment.content}`),
      avatar: comment.avatar,
      url: comment.url,
    })),
    true
  );
  Solitude.onPageCleanup?.(() => container.replaceChildren());
};

const initializeValineEffects = async () => {
  try {
    const comments = await fetchPageComments(location.pathname);
    await Promise.all([
      initializePageBarrage(comments),
      initializeEnvelope(comments),
    ]);
  } catch {
    const barrage = document.querySelector(".comment-barrage");
    if (barrage) barrage.replaceChildren();
    const envelope = document.getElementById("barrage");
    if (envelope) envelope.replaceChildren();
  }
};

const mountValine = async (mount: HTMLElement) => {
  if (mount.dataset.initialized === "true") return;
  mount.dataset.initialized = "true";
  try {
    await Solitude.loadScript(Solitude.config.cdn.valine);
    const Valine = (window as any).Valine;
    if (typeof Valine !== "function") throw new Error("Valine is unavailable");
    const config = valineConfig();
    const instance = new Valine({
      ...(config.option || {}),
      el: "#vcomment",
      appId: config.appId,
      appKey: config.appKey,
      serverURLs: config.serverURLs,
      avatar: config.avatar,
      visitor: Boolean(config.visitor),
      path: location.pathname,
    });
    // Valine replaces the mount element's class name while rendering. Restore
    // the theme opt-in afterwards so the Hugo output matches the Hexo styles.
    mount.classList.toggle("valine-theme-style", Boolean(config.style));
    Solitude.lightbox?.(
      document.querySelectorAll("#vcomment .vcontent img:not(.vemoji)")
    );
    Solitude.owoBig?.({ body: "#vcomment .vwrap", item: ".vemojis i" });
    Solitude.onPageCleanup?.(() => instance?.destroy?.());
    await initializeValineEffects();
  } catch {
    mount.dataset.initialized = "false";
    setStatus(mount, commentText("error", "Unable to load comments"), "error");
  }
};

const initializeValine = () => {
  const mount = document.getElementById("vcomment");
  if (!mount) return;
  if (!Solitude.config.comment?.lazyload || !("IntersectionObserver" in window)) {
    void mountValine(mount);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void mountValine(mount);
    },
    { rootMargin: "200px 0px" }
  );
  observer.observe(mount);
  Solitude.onPageCleanup?.(() => observer.disconnect());
};

const initializeOtherProviders = async (enabled: CommentProvider[]) => {
  const cdn = Solitude.config.cdn || {};
  if (enabled.includes("twikoo") && document.getElementById("twikoo")) {
    await Solitude.loadScript(cdn.twikoo);
    await (window as any).twikoo?.init?.({
      el: "#twikoo",
      ...Solitude.config.twikoo,
    });
  }
  if (enabled.includes("waline") && document.getElementById("waline-wrap")) {
    if (cdn.waline_css) await Solitude.loadStyle(cdn.waline_css);
    await Solitude.loadScript(cdn.waline);
    (window as any).Waline?.init?.({
      el: "#waline-wrap",
      ...Solitude.config.waline,
    });
  }
  if (enabled.includes("artalk") && document.getElementById("artalk-wrap")) {
    if (cdn.artalk_css) await Solitude.loadStyle(cdn.artalk_css);
    await Solitude.loadScript(cdn.artalk);
    (window as any).Artalk?.init?.({
      el: "#artalk-wrap",
      ...Solitude.config.artalk,
    });
  }
};

const initializeComments = () => {
  const enabled = providers();
  if (!enabled.length) return;
  if (enabled.includes("valine")) {
    if (valineReady()) {
      void renderPostCardParticipants();
      void renderAggregateSurfaces();
      void renderAggregateCount();
      initializeValine();
    } else {
      document
        .querySelectorAll(
          "#vcomment, .recent-comments-list, .card-recent-comment .aside-list, .console_recentcomments"
        )
        .forEach((container) => {
          setStatus(
            container,
            commentText("error", "Unable to load comments"),
            "error"
          );
          if (container.matches(".card-recent-comment .aside-list")) {
            container.setAttribute("aria-busy", "false");
          }
        });
    }
  }
  void initializeOtherProviders(enabled);
};

document.addEventListener("solitude:ready", initializeComments);
document.addEventListener("solitude:afterNavigate", initializeComments);
