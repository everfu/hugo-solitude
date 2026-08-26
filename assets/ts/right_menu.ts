import { Solitude } from "./core/api";

let selectTextNow = "";
let firstShowRightMenu = true;

const selectText = () => {
    selectTextNow = document.selection ? document.selection.createRange().text : window.getSelection().toString() || "";
    Solitude.selectedText = selectTextNow;
};

const commentsEnabled = () => Boolean(Solitude.config.comment?.use && Solitude.page.comment);

document.addEventListener("mouseup", selectText);
document.addEventListener("dblclick", selectText);

const rm = {
    mask: document.getElementById("rightmenu-mask"),
    menu: document.getElementById("rightMenu"),
    width: 0,
    height: 0,
    domhref: "",
    domsrc: "",
    globalEvent: null,
    menuItems: {
        other: document.getElementsByClassName("rightMenuOther"),
        plugin: document.getElementsByClassName("rightMenuPlugin"),
        back: document.getElementById("menu-backward"),
        forward: document.getElementById("menu-forward"),
        refresh: document.getElementById("menu-refresh"),
        top: document.getElementById("menu-top"),
        copy: document.getElementById("menu-copytext"),
        paste: document.getElementById("menu-pastetext"),
        comment: document.getElementById("menu-commenttext"),
        new: document.getElementById("menu-newwindow"),
        copyLink: document.getElementById("menu-copylink"),
        copyImg: document.getElementById("menu-copyimg"),
        downloadImg: document.getElementById("menu-downloadimg"),
        search: document.getElementById("menu-search"),
        barrage: document.getElementById("menu-commentBarrage"),
        mode: document.getElementById("menu-darkmode"),
        translate: document.getElementById("menu-translate"),
        music: [
            document.getElementById("menu-music-toggle"),
            document.getElementById("menu-music-back"),
            document.getElementById("menu-music-forward"),
            document.getElementById("menu-music-copyMusicName"),
        ],
    },
    showRightMenu(e, x = 0, y = 0) {
        if (!this.menu || !this.mask) return;
        this.menu.style.top = `${y}px`;
        this.menu.style.left = `${x}px`;
        this.menu.style.display = e ? "block" : "none";
        this.mask.style.display = e ? "flex" : "none";
        if (e) stopMaskScroll();
    },
    hideRightMenu() {
        this.showRightMenu(false);
    },
    reLoadSize() {
        if (!this.menu) return;
        this.menu.style.display = "block";
        this.width = this.menu.offsetWidth;
        this.height = this.menu.offsetHeight;
        this.menu.style.display = 'none';
    },
    copyText(e) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(e);
            Solitude.snackbarShow(Solitude.config.lang.copy.success, false, 2000);
        }
        this.hideRightMenu();
    },
    async pasteText() {
        const target = this.globalEvent?.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false;
        try {
            const value = await navigator.clipboard.readText();
            target.setRangeText(value, target.selectionStart || 0, target.selectionEnd || 0, "end");
            target.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
        } catch {
            return false;
        }
    },
    async downloadImage(imageUrl = this.domsrc, filename = "photo") {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            Solitude.snackbarShow(Solitude.config.right_menu.img_error, false, 2000);
        }
    },
    copyImage(imgUrl = this.domsrc) {
        window.open(imgUrl);
    },
    setLabel(element, label) {
        if (!element || !label) return;
        element.textContent = label;
        element.setAttribute("title", label);
        element.setAttribute("heotip", label);
        const menuItem = element.closest(".rightMenu-item");
        if (menuItem) {
            menuItem.setAttribute("title", label);
            menuItem.setAttribute("heotip", label);
        }
    },
    mode(darkmode) {
        const label = darkmode ? Solitude.config.right_menu.mode.light : Solitude.config.right_menu.mode.dark;
        this.setLabel(document.querySelector(".menu-darkmode-text"), label);
        this.hideRightMenu();
    },
    barrage(enable) {
        const label = enable ? Solitude.config.right_menu.barrage.open : Solitude.config.right_menu.barrage.close;
        this.setLabel(document.querySelector(".menu-commentBarrage-text"), label);
        this.hideRightMenu();
    },
};

Solitude.rightMenu = rm;
Solitude.hideRightMenu = rm.hideRightMenu.bind(rm);
rm.mode(document.documentElement.dataset.theme === "dark");

function stopMaskScroll() {
    const hideMenu = rm.hideRightMenu.bind(rm);
    Solitude.addEventListenerPjax(rm.menu, "mousewheel", hideMenu, { passive: true });
    Solitude.addEventListenerPjax(rm.mask, "mousewheel", hideMenu, { passive: true });
    Solitude.addEventListenerPjax(rm.mask, "click", hideMenu, { passive: true });
}

document.addEventListener("contextmenu", (ele) => {
    if (!Solitude.config.right_menu || !rm.menu || !rm.mask) return;
    if (document.body.clientWidth <= 768) return;
    if (Solitude.config.right_menu.ctrlOriginalMenu) {
        if (firstShowRightMenu) {
            firstShowRightMenu = false;
            Solitude.snackbarShow(Solitude.config.right_menu.ctrlOriginalMenu, false, 2000);
        }
        if (ele.ctrlKey) return true;
    }

    let x = ele.clientX + 10;
    let y = ele.clientY;
    Array.from(rm.menuItems.other).forEach(item => item.style.display = "flex");
    rm.globalEvent = ele;

    const link = ele.target.href;
    const src = ele.target.currentSrc;
    const tagName = ele.target.tagName.toLowerCase();
    const cls = ele.target.className.toLowerCase();

    const display = !!(selectTextNow && window.getSelection()) || !!link || !!src || (tagName === "input" || tagName === "textarea") || cls.match(/aplayer/);

    rm.menuItems.copy.style.display = selectTextNow && window.getSelection() ? "flex" : "none";
    rm.menuItems.comment && (rm.menuItems.comment.style.display = commentsEnabled() && selectTextNow && window.getSelection() ? "flex" : "none");
    rm.menuItems.search && (rm.menuItems.search.style.display = selectTextNow && window.getSelection() ? "flex" : "none");

    rm.menuItems.new.style.display = link ? "flex" : "none";
    rm.menuItems.copyLink.style.display = link ? "flex" : "none";
    rm.domhref = link || "";

    rm.menuItems.copyImg.style.display = src ? "flex" : "none";
    rm.menuItems.downloadImg.style.display = src ? "flex" : "none";
    rm.domsrc = src || "";

    rm.menuItems.paste.style.display = (tagName === "input" || tagName === "textarea") ? "flex" : "none";

    if (Solitude.config.right_menu.music) {
        if (cls.match(/aplayer/)) {
            rm.menuItems.music.forEach(item => item.style.display = "flex");
        } else {
            rm.menuItems.music.forEach(item => item.style.display = "none");
        }
    }

    Array.from(display ? rm.menuItems.other : rm.menuItems.plugin).forEach(item => item.style.display = "none");
    Array.from(display ? rm.menuItems.plugin : rm.menuItems.other).forEach(item => item.style.display = "block");

    rm.reLoadSize();
    x = (x + rm.width > window.innerWidth) ? x - (rm.width + 10) : x;
    y = (y + rm.height > window.innerHeight) ? y - (y + rm.height - window.innerHeight) : y;

    rm.showRightMenu(true, x, y);
    ele.preventDefault();
});

(function () {
    const addEventListener = (element, event, handler) => element?.addEventListener(event, handler);

    addEventListener(rm.menuItems.back, "click", () => window.history.back() || rm.hideRightMenu());
    addEventListener(rm.menuItems.forward, "click", () => window.history.forward() || rm.hideRightMenu());
    addEventListener(rm.menuItems.refresh, "click", () => window.location.reload());
    addEventListener(rm.menuItems.top, "click", () => Solitude.toTop() || rm.hideRightMenu());

    if (Solitude.config.right_menu.music) {
        addEventListener(rm.menuItems.music[0], "click", () => {
            Solitude.musicToggle();
            rm.hideRightMenu();
        });
        addEventListener(rm.menuItems.music[1], "click", () => {
            document.querySelector("meting-js").aplayer.skipBack();
            rm.hideRightMenu();
        });
        addEventListener(rm.menuItems.music[2], "click", () => {
            document.querySelector("meting-js").aplayer.skipForward();
            rm.hideRightMenu();
        });
        addEventListener(rm.menuItems.music[3], "click", () => {
            const title = Array.from(document.querySelectorAll(".aplayer-title")).map(e => e.innerText)[0];
            rm.copyText(title);
        });
    }

    addEventListener(rm.menuItems.copy, "click", () => {
        if (Solitude.config.copyright && selectTextNow.length > Solitude.config.right_menu.limit) {
            selectTextNow += `\n\n${Solitude.config.right_menu.author}\n${Solitude.config.right_menu.link}${window.location.href}\n${Solitude.config.right_menu.source}\n${Solitude.config.right_menu.info}`;
        }
        rm.copyText(selectTextNow);
    });

    if (Solitude.saveToLocal.get("commentBarrageSwitch") !== null) {
        rm.menuItems.barrage && rm.barrage(!Solitude.saveToLocal.get("commentBarrageSwitch"));
    }

    addEventListener(rm.menuItems.paste, "click", () => rm.pasteText() && rm.hideRightMenu());
    addEventListener(rm.menuItems.comment, "click", () => rm.hideRightMenu() || Solitude.toTalk(selectTextNow));
    addEventListener(rm.menuItems.new, "click", () => window.open(rm.domhref) && rm.hideRightMenu());
    addEventListener(rm.menuItems.downloadImg, "click", () => rm.downloadImage() && rm.hideRightMenu());
    addEventListener(rm.menuItems.copyImg, "click", () => rm.copyImage() && rm.hideRightMenu());
    addEventListener(rm.menuItems.copyLink, "click", () => rm.copyText(rm.domhref) && rm.hideRightMenu());
})();
