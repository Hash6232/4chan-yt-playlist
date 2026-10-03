import C from "../config";

type TrackHistory = { [key: string]: string };

const HISTORY_KEY = "4chan-yt-playlist-history";
const LEGACY_HISTORY_KEY = HISTORY_KEY;

function historyStorageKey() {
    return (C.isFourchan ? "4chan" : "Warosu") + " " + HISTORY_KEY;
}

function parseHistory(raw: unknown): TrackHistory | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(String(raw));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

        return parsed;
    } catch {
        return null;
    }
}

function migrateLegacyHistory(key: string) {
    if (GM_getValue(key) !== undefined) return;

    const legacy = parseHistory(localStorage.getItem(LEGACY_HISTORY_KEY));
    if (!legacy || Object.keys(legacy).length === 0) return;

    GM_setValue(key, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_HISTORY_KEY);
}

export function saveHistory(history: TrackHistory) {
    GM_setValue(historyStorageKey(), JSON.stringify(history));
}

export function loadHistory(): TrackHistory | null {
    const key = historyStorageKey();
    migrateLegacyHistory(key);

    return parseHistory(GM_getValue(key));
}