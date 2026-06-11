type TrackHistory = { [key: string]: string };

const STORAGE_HISTORY_KEY = "4chan-yt-playlist-history";

export function saveHistory(history: TrackHistory) {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
}

export function loadHistory(): TrackHistory | null {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);

    try {
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
