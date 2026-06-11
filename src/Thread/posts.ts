import C from "../config";
import { FourchanAPIClient as api } from "../api/fourchan";
import { findLinks, isVideoAlive, printDeadLinks } from "../utils";
import type { Post, PostLinks, Thread, Update, Video } from "../types";

const thread: Thread = {};

async function getPosts(update?: Update) {
    const fetchedPosts = await fetchPosts(update);
    const postsWithLinks = filterPosts(fetchedPosts);
    if (postsWithLinks.length === 0) return [];

    const output = await Promise.all(
        postsWithLinks.map(async (post): Promise<PostLinks> => {
            const [no, videos] = post;
            const checkedLinks = videos.map(({ id }) =>
                isVideoAlive(id).then((res) => ({ id, isAlive: res })),
            );
            const results = await Promise.all(checkedLinks);
            return [no, results];
        }),
    );

    printDeadLinks(output);

    return output;
}

async function fetchPosts(update?: Update): Promise<Post[]> {
    if (C.isFourchan) {
        if (update) return mapUpdate(update);
        try {
            const response = await api.getThread(C.board, C.thread);
            return response.posts.map(({ no, com }) => ({ no, com }));
        } catch {
            throw new Error(
                "Unable to connect to 4chan's API. Try reloading the page.",
            );
        }
    } else if (C.isWarosu) {
        const postForm = document.getElementById("postform");
        const posts = postForm?.querySelectorAll(
            "div.comment[id], td.comment[id]",
        );
        return posts ? mapWarosuNodes(posts) : [];
    }
    return [];
}

const mapUpdate = (update: Update): Post[] => {
    if (!update.newPosts) return [];
    return update.newPosts.reduce((output, fullId) => {
        const no = parseInt(fullId.split(".").pop()!);
        const com = document.getElementById("m" + no)?.innerHTML;
        if (!isNaN(no)) output.push({ no, com });
        return output;
    }, [] as Post[]);
};

const mapWarosuNodes = (posts: NodeListOf<Element>): Post[] => {
    return Array.from(posts).reduce((mappedPosts, el) => {
        const deleted = !!el.querySelector(":scope > a+img[alt='[DELETED]']");
        if (deleted) return mappedPosts;

        const no = parseInt(el.id.slice(1));
        const com = el.querySelector("blockquote")?.innerHTML ?? "";
        if (!isNaN(no)) mappedPosts.push({ no, com });

        return mappedPosts;
    }, [] as Post[]);
};

function filterPosts(posts: Post[]) {
    return posts.reduce((output, post) => {
        if (!post.com) return output;
        const comment = post.com.replace(/<wbr>/g, ""); // sanitize
        const uniqueIds = new Set(findLinks(comment));
        const videos = Array.from(uniqueIds, (id) => ({ id }));
        if (videos.length > 0) output.push([post.no, videos]);
        return output;
    }, [] as PostLinks[]);
}

function addPosts(newPosts: PostLinks[]) {
    for (const [no, videos] of newPosts) thread[no] = videos;
    return newPosts;
}

function removePosts(update: Update) {
    if (!update.deletedPosts) return [];
    const removedPosts: PostLinks[] = [];
    for (const fullId of update.deletedPosts) {
        const no = parseInt(fullId.split(".").pop()!);
        if (no in thread) removedPosts.push([no, thread[no]]);
    }
    removedPosts.forEach(([no]) => delete thread[no]);
    return removedPosts;
}

function getVideos(): Video[] {
    const seen = new Set<string>();
    return Object.values(thread)
        .flat()
        .filter((v) => v.isAlive && !seen.has(v.id) && seen.add(v.id));
}

function getPostByVideoId(videoId: string) {
    for (const postNumber in thread) {
        for (const { id } of thread[postNumber]) {
            if (id === videoId) return postNumber;
        }
    }
}

export { getPosts, addPosts, removePosts, getVideos, getPostByVideoId };
