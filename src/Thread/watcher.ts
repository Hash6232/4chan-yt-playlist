import C from "../config";
import { FourchanUpdate } from "../types";

const threadId = C.board + "." + C.thread;

const knownPostIds = new Set<string>();

const watchers: MutationObserver[] = [];

function initNativeUpdates() {
    const threadContainer = document.querySelector(".thread");
    const updateLabel = document.querySelector(
        ".navLinks.desktop>span:last-of-type",
    );

    if (threadContainer) {
        const threadObserver = new MutationObserver(observeThread);
        threadObserver.observe(threadContainer, { childList: true });
        watchers.push(threadObserver);

        const postNodes = threadContainer.querySelectorAll("div.postContainer");
        for (const id of Array.from(postNodes, getFullId)) {
            knownPostIds.add(id);
        }
    }

    if (updateLabel) {
        const deathObserver = new MutationObserver(observeStatus);
        deathObserver.observe(updateLabel, { childList: true });
        watchers.push(deathObserver);
    }
}

const getFullId = (postContainer: Element) => {
    const id = postContainer.id.slice(2);
    return C.board + "." + id;
};

const observeThread = (mutations: MutationRecord[]) => {
    const newPosts: string[] = [];
    const deletedPosts: string[] = [];

    for (const { addedNodes, removedNodes } of mutations) {
        for (const node of removedNodes) {
            if (!(node instanceof Element)) continue;
            if (!node.classList.contains("postContainer")) continue;
            const fullID = getFullId(node);
            if (knownPostIds.delete(fullID)) {
                deletedPosts.push(fullID);
            }
        }
        for (const node of addedNodes) {
            if (!(node instanceof Element)) continue;
            if (!node.classList.contains("postContainer")) continue;
            const fullID = getFullId(node);
            if (!knownPostIds.has(fullID)) {
                knownPostIds.add(fullID);
                newPosts.push(fullID);
            }
        }
    }

    if (newPosts.length > 0 || deletedPosts.length > 0) {
        document.dispatchEvent(
            new CustomEvent<FourchanUpdate>("ThreadUpdateNative", {
                detail: {
                    404: false,
                    threadID: threadId,
                    newPosts,
                    deletedPosts,
                },
            }),
        );
    }
};

const observeStatus = (mutations: MutationRecord[]) => {
    for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
            if (!(node instanceof Element)) continue;
            if (!node.querySelector(".tu-error")) continue;
            document.dispatchEvent(
                new CustomEvent<FourchanUpdate>("ThreadUpdateNative", {
                    detail: { 404: true, threadID: threadId },
                }),
            );
        }
    }
};

function stopNativeUpdates() {
    watchers.forEach((ob) => ob.disconnect());
}

export { initNativeUpdates, stopNativeUpdates };
