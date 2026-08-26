import { Solitude } from "./core/api";

const MEDIA_SESSION_ACTIONS = ["play", "pause", "previoustrack", "nexttrack", "seekto"];

class MusicPlayer {
    constructor() {
        this.loadingTimer = null;
        this.manualScrollTimer = null;
        this.lyricAnimationFrame = null;
        this.currentLyricIndex = -1;
        this.lastMediaPosition = -1;
        this.isManualScrolling = false;
        this.isPrepared = false;
        this.wasMobile = this.isMobile();

        this.boundKeydown = this.handleKeydown.bind(this);
        this.boundResize = this.handleResize.bind(this);
        this.boundPlay = this.handlePlay.bind(this);
        this.boundPause = this.handlePause.bind(this);
        this.boundLoadedData = this.handleLoadedData.bind(this);
        this.boundTimeUpdate = this.handleTimeUpdate.bind(this);
        this.boundLyricClick = this.handleLyricClick.bind(this);
        this.boundManualScroll = this.handleManualLyricScroll.bind(this);

        this.init();
    }

    init() {
        this.setViewportHeight();
        document.addEventListener("keydown", this.boundKeydown);
        window.addEventListener("resize", this.boundResize, { passive: true });
        this.waitForAPlayer();
    }

    setViewportHeight() {
        document.documentElement.style.setProperty("--vh", `${window.innerHeight}px`);
    }

    isMobile() {
        return window.matchMedia("(max-width: 798px)").matches;
    }

    handleResize() {
        this.setViewportHeight();
        const isMobile = this.isMobile();
        if (isMobile && !this.wasMobile) this.aplayer?.list?.hide?.();
        this.wasMobile = isMobile;
    }

    waitForAPlayer() {
        const loadingElement = document.querySelector(".Music-loading");
        const backgroundElement = document.getElementById("Music-bg");

        clearInterval(this.loadingTimer);
        this.loadingTimer = window.setInterval(() => {
            const meting = document.querySelector("#Music-page meting-js");
            const aplayer = meting?.aplayer;
            const root = document.querySelector("#Music-page .aplayer");
            const body = root?.querySelector(".aplayer-body");
            const cover = root?.querySelector(".aplayer-pic");
            const list = root?.querySelector(".aplayer-list");

            if (!aplayer || !root || !body || !cover || !list) return;

            clearInterval(this.loadingTimer);
            this.loadingTimer = null;
            if (loadingElement) loadingElement.style.display = "none";
            if (backgroundElement) backgroundElement.style.display = "block";
            this.prepareAPlayer({ aplayer, root, body, cover, list });
        }, 100);
    }

    prepareAPlayer({ aplayer, root, body, cover, list }) {
        if (this.isPrepared) return;
        this.isPrepared = true;
        this.aplayer = aplayer;
        this.playerRoot = root;
        this.audio = aplayer.audio;
        this.lyricViewport = root.querySelector(".aplayer-lrc");

        let leftColumn = root.querySelector(":scope > .aplayer-left");
        if (!leftColumn) {
            leftColumn = document.createElement("div");
            leftColumn.className = "aplayer-left";
            root.insertBefore(leftColumn, body);
        }
        leftColumn.append(cover, list);
        root.classList.add("music-layout-ready");

        if (this.isMobile()) aplayer.list?.hide?.();

        this.addPlayerEventListeners();
        this.enhanceControls();
        this.updateBackgroundImage();
        this.updatePlaybackState();
        this.updateMediaSessionMetadata();
        window.requestAnimationFrame(() => this.centerCurrentLyric(false));
    }

    addPlayerEventListeners() {
        if (!this.audio) return;
        this.audio.addEventListener("play", this.boundPlay);
        this.audio.addEventListener("pause", this.boundPause);
        this.audio.addEventListener("loadeddata", this.boundLoadedData);
        this.audio.addEventListener("timeupdate", this.boundTimeUpdate);

        if (this.lyricViewport) {
            this.lyricViewport.addEventListener("click", this.boundLyricClick);
            this.lyricViewport.addEventListener("wheel", this.boundManualScroll, { passive: true });
            this.lyricViewport.addEventListener("touchstart", this.boundManualScroll, { passive: true });
            this.lyricViewport.addEventListener("touchmove", this.boundManualScroll, { passive: true });
        }
    }

    enhanceControls() {
        const labels = [
            [".aplayer-icon-back", "上一曲"],
            [".aplayer-play", "播放"],
            [".aplayer-icon-play", "播放"],
            [".aplayer-icon-forward", "下一曲"],
            [".aplayer-icon-volume-down", "静音或恢复音量"],
            [".aplayer-icon-order", "切换播放顺序"],
            [".aplayer-icon-loop", "切换循环模式"],
            [".aplayer-icon-menu", "展开或收起歌单"],
            [".aplayer-icon-lrc", "显示或隐藏歌词"]
        ];

        labels.forEach(([selector, label]) => {
            this.playerRoot.querySelectorAll(selector).forEach((control) => {
                control.setAttribute("aria-label", label);
                control.setAttribute("title", label);
                if (!control.matches("button, a, input")) {
                    control.setAttribute("role", "button");
                    control.tabIndex = 0;
                }
            });
        });

        this.playerRoot.querySelectorAll(".aplayer-list li").forEach((item, index) => {
            item.setAttribute("role", "button");
            item.tabIndex = 0;
            const title = item.querySelector(".aplayer-list-title")?.textContent?.trim();
            item.setAttribute("aria-label", title ? `播放 ${title}` : `播放第 ${index + 1} 首歌曲`);
        });
    }

    extractCoverUrl(backgroundImage) {
        const match = /url\((['"]?)(.*?)\1\)/.exec(backgroundImage || "");
        return match?.[2] || "";
    }

    getCurrentCoverUrl() {
        const cover = this.playerRoot?.querySelector(".aplayer-pic");
        if (!cover) return "";
        return this.extractCoverUrl(cover.style.backgroundImage || getComputedStyle(cover).backgroundImage);
    }

    updateBackgroundImage() {
        const backgroundElement = document.getElementById("Music-bg");
        const coverUrl = this.getCurrentCoverUrl();
        if (!backgroundElement || !coverUrl) return;

        const image = new Image();
        image.src = coverUrl;
        image.onload = () => {
            backgroundElement.style.backgroundImage = `url("${coverUrl.replaceAll('"', '\\"')}")`;
            backgroundElement.classList.add("show");
        };
    }

    handlePlay() {
        this.updatePlaybackState();
        requestAnimationFrame(() => this.updatePlaybackState());
    }

    handlePause() {
        this.updatePlaybackState();
        requestAnimationFrame(() => this.updatePlaybackState());
    }

    updatePlaybackState() {
        const isPlaying = Boolean(this.audio && !this.audio.paused);
        this.playerRoot?.classList.toggle("is-playing", isPlaying);
        document.getElementById("Music-page")?.classList.toggle("is-playing", isPlaying);

        const label = isPlaying ? "暂停" : "播放";
        this.playerRoot?.querySelectorAll(".aplayer-play, .aplayer-icon-play").forEach((control) => {
            control.setAttribute("aria-label", label);
            control.setAttribute("title", label);
        });

        if ("mediaSession" in navigator) {
            try {
                navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
            } catch (_) {
                // Older implementations expose Media Session without a writable playbackState.
            }
        }
    }

    handleLoadedData() {
        this.currentLyricIndex = -1;
        this.lastMediaPosition = -1;
        this.updateBackgroundImage();
        this.enhanceControls();
        this.updateMediaSessionMetadata();
        this.centerCurrentLyric(false);
    }

    getCurrentLyricLine() {
        return this.playerRoot?.querySelector(".aplayer-lrc-contents .aplayer-lrc-current") || null;
    }

    handleTimeUpdate() {
        const currentLine = this.getCurrentLyricLine();
        const lyricContents = currentLine?.parentElement;
        if (currentLine && lyricContents) {
            const index = Array.from(lyricContents.children).indexOf(currentLine);
            if (index !== this.currentLyricIndex) {
                this.currentLyricIndex = index;
                if (!this.isManualScrolling) this.scrollLyricTo(currentLine, true);
            }
        }
        this.updateMediaSessionPosition();
    }

    centerCurrentLyric(smooth = true) {
        const currentLine = this.getCurrentLyricLine();
        if (currentLine) this.scrollLyricTo(currentLine, smooth);
    }

    scrollLyricTo(line, smooth = true) {
        if (!this.lyricViewport || !line) return;
        cancelAnimationFrame(this.lyricAnimationFrame);

        const maxScroll = Math.max(0, this.lyricViewport.scrollHeight - this.lyricViewport.clientHeight);
        const target = Math.min(
            maxScroll,
            Math.max(0, line.offsetTop - this.lyricViewport.clientHeight * 0.3 + line.offsetHeight / 2)
        );
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!smooth || reduceMotion) {
            this.lyricViewport.scrollTop = target;
            return;
        }

        const start = this.lyricViewport.scrollTop;
        const distance = target - start;
        if (Math.abs(distance) < 1) return;
        const duration = 600;
        const startedAt = performance.now();

        const animate = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            this.lyricViewport.scrollTop = start + distance * eased;
            if (progress < 1) this.lyricAnimationFrame = requestAnimationFrame(animate);
        };
        this.lyricAnimationFrame = requestAnimationFrame(animate);
    }

    handleManualLyricScroll() {
        this.isManualScrolling = true;
        cancelAnimationFrame(this.lyricAnimationFrame);
        clearTimeout(this.manualScrollTimer);
        this.manualScrollTimer = window.setTimeout(() => {
            this.isManualScrolling = false;
            this.centerCurrentLyric(true);
        }, 4000);
    }

    handleLyricClick(event) {
        const line = event.target.closest?.(".aplayer-lrc-contents p");
        const lyricContents = line?.parentElement;
        if (!line || !lyricContents || !this.aplayer) return;

        const index = Array.from(lyricContents.children).indexOf(line);
        const lyricTime = Number(this.aplayer.lrc?.current?.[index]?.[0]);
        if (!Number.isFinite(lyricTime)) return;

        event.preventDefault();
        event.stopPropagation();
        this.aplayer.seek(lyricTime);
        if (this.audio?.paused) this.aplayer.play();
        this.isManualScrolling = false;
        clearTimeout(this.manualScrollTimer);
        this.scrollLyricTo(line, true);
    }

    updateMediaSessionMetadata() {
        if (!("mediaSession" in navigator) || !("MediaMetadata" in window) || !this.aplayer) return;
        const song = this.aplayer.list?.audios?.[this.aplayer.list.index];
        if (!song) return;

        const cover = song.cover || song.pic || this.getCurrentCoverUrl();
        const metadata = {
            title: song.name || song.title || "音乐馆",
            artist: song.artist || "未知歌手",
            album: song.album || "音乐馆"
        };
        if (cover) metadata.artwork = [{ src: cover }];

        try {
            navigator.mediaSession.metadata = new MediaMetadata(metadata);
            navigator.mediaSession.setActionHandler("play", () => this.aplayer?.play());
            navigator.mediaSession.setActionHandler("pause", () => this.aplayer?.pause());
            navigator.mediaSession.setActionHandler("previoustrack", () => this.aplayer?.skipBack());
            navigator.mediaSession.setActionHandler("nexttrack", () => this.aplayer?.skipForward());
            navigator.mediaSession.setActionHandler("seekto", (details) => {
                if (Number.isFinite(details.seekTime)) this.aplayer?.seek(details.seekTime);
            });
        } catch (_) {
            // Unsupported Media Session actions are ignored independently by the browser.
        }
    }

    updateMediaSessionPosition() {
        if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState || !this.audio) return;
        const position = Math.floor(this.audio.currentTime);
        const duration = this.audio.duration;
        if (position === this.lastMediaPosition || !Number.isFinite(duration) || duration <= 0) return;
        this.lastMediaPosition = position;
        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate: this.audio.playbackRate || 1,
                position: Math.min(duration, Math.max(0, this.audio.currentTime))
            });
        } catch (_) {
            // Position state is optional and can reject incomplete media metadata.
        }
    }

    handleKeydown(event) {
        if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;

        const keyboardItem = event.target?.closest?.("#Music-page .aplayer-list li");
        if (keyboardItem && (event.code === "Enter" || event.code === "Space")) {
            event.preventDefault();
            keyboardItem.click();
            return;
        }

        const control = event.target?.closest?.("#Music-page .aplayer-icon, #Music-page .aplayer-button");
        if (control) {
            if (!control.matches("button, a, input") && (event.code === "Enter" || event.code === "Space")) {
                event.preventDefault();
                control.click();
            }
            return;
        }

        if (!this.aplayer) return;
        const actions = {
            Space: () => this.aplayer.toggle(),
            ArrowRight: () => this.aplayer.skipForward(),
            ArrowLeft: () => this.aplayer.skipBack(),
            ArrowUp: () => this.setVolume((this.audio?.volume || 0) + 0.1),
            ArrowDown: () => this.setVolume((this.audio?.volume || 0) - 0.1)
        };

        if (actions[event.code]) {
            event.preventDefault();
            actions[event.code]();
        }
    }

    setVolume(volume) {
        const nextVolume = Math.min(1, Math.max(0, volume));
        this.aplayer?.volume(nextVolume);
    }

    clearMediaSession() {
        if (!("mediaSession" in navigator)) return;
        MEDIA_SESSION_ACTIONS.forEach((action) => {
            try {
                navigator.mediaSession.setActionHandler(action, null);
            } catch (_) {
                // Some browsers expose only a subset of Media Session actions.
            }
        });
        try {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = "none";
        } catch (_) {
            // No cleanup is needed when the browser owns the media state.
        }
    }

    destroy() {
        clearInterval(this.loadingTimer);
        clearTimeout(this.manualScrollTimer);
        cancelAnimationFrame(this.lyricAnimationFrame);
        document.removeEventListener("keydown", this.boundKeydown);
        window.removeEventListener("resize", this.boundResize);

        if (this.audio) {
            this.audio.removeEventListener("play", this.boundPlay);
            this.audio.removeEventListener("pause", this.boundPause);
            this.audio.removeEventListener("loadeddata", this.boundLoadedData);
            this.audio.removeEventListener("timeupdate", this.boundTimeUpdate);
        }
        if (this.lyricViewport) {
            this.lyricViewport.removeEventListener("click", this.boundLyricClick);
            this.lyricViewport.removeEventListener("wheel", this.boundManualScroll);
            this.lyricViewport.removeEventListener("touchstart", this.boundManualScroll);
            this.lyricViewport.removeEventListener("touchmove", this.boundManualScroll);
        }

        this.playerRoot?.classList.remove("is-playing");
        document.getElementById("Music-page")?.classList.remove("is-playing");
        this.clearMediaSession();
    }
}

export function initializeMusicPlayer() {
    const existingMusic = Solitude.musicPlayer;
    if (existingMusic) existingMusic.destroy();
    Solitude.musicPlayer = new MusicPlayer();
}
