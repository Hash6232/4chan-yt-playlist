// ==UserScript==
// @name        4chan - YouTube Playlist
// @description Wraps all YouTube videos inside a thread into a playlist
// @namespace   4chan-yt-playlist
// @version     2.4.0
// @include     https://boards.4chan.org/*/thread/*
// @include     https://warosu.org/*/thread/*
// @run-at      document-start
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==
const C = new class Conf {
    constructor() {
        this.initFinished = false;
        this.fourchan = location.hostname === "boards.4chan.org";
        this.warosu = location.hostname === "warosu.org";
        this.native = true;
        this.fixedNav = false;
        this.autohideNav = false;
        this.fourchanX = false;
        const pathname = location.pathname.slice(1).split("/thread/");
        this.board = pathname[0];
        this.thread = pathname[1];
        if (this.warosu)
            this.initFinished = true;
        document.addEventListener("4chanMainInit", () => {
            this.native = !unsafeWindow.Config.disableAll;
            this.fixedNav = unsafeWindow.Config.dropDownNav;
            this.autohideNav = unsafeWindow.Config.autoHideNav;
            this.initFinished = true;
        });
        document.addEventListener("4chanXInitFinished", () => {
            this.fourchanX = true;
        });
    }
    get fixedHeader() {
        if (!this.fourchanX)
            return false;
        return document.documentElement.classList.contains("fixed");
    }
    get autohideHeader() {
        if (!this.fourchanX)
            return false;
        return document.documentElement.classList.contains("autohide");
    }
};

class Playlist {
    constructor() {
        this.checking = false;
        this.mutated = false;
        this.playing = false;
        this.state = 0;
        this.posts = {};
        this.dialog = null;
        this.player = null;
        this.track = "";
        this.regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g;
        if (!C.fourchan && !C.warosu)
            throw new Error("Website not supported..");
        document.addEventListener("DOMContentLoaded", async () => {
            this.checking = true;
            const posts = await fetchThread();
            if (posts.length < 1)
                throw new Error("No post was found.");
            this.parsePosts(posts).finally(() => this.checking = false);
        });
        document.addEventListener("ThreadUpdate", ((e) => {
            if (!C.fourchanX)
                return;
            if (e.detail[404])
                return;
            const newPosts = e.detail.newPosts.map((fullId) => {
                const no = fullId.split(".").pop();
                return [no, document.getElementById("m" + no)?.innerHTML || ""];
            });
            parseReplies(this, newPosts);
        }));
        document.addEventListener("4chanThreadUpdated", ((e) => {
            if (C.fourchanX)
                return;
            if (unsafeWindow.thread_archived)
                return;
            const thread = document.querySelector(".board > .thread");
            const newPosts = [...thread.children].slice(-e.detail.count).map((p) => {
                const no = p.id.split("pc").pop();
                return [no, document.getElementById("m" + no)?.innerHTML || ""];
            });
            parseReplies(this, newPosts);
        }));
        document.addEventListener("4chanQRPostSuccess", ((e) => {
            if (C.fourchanX)
                return;
            const no = e.detail.postId.toString();
            const newPost = [no, document.getElementById("m" + no)?.innerHTML || ""];
            parseReplies(this, [newPost]);
        }));
        async function fetchThread() {
            switch (true) {
                case C.fourchan:
                    const response = await fetch("https://a.4cdn.org/" + C.board + "/thread/" + C.thread + ".json");
                    const { posts } = await response.json();
                    return posts.map((post) => [post.no.toString(), post.com || ""]);
                case C.warosu:
                    return [...document.querySelectorAll(".comment blockquote")]
                        .map((post) => [post.parentElement?.id.slice(1) ?? "", post.innerHTML]);
                default:
                    return [];
            }
        }
        async function parseReplies(playlist, newPosts) {
            playlist.checking = true;
            playlist.parsePosts(newPosts).then((addedPosts) => {
                if (!playlist.player)
                    return;
                if (addedPosts > 0)
                    playlist.mutated = true;
            }).finally(() => {
                playlist.checking = false;
                if (!playlist.mutated || playlist.playing)
                    return;
                playlist.updatePlayer();
            });
        }
    }
    async parsePosts(posts) {
        const validPosts = posts.reduce((array, post) => {
            const comment = post[1].replace(/<wbr>/g, "");
            const ids = Array.from(new Set([...comment.matchAll(this.regex)].map((m) => m[1])));
            if (ids.length > 0)
                array.push([post[0], ids]);
            return array;
        }, []);
        if (validPosts.length < 1)
            return Promise.resolve(0);
        const parsedPosts = validPosts.map(async (post) => {
            return Promise.allSettled(post[1].map((id) => this.checkLink(id)))
                .then((responses) => [post[0], responses.reduce((output, res) => {
                    if (res.status === "fulfilled")
                        output.push(res.value);
                    return output;
                }, [])]);
        });
        return Promise.allSettled(parsedPosts).then((responses) => {
            return responses.reduce((output, res) => {
                if (res.status === "fulfilled")
                    output.push(res.value);
                return output;
            }, []);
        }).then((posts) => {
            for (const post of posts)
                this.posts[post[0]] = post[1];
            return posts.length;
        });
    }
    ;
    async checkLink(id) {
        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, { method: "HEAD" }).then(res => [id, res.ok]);
    }
    ;
    updatePlayer() {
        if (!this.player)
            return;
        const pages = this.toPages();
        const page = pages.findIndex(p => p.includes(this.track));
        if (page > -1) {
            const index = pages[page].indexOf(this.track), trackLength = this.player.getDuration(), trackTime = this.player.getCurrentTime(), endTrack = trackTime === trackLength && trackLength > 0, endPlaylist = index === 199;
            const nextPage = endPlaylist && endTrack && page < pages.length - 1 ? page + 1 : page, nextIndex = !endPlaylist && endTrack ? index + 1 : index;
            if (this.playing) {
                this.player.loadPlaylist(pages[nextPage], nextIndex);
                console.debug("loadPlaylist()");
            }
            else {
                const start = trackTime < trackLength ? trackTime : undefined;
                this.player.cuePlaylist(pages[nextPage], nextIndex, start);
                console.debug("cuePlaylist()");
            }
        }
        else {
            console.debug("Can't find last played track in the playlist. Resetting to first page..");
            if (this.playing) {
                this.player.loadPlaylist(pages[0]);
            }
            else {
                this.player.cuePlaylist(pages[0]);
            }
        }
        this.mutated = false;
        const tabs = document.getElementById("playlist-embed")?.querySelector(".tabs");
        if (tabs && tabs.children.length !== pages.length)
            this.dialog?.updateTabs(pages.length);
    }
    ;
    toPages() {
        const output = [];
        const ids = Object.values(this.posts).flatMap((post) => {
            return post.reduce((validVideos, video) => {
                const [id, status] = video;
                if (status && !validVideos.includes(id))
                    validVideos.push(id);
                return validVideos;
            }, []);
        });
        for (let i = 0; i < ids.length; i += 200) {
            const chunk = ids.slice(i, i + 200);
            output.push(chunk);
        }
        return output;
    }
    ;
    jumpTo(track) {
        if (!track)
            return;
        const postId = findKey(this.posts, track);
        return document.getElementById((C.fourchan ? "pc" : "p") + postId)?.scrollIntoView();
        function findKey(object, key) {
            for (const k in object) {
                for (const a of object[k]) {
                    if (a.includes(key))
                        return k;
                }
            }
            return null;
        }
    }
    ;
    isEmpty() {
        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
        return true;
    }
    ;
}

class Dialog {
    constructor(playlist) {
        this.dragging = false;
        this.snapshot = {
            size: [0, 0],
            cursor: [0, 0],
            topbar: [0, 0, false, false]
        };
        document.addEventListener("DOMContentLoaded", () => {
            document.body.insertAdjacentHTML("beforeend", "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>");
            const tabs = this.self?.querySelector("ul");
            const move = this.self?.querySelector(".move");
            const jump = this.self?.querySelector(".jump");
            const close = this.self?.querySelector(".close");
            tabs.addEventListener("click", switchTab);
            move.addEventListener("mousedown", toggleDrag);
            jump.addEventListener("click", () => { playlist.jumpTo(playlist.track); });
            close.addEventListener("click", () => { this.toggle(true); });
            document.addEventListener("mouseup", toggleDrag);
            switch (true) {
                case C.fourchan:
                    setPos(GM_getValue("4chan Dialog Coordinates", ["10%", "5%", null, null]));
                    break;
                case C.warosu:
                    setPos(GM_getValue("Warosu Dialog Coordinates", ["10%", "5%", null, null]));
                    break;
            }
        });
        document.addEventListener("DOMContentLoaded", () => {
            switch (true) {
                case C.fourchan:
                    document.getElementById("navtopright")?.insertAdjacentHTML("afterbegin", "[<a class=\"playlist-toggle native\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a>] ");
                    document.getElementById("settingsWindowLinkMobile")?.insertAdjacentHTML("beforebegin", "<a class=\"playlist-toggle native\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a> ");
                    document.querySelectorAll(".playlist-toggle.native").forEach((l) => { l.onclick = initOrToggle; });
                    break;
                case C.warosu:
                    const childNodes = [...document.body.childNodes];
                    const delimeter = childNodes.find(n => n.nodeType === 3 &&
                        n.nextElementSibling?.tagName === "DIV");
                    try {
                        delimeter.nextElementSibling?.insertAdjacentHTML("beforebegin", "[ <a class=\"playlist-toggle\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">playlist</a> ]");
                    }
                    catch {
                        throw new Error("Unable to append toggle link.");
                    }
                    document.querySelector(".playlist-toggle").onclick = initOrToggle;
                    break;
            }
        });
        document.addEventListener("4chanXInitFinished", () => {
            document.getElementById("shortcut-qr")?.insertAdjacentHTML("beforebegin", "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a class=\"playlist-toggle disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><span class=\"icon--alt-text\">YouTube Playlist</span><svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\" fill=\"currentColor\" /></svg></a></span>");
            document.querySelector(".playlist-toggle:not(.native)").onclick = initOrToggle;
        });
        function switchTab(e) {
            if (!playlist.player)
                return;
            if (!e.target?.dataset.page)
                return;
            const index = e.target.dataset.page || "0";
            playlist.player.cuePlaylist(playlist.toPages()[parseInt(index)]);
        }
        function initOrToggle() {
            if (playlist.checking || playlist.isEmpty())
                return;
            if (!playlist.player)
                return initAPI();
            return playlist.dialog?.toggle();
        }
        function toggleDrag(e) {
            if (!playlist.dialog?.self)
                return;
            switch (e.type) {
                case "mouseup":
                    if (!playlist.dialog.dragging)
                        return;
                    playlist.dialog.dragging = false;
                    document.removeEventListener("mousemove", moveDialog);
                    GM_setValue((C.fourchan ? "4chan" : "Warosu") + " Dialog Coordinates", [
                        playlist.dialog.self.style.top, playlist.dialog.self.style.right,
                        playlist.dialog.self.style.bottom, playlist.dialog.self.style.left
                    ]);
                    break;
                case "mousedown":
                    if (e.button !== 0)
                        return;
                    e.preventDefault();
                    const rect = playlist.dialog.self.getBoundingClientRect();
                    playlist.dialog.snapshot.size[0] = rect.width;
                    playlist.dialog.snapshot.size[1] = rect.height;
                    playlist.dialog.snapshot.cursor[0] = e.x - rect.x;
                    playlist.dialog.snapshot.cursor[1] = e.y - rect.y;
                    if (C.fourchan && (C.fixedNav || C.fixedHeader)) {
                        const topbar = document.getElementById(C.fourchanX ? "header-bar" : "boardNavMobile");
                        if (topbar) {
                            playlist.dialog.snapshot.topbar[0] = topbar.getBoundingClientRect().y || 0;
                            playlist.dialog.snapshot.topbar[1] = topbar.offsetHeight || 0;
                            playlist.dialog.snapshot.topbar[2] = C.fourchanX ? C.fixedHeader : C.fixedNav;
                            playlist.dialog.snapshot.topbar[3] = C.fourchanX ? C.autohideHeader : C.autohideNav;
                        }
                    }
                    playlist.dialog.dragging = true;
                    document.addEventListener("mousemove", moveDialog);
                    break;
            }
        }
        function moveDialog(e) {
            if (!playlist.dialog?.self)
                return;
            e.preventDefault();
            const sW = document.documentElement.clientWidth, sH = document.documentElement.clientHeight, x = e.x - playlist.dialog.snapshot.cursor[0], y = e.y - playlist.dialog.snapshot.cursor[1], w = playlist.dialog.snapshot.size[0], h = playlist.dialog.snapshot.size[1], maxX = sW - w;
            let minY = 0, maxY = sH - h;
            if (playlist.dialog.snapshot.topbar[2]) {
                const [y, offset, fixed, autohide] = playlist.dialog.snapshot.topbar;
                if (fixed && !autohide) {
                    if (y < offset) {
                        minY += offset;
                    }
                    else {
                        maxY -= offset;
                    }
                }
            }
            if (y > maxY) {
                playlist.dialog.self.style.bottom = 0 + "px";
                playlist.dialog.self.style.removeProperty("top");
            }
            else {
                playlist.dialog.self.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
                playlist.dialog.self.style.removeProperty("bottom");
            }
            if (x > maxX) {
                playlist.dialog.self.style.right = 0 + "px";
                playlist.dialog.self.style.removeProperty("left");
            }
            else {
                playlist.dialog.self.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
                playlist.dialog.self.style.removeProperty("right");
            }
        }
        function initAPI() {
            if (playlist.state > 0 || playlist.player)
                return;
            if (playlist.state < 0)
                return failedLoad();
            playlist.state = 1;
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(script);
            setTimeout(() => {
                if (playlist.state < 1)
                    return;
                playlist.state = -1;
                failedLoad();
            }, 5000);
            script.onerror = () => { failedLoad(); playlist.state = -1; };
            function failedLoad() {
                const msg = "Unable to load YouTube Iframe API.\nPress F12 and follow the instructions in the console.";
                switch (true) {
                    case C.fourchanX:
                        document.dispatchEvent(new CustomEvent("CreateNotification", {
                            detail: { type: "error", content: msg }
                        }));
                        break;
                    default:
                        alert(msg);
                        break;
                }
                console.info("Unable to load YouTube Iframe API\n\n" +
                    "4chanX's Settings > Advanced > Javascript Whitelist\n\n" +
                    "  https://www.youtube.com/iframe_api\n" +
                    "  https://www.youtube.com/s/player/" +
                    "\n\nFilters in your AdBlock extension\n\n" +
                    "  @@||www.youtube.com/iframe_api$script,domain=4chan.org\n" +
                    "  @@||www.youtube.com/s/player/*$script,domain=4chan.org\n");
            }
        }
        function setPos(coordinates) {
            coordinates.forEach((pos, index) => {
                if (!pos || !playlist.dialog?.self)
                    return;
                switch (index) {
                    case 0:
                        playlist.dialog.self.style.top = pos;
                        break;
                    case 1:
                        playlist.dialog.self.style.right = pos;
                        break;
                    case 2:
                        playlist.dialog.self.style.bottom = pos;
                        break;
                    case 3:
                        playlist.dialog.self.style.left = pos;
                        break;
                }
            });
        }
    }
    get self() {
        return document.getElementById("playlist-embed");
    }
    get toggleBtn() {
        return document.querySelector(".playlist-toggle:not(.native)");
    }
    toggle(close) {
        if (close || !this.self?.classList.contains("hide")) {
            this.self?.classList.add("hide");
            this.toggleBtn?.classList.add("disabled");
        }
        else {
            this.self?.classList.remove("hide");
            this.toggleBtn?.classList.remove("disabled");
        }
    }
    updateTabs(amount) {
        const tabs = this.self?.querySelector("ul");
        if (!tabs)
            return console.error("No <ul> present in dialog.");
        while (tabs?.lastChild)
            tabs.removeChild(tabs.lastChild);
        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);
        }
    }
}

const playlist = new Playlist();
playlist.dialog = new Dialog(playlist);
unsafeWindow.onYouTubeIframeAPIReady = () => {
    playlist.player = new YT.Player("playlist", {
        width: '512', height: '288',
        playerVars: { 'fs': 0, 'disablekb': 1, 'rel': 0 },
        events: {
            "onReady": initPlaylist,
            "onStateChange": updateTrack,
            "onError": playbackError
        }
    });
    function initPlaylist(e) {
        playlist.state = 0;
        const pages = playlist.toPages();
        playlist.dialog?.updateTabs(pages.length);
        let history = {};
        try {
            history = JSON.parse(localStorage.getItem("4chan-x-yt-playlist-history") || "{}");
        }
        catch {
            console.error("Failed to parse playlist history from local storage");
        }
        const lastPlayedTrack = history[C.board + "." + C.thread] || null;
        const lastPage = lastPlayedTrack ? pages.find(p => p.includes(lastPlayedTrack)) : null;
        if (lastPlayedTrack && lastPage) {
            e.target.cuePlaylist(lastPage, lastPage.indexOf(lastPlayedTrack));
        }
        else {
            e.target.cuePlaylist(pages[0]);
        }
        playlist.dialog?.toggle();
    }
    function updateTrack(e) {
        if (e.data == 0) {
            const pages = playlist.toPages();
            const page = pages.findIndex(p => p.includes(playlist.track));
            if (page > -1 && page < pages.length - 1)
                e.target.loadPlaylist(pages[page + 1]);
        }
        else if (e.data == -1) {
            playlist.track = e.target.getVideoUrl().split("=").pop() || "";
            let history = {};
            try {
                history = JSON.parse(localStorage.getItem("4chan-x-yt-playlist-history") || "{}");
                history[C.board + "." + C.thread] = playlist.track;
            }
            catch {
                console.error("Failed to parse playlist history from local storage");
            }
            localStorage.setItem("4chan-x-yt-playlist-history", JSON.stringify(history));
            if (playlist.mutated)
                playlist.updatePlayer();
        }
        playlist.playing = (e.data == 1 || e.data == 3) ? true : false;
    }
    function playbackError(e) {
        let errLvl = "", errMsg = "";
        const index = e.target.getPlaylistIndex();
        const length = e.target.getPlaylist().length;
        switch (+e.data) {
            case 5:
            case 100:
            case 101:
            case 150:
                if (index + 1 < length) {
                    e.target.nextVideo();
                }
            case 101:
            case 150:
                errLvl = "warning";
                errMsg = "The owner of the requested video does not allow it to be played in embedded players.";
                break;
            case 2:
                errLvl = "error";
                errMsg = "The request contains an invalid parameter value.";
                break;
            case 5:
                errLvl = "error";
                errMsg = "The requested content cannot be played in an HTML5 player.";
                break;
            case 100:
                errLvl = "warning";
                errMsg = "The video has been removed or marked as private.";
                break;
        }
        const output = "Error - Video #" + (index + 1) + "\n" + errMsg;
        if (C.fourchanX) {
            document.dispatchEvent(new CustomEvent("CreateNotification", {
                detail: { type: errLvl, content: output, lifetime: 10 }
            }));
        }
        else {
            switch (errLvl) {
                case "error":
                    console.error(output);
                    break;
                case "warning":
                    console.warn(output);
                    break;
                default:
                    console.info(output);
                    break;
            }
        }
    }
};
document.addEventListener("DOMContentLoaded", () => {
    let css = "#playlist-embed{position:fixed;padding:1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 .25em}#playlist-embed .move{flex:1;cursor:move}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}";
    switch (true) {
        case C.fourchan:
            const currentStyle = getComputedStyle(document.querySelector(".post.reply"));
            css += `:root.fourchan-x:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px}:root:not(.fourchan-x) .dialog{background-color:${currentStyle["backgroundColor"]};border:1px solid ${currentStyle["borderRightColor"]};box-shadow:0 1px 2px rgba(0,0,0,.15)}`;
            break;
        case C.warosu:
            css += ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow:0 1px 2px rgba(0,0,0,.15)}#playlist-embed a{text-decoration:none}";
            break;
    }
    document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>");
});
