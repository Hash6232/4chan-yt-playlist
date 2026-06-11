import C from "./config";
import { Dialog } from "./Playlist/dialog";
import { getPosts, addPosts, removePosts } from "./Thread/posts";
import { initNativeUpdates, stopNativeUpdates } from "./Thread/watcher";
import { sendNotification } from "./utils";
import type { UpdateEvent } from "./types";
import "./style.scss";

let dialog: Dialog;

document.addEventListener("DOMContentLoaded", () => {
    C.parsingUpdate = true;

    getPosts()
        .then(addPosts)
        .then(() => (dialog = new Dialog()))
        .catch((err: Error) => {
            sendNotification({ type: "error", content: err.message });
            throw new Error(err.message);
        })
        .finally(() => (C.parsingUpdate = false));

    if (C.isFourchan) {
        const callback = (e: UpdateEvent) => {
            if (e.detail[404]) return stopNativeUpdates();

            C.parsingUpdate = true;

            Promise.all([
                removePosts(e.detail),
                getPosts(e.detail).then(addPosts),
            ])
                .then((results) => {
                    if (results.some((result) => result.length > 0))
                        dialog?.updatePlaylist();
                })
                .finally(() => (C.parsingUpdate = false));
        };

        if (C.fourchanX.enabled) {
            document.addEventListener("ThreadUpdate", callback);
        } else {
            document.addEventListener("ThreadUpdateNative", callback);
            initNativeUpdates();
        }
    } else if (C.isWarosu) {
        document.documentElement.classList.add("warosu");
    }
});
