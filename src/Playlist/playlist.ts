import C from "../config";
import { Dialog } from "./dialog";
import { Player } from "./player";
import { getVideos } from "../Thread/posts";
import { getTitleById, loadHistory, YOUTUBE_VIDEO_ID_REGEX } from "../utils";
import type { Video } from "../types";

class Playlist {
    private display: boolean = false;
    private _looping: boolean = false;

    private self: HTMLUListElement | undefined;
    private dialog: Dialog;
    private player: Player | undefined;
    private _tracks: Video[];
    private _track: string = "";
    private observer: IntersectionObserver;

    constructor(container: Dialog) {
        this.dialog = container;
        const node = this.dialog.self?.querySelector(".playlist-tracks");
        if (node && node instanceof HTMLUListElement) this.self = node;
        this._tracks = getVideos();
        this.observer = this.initObserver();

        // Load saved track from storage
        const history = loadHistory() ?? {};
        const trackId = history[C.threadFullId] ?? "";
        const validTrack = YOUTUBE_VIDEO_ID_REGEX.test(trackId);
        const track = validTrack ? this.findTrackById(trackId) : null;
        this._track = track?.id ?? "";

        // Prefetch _after_ setting current track
        this.prefetchTitles();
    }

    get tracks() {
        return this._tracks;
    }

    get track() {
        return this._track;
    }

    set track(trackId: string) {
        this._track = trackId;
    }

    get looping() {
        return this._looping;
    }

    set looping(state: boolean) {
        this._looping = state;
    }

    toggle() {
        if (!this.self) return;

        this.display = !this.display;
        this.self?.classList.toggle("hide", !this.display);

        if (this.display) this.scrollToCurrentTrack();
    }

    update() {
        if (!this.self) return;

        const playlist = this.self;
        while (playlist.lastChild) playlist.removeChild(playlist.lastChild);

        this._tracks = getVideos();
        if (this.tracks.length < 1) return;
        this.tracks.forEach(this.addTrackToPlaylist);
    }

    setPlayer(input: Player) {
        this.player = input;
    }

    findTrackById(trackId: string) {
        return this._tracks.find(({ id }) => id === trackId);
    }

    setActiveTrack(videoId: string) {
        if (!this.self) return;

        const tracks = this.self.querySelectorAll("li");
        for (const track of tracks) {
            track.classList.toggle("active", track.dataset.videoId === videoId);
        }
    }

    async prefetchTitles(radiusBefore = 4, radiusAfter = 6) {
        const tracks = this.tracks;
        const track = tracks.find(({ id }) => id === this._track);

        const idx = track ? tracks.indexOf(track) : 0;

        // Initial window boundaries, clamped to array limits
        let start = Math.max(0, idx - radiusBefore);
        let end = Math.min(tracks.length, idx + radiusAfter);

        // When near an edge, one side of the window is cut short — measure how much was lost
        const slackBefore = idx - radiusBefore < 0 ? radiusBefore - idx : 0; // slots lost off the left edge
        // prettier-ignore
        const slackAfter = idx + radiusAfter > tracks.length ? idx + radiusAfter - tracks.length : 0; // slots lost off the right edge

        // Redistribute the lost slots to the opposite side to keep the window full
        start = Math.max(0, start - slackAfter); // left boundary absorbs right-side slack
        end = Math.min(tracks.length, end + slackBefore); // right boundary absorbs left-side slack

        const chunk = tracks.slice(start, end);

        // Return processed titles
        const promises = chunk
            .filter((video) => video.id)
            .map(async (video) => {
                if (typeof video.title === "string") {
                    // Skip fetch if already available
                    return Promise.resolve(video.title);
                } else {
                    const title = await getTitleById(video.id);
                    this.setTitle(video.id, title);
                    return title;
                }
            });

        return Promise.allSettled(promises);
    }

    private initObserver() {
        return new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;

                    const item = entry.target as HTMLElement;
                    const videoId = item.dataset.videoId;
                    const titleEl = item.querySelector(".track-title");

                    if (!videoId || !titleEl) continue;
                    if (titleEl.textContent !== videoId) continue;

                    const track = this.tracks.find(
                        (track) => track.id === videoId,
                    );

                    // Skip title fetch if track has already been fetched
                    if (typeof track?.title === "string") {
                        titleEl.textContent = track.title;
                        return;
                    }

                    getTitleById(videoId).then((title) => {
                        if (titleEl.textContent === videoId) {
                            titleEl.textContent = title;
                            this.setTitle(videoId, title);
                        }
                    });
                }
            },
            { root: this.self, threshold: 0.1 },
        );
    }

    private setTitle = (videoId: string, title: string) => {
        for (const track of this.tracks) {
            if (track.id === videoId && !!title) {
                track.title = title;
                return;
            }
        }
    };

    private scrollToCurrentTrack() {
        const activeTrack = this.self?.querySelector(".active");
        if (!activeTrack) return;

        activeTrack.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }

    private addTrackToPlaylist = (video: Video, i: number) => {
        const track = document.createElement("li");
        track.dataset.index = String(i);
        track.dataset.videoId = video.id;

        const index = document.createElement("span");
        index.className = "track-index";
        index.textContent = String(i + 1);

        const title = document.createElement("span");
        title.className = "track-title";
        title.title = video.id;
        title.textContent = video.title || video.id;

        track.appendChild(index);
        track.appendChild(title);
        track.addEventListener("click", this.changeTrack);

        if (video.id === this._track) {
            track.classList.add("active");
        }

        if (this.self) {
            this.self.appendChild(track);
            this.observer.observe(track);
        }
    };

    private changeTrack = (e: MouseEvent) => {
        e.preventDefault();

        const { currentTarget } = e;
        if (!(currentTarget instanceof HTMLElement)) return;

        this.player?.play(currentTarget.dataset.videoId);
    };
}

export { Playlist };
