import { C } from "./config";
import { Dialog } from "./dialog";

type Video = [ id: string, status: boolean ]

class Playlist {

    constructor() {

        if (!C.fourchan && !C.warosu) throw new Error("Website not supported..");

        document.addEventListener("DOMContentLoaded", async () => {

            this.checking = true;
            const posts = await fetchThread();
            if (posts.length < 1) throw new Error("No post was found.");
            this.parsePosts(posts).finally(() => this.checking = false);

        });

        document.addEventListener("ThreadUpdate", ((e: CustomEvent) => {
    
            if (!C.fourchanX) return;
            if (e.detail[404]) return;
            
            const newPosts: [ no: string, com: string ][] = e.detail.newPosts.map((fullId: string) => {
                const no = fullId.split(".").pop() as string;
                return [ no, document.getElementById("m" + no)?.innerHTML || "" ]
            });
        
            parseReplies(this, newPosts);
        
        }) as EventListener);

        document.addEventListener("4chanThreadUpdated", ((e: CustomEvent) => {

            if (C.fourchanX) return;
            if (unsafeWindow.thread_archived) return;
        
            const thread = document.querySelector(".board > .thread") as HTMLElement;
            const newPosts: [ no: string, com: string ][] = [...thread.children].slice(-e.detail.count).map((p) => {
                const no = p.id.split("pc").pop() as string;
                return [ no, document.getElementById("m" + no)?.innerHTML || "" ]
            });
            
            parseReplies(this, newPosts);
            
        }) as EventListener);

        document.addEventListener("4chanQRPostSuccess", ((e: CustomEvent) => {

            if (C.fourchanX) return;
        
            const no = (e.detail.postId as number).toString();
            const newPost: [no: string, com: string] = [ no, document.getElementById("m" + no)?.innerHTML || "" ];
            
            parseReplies(this, [newPost]);
            
        }) as EventListener);

        async function fetchThread(): Promise<[ no: string, com: string ][]> {

            switch(true) {
                case C.fourchan:
                    const response = await fetch("https://a.4cdn.org/" + C.board + "/thread/" + C.thread + ".json");
                    const { posts } = await response.json() as { posts: { no: number, com?: string }[] };
                    return posts.map((post) => [ post.no.toString(), post.com || "" ])
                case C.warosu:
                    return [...document.querySelectorAll(".comment:not(:has(img[alt='[DELETED]'])) blockquote")]
                        .map((post) => [ post.parentElement?.id.slice(1) ?? "", post.innerHTML ])
                default:
                    return []
            }
        
        };

        async function parseReplies(playlist: Playlist, newPosts: [no: string, com: string][]) {

            playlist.checking = true;
    
            playlist.parsePosts(newPosts).then((addedPosts) => {
                if (! playlist.player) return;
                if (addedPosts > 0) playlist.mutated = true;
            }).finally(() => {
                playlist.checking = false;
                if (! playlist.mutated || playlist.playing) return;
                playlist.updatePlayer();
            })
    
        };
        
    }

    checking = false;
    mutated = false;
    playing = false;

    // -1 FAILED | 0 IDLE | 1 LOADING
    state: -1 | 0 | 1 = 0;

    posts: { [key: string]: Video[] } = {};

    dialog: Dialog = new Dialog(this);

    player: YT.Player | null = null;
    track = "";

    regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/g;

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
    
    };

    async checkLink(id: string): Promise<Video> {

        const url = "https://www.youtube.com/oembed?url=https://youtu.be/" + id + "&format=json";
        return fetch(url, {method: "HEAD"}).then(res => [id, res.ok])

    };

    updatePlayer(): void {

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

        const tabs = document.getElementById("playlist-embed")?.querySelector(".tabs");
        if (tabs && tabs.children.length !== pages.length) this.dialog?.updateTabs(pages.length);
        
    };

    toPages(): string[][] {

        const output: string[][] = [];

        const ids = Object.values(this.posts).flat()
            .reduce((validVideos: string[], video) => {
                const [ id, status ] = video;

                if (status && validVideos.indexOf(id) < 0) {
                    validVideos.push(id);
                }

                return validVideos
        }, []);

        for (let i = 0; i < ids.length; i += 200) {
            const chunk = ids.slice(i, i + 200);
            output.push(chunk);
        }

        return output

    };

    jumpTo(track: string) {

        if (! track) return;

        const postId = findKey(this.posts, track);
        return document.getElementById((C.fourchan ? "pc" : "p") + postId)?.scrollIntoView()

        function findKey(object: { [key: string]: Video[] }, key: string) {
            for (const k in object) {
                for (const a of object[k]) {
                    if (a.includes(key)) return k
                }
            }

            return null
        }

    };

    isEmpty(): boolean {

        for (const prop in this.posts) {
            if (Object.prototype.hasOwnProperty.call(this.posts, prop)) {
                return false;
            }
        }
      
        return true

    };

    reload(): void {

        if (!this.player) return;

        const pages: string[][] = this.toPages();
        const page = pages.findIndex(p => p.includes(this.track));

        if (page > -1) {
            const index = pages[page].indexOf(this.track),
            trackTime = this.player.getCurrentTime();

            if (this.playing) {
                this.player.loadPlaylist(pages[page], index, trackTime);
            } else {
                this.player.cuePlaylist(pages[page], index, trackTime);
            }
        } else {
            if (this.playing) {
                this.player.loadPlaylist(pages[0]);
            } else {
                this.player.cuePlaylist(pages[0]);
            }
        }
    }

}

export { Playlist }