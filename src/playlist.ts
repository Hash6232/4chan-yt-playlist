import { Dialog } from "./dialog"

class Playlist {

    constructor() {

        const [board, no] = window.location.pathname.slice(1).split("/thread/");
        this.board = board;
        this.thread = no;

        document.addEventListener("DOMContentLoaded", async () => {

            this.checking = true;
            const posts = await fetchThread();
            if (posts.length < 1) throw new Error("No post was found.");
            return this.parsePosts(posts).finally(() => this.checking = false)

        })

        async function fetchThread(): Promise<[ no: string, com: string ][]> {

            switch(location.hostname) {
                case "boards.4chan.org":
                    const response = await fetch("https://a.4cdn.org/" + board + "/thread/" + no + ".json");
                    const { posts } = await response.json() as { posts: { no: number, com?: string }[] };
                    return posts.map((post) => [ post.no.toString(), post.com || "" ])
                case "warosu.org":
                    return [...document.querySelectorAll(".comment blockquote")]
                        .map((post) => [ post.parentElement?.id.slice(1) ?? "", post.innerHTML ])
                default:
                    console.error("This script isn't compatible with this image board.");
                    return []
            }

        }

    }

    board = "";
    thread = "";

    checking = false;
    mutated = false;
    playing = false;

    // -1 FAILED | 0 IDLE | 1 LOADING
    state: -1 | 0 | 1 = 0;

    posts: Posts = {};

    dialog: Dialog | null = null;
    player: YT.Player | null = null;
    track = "";

    private regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g

    async parsePosts(posts: [ no: string, com: string ][]): Promise<number> {

        const validPosts = posts.reduce((array: [ no: string, ids: string[] ][], post) => {
            const comment = post[1].replace(/<wbr>/g, "");
            // Look for all YouTube links and return an array of unique video ids
            const ids = Array.from(new Set([...comment.matchAll(this.regex)].map((m) => m[1])));
            if (ids.length > 0) array.push( [post[0], ids] );
            return array
        }, []);

        if (validPosts.length < 1) return Promise.resolve(0);

        const parsedPosts = validPosts.map(async (post) => {
            return Promise.allSettled(post[1].map((id) => this.checkLink(id)))
                .then((responses) => [ post[0], responses.reduce((output: Video[], res) => {
                    if (res.status === "fulfilled") output.push(res.value);
                    return output
                }, []) ] as [ no: string, videos: Video[] ] )
        });

        return Promise.allSettled(parsedPosts).then((responses) => {
            return responses.reduce((output: [ no: string, videos: Video[] ][], res) => {
                if (res.status === "fulfilled") output.push(res.value);
                return output
            }, [])
        }).then((posts) => {
            for (const post of posts) this.posts[post[0]] = post[1];
            return posts.length
        })
    
    }

    async checkLink(id: string): Promise<Video> {

        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, {method: "HEAD"}).then(res => [id, res.ok])

    }

    initAPI() {

        if (this.state > 0 || this.player) return;
        if (this.state < 0) return failedLoad();
        
        this.state = 1;

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);

        setTimeout(() => {
            if (this.state < 1) return;
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
                "  @@||www.youtube.com/s/player/*$script,domain=4chan.org\n"
            )
        }

    }

    updatePlayer() {

        if (! this.player) return;

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

        this.mutated = false;

        if (! this.dialog) return;

        const tabs = document.getElementById("playlist-embed")?.querySelector(".tabs");
        if (tabs && tabs.children.length !== pages.length) this.dialog.updateTabs(pages.length);
        
    }

    toPages(): string[][] {

        const output: string[][] = [];

        const ids = Object.values(this.posts).flatMap((post) => {
            return post.reduce((validVideos: string[], video) => {
                const [ id, status ] = video;

                if (status && ! validVideos.includes(id))
                    validVideos.push(id);
                return validVideos
            }, [])
        });

        for (let i = 0; i < ids.length; i += 199) {
            const chunk = ids.slice(i, i + 199);
            output.push(chunk);
        }

        return output

    }

    jumpTo(track: string) {

        if (! track) return;

        const postId = findKey(this.posts, track);
        const is4chan = location.hostname === "boards.4chan.org";

        return document.getElementById((is4chan ? "pc" : "p") + postId)?.scrollIntoView()

        function findKey(object: Posts, key: string) {
            for (const k in object) {
                for (const a of object[k]) {
                    if (a.includes(key)) return k
                }
            }

            return null
        }

    }

    isEmpty(): boolean {
        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
      
        return true
    }

}

export { Playlist }