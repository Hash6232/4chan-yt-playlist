import { C } from "./config";
import { Playlist } from "./playlist";

const playlist = new Playlist();

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

    function initPlaylist(e: YT.PlayerEvent) {

        playlist.state = 0;
    
        const pages = playlist.toPages();
        playlist.dialog?.updateTabs(pages.length);

        let history: { [key: string]: string } = {};
        try {
            history = JSON.parse(localStorage.getItem("4chan-yt-playlist-history") || "{}");
        } catch (err) { console.error("Failed to parse playlist history from local storage"); console.error(err); };
        
        const lastPlayedTrack = history[C.board + "." + C.thread] || null;
        const lastPage = lastPlayedTrack ? pages.find(p => p.includes(lastPlayedTrack)) : null;
    
        if (lastPlayedTrack && lastPage) {
            e.target.cuePlaylist(lastPage, lastPage.indexOf(lastPlayedTrack))
        } else {
            e.target.cuePlaylist(pages[0])
        }

        playlist.dialog?.toggle();

    };
    
    function updateTrack(e: YT.OnStateChangeEvent) {
    
        if (e.data == 0) { // If playlist ended
            
            const pages = playlist.toPages();
            const page = pages.findIndex(p => p.includes(playlist.track));
    
            if (page > -1 && page < pages.length - 1) e.target.loadPlaylist(pages[page + 1]);

        } else if (e.data == -1) { // If track ended or next is loaded

            // Save last played track
            playlist.track = e.target.getVideoUrl().split("=").pop() || "";
            
            let history: { [key: string]: string } = {};
            try {
                history = JSON.parse(localStorage.getItem("4chan-yt-playlist-history") || "{}");
                history[C.board + "." + C.thread] = playlist.track;
            } catch (err) { console.error("Failed to parse playlist history from local storage"); console.error(err); };
            
            localStorage.setItem("4chan-yt-playlist-history", JSON.stringify(history));
    
            // Due to a change to when state 0 is returned, update playlist
            // attempts must now also happen when the next track is loaded
            if (playlist.mutated) playlist.updatePlayer();

        }
    
        // This has to stay at the bottom or it will mess with prev isPlaying checks
        playlist.playing = (e.data == 1 || e.data == 3) ? true : false;
    
    };
    
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

        if (C.fourchanX) {
            document.dispatchEvent(new CustomEvent("CreateNotification", {
                detail: { type: errLvl, content: output, lifetime: 10 }
            }));
        } else {
            switch(errLvl) {
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

    };

};

document.addEventListener("DOMContentLoaded", () => {

    let css = "#playlist-embed{position:fixed;padding:1px 4px}#playlist-embed.hide{display:none}#playlist-embed>div:first-child{display:flex}#playlist-embed ul,#playlist-embed li{margin:0;padding:0}#playlist-embed li{display:inline-block;list-style-type:none}#playlist-embed li:not(:only-of-type):not(:last-of-type)::after{content:'•';margin:0 .25em}#playlist-embed .move{flex:1;cursor:move}#playlist-embed .jump{margin-top:-1px}#playlist-embed .close{margin-left:4px}";

    switch (true) {
        case C.fourchan:
            const currentStyle = getComputedStyle(document.querySelector(".post.reply") as HTMLElement);
            css += `:root.fourchan-x:not(.fourchan-xt) #shortcut-playlist .icon{height:15px;width:16px;margin-bottom:-3px}:root:not(.fourchan-x) .dialog{background-color:${currentStyle["backgroundColor"]};border:1px solid ${currentStyle["borderRightColor"]};box-shadow:0 1px 2px rgba(0,0,0,.15)}`;
            break;

        case C.warosu:
            css += ".dialog{background-color:var(--darker-background-color);border:1px solid var(--even-darker-background-color);box-shadow:0 1px 2px rgba(0,0,0,.15)}#playlist-embed a{text-decoration:none}";
            break;
    }

    document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>");

});