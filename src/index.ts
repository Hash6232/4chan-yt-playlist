import { Playlist } from "./playlist";

const playlist = new Playlist();

document.addEventListener("DOMContentLoaded", () => {
    // Link dialog events to playlist
    
    const move = playlist.dialog?.node?.querySelector(".move") as HTMLElement | null;
    const jump = playlist.dialog?.node?.querySelector(".jump") as HTMLElement | null;
    const close = playlist.dialog?.node?.querySelector(".close") as HTMLElement | null;

    move?.addEventListener("mousedown", toggleDrag);
    jump?.addEventListener("click", () => { playlist.findPost(playlist.track)?.scrollIntoView() });
    close?.addEventListener("click", () => { playlist.dialog?.close()})

    document.addEventListener("mouseup", toggleDrag);

    playlist.dialog?.node?.querySelector("ul")?.addEventListener("click", (e) => {
        if (! playlist.player) return;
        if (! e.target || (e.target as HTMLElement).tagName !== "A") return;
        const index = (e.target as HTMLElement).dataset.page || "0";
        playlist.player.cuePlaylist(playlist.toPages()[parseInt(index)])
    });

    document.head.insertAdjacentHTML("beforeend", "<style>" + "#playlist-embed{position:fixed;padding:1px 4px 1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 0.25em}#playlist-embed .move{flex:1}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}" + (location.hostname === "boards.4chan.org" ? ":root:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px;}" : ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow: 0 1px 2px rgba(0, 0, 0, .15);}#playlist-embed a{text-decoration:none;}#playlist-embed .move{cursor:move;}") + "</style>");

    function toggleDrag(e: MouseEvent) {

        if (! playlist.dialog || ! playlist.dialog.node) return;
    
        switch(e.type) {
            case "mouseup":
                if (! playlist.dialog.node.classList.contains("dragging")) return;
    
                playlist.dialog.node.classList.remove("dragging");
                document.removeEventListener("mousemove", moveDialog);

                let key: string;
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
                if (e.button !== 0) return;
    
                e.preventDefault(); // avoid selection while dragging
                
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
    
    function moveDialog(e: MouseEvent) {
    
        if (! playlist.dialog || ! playlist.dialog.node) return;
    
        e.preventDefault(); // avoid selection while dragging
    
        const sW = document.documentElement.clientWidth,
            sH = document.documentElement.clientHeight,
            x = e.x - playlist.dialog.cursorPos[0],
            y = e.y - playlist.dialog.cursorPos[1],
            w = playlist.dialog.size[0],
            h = playlist.dialog.size[1],
            maxX = sW - w;
    
        let minY = 0, maxY = sH - h;
    
        if (document.getElementById("header-bar")) {
            const fixed = playlist.dialog.header[2];
            const autohide = playlist.dialog.header[3];

            if (fixed && ! autohide) {
                if (playlist.dialog.header[0] < playlist.dialog.header[1]) {
                    minY += playlist.dialog.header[1];
                } else {
                    maxY -= playlist.dialog.header[1];
                }
            }
        }
    
        if (y > maxY) {
            playlist.dialog.node.style.bottom = 0 + "px";
            playlist.dialog.node.style.removeProperty("top");
        } else {
            playlist.dialog.node.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
            playlist.dialog.node.style.removeProperty("bottom");
        }
        
        if (x > maxX) {
            playlist.dialog.node.style.right = 0 + "px";
            playlist.dialog.node.style.removeProperty("left");
        } else {
            playlist.dialog.node.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
            playlist.dialog.node.style.removeProperty("right");
        }
    
    }
});

document.addEventListener("4chanXInitFinished", () => {
    document.addEventListener("ThreadUpdate", ((e: CustomEvent) => {
        if (e.detail[404]) return;

        Promise.allSettled([

            new Promise<void>((ok, abort) => {
                if (e.detail.newPosts.length < 1) return abort();

                const newPosts: [ no: string, com: string ][] = e.detail.newPosts.map((fullId: string) => {
                    const no = fullId.split(".").pop() || "";
                    return [ no, document.getElementById("m" + no)?.innerHTML || "" ]
                });
        
                playlist.checking = true;

                playlist.parsePosts(newPosts).then((addedPosts) => {
                    if (! playlist.player) return abort();
                    if (addedPosts > 0) playlist.mutated = true;
                    return ok()
                })
            }),

            new Promise<void>((ok, abort) => {
                if (e.detail.deletedPosts.length < 1) return abort();

                e.detail.deletedPosts.forEach((fullId: string) => {
                    const postId = fullId.split(".").pop();
                    if (! postId || ! (postId in playlist.posts)) return;
                    delete playlist.posts[postId];
                    if (! playlist.player) return;
                    playlist.mutated = true;
                });

                return ok()
            })

        ])
        .finally(() => {
            if (! playlist.mutated || playlist.playing) return;
            playlist.updatePlayer();
        })
    }) as EventListener);
});

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
    }
}

unsafeWindow.onYouTubeIframeAPIReady = () => {

    type TracksHistory = {
        [key: string]: string
    }

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
        playlist.mutated = false;
    
        const pages = playlist.toPages();
        playlist.dialog?.updateTabs(pages.length);
    
        const key = location.hostname === "boards.4chan.org" ? "4chan Last Played" : "Warosu Last Played";
        const no = window.location.pathname.split("/").pop() || "";
        const track = GM_getValue(key, {} as TracksHistory)[no] || undefined;
        const page = track ? pages.find(p => p.includes(track)) : pages[0];
    
        if (track && page) {
            e.target.cuePlaylist(page, page.indexOf(track))
        } else {
            e.target.cuePlaylist(pages[0])
        }
    
        playlist.dialog?.node?.classList.remove("hide");
        playlist.dialog?.toggle?.classList.remove("disabled");

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
            const key = location.hostname === "boards.4chan.org" ? "4chan Last Played" : "Warosu Last Played";
            const cachedTracks = GM_getValue(key, {} as TracksHistory);
    
            // Apply changes to snapshot using current thread as key
            playlist.track = e.target.getVideoUrl().split("=").pop() || "";
            const no = window.location.pathname.split("/").pop() || "";
            cachedTracks[no] = playlist.track;
    
            // Overwrite history in the storage with the modified snapshot
            GM_setValue(key, cachedTracks);
    
            // Due to a change to when state 0 is returned, update playlist
            // attempts must now also happen when the next track is loaded
            if (playlist.mutated) playlist.updatePlayer();
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

};