import { Playlist } from "./playlist";
import { Dialog } from "./dialog";

const playlist = new Playlist();

document.addEventListener("DOMContentLoaded", () => {

    if (location.hostname === "warosu.org") playlist.dialog = new Dialog(playlist);

    document.head.insertAdjacentHTML("beforeend", "<style>" + "#playlist-embed{position:fixed;padding:1px 4px 1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 0.25em}#playlist-embed .move{flex:1}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}" + (location.hostname === "boards.4chan.org" ? ":root:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px;}" : ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow: 0 1px 2px rgba(0, 0, 0, .15);}#playlist-embed a{text-decoration:none;}#playlist-embed .move{cursor:move;}") + "</style>");

});

document.addEventListener("4chanXInitFinished", () => {

    playlist.dialog = new Dialog(playlist);

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

        playlist.state = 0;
    
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

        playlist.dialog?.toggle();

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