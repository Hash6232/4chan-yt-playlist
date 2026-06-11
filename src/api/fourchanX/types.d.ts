/**
 * Namespace containing 4chan X API request types for custom events.
 */
export namespace FourchanXAPIRequests {
    /**
     * Detail object passed to the "CreateNotification" CustomEvent fired on the document
     * to create a 4chan X notification.
     */
    export interface CreateNotificationDetail {
        /**
         * CSS class of the notification, indicating the message type.
         * Can be one of:
         * - `'info'`
         * - `'success'`
         * - `'warning'`
         * - `'error'`
         */
        type: "info" | "success" | "warning" | "error";

        /**
         * Message to display in the notification.
         */
        content: string;

        /**
         * Optional time for the notification to be displayed, in seconds.
         * If absent or falsy, the notification remains visible until closed by the user.
         */
        lifetime?: number;
    }

    /**
     * Type for the "CreateNotification" custom event.
     */
    export type CreateNotificationEvent = CustomEvent<CreateNotificationDetail>;
}

/**
 * Namespace containing 4chan X API response types for custom events.
 */
export namespace FourchanXAPIResponses {
    /**
     * Detail object passed to the "ThreadUpdate" CustomEvent fired by 4chan X on the document.
     */
    export interface ThreadUpdateDetail {
        /**
         * Indicates whether the thread has been deleted or closed/archived.
         * - `true` if the thread is dead.
         * - `false` if the thread is still active and this is an update.
         */
        404: boolean;

        /**
         * Full ID of the thread.
         * A "full ID" is a string containing the board name and thread number separated by a period.
         * Example: 'g.39894014' for https://boards.4chan.org/g/thread/39894014
         */
        threadID: string;

        /**
         * Array of full IDs of new posts in this update.
         * Present only when the thread is active (`404 === false`).
         */
        newPosts?: string[];

        /**
         * Array of full IDs of posts deleted in this update.
         * Present only when the thread is active (`404 === false`).
         */
        deletedPosts?: string[];

        /**
         * Array of full IDs of posts whose attached files were deleted in this update.
         * Present only when the thread is active (`404 === false`).
         */
        deletedFiles?: string[];

        /**
         * Number of posts in the thread, including the OP.
         * Present only when the thread is active (`404 === false`).
         */
        postCount?: number;

        /**
         * Number of posts with images or other attached files in the thread, including the OP.
         * Present only when the thread is active (`404 === false`).
         */
        fileCount?: number;

        /**
         * Number of unique IP addresses that have posted to the thread.
         * Present only when the thread is active (`404 === false`).
         */
        ipCount?: number;
    }

    /**
     * Type for the "ThreadUpdate" custom event.
     */
    export type ThreadUpdateEvent = CustomEvent<ThreadUpdateDetail>;
}
