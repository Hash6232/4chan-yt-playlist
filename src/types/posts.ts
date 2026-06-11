import { FourchanAPIResponses } from "../api/fourchan/types";

type Post = Pick<FourchanAPIResponses.ThreadPost, "no" | "com">;

type Video = {
    id: string;
    isAlive?: boolean;
    title?: string;
};

interface Thread {
    [no: number]: Video[];
}

type PostLinks = [no: number, videos: Video[]];

export type { Thread, Post, PostLinks, Video };
