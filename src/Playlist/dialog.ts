import C from "../config";
import { Player } from "./player";
import { Playlist } from "./playlist";
import { getPostByVideoId } from "../Thread/posts";
import { getThemeColors, printWarning } from "../utils";
import dialogTemplate from "./templates/dialog.html";
import shortcutIcon from "./templates/shortcutIcon.html";

class Dialog {
    private display: boolean = false;
    private size: [width: number, height: number] = [0, 0];
    private offset: [x: number, y: number] = [0, 0];
    private screen: [width: number, height: number] = [0, 0];
    private headerHeight: number = 0;
    private dragging: boolean = false;

    private _self: HTMLDivElement | undefined;
    private shortcuts: (HTMLElement | undefined)[] = [];
    private player: Player;
    private playlist: Playlist;

    constructor() {
        // Init DOM node
        const dialog = document.createElement("div");
        dialog.id = "playlist-embed";
        dialog.className = "dialog hide";
        dialog.insertAdjacentHTML("afterbegin", dialogTemplate);
        if (!C.isWarosu && !C.fourchanX.enabled) {
            const [bg, border] = getThemeColors();
            if (bg) dialog.style.backgroundColor = bg;
            if (border) dialog.style.borderColor = border;
        }
        this._self = dialog;

        // Add dialog shortcut to the DOM
        this.addShortcut();

        // Attach events to dialog components
        const list = dialog.querySelector<HTMLElement>(".list-toggle");
        list?.addEventListener("click", this.togglePlaylist);
        const prev = dialog.querySelector<HTMLElement>(".prev-track");
        prev?.addEventListener("click", this.loadPrevTrack);
        const next = dialog.querySelector<HTMLElement>(".next-track");
        next?.addEventListener("click", this.loadNextTrack);
        const loop = dialog.querySelector<HTMLElement>(".loop-playlist");
        loop?.addEventListener("click", this.toggleLoop);
        const move = dialog.querySelector<HTMLElement>(".move");
        move?.addEventListener("mousedown", this.toggleDragging);
        const jumpTo = dialog.querySelector<HTMLElement>(".jump-to");
        jumpTo?.addEventListener("click", this.findCurrentTrack);
        const close = dialog.querySelector<HTMLElement>(".close");
        close?.addEventListener("click", this.close);

        // Add dialog itself to the DOM
        document.body.appendChild(dialog);
        this.loadPosition();

        // Init and inject dependencies
        this.playlist = new Playlist(this);
        this.player = new Player(this);

        // Pair siblings
        this.playlist.setPlayer(this.player);
        this.player.setPlaylist(this.playlist);
    }

    get self() {
        return this._self;
    }

    toggle(forceClose: boolean = false) {
        if (!this._self) return;

        this.display = forceClose ? false : !this.display;
        this._self.classList.toggle("hide", !this.display);

        if (C.isWarosu || !C.fourchanX.enabled) return;
        const link = this.shortcuts[0];
        link?.classList.toggle("disabled", !this.display);
    }

    updatePlaylist() {
        this.playlist.update();
    }

    private addShortcut() {
        if (C.isFourchan) this.addFourchanShortcuts();
        if (C.isWarosu) this.addWarosuShortcut();

        this.shortcuts.forEach((shortcut) =>
            shortcut?.addEventListener("click", () => {
                if (C.parsingUpdate) return;

                const videos = this.playlist.tracks;
                if (videos.length === 0) {
                    printWarning(
                        "No YouTube links found in this thread.",
                        true,
                    );
                    return;
                }

                const hasPlayableVideos = videos.some((v) => v.isAlive);
                if (!hasPlayableVideos) {
                    printWarning(
                        "All YouTube links in this thread are unavailable.",
                        true,
                    );
                    return;
                }

                if (this.player.isAPIInitialized) {
                    this.toggle();
                } else {
                    this.player.injectAPI();
                }
            }),
        );
    }

    private addFourchanShortcuts() {
        const shortcutTitle = "Toggle YouTube Playlist";

        if (C.fourchanX.enabled) {
            const headerShortcut = document.createElement("span");
            headerShortcut.id = "shortcut-playlist";
            headerShortcut.className = "shortcut brackets-wrap";
            headerShortcut.dataset.index = "535";
            const shortcutLink = document.createElement("a");
            shortcutLink.className = "disabled";
            shortcutLink.title = shortcutTitle;
            shortcutLink.href = "javascript:;";
            shortcutLink.innerHTML = `<span class="icon--alt-text">Playlist</span>`;
            shortcutLink.innerHTML += shortcutIcon;
            headerShortcut.appendChild(shortcutLink);

            const sibling = document.getElementById("shortcut-gallery");
            sibling?.insertAdjacentElement("afterend", headerShortcut);

            this.shortcuts.push(shortcutLink);
        } else {
            if (!C.native.extensionDisabled && C.native.headerEnabled) {
                const mobileShortcut = document.createElement("a");
                mobileShortcut.href = "javascript:;";
                mobileShortcut.textContent = "Playlist";

                const sibling = document.getElementById(
                    "settingsWindowLinkMobile",
                );
                sibling?.insertAdjacentElement("beforebegin", mobileShortcut);
                mobileShortcut.insertAdjacentText("afterend", "\u00A0");

                this.shortcuts.push(mobileShortcut);
            }

            const desktopShortcut = document.createElement("a");
            desktopShortcut.href = "javascript:;";
            desktopShortcut.textContent = "Playlist";

            const postInfo = document.getElementById("pi" + C.thread);
            const sibling = postInfo?.querySelector("span.postNum");
            sibling?.insertAdjacentElement("afterend", desktopShortcut);
            desktopShortcut.insertAdjacentText("beforebegin", " [");
            desktopShortcut.insertAdjacentText("afterend", "]");

            this.shortcuts.push(desktopShortcut);
        }
    }

    private addWarosuShortcut() {
        const parent = document.getElementById("p" + C.thread);
        if (!parent) return;

        const lastLink = parent.querySelector("a:last-of-type");
        if (!lastLink) return;

        const shortcut = document.createElement("a");
        shortcut.className = "playlist-toggle";
        shortcut.title = "Toggle YouTube playlist";
        shortcut.textContent = "Playlist";
        shortcut.href = "javascript:;";

        lastLink.nextElementSibling?.insertAdjacentElement(
            "beforebegin",
            shortcut,
        );
        shortcut.insertAdjacentText("beforebegin", "[");
        shortcut.insertAdjacentText("afterend", "]");

        this.shortcuts.push(shortcut);
    }

    private togglePlaylist = () => {
        this.playlist.toggle();
    };

    private loadPrevTrack = () => {
        this.player.prev();
    };

    private loadNextTrack = () => {
        this.player.next();
    };

    private toggleLoop = () => {
        const loopBtn = this._self?.querySelector(".loop-playlist");
        if (!loopBtn) return;

        this.playlist.looping = !this.playlist.looping;
        loopBtn?.classList.toggle("active", this.playlist.looping);
    };

    private toggleDragging = (e: MouseEvent) => {
        if (!this._self) return;

        /* Snapshot the dialog properties and start listening to cursor movements */
        if (e.type === "mousedown") {
            if (e.button !== 0) return;

            e.preventDefault(); // Avoid selection while dragging

            const { width, height, x, y } = this._self.getBoundingClientRect();
            this.size[0] = width;
            this.size[1] = height;
            this.offset[0] = e.clientX - x;
            this.offset[1] = e.clientY - y;

            const { clientWidth, clientHeight } = document.documentElement;
            this.screen[0] = clientWidth;
            this.screen[1] = clientHeight;

            const header = document.getElementById("header-bar");
            const headerHeight = header?.getBoundingClientRect().height;
            this.headerHeight = headerHeight ?? 0;

            document.addEventListener("mousemove", this.move);
            document.addEventListener("mouseup", this.toggleDragging);
            this.dragging = true;
        }

        /* Stop listening to cursor movements and save the dialog coordinates */
        if (e.type === "mouseup") {
            if (!this.dragging) return;

            document.removeEventListener("mousemove", this.move);
            document.removeEventListener("mouseup", this.toggleDragging);
            this.dragging = false;

            this.savePosition();
        }
    };

    private move = (e: MouseEvent) => {
        if (!this._self) return;

        e.preventDefault();

        const [screenW, screenH] = this.screen;
        const [dialogW, dialogH] = this.size;

        const minX = 0;
        const maxX = screenW - dialogW;
        let minY = 0;
        let maxY = screenH - dialogH;

        if (C.fourchanX.fixedHeader && !C.fourchanX.autohideHeader) {
            if (C.fourchanX.bottomHeader) maxY -= this.headerHeight;
            else minY += this.headerHeight;
        }

        const x = e.clientX - this.offset[0];
        const y = e.clientY - this.offset[1];

        const clamp = (v: number, min: number, max: number) =>
            Math.min(Math.max(v, min), max);

        const getProportions = (input: number, max: number) => {
            return (input * 100) / max;
        };

        const newX = getProportions(clamp(x, minX, maxX), screenW);
        const newY = getProportions(clamp(y, minY, maxY), screenH);

        this.setPosition([newX + "%", newY + "%"]);
    };

    private savePosition() {
        if (!this._self) return;

        const prefix = C.isFourchan ? "4chan" : "Warosu";
        GM_setValue(prefix + " Dialog Coordinates", [
            this._self.style.left ?? "5%",
            this._self.style.top ?? "5%",
        ]);
    }

    private loadPosition() {
        const key = (C.isFourchan ? "4chan" : "Warosu") + " Dialog Coordinates";
        const coords: [x: string, y: string] = GM_getValue(key, ["5%", "5%"]);
        this.setPosition(coords);
    }

    private setPosition([x, y]: [x: string, y: string]) {
        if (!this._self) return;

        this._self.style.left = x;
        this._self.style.top = y;
    }

    private findCurrentTrack = () => {
        const trackId = this.playlist.track;
        if (!trackId) return;

        const postId = getPostByVideoId(trackId);
        const post = document.getElementById("p" + postId);

        if (!post) return;
        post.scrollIntoView();
    };

    private close = () => {
        this.toggle(true);
    };
}

export { Dialog };
