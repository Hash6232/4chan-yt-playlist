import type {
    FourchanXAPIRequests,
    FourchanXAPIResponses,
} from "../api/fourchanX/types";

type FourchanXUpdate = FourchanXAPIResponses.ThreadUpdateDetail;

type FourchanXUpdateEvent = FourchanXAPIResponses.ThreadUpdateEvent;

type FourchanUpdate = Pick<
    FourchanXUpdate,
    404 | "threadID" | "newPosts" | "deletedPosts"
>;

type FourchanUpdateEvent = CustomEvent<FourchanUpdate>;

type Update = FourchanUpdate | FourchanXUpdate;

type UpdateEvent = FourchanUpdateEvent | FourchanXUpdateEvent;

type FourchanXNotification = FourchanXAPIRequests.CreateNotificationDetail;

export {
    Update,
    UpdateEvent,
    FourchanXUpdate,
    FourchanXUpdateEvent,
    FourchanUpdate,
    FourchanUpdateEvent,
    FourchanXNotification
};
