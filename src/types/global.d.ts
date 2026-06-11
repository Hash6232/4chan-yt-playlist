import type { FourchanXAPIResponses } from "../api/fourchanX/types";
import type { FourchanXAPIRequests } from "../api/fourchanX/types";

declare global {
    interface Window {
        Config: {
            disableAll: boolean;
            dropDownNav: boolean;
            threadUpdater: boolean;
        };
        FCX: {};
        ThreadUpdater: {
            dead: boolean;
        };
        onYouTubeIframeAPIReady: () => void;
    }

    interface DocumentEventMap {
        ThreadUpdate: FourchanXAPIResponses.ThreadUpdateEvent;
        CreateNotification: FourchanXAPIRequests.CreateNotificationEvent;
        ThreadUpdateNative: FourchanUpdateEvent;
    }

    declare namespace YT {
        interface Player {
            playerInfo: {
                progressState: {
                    allowSeeking: boolean;
                };
            };
        }
    }
}

export {};
