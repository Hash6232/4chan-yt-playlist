// ==UserScript==
// @name        4chan X - YouTube Playlist
// @version     2.0
// @namespace   4chan-X-yt-playlist
// @description Wraps all YouTube videos inside a thread into a playlist
// @include     https://boards.4chan.org/*/thread/*
// @include     https://warosu.org/*/thread/*
// @grant       unsafeWindow
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-svg-core@1.2.35/index.min.js
// @run-at      document-start
// ==/UserScript==

"use strict";

const is4chan = location.hostname === "boards.4chan.org";

const playlist = Object.create({

    init: function(comments) {
        this.checking = true;
        this.findLinks(comments).then(posts => {
            this.posts = {};
            posts.forEach(post => this.addPost(post));
            this.checking = false;
            console.debug(this);
        })
    },

    findLinks: async function(posts) {
        return Promise.allSettled(
            posts.reduce((array, post) => {
                // Cleanup HTML from word breaks inside URLs
                const comment = post[1].replaceAll("<wbr>", "");
                // Look for all YouTube links and return an array of unique video ids
                const ids = [... new Set([...comment.matchAll(this.regex)].map(m => m[1]))];
                // If array is not-empty add post+ids to result
                if (ids.length > 0) array.push( [post[0], ids] );
                return array
            }, [])
            // Validate YouTube video ids in each post
            .map(async post => {
                return Promise.allSettled(post[1].map(this.validateLink))
                    .then(res => [post[0], res.map(l => l.value)])
            })).then(res => res.map(p => p.value))
    },

    validateLink: async function(id) {
        if (! id) return [null, false];

        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, {method: "HEAD"}).then(res => [id, res.ok])
    },

    addPost: function(post) {
        if (! Array.isArray(post)) return;
        if (! this.hasOwnProperty("posts")) return;

        const [postId, videoIds] = post;
        this.posts[postId] = videoIds;
    },

    isEmpty: function() {
        if (! this.hasOwnProperty("posts")) return true;

        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
      
        return true
    },

    toPages: function() {
        if (this.isEmpty()) return [];

        const ids = Object.values(this.posts)
        .flatMap(post => post.reduce((validLinks, link) => {
            if (link[1]) validLinks.push(link[0])
            return validLinks
        }, []) );

        return [...new Set(ids)].reduce((pages, id, index) => {
            if ( index % 200 < 1 ) { pages.push([id]) }
            else { pages.at(-1).push(id) }
            return pages
        }, [])
    },

    makeTabs: function(amount) {
        const tabs = document.getElementById("playlist-embed").querySelector("ul");
        while (tabs.lastChild) tabs.removeChild(tabs.lastChild);

        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);
            tabs.lastChild.onclick = (e) => {
                if (! this.hasOwnProperty("player")) return;
                this.player.cuePlaylist(this.toPages()[e.currentTarget.dataset.page])
            }
        }
    },

    findPost: function() {
        if (this.isEmpty()) return;
        if (! this.player.hasOwnProperty("track")) return;
    
        const postId = findKey(this.posts, this.player.track);
        document.getElementById((is4chan ? "pc" : "p") + postId).scrollIntoView();

        function findKey(object, key) {
            for (const k in object) {
                for (const a of object[k]) {
                    if (a.includes(key)) return k
                }
            }
        }
    },

    updatePlayer: function() {
        if (! this.hasOwnProperty("player")) return;
        if (! this.player.hasOwnProperty("track")) return;

        const pages = this.toPages();
        const page = pages.findIndex(p => p.includes(this.player.track));

        if (page > -1) {
            const index = pages[page].indexOf(this.player.track),
                trackLength = this.player.getDuration(),
                trackTime = this.player.getCurrentTime(),
                endTrack = trackTime === trackLength && trackLength > 0,
                endPlaylist = index === 199;

            const nextPage = endPlaylist && endTrack && page < pages.length - 1 ? page + 1 : page, 
                nextIndex = ! endPlaylist && endTrack ? index + 1 : index;

            if (this.player.playing) {
                this.player.loadPlaylist(pages[nextPage], nextIndex);
                console.debug("loadPlaylist()");
            } else {
                const start = trackTime < trackLength ? trackTime : null;
                this.player.cuePlaylist(pages[nextPage], nextIndex, start);
                console.debug("cuePlaylist()");
            }
        } else {
            console.debug("Can't find last played track in the playlist. Resetting to first page..");
            if (this.player.playing) {
                this.player.loadPlaylist(pages[0]);
            } else {
                this.player.cuePlaylist(pages[0]);
            }
        }

        const tabs = document.getElementById("playlist-embed").querySelector(".tabs");
        if (tabs.children.length !== pages.length) this.makeTabs(pages.length);
    },

    html: {
        dialog: "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>",

        toggle: {
            fourchan: "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a class=\" disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 512 512\"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill=\"currentColor\" d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\"/></svg></a></span>",
            warosu: "[ <a id=\"shortcut-playlist\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">playlist</a> ]"
        }
    },

    css: {
        default: "#playlist-embed{position:fixed;padding:1px 4px 1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 0.25em}#playlist-embed .move{flex:1}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}",
        fourchan: ":root:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px;}",
        warosu: ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow: 0 1px 2px rgba(0, 0, 0, .15);}#playlist-embed a{text-decoration:none;}#playlist-embed .move{cursor:move;}"
    },

    regex: /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g

});

document.addEventListener("4chanXInitFinished", () => {

    // HTML+CSS

    document.body.insertAdjacentHTML("beforeend", playlist.html.dialog);
    document.getElementById("shortcut-qr").insertAdjacentHTML("beforebegin", playlist.html.toggle.fourchan);
    document.head.insertAdjacentHTML("beforeend", "<style>" + playlist.css.default + playlist.css.fourchan + "</style>");
    initDialog(GM_getValue("4chanDialogCoord", defaultHeaderOffset()));

    // Playlist init

    const [board, id] = window.location.pathname.slice(1).split("/thread/");
    
    fetch("https://a.4cdn.org/" + board + "/thread/" + id + ".json")
    .then(res => res.json()).then(thread => {
        playlist.init(thread.posts.map(p => [p.no, p.com || ""]));
    });

    document.addEventListener("ThreadUpdate", (e) => {
        if (e.detail[404]) return;

        Promise.allSettled([
            new Promise((ok, abort) => {
                if (e.detail.newPosts.length < 1) return abort();

                const newPosts = e.detail.newPosts.map(fullId => {
                    const postId = fullId.split(".").pop();
                    return [postId, document.getElementById("m" + postId).innerHTML]
                });
        
                playlist.checking = true;
                playlist.findLinks(newPosts).then(posts => {
                    posts.forEach(post => playlist.addPost(post));
                    playlist.checking = false;
                    if (! playlist.hasOwnProperty("player")) return ok();
                    if (posts.length > 0) playlist.player.needsUpdate = true;

                    return ok()
                })
            }),
            new Promise((ok, abort) => {
                if (e.detail.deletedPosts.length < 1) return abort();

                e.detail.deletedPosts.forEach(fullId => {
                    const postId = fullId.split(".").pop();
                    if (! postId in playlist.posts) return;
                    delete playlist.posts[postId];
                    if (! playlist.hasOwnProperty("player")) return;
                    playlist.player.needsUpdate = true;
                });

                return ok()
            })
        ])
        .then(() => {
            if (! playlist.hasOwnProperty("player")) return;
            if (! playlist.player.needsUpdate) return;
            if (playlist.player.playing) return;
            playlist.updatePlayer();
            playlist.player.needsUpdate = false;
        })
    });

    function defaultHeaderOffset() {
        const offsets = ["0px", "0px", "", ""];

        const header = document.getElementById("header-bar");
        const headerTop = header.getBoundingClientRect().y;
        const headerOffset = header.offsetHeight;

        if ( document.documentElement.classList.contains("fixed") && 
            ! document.documentElement.classList.contains("autohide") ) {
            if (headerTop < headerOffset) offsets[0] = headerOffset + "px";
        }

        return offsets
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (is4chan) return;

    // HTML+CSS

    document.body.insertAdjacentHTML("beforeend", playlist.html.dialog);
    document.querySelector(".motd").insertAdjacentHTML("beforebegin", playlist.html.toggle.warosu);
    document.head.insertAdjacentHTML("beforeend", "<style>" + playlist.css.default + playlist.css.warosu + "</style>");
    initDialog(["0px", "0px", "", ""]);

    // Playlist init
    playlist.init([...document.querySelectorAll(".comment blockquote")]
        .map(node => [node.parentNode.id.slice(1), node.innerHTML]));
});

unsafeWindow.onYouTubeIframeAPIReady = onAPIReady;

// Functions

function initDialog(coordinates) {
    playlist.dialog = document.getElementById("playlist-embed");
    playlist.toggle = document.getElementById("shortcut-playlist");

    if (is4chan) {
        playlist.toggle = playlist.toggle.querySelector("a");
    }

    coordinates.forEach((value, index) => {
        if (value == "") return;

        switch(index) {
            case 0:
                playlist.dialog.style.top = value;
                break;
            case 1:
                playlist.dialog.style.right = value;
                break;
            case 2:
                playlist.dialog.style.bottom = value;
                break;
            case 3:
                playlist.dialog.style.left = value;
                break;
        }
    });

    playlist.toggle.onclick = toggleDialog;
    document.addEventListener("mouseup", toggleDialogDrag);
    playlist.dialog.querySelector(".move").onmousedown = toggleDialogDrag;
    playlist.dialog.querySelector(".jump").onclick = () => { playlist.findPost() };
    playlist.dialog.querySelector(".close").onclick = () => {
        playlist.dialog.classList.add("hide");
        playlist.toggle.classList.add("disabled");
    };
}

function toggleDialog(e) {
    if (playlist.checking) return;
    if (playlist.isEmpty()) return;
    if (! playlist.hasOwnProperty("player")) return initAPI();

    if (playlist.dialog.classList.contains("hide")) {
        playlist.dialog.classList.remove("hide");
        e.currentTarget.classList.remove("disabled");
    } else {
        playlist.dialog.classList.add("hide");
        e.currentTarget.classList.add("disabled");
    }
}

function toggleDialogDrag(e) {
    switch(e.type) {
        case "mouseup":
            if (! playlist.dialog.classList.contains("dragging")) return;

            playlist.dialog.classList.remove("dragging");
            document.removeEventListener("mousemove", moveDialog);
            GM_setValue(
                is4chan ? "4chanDialogCoord" : "warosuDialogCoord", 
                [
                    playlist.dialog.style.top, 
                    playlist.dialog.style.right, 
                    playlist.dialog.style.bottom, 
                    playlist.dialog.style.left
                ]
            );
            break;

        case "mousedown":
            if (e.button !== 0) return;

            e.preventDefault(); // avoid selection while dragging
            
            const rect = playlist.dialog.getBoundingClientRect();

            playlist.dialog.size = [rect.width, rect.height];
            playlist.dialog.cursorOffset = [e.x - rect.x, e.y - rect.y];

            if (is4chan) {
                const header = document.getElementById("header-bar");
                playlist.dialog.headerTop = header.getBoundingClientRect().y;
                playlist.dialog.headerOffset = header.offsetHeight;
            }

            playlist.dialog.classList.add("dragging");
            document.addEventListener("mousemove", moveDialog);
    }
}

function moveDialog(e) {
    e.preventDefault(); // avoid selection while dragging

    const sW = document.documentElement.clientWidth,
        sH = document.documentElement.clientHeight,
        x = e.x - playlist.dialog.cursorOffset[0],
        y = e.y - playlist.dialog.cursorOffset[1],
        w = playlist.dialog.size[0],
        h = playlist.dialog.size[1],
        maxX = sW - w;

    let minY = 0, maxY = sH - h;

    if ( is4chan && document.documentElement.classList.contains("fixed") && 
        ! document.documentElement.classList.contains("autohide") ) {
        if (playlist.dialog.headerTop < playlist.dialog.headerOffset) {
            minY += playlist.dialog.headerOffset;
        } else {
            maxY -= playlist.dialog.headerOffset;
        }
    }

    if (y > maxY) {
        playlist.dialog.style.bottom = 0 + "px";
        playlist.dialog.style.removeProperty("top");
    } else {
        playlist.dialog.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
        playlist.dialog.style.removeProperty("bottom");
    }
    
    if (x > maxX) {
        playlist.dialog.style.right = 0 + "px";
        playlist.dialog.style.removeProperty("left");
    } else {
        playlist.dialog.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
        playlist.dialog.style.removeProperty("right");
    }
}

function initAPI() {
    if (playlist.dead) return failedLoad();
    if (playlist.hasOwnProperty("player")) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);

    script.onerror = () => { failedLoad(); playlist.dead = true; };

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
            "  @@||www.youtube.com/s/player/*$script,domain=4chan.org\n"
        )
    }
}

function onAPIReady() {

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
        e.target.track = "";
        e.target.playing = false;
        e.target.needsUpdate = false;

        const pages = playlist.toPages();
        playlist.makeTabs(pages.length);
        e.target.cuePlaylist(pages[0]);

        playlist.dialog.classList.remove("hide");
        playlist.toggle.classList.remove("disabled");
    }

    function updateTrack(e) {
        console.debug(e.data);

        if (e.data == 0) {
            // If playlist ended

            const pages = playlist.toPages();
            const page = pages.findIndex(p => p.includes(this.player.track));

            if (page > -1 && page < pages.length - 1) e.target.loadPlaylist(pages[page + 1]);
        } else if (e.data == -1) {
            // If track ended or next is loaded

            e.target.track = e.target.getVideoUrl().split("=").pop();  

            // Due to a change to when state 0 is returned, update playlist
            // attempts must now also happen when the next track is loaded
            if (e.target.needsUpdate) playlist.updatePlayer();
        }

        // This has to stay at the bottom or it will mess with prev isPlaying checks
        e.target.playing = (e.data == 1 || e.data == 3) ? true : false;
    }

    function playbackError(e) {
        let errLvl, errMsg;

        const index = e.target.getPlaylistIndex();
        const length = e.target.getPlaylist().length;

        switch(+e.data) {
            case 5:
            case 100:
            case 101:
            case 150:
                if (index + 1 < length) { e.target.nextVideo() };
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
        };

        const output = "Error - Video #" + (index + 1) + "\n" + errMsg;
        document.dispatchEvent(new CustomEvent("CreateNotification", {
            detail: { type: errLvl, content: output, lifetime: 10 }
        }));
    }

}

// -- Debug

unsafeWindow.deadLinks = function() {
    return Object.keys(playlist.posts).reduce((posts, id) => {
        return playlist.posts[id].some(v => !v[1]) ? { ...posts, [id]: playlist.posts[id].filter(v => !v[1]) } : posts
    }, {})
}