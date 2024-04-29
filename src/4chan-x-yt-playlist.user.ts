type Video = [
    id: string,
    status: boolean
]

type Posts = {
    [key: string]: Video[]
}

type Coordinates = [
    top: string,
    right: string,
    bottom: string,
    left: string
]

type TracksHistory = {
    [key: string]: string
}

const isFourchan = location.hostname === "boards.4chan.org";

const [board, no] = window.location.pathname.slice(1).split("/thread/");

const playlist = {

    checking: false,
    needsUpdate: false,
    playing: false,
    dead: false,

    posts: {} as Posts,
    player: {} as YT.Player,

    track: "",

    dialog: {
        size: [0, 0],
        cursor: [0, 0],
        header: {
            y: 0,
            offset: 0
        }
    },

    checkLink: async function(id: string): Promise<Video> {
        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, {method: "HEAD"}).then(res => [id, res.ok])
    },

    parsePosts: async function(posts: [ no: string, com: string ][]) {

        const validPosts = posts.reduce((array: [ string, string[] ][], post) => {
            const comment = post[1].replace(/<wbr>/g, "");
            // Look for all YouTube links and return an array of unique video ids
            const ids = Array.from(new Set([...comment.matchAll(this.regex)].map(m => m[1])));
            if (ids.length > 0) array.push( [post[0], ids] );
            return array
        }, []);

        const checkedPosts: Promise<[ string, Video[] ]>[] = validPosts.map(async p => {
            return Promise.allSettled(p[1].map(l => this.checkLink(l)))
            .then(responses => [ p[0], responses.reduce((output: Video[], res) => {
                if (res.status === "fulfilled") output.push(res.value);
                return output
            }, []) ] )
        });

        return Promise.allSettled(checkedPosts).then(responses => {
            return responses.reduce((output: [ string, Video[] ][], res) => {
                if (res.status === "fulfilled") output.push(res.value);
                return output
            }, [])
        })

    },

    isEmpty: function() {
        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
      
        return true
    },

    toPages: function() {
        const output: string[][] = [];

        const ids = Object.values(this.posts).flatMap((post) => {
            return post.reduce((validLinks: string[], link) => {
                if (link[1] && ! validLinks.includes(link[0]))
                    validLinks.push(link[0]);
                return validLinks
            }, [])
        });

        for (let i = 0; i < ids.length; i += 199) {
            const chunk = ids.slice(i, i + 199);
            output.push(chunk);
        }

        return output
    },

    updatePlayer: function() {
        if (! this.player.hasOwnProperty("g")) return;

        const pages: string[][] = this.toPages();
        const page = pages.findIndex(p => p.includes(this.track));

        if (page > -1) {
            const index = pages[page].indexOf(this.track),
                trackLength = this.player.getDuration(),
                trackTime = this.player.getCurrentTime(),
                endTrack = trackTime === trackLength && trackLength > 0,
                endPlaylist = index === 199;

            const nextPage = endPlaylist && endTrack && page < pages.length - 1 ? page + 1 : page, 
                nextIndex = ! endPlaylist && endTrack ? index + 1 : index;

            if (this.playing) {
                this.player.loadPlaylist(pages[nextPage], nextIndex);
                console.debug("loadPlaylist()");
            } else {
                const start = trackTime < trackLength ? trackTime : undefined;
                this.player.cuePlaylist(pages[nextPage], nextIndex, start);
                console.debug("cuePlaylist()");
            }
        } else {
            console.debug("Can't find last played track in the playlist. Resetting to first page..");
            if (this.playing) {
                this.player.loadPlaylist(pages[0]);
            } else {
                this.player.cuePlaylist(pages[0]);
            }
        }

        const tabs = document.getElementById("playlist-embed")?.querySelector(".tabs");
        if (tabs && tabs.children.length !== pages.length) this.makeTabs(pages.length);

        this.needsUpdate = false;
    },

    makeTabs: function(amount: number) {
        const tabs = document.getElementById("playlist-embed")?.querySelector("ul");

        if (! tabs) return;

        while (tabs.lastChild) tabs.removeChild(tabs.lastChild);

        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);

            if (! tabs.lastChild) return;

            const page: HTMLLIElement | null = tabs.lastChild as HTMLLIElement;

            page.onclick = (e) => {
                if (! playlist.player.hasOwnProperty("g")) return;
                const page = (e.currentTarget as HTMLLIElement).querySelector("a")?.dataset.page || "0";
                playlist.player.cuePlaylist(playlist.toPages()[parseInt(page)])
            } 
        }
    },

    findPost: function() {
        const postId = findKey(playlist.posts, playlist.track);

        if (! postId) return;

        document.getElementById((isFourchan ? "pc" : "p") + postId)?.scrollIntoView();

        function findKey(object: Posts, key: string) {
            for (const k in object) {
                for (const a of object[k]) {
                    if (a.includes(key)) return k
                }
            }

            return null
        }
    },

    html: {
        dialog: "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>",

        toggle: {
            fourchan: "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a id=\"playlist-toggle\" class=\"disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 512 512\"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill=\"currentColor\" d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\"/></svg></a></span>",
            warosu: "[ <a id=\"playlist-toggle\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">playlist</a> ]"
        }
    },

    css: {
        default: "#playlist-embed{position:fixed;padding:1px 4px 1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 0.25em}#playlist-embed .move{flex:1}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}",
        fourchan: ":root:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px;}",
        warosu: ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow: 0 1px 2px rgba(0, 0, 0, .15);}#playlist-embed a{text-decoration:none;}#playlist-embed .move{cursor:move;}"
    },

    regex: /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g

}

document.addEventListener("4chanXInitFinished", () => {

    // HTML+CSS

    document.body.insertAdjacentHTML("beforeend", playlist.html.dialog);
    document.getElementById("shortcut-qr")?.insertAdjacentHTML("beforebegin", playlist.html.toggle.fourchan);
    document.head.insertAdjacentHTML("beforeend", "<style>" + playlist.css.default + playlist.css.fourchan + "</style>");
    initDialog(GM_getValue("4chan Dialog Coordinates", defaultCoordinates()));

    // Playlist

    fetch("https://a.4cdn.org/" + board + "/thread/" + no + ".json")
    .then(res => res.json()).then((thread: { posts: { no: number, com?: string }[] }) => {
        playlist.checking = true;
        const formattedPosts: [ string, string ][] = thread.posts.map(p => [ p.no.toString(), p.com || "" ]);
        playlist.parsePosts(formattedPosts).then(posts => {
            for (const post of posts) playlist.posts[post[0]] = post[1];
            playlist.checking = false;
            console.log(playlist);
        })
    });

    document.addEventListener("ThreadUpdate", ((e: CustomEvent) => {
        if (e.detail[404]) return;

        Promise.allSettled([
            new Promise<void>((ok, abort) => {
                if (e.detail.newPosts.length < 1) return abort();

                const newPosts: [ string, string ][] = e.detail.newPosts.map((fullId: string) => {
                    const postId = fullId.split(".").pop() || "";
                    const com = document.getElementById("m" + postId)?.innerHTML || "";
                    return [ postId, com ]
                });
        
                playlist.checking = true;

                playlist.parsePosts(newPosts).then(posts => {
                    for (const post of posts) playlist.posts[post[0]] = post[1];
                    playlist.checking = false;
                    if (! playlist.player.hasOwnProperty("g")) return abort();
                    if (posts.length > 0) playlist.needsUpdate = true;

                    return ok()
                })
            }),
            new Promise<void>((ok, abort) => {
                if (e.detail.deletedPosts.length < 1) return abort();

                e.detail.deletedPosts.forEach((fullId: string) => {
                    const postId = fullId.split(".").pop() || "";
                    if (! (postId in playlist.posts)) return;
                    delete playlist.posts[parseInt(postId)];
                    if (! playlist.player.hasOwnProperty("g")) return;
                    playlist.needsUpdate = true;
                });

                return ok()
            })
        ])
        .then(() => {
            if (! playlist.needsUpdate || playlist.playing) return;
            playlist.updatePlayer();
        })
    }) as EventListener);

    function defaultCoordinates() {
        const offsets: Coordinates = ["0px", "0px", "", ""];

        const header = document.getElementById("header-bar");
        const headerTop = header?.getBoundingClientRect().y || 0;
        const headerOffset = header?.offsetHeight || 0;

        if ( document.documentElement.classList.contains("fixed") && 
            ! document.documentElement.classList.contains("autohide") ) {
            if (headerTop < headerOffset) offsets[0] = headerOffset + "px";
        }

        return offsets
    }

})

document.addEventListener("DOMContentLoaded", () => {

    if (isFourchan) return;

    // HTML+CSS

    document.body.insertAdjacentHTML("beforeend", playlist.html.dialog);
    document.querySelector(".motd")?.insertAdjacentHTML("beforebegin", playlist.html.toggle.warosu);
    document.head.insertAdjacentHTML("beforeend", "<style>" + playlist.css.default + playlist.css.warosu + "</style>");
    initDialog(GM_getValue("Warosu Dialog Coordinates", ["0px", "0px", "", ""]));

    // Playlist init
    playlist.checking = true;
    const formattedPosts = [...document.querySelectorAll(".comment blockquote")]
    .reduce((output: [ string, string ][], node) => {
        const id = node.parentElement?.id.slice(1);
        if (id) output.push([ id, node.innerHTML ])
        return output
    }, []);
    playlist.parsePosts(formattedPosts).then(posts => {
        for (const post of posts) playlist.posts[post[0]] = post[1];
        playlist.checking = false;
    })

});

(unsafeWindow as any).onYouTubeIframeAPIReady = onAPIReady;

// Functions

function initDialog(coordinates: Coordinates) {

    const dialog = document.getElementById("playlist-embed");
    const toggle = document.getElementById("playlist-toggle");

    if (! dialog || ! toggle) return;

    coordinates.forEach((value, index) => {
        
        if (value === "") return;

        switch(index) {
            case 0:
                dialog.style.top = value;
                break;
            case 1:
                dialog.style.right = value;
                break;
            case 2:
                dialog.style.bottom = value;
                break;
            case 3:
                dialog.style.left = value;
                break;
        }
    });

    const move = dialog.querySelector(".move") as HTMLElement | null;
    const jump = dialog.querySelector(".jump") as HTMLElement | null;
    const close = dialog.querySelector(".close") as HTMLElement | null;
    
    if (! move || ! jump || ! close) return;

    toggle.onclick = toggleDialog;
    document.addEventListener("mouseup", toggleDialogDrag);
    move.onmousedown = toggleDialogDrag;
    jump.onclick = () => { playlist.findPost() };
    close.onclick = () => {
        const dialog = document.getElementById("playlist-embed");
        const toggle = document.getElementById("playlist-toggle");

        if (! dialog || ! toggle) return;

        dialog.classList.add("hide");
        toggle.classList.add("disabled");
    };

}

function toggleDialog() {

    if (playlist.checking || playlist.isEmpty()) return;
    if (! playlist.player.hasOwnProperty("g")) return initAPI();

    const dialog = document.getElementById("playlist-embed");
    const toggle = document.getElementById("playlist-toggle");

    if (! dialog || ! toggle) return;

    if (dialog.classList.contains("hide")) {
        dialog.classList.remove("hide");
        toggle.classList.remove("disabled");
    } else {
        dialog.classList.add("hide");
        toggle.classList.add("disabled");
    }

}

function toggleDialogDrag(e: MouseEvent) {

    const dialog = document.getElementById("playlist-embed");

    if (! dialog) return;

    switch(e.type) {
        case "mouseup":
            if (! dialog.classList.contains("dragging")) return;

            dialog.classList.remove("dragging");
            document.removeEventListener("mousemove", moveDialog);
            GM_setValue(
                isFourchan ? "4chan Dialog Coordinates" : "Warosu Dialog Coordinates", 
                [ dialog.style.top, dialog.style.right, dialog.style.bottom, dialog.style.left ]
            );

            break;

        case "mousedown":
            if (e.button !== 0) return;

            e.preventDefault(); // avoid selection while dragging

            // const dialog = document.getElementById("playlist-embed");

            if (! dialog) return;
            
            const rect = dialog.getBoundingClientRect();

            playlist.dialog.size = [rect.width, rect.height];
            playlist.dialog.cursor = [e.x - rect.x, e.y - rect.y];

            if (isFourchan) {
                const header = document.getElementById("header-bar");
                playlist.dialog.header.y = header?.getBoundingClientRect().y || 0;
                playlist.dialog.header.offset = header?.offsetHeight || 0;
            }

            dialog.classList.add("dragging");
            document.addEventListener("mousemove", moveDialog);

            break;
    }

}

function moveDialog(e: MouseEvent) {

    e.preventDefault(); // avoid selection while dragging

    const dialog = document.getElementById("playlist-embed");

    if (! dialog) return;

    const sW = document.documentElement.clientWidth,
        sH = document.documentElement.clientHeight,
        x = e.x - playlist.dialog.cursor[0],
        y = e.y - playlist.dialog.cursor[1],
        w = playlist.dialog.size[0],
        h = playlist.dialog.size[1],
        maxX = sW - w;

    let minY = 0, maxY = sH - h;

    if ( isFourchan && document.documentElement.classList.contains("fixed") && 
        ! document.documentElement.classList.contains("autohide") ) {
        if (playlist.dialog.header.y < playlist.dialog.header.offset) {
            minY += playlist.dialog.header.offset;
        } else {
            maxY -= playlist.dialog.header.offset;
        }
    }

    if (y > maxY) {
        dialog.style.bottom = 0 + "px";
        dialog.style.removeProperty("top");
    } else {
        dialog.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
        dialog.style.removeProperty("bottom");
    }
    
    if (x > maxX) {
        dialog.style.right = 0 + "px";
        dialog.style.removeProperty("left");
    } else {
        dialog.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
        dialog.style.removeProperty("right");
    }

}

function initAPI() {

    if (playlist.dead) return failedLoad();
    if (playlist.player.hasOwnProperty("g")) return;

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

    function initPlaylist(e: YT.PlayerEvent) {

        playlist.track = "";
        playlist.playing = false;
        playlist.needsUpdate = false;

        const pages = playlist.toPages();
        playlist.makeTabs(pages.length);

        const track = GM_getValue(isFourchan ? "4chan Last Played" : "Warosu Last Played", {} as TracksHistory)[no] || undefined;
        const page = track ? pages.find(p => p.includes(track)) : pages[0];

        if (track && page) {
            e.target.cuePlaylist(page, page.indexOf(track))
        } else {
            e.target.cuePlaylist(pages[0])
        }

        const dialog = document.getElementById("playlist-embed");
        const toggle = document.getElementById("playlist-toggle");

        if (! dialog || ! toggle) return;

        dialog.classList.remove("hide");
        toggle.classList.remove("disabled");

    }

    function updateTrack(e: YT.OnStateChangeEvent) {

        if (e.data == 0) {
            // If playlist ended

            const pages = playlist.toPages();
            const page = pages.findIndex(p => p.includes(playlist.track));

            if (page > -1 && page < pages.length - 1) e.target.loadPlaylist(pages[page + 1]);
        } else if (e.data == -1) {
            // If track ended or next is loaded

            // Retrive snapshot of the cached history for the relevant image board
            const cachedTracks = GM_getValue(isFourchan ? "4chan Last Played" : "Warosu Last Played", {} as TracksHistory);

            // Apply changes to snapshot using current thread as key
            playlist.track = e.target.getVideoUrl().split("=").pop() || "";
            cachedTracks[no] = playlist.track;

            // Overwrite history in the storage with the modified snapshot
            GM_setValue(isFourchan ? "4chan Last Played" : "Warosu Last Played", cachedTracks);

            // Due to a change to when state 0 is returned, update playlist
            // attempts must now also happen when the next track is loaded
            if (playlist.needsUpdate) playlist.updatePlayer();
        }

        // This has to stay at the bottom or it will mess with prev isPlaying checks
        playlist.playing = (e.data == 1 || e.data == 3) ? true : false;

    }

    function playbackError(e: YT.OnErrorEvent) {

        let errLvl = "", errMsg = "";

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