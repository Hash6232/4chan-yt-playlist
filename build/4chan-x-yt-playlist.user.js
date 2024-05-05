// ==UserScript==
// @name        4chan X - YouTube Playlist
// @description Wraps all YouTube videos inside a thread into a playlist
// @namespace   4chan-X-yt-playlist
// @version     2.3.4
// @include     https://boards.4chan.org/*/thread/*
// @include     https://warosu.org/*/thread/*
// @run-at      document-start
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==
class Playlist {
    constructor() {
        this.board = "";
        this.thread = "";
        this.checking = false;
        this.mutated = false;
        this.playing = false;
        this.state = 0;
        this.posts = {};
        this.dialog = null;
        this.player = null;
        this.track = "";
        this.regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g;
        const [board, no] = window.location.pathname.slice(1).split("/thread/");
        this.board = board;
        this.thread = no;
        document.addEventListener("DOMContentLoaded", async () => {
            this.checking = true;
            const posts = await fetchThread();
            if (posts.length < 1)
                throw new Error("No post was found.");
            return this.parsePosts(posts).finally(() => this.checking = false);
        });
        async function fetchThread() {
            if ([board, no].some((s) => !s || s.length < 1))
                throw new Error("Unable to retrieve board and thread number.");
            switch (location.hostname) {
                case "boards.4chan.org":
                    const response = await fetch("https://a.4cdn.org/" + board + "/thread/" + no + ".json");
                    const { posts } = await response.json();
                    return posts.map((post) => [post.no.toString(), post.com || ""]);
                case "warosu.org":
                    return [...document.querySelectorAll(".comment blockquote")]
                        .map((post) => [post.parentElement?.id.slice(1) ?? "", post.innerHTML]);
                default:
                    console.error("This script isn't compatible with this image board.");
                    return [];
            }
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
    async checkLink(id) {
        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, { method: "HEAD" }).then(res => [id, res.ok]);
    }
    initAPI() {
        if (this.state > 0 || this.player)
            return;
        if (this.state < 0)
            return failedLoad();
        this.state = 1;
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
        setTimeout(() => {
            if (this.state < 1)
                return;
            this.state = -1;
            failedLoad();
        }, 5000);
        script.onerror = () => { failedLoad(); this.state = -1; };
        function failedLoad() {
            document.dispatchEvent(new CustomEvent("CreateNotification", {
                detail: { type: "error", content: "Unable to load YouTube Iframe API.\nPress F12 and follow the instructions in the console." }
            }));
            console.info("Unable to load YouTube Iframe API\n\n" +
                "4chanX's Settings > Advanced > Javascript Whitelist\n\n" +
                "  https://www.youtube.com/iframe_api\n" +
                "  https://www.youtube.com/s/player/" +
                "\n\nFilters in your AdBlock extension\n\n" +
                "  @@||www.youtube.com/iframe_api$script,domain=4chan.org\n" +
                "  @@||www.youtube.com/s/player/*$script,domain=4chan.org\n");
        }
    }
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
        if (!this.dialog)
            return;
        const tabs = document.getElementById("playlist-embed")?.querySelector(".tabs");
        if (tabs && tabs.children.length !== pages.length)
            this.dialog.updateTabs(pages.length);
    }
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
    jumpTo(track) {
        if (!track)
            return;
        const postId = findKey(this.posts, track);
        const is4chan = location.hostname === "boards.4chan.org";
        return document.getElementById((is4chan ? "pc" : "p") + postId)?.scrollIntoView();
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
    isEmpty() {
        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
        return true;
    }
}

class Dialog {
    constructor(playlist) {
        this.size = [0, 0];
        this.cursorPos = [0, 0];
        this.header = [0, 0, true, false];
        document.body.insertAdjacentHTML("beforeend", "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>");
        switch (location.hostname) {
            case "boards.4chan.org":
                this.setPos(GM_getValue("4chan Dialog Coordinates", ["10%", "5%", null, null]));
                document.getElementById("shortcut-qr")?.insertAdjacentHTML("beforebegin", "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a id=\"playlist-toggle\" class=\"disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><span class=\"icon--alt-text\">YouTube Playlist</span><svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\" fill=\"currentColor\" /></svg></a></span>");
                break;
            case "warosu.org":
                this.setPos(GM_getValue("Warosu Dialog Coordinates", ["10%", "5%", null, null]));
                const childNodes = [...document.body.childNodes];
                const delimeter = childNodes.find(n => n.nodeType === 3 &&
                    n.nextElementSibling?.tagName === "DIV");
                if (!delimeter?.nextElementSibling)
                    throw new Error("Unable to append toggle link.");
                delimeter.nextElementSibling.insertAdjacentHTML("beforebegin", "[ <a id=\"playlist-toggle\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">playlist</a> ]");
                break;
        }
        const move = this.node?.querySelector(".move");
        const jump = this.node?.querySelector(".jump");
        const close = this.node?.querySelector(".close");
        move.addEventListener("mousedown", toggleDrag);
        jump.addEventListener("click", () => { playlist.jumpTo(playlist.track); });
        close.addEventListener("click", () => { playlist.dialog?.toggle(true); });
        document.addEventListener("mouseup", toggleDrag);
        const tabs = this.node?.querySelector("ul");
        tabs.addEventListener("click", (e) => {
            if (!playlist.player)
                return;
            if (!e.target || e.target.tagName !== "A")
                return;
            const index = e.target.dataset.page || "0";
            playlist.player.cuePlaylist(playlist.toPages()[parseInt(index)]);
        });
        this.shortcut?.addEventListener("click", () => {
            if (playlist.checking || playlist.isEmpty())
                return;
            if (!playlist.player)
                return playlist.initAPI();
            return playlist.dialog?.toggle();
        });
        function toggleDrag(e) {
            if (!playlist.dialog || !playlist.dialog.node)
                return;
            switch (e.type) {
                case "mouseup":
                    if (!playlist.dialog.node.classList.contains("dragging"))
                        return;
                    playlist.dialog.node.classList.remove("dragging");
                    document.removeEventListener("mousemove", moveDialog);
                    let key;
                    switch (location.hostname) {
                        case "boards.4chan.org":
                            key = "4chan Dialog Coordinates";
                            break;
                        case "warosu.org":
                            key = "Warosu Dialog Coordinates";
                            break;
                        default:
                            return;
                    }
                    GM_setValue(key, [
                        playlist.dialog.node.style.top, playlist.dialog.node.style.right,
                        playlist.dialog.node.style.bottom, playlist.dialog.node.style.left
                    ]);
                    break;
                case "mousedown":
                    if (e.button !== 0)
                        return;
                    e.preventDefault();
                    const rect = playlist.dialog.node.getBoundingClientRect();
                    playlist.dialog.size[0] = rect.width;
                    playlist.dialog.size[1] = rect.height;
                    playlist.dialog.cursorPos[0] = e.x - rect.x;
                    playlist.dialog.cursorPos[1] = e.y - rect.y;
                    if (document.getElementById("header-bar")) {
                        playlist.dialog.header[0] = document.getElementById("header-bar")?.getBoundingClientRect().y || 0;
                        playlist.dialog.header[1] = document.getElementById("header-bar")?.offsetHeight || 0;
                        playlist.dialog.header[2] = document.documentElement.classList.contains("fixed");
                        playlist.dialog.header[3] = document.documentElement.classList.contains("autohide");
                    }
                    playlist.dialog.node.classList.add("dragging");
                    document.addEventListener("mousemove", moveDialog);
                    break;
            }
        }
        function moveDialog(e) {
            if (!playlist.dialog || !playlist.dialog.node)
                return;
            e.preventDefault();
            const sW = document.documentElement.clientWidth, sH = document.documentElement.clientHeight, x = e.x - playlist.dialog.cursorPos[0], y = e.y - playlist.dialog.cursorPos[1], w = playlist.dialog.size[0], h = playlist.dialog.size[1], maxX = sW - w;
            let minY = 0, maxY = sH - h;
            if (document.getElementById("header-bar")) {
                const fixed = playlist.dialog.header[2];
                const autohide = playlist.dialog.header[3];
                if (fixed && !autohide) {
                    if (playlist.dialog.header[0] < playlist.dialog.header[1]) {
                        minY += playlist.dialog.header[1];
                    }
                    else {
                        maxY -= playlist.dialog.header[1];
                    }
                }
            }
            if (y > maxY) {
                playlist.dialog.node.style.bottom = 0 + "px";
                playlist.dialog.node.style.removeProperty("top");
            }
            else {
                playlist.dialog.node.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
                playlist.dialog.node.style.removeProperty("bottom");
            }
            if (x > maxX) {
                playlist.dialog.node.style.right = 0 + "px";
                playlist.dialog.node.style.removeProperty("left");
            }
            else {
                playlist.dialog.node.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
                playlist.dialog.node.style.removeProperty("right");
            }
        }
    }
    get node() {
        return document.getElementById("playlist-embed");
    }
    get shortcut() {
        return document.getElementById("playlist-toggle");
    }
    toggle(close) {
        if (close || !this.node?.classList.contains("hide")) {
            this.node?.classList.add("hide");
            this.shortcut?.classList.add("disabled");
        }
        else {
            this.node?.classList.remove("hide");
            this.shortcut?.classList.remove("disabled");
        }
    }
    updateTabs(amount) {
        const tabs = this.node?.querySelector("ul");
        if (!tabs)
            return console.error("No <ul> present in dialog.");
        while (tabs?.lastChild)
            tabs.removeChild(tabs.lastChild);
        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);
        }
    }
    setPos(coordinates) {
        coordinates.forEach((pos, index) => {
            if (!pos || !this.node)
                return;
            switch (index) {
                case 0:
                    this.node.style.top = pos;
                    break;
                case 1:
                    this.node.style.right = pos;
                    break;
                case 2:
                    this.node.style.bottom = pos;
                    break;
                case 3:
                    this.node.style.left = pos;
                    break;
            }
        });
    }
}

const playlist = new Playlist();
document.addEventListener("DOMContentLoaded", () => {
    if (location.hostname === "warosu.org")
        playlist.dialog = new Dialog(playlist);
    document.head.insertAdjacentHTML("beforeend", "<style>" + "#playlist-embed{position:fixed;padding:1px 4px 1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 0.25em}#playlist-embed .move{flex:1}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}" + (location.hostname === "boards.4chan.org" ? ":root:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px;}" : ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow: 0 1px 2px rgba(0, 0, 0, .15);}#playlist-embed a{text-decoration:none;}#playlist-embed .move{cursor:move;}") + "</style>");
});
document.addEventListener("4chanXInitFinished", () => {
    playlist.dialog = new Dialog(playlist);
    document.addEventListener("ThreadUpdate", ((e) => {
        if (e.detail[404])
            return;
        Promise.allSettled([
            new Promise((done) => {
                if (e.detail.newPosts.length < 1)
                    return done();
                const newPosts = e.detail.newPosts.map((fullId) => {
                    const no = fullId.split(".").pop() || "";
                    return [no, document.getElementById("m" + no)?.innerHTML || ""];
                });
                playlist.checking = true;
                playlist.parsePosts(newPosts).then((addedPosts) => {
                    if (!playlist.player)
                        return done();
                    if (addedPosts > 0)
                        playlist.mutated = true;
                    return done();
                }).finally(() => playlist.checking = false);
            }),
            new Promise((done) => {
                if (e.detail.deletedPosts.length < 1)
                    return done();
                e.detail.deletedPosts.forEach((fullId) => {
                    const postId = fullId.split(".").pop();
                    if (!postId || !(postId in playlist.posts))
                        return;
                    delete playlist.posts[postId];
                    if (!playlist.player)
                        return;
                    playlist.mutated = true;
                });
                return done();
            })
        ])
            .finally(() => {
            if (!playlist.mutated || playlist.playing)
                return;
            playlist.updatePlayer();
        });
    }));
});
unsafeWindow.onYouTubeIframeAPIReady = () => {
    playlist.player = new YT.Player("playlist", {
        width: '512', height: '288',
        playerVars: { 'fs': 0, 'disablekb': 1, 'modestbranding': 1 },
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
        const lastPlayedTrack = history[playlist.board + "." + playlist.thread] || null;
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
                history[playlist.board + "." + playlist.thread] = playlist.track;
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
        document.dispatchEvent(new CustomEvent("CreateNotification", {
            detail: { type: errLvl, content: output, lifetime: 10 }
        }));
    }
};
