import C from "../config";
import { printWarning } from "./debug";

type TrackHistory = { [key: string]: string };

// GM storage key, following the dialog-coordinate convention of prefixing the
// host: "4chan History" / "Warosu History".
const HISTORY_KEY = "History";

// localStorage key written by v3.0.0 and earlier. Must never be derived from
// HISTORY_KEY: renaming the GM key must not orphan the data we migrate from.
const LEGACY_HISTORY_KEY = "4chan-yt-playlist-history";

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

function readStoredHistory(key: string): TrackHistory | null {
    const stored = GM_getValue(key);

    // We only ever store JSON strings. Managers disagree on the sentinel for a
    // missing key (undefined vs null), so type-check instead of comparing.
    if (typeof stored !== "string") return null;

    return parseHistory(stored);
}

function migrateLegacyHistory(key: string) {
    if (readStoredHistory(key)) return;

    const legacyRaw = localStorage.getItem(LEGACY_HISTORY_KEY);
    const legacy = parseHistory(legacyRaw);

    if (!legacy || Object.keys(legacy).length === 0) {
        if (legacyRaw)
            printWarning(
                `history: unusable localStorage entry left in place: ${legacyRaw.slice(0, 40)}`
            );

        return;
    }

    GM_setValue(key, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_HISTORY_KEY);

    const count = Object.keys(legacy).length;
    printWarning(`history: migrated ${count} entries from localStorage to "${key}"`);
}

export function saveHistory(history: TrackHistory) {
    GM_setValue(historyStorageKey(), JSON.stringify(history));
}

export function loadHistory(): TrackHistory | null {
    const key = historyStorageKey();
    migrateLegacyHistory(key);

    return readStoredHistory(key);
}