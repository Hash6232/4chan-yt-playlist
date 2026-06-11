import C from "../config";
import { Dialog } from "./dialog";
import { Playlist } from "./playlist";
import {
    extractId,
    loadHistory,
    saveHistory,
    printError,
    printWarning,
} from "../utils";

// prettier-ignore
const YTPlayerError = {
    InvalidParam:         2  as YT.PlayerError,
    Html5Error:           5  as YT.PlayerError,
    VideoNotFound:        100 as YT.PlayerError,
    EmbeddingNotAllowed:  101 as YT.PlayerError,
    EmbeddingNotAllowed2: 150 as YT.PlayerError,
};

const enum ErrorMessages {
    FAILED_TO_LOAD = "Unable to load YouTube Iframe API.\nPress F12 and follow the instructions in the console.",
    FAILED_TO_LOAD_CONSOLE = "Unable to load YouTube Iframe API\n\n4chanX's Settings > Advanced > Javascript Whitelist\n\n\thttps://www.youtube.com/iframe_api\n\thttps://www.youtube.com/s/player/\n\nFilters in your AdBlock extension\n\n\t@@||www.youtube.com/iframe_api$script,domain=4chan.org|warosu.org\n\t@@||www.youtube.com/s/player/*$script,domain=4chan.org|warosu.org",
    API_NO_EMBEDS = "The owner of the requested video does not allow it to be played in embedded players.",
    API_INVALID_ID = "The request contains an invalid parameter value.",
    API_NO_HTML5 = "The requested content cannot be played in an HTML5 player.",
    API_NOT_FOUND = "The video has been removed or marked as private.",
    MEMBERS_ONLY = "The video cannot be played because it's members-only content.",
    ALL_DEAD = "All videos in playlist are unavailable.",
}

class Player {
    private apiInit: boolean = false;
    private apiFail: boolean = false;

    private dialog: Dialog;
    private playlist: Playlist | undefined;
    private player: YT.Player | undefined;
    private consecutiveErrors = 0;

    constructor(parent: Dialog) {
        this.dialog = parent;
    }

    get isAPIInitialized() {
        return this.apiInit;
    }

    play(track?: string) {
        if (typeof track === "string") {
            this.player?.loadVideoById(track);
        }
    }

    prev() {
        if (!this.playlist) return;

        const tracks = this.playlist.tracks;
        if (!tracks || tracks.length === 0) return;

        const track = this.playlist.findTrackById(this.playlist.track);
        if (!track) return this.play(tracks[0].id);

        const idx = tracks.indexOf(track);
        const prevIndex = idx > 0 ? idx - 1 : tracks.length - 1;
        if (idx > 0 || this.playlist.looping) {
            this.play(tracks[prevIndex].id);
        }
    }

    next() {
        if (!this.playlist) return;

        const tracks = this.playlist.tracks;
        if (!tracks || tracks.length === 0) return;

        const track = this.playlist.findTrackById(this.playlist.track);
        if (!track) return this.play(tracks[0].id);

        const idx = tracks.indexOf(track);
        const nextIndex = idx < tracks.length - 1 ? idx + 1 : 0;
        if (idx < tracks.length - 1 || this.playlist.looping) {
            this.play(tracks[nextIndex].id);
        }
    }

    injectAPI() {
        if (this.apiInit || !this.playlist) return;

        const tracks = this.playlist.tracks;
        if (!tracks || tracks.length === 0) return;

        // Fallback to first track of the playlist
        if (!this.playlist.track) this.playlist.track = tracks[0].id;

        const initPlayer = () => {
            this.player = new YT.Player("youtube-player", {
                width: "640",
                height: "360",
                videoId: this.playlist?.track,
                playerVars: { fs: 0, disablekb: 1, rel: 0 },
                events: {
                    onReady: this.handlePlayerReady,
                    onStateChange: this.handleTrackUpdate,
                    onError: this.handlePlaybackError,
                },
            });
        };

        const errorNotification = () => {
            printError(ErrorMessages.FAILED_TO_LOAD, true);
            console.log(ErrorMessages.FAILED_TO_LOAD_CONSOLE);
        };

        if (this.apiFail) return errorNotification();

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";

        unsafeWindow.onYouTubeIframeAPIReady = () => {
            initPlayer();
            this.apiInit = true;
        };

        script.onerror = () => {
            this.apiFail = true;
            errorNotification();
        };

        document.head.appendChild(script);
    }

    setPlaylist(input: Playlist) {
        this.playlist = input;
    }

    private handlePlayerReady = async (e: YT.PlayerEvent) => {
        const videoId = extractId(e.target.getVideoUrl());
        if (videoId) this.setTrack(videoId);

        this.dialog.toggle();
        this.playlist?.update();
    };

    private handleTrackUpdate = (e: YT.OnStateChangeEvent) => {
        // If video has finished playing
        if (e.data === YT.PlayerState.ENDED) {
            this.next();
        }

        // If video is unplayable (e.g. Membership-only video)
        if (
            e.data === YT.PlayerState.UNSTARTED &&
            this.isUnplayableVideo(e.target)
        ) {
            const output = this.formatPlaybackError(ErrorMessages.MEMBERS_ONLY);
            printWarning(output, true);
            this.next();
        }

        // If a track is played
        if (e.data === YT.PlayerState.BUFFERING) {
            this.consecutiveErrors = 0;

            // Update current track
            const videoId = extractId(e.target.getVideoUrl());
            if (!videoId) return;
            this.setTrack(videoId);

            // Fetch titles around current track
            this.playlist?.prefetchTitles();
        }
    };

    private isUnplayableVideo(player: YT.Player): boolean {
        return !player.playerInfo.progressState.allowSeeking;
    }

    private setTrack(videoId: string) {
        if (!this.playlist) return;

        this.playlist.track = videoId;
        const history = loadHistory() ?? {};
        history[C.threadFullId] = videoId;
        saveHistory(history);

        // Highlight current track in the playlist
        const track = this.playlist.findTrackById(videoId);
        if (track) this.playlist.setActiveTrack(videoId);
    }

    private handlePlaybackError = (e: YT.OnErrorEvent) => {
        if (!this.playlist) return;

        let errLvl = "";
        let errMsg = "";

        switch (e.data) {
            case YTPlayerError.InvalidParam:
                errLvl = "error";
                errMsg = ErrorMessages.API_INVALID_ID;
                break;

            case YTPlayerError.Html5Error:
                errLvl = "error";
                errMsg = ErrorMessages.API_NO_HTML5;
                break;

            case YTPlayerError.VideoNotFound:
                errLvl = "warning";
                errMsg = ErrorMessages.API_NOT_FOUND;
                break;

            case YTPlayerError.EmbeddingNotAllowed:
            case YTPlayerError.EmbeddingNotAllowed2:
                errLvl = "warning";
                errMsg = ErrorMessages.API_NO_EMBEDS;
                break;
        }

        const output = this.formatPlaybackError(errMsg);

        if (errLvl === "warning") printWarning(output, true);
        if (errLvl === "error") printError(output, true);

        this.consecutiveErrors++;
        const trackCount = this.playlist.tracks.length ?? 0;

        if (this.consecutiveErrors >= trackCount) {
            printWarning(ErrorMessages.ALL_DEAD, true);
            return;
        }

        // Attempt to play next track
        this.next();
    };

    private formatPlaybackError(errMsg: string) {
        const tracks = this.playlist?.tracks;
        const track = this.playlist?.findTrackById(this.playlist.track);
        const index = tracks && track ? tracks.indexOf(track) + 1 : "??";
        return "Error - Video #" + index + "\n" + errMsg;
    }
}

export { Player };
