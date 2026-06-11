import type { FourchanXNotification } from "../types";

export function sendNotification(payload: Partial<FourchanXNotification>) {
    if (!payload.content) return false;

    const detail: typeof payload = {
        content: payload.content,
    };

    if (payload.type) detail.type = payload.type;
    if (payload.lifetime) detail.lifetime = payload.lifetime;

    return document.dispatchEvent(
        new CustomEvent("CreateNotification", { detail }),
    );
}
