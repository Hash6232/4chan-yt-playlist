// prettier-ignore
const YOUTUBE_API_BASEURL = "https://www.youtube.com/oembed?url=https://youtu.be/";

// prettier-ignore
export const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*?(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*?v=|v\/)))([-a-zA-Z0-9_]{11,})/;

export const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11,}$/;

export function extractId(url: string): string | undefined {
    return YOUTUBE_REGEX.exec(url)?.[1];
}

export function findLinks(input: string) {
    const regex = new RegExp(YOUTUBE_REGEX.source, "g");
    return [...input.matchAll(regex)].map((m) => m[1]);
}

export async function isVideoAlive(videoId: string) {
    const url = YOUTUBE_API_BASEURL + videoId + "&format=json";
    const headers = fetch(url, { method: "HEAD" });
    return headers.then((res) => res.ok).catch(() => false);
}

export async function getTitleById(videoId: string): Promise<string> {
    const url = YOUTUBE_API_BASEURL + videoId + "&format=json";
    const response = await fetch(url);
    if (!response.ok) return Promise.reject(videoId);
    const data = await response.json();
    if (!data.title || typeof data.title !== "string")
        return Promise.reject(videoId);
    return data.title;
}
