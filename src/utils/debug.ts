import { sendNotification } from "./fourchanX";
import type { PostLinks, Video } from "../types";

type DeadLinkRow = Record<number, { "Dead links": string[] }>;
type NewPostRow = Record<number, { "New links": Video[] }>;
type DeletedPostRow = Record<number, { "Deleted links": Video[] }>;

const logPrefix = "[4chan-yt-playlist]";

export function printError(err: any, notify = false) {
    if (typeof err !== "string" && !(err instanceof Error)) return;
    const msg = typeof err === "string" ? err : err.message;

    if (notify) sendNotification({ content: msg, type: "error" });

    console.log(logPrefix, msg);
}

export function printWarning(msg: string, notify = false) {
    if (notify)
        sendNotification({ content: msg, type: "warning", lifetime: 5 });

    console.log(logPrefix, msg);
}

export function printDeadLinks(validPosts: PostLinks[]) {
    if (validPosts.length < 1) return;

    const filteredPosts = validPosts.reduce(
        (output, post) => {
            const [no, videos] = post;

            const deadLinks = videos.reduce((output, video) => {
                if (!video.isAlive) output.push(video.id);
                return output;
            }, [] as string[]);
            if (deadLinks.length > 0) output.push({ no, videos: deadLinks });
            return output;
        },
        [] as { no: number; videos: string[] }[],
    );

    if (filteredPosts.length < 1) return;

    // Convert array into an object representation of a table row
    const tableObject: DeadLinkRow = {};
    filteredPosts.forEach((post) => {
        tableObject[post.no] = { "Dead links": post.videos };
    });

    console.table(tableObject);
}

export function printNewPosts(newPosts: PostLinks[]) {
    if (newPosts.length < 1) return;

    const tableObject: NewPostRow = {};
    newPosts.forEach(([no, videos]) => {
        tableObject[no] = { "New links": videos };
    });

    console.table(tableObject);
}

export function printDeletedPosts(deletedPosts: PostLinks[]) {
    if (deletedPosts.length < 1) return;

    const tableObject: DeletedPostRow = {};
    deletedPosts.forEach(([no, videos]) => {
        tableObject[no] = { "Deleted links": videos };
    });

    console.table(tableObject);
}
