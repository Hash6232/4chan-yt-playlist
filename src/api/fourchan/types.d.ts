export declare namespace FourchanAPIResponses {
    /**
     * Represents the response from any board's `/archive.json` endpoint.
     * Archived threads are read-only threads that have been closed and are no longer active.
     * The response is an array of thread IDs (OP numbers).
     *
     * Example URL: https://a.4cdn.org/po/archive.json
     */
    export type ArchiveResponse = number[];

    /**
     * Response object for the `/boards.json` endpoint.
     *
     * Example URL: [`https://a.4cdn.org/boards.json`](https://a.4cdn.org/boards.json)
     */
    export interface BoardsResponse {
        /**
         * Array of boards available on 4chan.
         */
        boards: Board[];
    }

    /**
     * Represents a single 4chan board and its configuration/settings.
     */
    export interface Board {
        /** The directory the board is located in. Example: `"a"` */
        board: string;

        /** The readable title at the top of the board. Example: `"Anime & Manga"` */
        title: string;

        /** Is the board worksafe? 1 = yes, 0 = no */
        ws_board: 0 | 1;

        /** Number of threads displayed per index page. Example: 15 */
        per_page: number;

        /** Number of index pages available. Example: 10 */
        pages: number;

        /** Maximum file size allowed for non-.webm attachments (in KB). Example: 4194304 */
        max_filesize: number;

        /** Maximum file size allowed for .webm attachments (in KB). Example: 3145728 */
        max_webm_filesize: number;

        /** Maximum number of characters allowed in a post comment. Example: 2000 */
        max_comment_chars: number;

        /** Maximum duration of a .webm attachment (in seconds). Example: 120 */
        max_webm_duration: number;

        /** Maximum number of replies allowed to a thread before it stops bumping. Example: 500 */
        bump_limit: number;

        /** Maximum number of image replies per thread. Example: 300 */
        image_limit: number;

        /** Cooldown times in seconds for creating threads, posting replies, and posting images. */
        cooldowns: Cooldowns;

        /** SEO meta description content for the board. */
        meta_description: string;

        /** Are spoilers enabled? 1 = yes, 0 = no */
        spoilers?: 0 | 1;

        /** Number of custom spoilers available on the board. */
        custom_spoilers?: number;

        /** Are archives enabled for the board? 1 = yes, 0 = no */
        is_archived?: 0 | 1;

        /** Map of board-specific flags (code → name). Example: { "AB": "Flag Name AB" } */
        board_flags?: Record<string, string>;

        /** Are country flags showing the poster's country enabled? 1 = yes, 0 = no */
        country_flags?: 0 | 1;

        /** Are poster ID tags enabled? 1 = yes, 0 = no */
        user_ids?: 0 | 1;

        /** Can users submit drawings via the Oekaki app? 1 = yes, 0 = no */
        oekaki?: 0 | 1;

        /** Can users submit SJIS drawings using the `[sjis]` tags? 1 = yes, 0 = no */
        sjis_tags?: 0 | 1;

        /** Does the board support code syntax highlighting using `[code]` tags? 1 = yes, 0 = no */
        code_tags?: 0 | 1;

        /** Does the board support `[math]` TeX and `[eqn]` tags? 1 = yes, 0 = no */
        math_tags?: 0 | 1;

        /** Is image posting disabled? 1 = yes, 0 = no */
        text_only?: 0 | 1;

        /** Is the name field disabled? 1 = yes, 0 = no */
        forced_anon?: 0 | 1;

        /** Are webms with audio allowed? 1 = yes, 0 = no */
        webm_audio?: 0 | 1;

        /** Do OPs require a subject? 1 = yes, 0 = no */
        require_subject?: 0 | 1;

        /** Minimum image width in pixels, if enforced. */
        min_image_width?: number;

        /** Minimum image height in pixels, if enforced. */
        min_image_height?: number;
    }

    /**
     * Cooldown times in seconds for threads, replies, and images.
     */
    export interface Cooldowns {
        /** Cooldown between creating new threads. Example: 600 */
        threads: number;

        /** Cooldown between posting replies. Example: 60 */
        replies: number;

        /** Cooldown between posting images. Example: 60 */
        images: number;
    }

    /**
     * Response object for the `/catalog.json` endpoint.
     *
     * Example URL: [`https://a.4cdn.org/po/catalog.json`](https://a.4cdn.org/po/catalog.json)
     *
     * The `catalog.json` file is a comprehensive list of all threads and their attributes on a board.
     * Every thread is grouped by `page`. Each page corresponds to a JSON representation of a catalog page
     * (e.g., https://boards.4channel.org/po/catalog).
     */
    export type CatalogResponse = CatalogPage[];

    /**
     * Represents a single catalog page, containing an array of threads.
     */
    export interface CatalogPage {
        /** The page number in the catalog (1-based). */
        page: number;

        /** List of threads that appear on this catalog page. */
        threads: CatalogThread[];
    }

    /**
     * Represents a single thread or post object in a catalog listing.
     */
    export interface CatalogThread {
        /** Numeric post ID. Example: `570368` */
        no: number;

        /** For replies: ID of the thread being replied to. For OP: `0`. */
        resto: number;

        /** If the thread is pinned (stickied) to the top of the page. `1` = yes */
        sticky?: 1;

        /** If the thread is closed to replies. `1` = yes */
        closed?: 1;

        /** Date and time string in format `MM/DD/YY(Day)HH:MM`. EST/EDT timezone. */
        now: string;

        /** UNIX timestamp when the post was created. */
        time: number;

        /** Name user posted with. Defaults to `"Anonymous"`. */
        name: string;

        /** The user's tripcode (e.g., `!tripcode` or `!!securetripcode`). */
        trip?: string;

        /** Poster's ID if assigned. */
        id?: string;

        /**
         * Capcode identifier for a post.
         * Possible values: `mod`, `admin`, `admin_highlight`, `manager`, `developer`, `founder`.
         */
        capcode?: string;

        /** ISO 3166-1 alpha-2 country code, if country flags are enabled. Example: `"US"`, `"GB"`, `"JP"`. */
        country?: string;

        /** Full country name associated with the poster. Example: `"United States"`. */
        country_name?: string;

        /** Subject text (for OPs only). Example: `"Welcome to /po/!"` */
        sub?: string;

        /** Comment text (HTML-escaped). */
        com?: string;

        /** Unix timestamp + microtime for uploaded image, if any. */
        tim?: number;

        /** Filename as it appeared on the poster's device. */
        filename?: string;

        /** File extension of uploaded attachment (e.g. `.jpg`, `.png`, `.gif`, `.pdf`, `.webm`). */
        ext?: string;

        /** Size of uploaded file in bytes. */
        fsize?: number;

        /** Base64-packed 24-character MD5 hash of the uploaded file. */
        md5?: string;

        /** Image width in pixels. */
        w?: number;

        /** Image height in pixels. */
        h?: number;

        /** Thumbnail width in pixels. */
        tn_w?: number;

        /** Thumbnail height in pixels. */
        tn_h?: number;

        /** If the post's attachment file has been deleted. `1` = yes */
        filedeleted?: 1;

        /** If the post's image is marked as a spoiler. `1` = yes */
        spoiler?: 1;

        /** Custom spoiler ID (1-10) if a spoilered image uses a custom spoiler image. */
        custom_spoiler?: number;

        /** Number of replies not displayed in preview (for OPs). */
        omitted_posts?: number;

        /** Number of image replies not displayed in preview (for OPs). */
        omitted_images?: number;

        /** Total number of replies to a thread (for OPs). */
        replies?: number;

        /** Total number of image replies in a thread (for OPs). */
        images?: number;

        /** Whether bump limit has been reached. `1` = yes */
        bumplimit?: 1;

        /** Whether image limit has been reached. `1` = yes */
        imagelimit?: 1;

        /** UNIX timestamp of the last modification to the thread (reply added, deleted, etc.). */
        last_modified?: number;

        /** Category or tag for `/f/` uploads (e.g. `"Game"`, `"Loop"`). */
        tag?: string;

        /** SEO-friendly URL slug for the thread. Example: `"welcome-to-po"`. */
        semantic_url?: string;

        /** Year the 4chan pass was purchased, if provided via "since4pass" field. */
        since4pass?: number;

        /** Number of unique posters in a thread. */
        unique_ips?: number;

        /** If a mobile-optimized image exists for this post. `1` = yes */
        m_img?: 1;

        /** JSON representation of the most recent replies to a thread. */
        last_replies?: CatalogReply[];
    }

    /**
     * Represents a single reply in a thread as shown in the catalog.  
     * Only exists inside the catalog context (`last_replies` field of a CatalogThread).
     */
    export interface CatalogReply {
        /**
         * Unique numeric ID of the post.
         * Example: 570371
         */
        no: number;

        /**
         * Human-readable timestamp string of when the post was made.
         * Format: MM/DD/YY(Day)HH:MM(:SS on some boards), EST/EDT timezone
         * Example: "12/31/18(Mon)17:21:29"
         */
        now: string;

        /**
         * Name the poster used. Defaults to "Anonymous" if not set.
         */
        name: string;

        /**
         * Comment content in HTML-escaped format.
         * Optional if the post is just an image or has no comment.
         */
        com?: string;

        /**
         * Numeric timestamp of when the post was created (Unix timestamp).
         */
        time?: number;

        /**
         * ID of the thread this post is replying to.
         * Zero if it's an OP (original post). Usually filled for replies.
         */
        resto: number;

        /**
         * Tripcode of the poster, if present.
         * Format: "!tripcode" or "!!securetripcode"
         */
        trip?: string;

        /**
         * Poster ID, if enabled for the board.
         */
        id?: string;

        /**
         * Capcode of the poster, if present.
         * Example values: "mod", "admin", "admin_highlight", "manager", "developer", "founder"
         */
        capcode?: string;

        /**
         * ISO 3166-1 alpha-2 country code of the poster.
         * Example: "US"
         */
        country?: string;

        /**
         * Full country name of the poster.
         */
        country_name?: string;

        /**
         * Original filename of attached image/file.
         */
        filename?: string;

        /**
         * File extension of the attached image/file.
         * Example: ".jpg", ".png"
         */
        ext?: string;

        /**
         * File size of the attachment in bytes.
         */
        fsize?: number;

        /**
         * Unix timestamp + microtime of the uploaded image (if present).
         */
        tim?: number;

        /**
         * Image width in pixels.
         */
        w?: number;

        /**
         * Image height in pixels.
         */
        h?: number;

        /**
         * Thumbnail width in pixels.
         */
        tn_w?: number;

        /**
         * Thumbnail height in pixels.
         */
        tn_h?: number;

        /**
         * MD5 hash of the attachment in packed base64.
         */
        md5?: string;

        /**
         * Marks the attachment as deleted.
         * 1 = deleted, undefined if not deleted.
         */
        filedeleted?: 1;

        /**
         * Marks the attachment as a spoiler.
         * 1 = spoilered, undefined if not.
         */
        spoiler?: 1;

        /**
         * Optional custom spoiler ID (1-10).
         */
        custom_spoiler?: number;

        /**
         * Mobile-optimized image exists.
         * 1 = exists, undefined if not.
         */
        m_img?: 1;
    }

    /**
     * Response object for the `/[board]/[1-15].json` endpoint.
     *
     * Example URL: [`https://a.4cdn.org/po/2.json`](https://a.4cdn.org/po/2.json)
     *
     * Each `/[board]/[1-15].json` file represents a single **index page** on a board.
     * It contains an array of threads (`threads`), and each thread includes its posts —
     * the first being the original post (OP) and the remainder being preview replies.
     */
    export interface IndexPageResponse {
        /** Array of thread entries appearing on this index page. */
        threads: IndexThread[];
    }

    /**
     * Represents a single thread entry on an index page.
     * Each thread contains its OP and a subset of preview replies.
     */
    export interface IndexThread {
        /** Array of posts in the thread. The first post is always the OP. */
        posts: IndexPost[];
    }

    /**
     * Represents a single post within a thread on an index page.
     */
    export interface IndexPost {
        /** Numeric post ID. Example: `570368` */
        no: number;

        /**
         * For replies: ID of the thread being replied to.
         * For OP posts: always `0`.
         */
        resto: number;

        /** If the thread is pinned to the top of the board (OP only). `1` = yes */
        sticky?: 1;

        /** If the thread is closed to replies (OP only). `1` = yes */
        closed?: 1;

        /** Date/time string in format `MM/DD/YY(Day)HH:MM`. EST/EDT timezone. */
        now: string;

        /** UNIX timestamp representing when the post was created. */
        time: number;

        /** Name of the poster. Defaults to `"Anonymous"`. */
        name: string;

        /** The user's tripcode, if present. Example: `"!tripcode"` or `"!!securetripcode"` */
        trip?: string;

        /** Poster ID, if enabled. Example: `"AbC123ef"` */
        id?: string;

        /**
         * Capcode identifier for a post.
         * Possible values: `mod`, `admin`, `admin_highlight`, `manager`, `developer`, `founder`
         */
        capcode?: string;

        /** ISO 3166-1 alpha-2 country code, if country flags are enabled. Example: `"US"` */
        country?: string;

        /** Full country name associated with the post, if available. Example: `"United States"` */
        country_name?: string;

        /** Subject text (for OP posts only). Example: `"Welcome to /po/!"` */
        sub?: string;

        /** Comment text (HTML escaped). */
        com?: string;

        /** Unix timestamp + microtime that an attachment image was uploaded, if any. */
        tim?: number;

        /** Original filename as uploaded by the user. Example: `"image123"` */
        filename?: string;

        /**
         * File extension of the uploaded file.
         * Example: `.jpg`, `.png`, `.gif`, `.pdf`, `.swf`, `.webm`
         */
        ext?: string;

        /** Size of the uploaded file in bytes. */
        fsize?: number;

        /** 24-character packed Base64 MD5 hash of the uploaded file. */
        md5?: string;

        /** Image width in pixels. */
        w?: number;

        /** Image height in pixels. */
        h?: number;

        /** Thumbnail width in pixels. */
        tn_w?: number;

        /** Thumbnail height in pixels. */
        tn_h?: number;

        /** If the post's attachment has been deleted. `1` = yes */
        filedeleted?: 1;

        /** If the post's attachment is spoilered. `1` = yes */
        spoiler?: 1;

        /** Custom spoiler ID (1-10) if a spoilered image uses a custom spoiler image. */
        custom_spoiler?: number;

        /** Number of replies omitted from preview (OP only). */
        omitted_posts?: number;

        /** Number of image replies omitted from preview (OP only). */
        omitted_images?: number;

        /** Total number of replies in a thread (OP only). */
        replies?: number;

        /** Total number of image replies in a thread (OP only). */
        images?: number;

        /** If the thread has reached bump limit (OP only). `1` = yes */
        bumplimit?: 1;

        /** If the thread has reached image limit (OP only). `1` = yes */
        imagelimit?: 1;

        /** UNIX timestamp of the last modification to the thread (OP only). */
        last_modified?: number;

        /** Category tag for `.swf` uploads (used on `/f/` board). Example: `"Game"` */
        tag?: string;

        /** SEO-friendly URL slug for the thread (OP only). Example: `"welcome-to-po"` */
        semantic_url?: string;

        /** Year the 4chan pass was purchased, if provided via 'since4pass'. Example: `2019` */
        since4pass?: number;

        /** Number of unique posters in the thread (OP only). */
        unique_ips?: number;

        /** If a mobile-optimized image exists for this post. `1` = yes */
        m_img?: 1;
    }

    /**
     * Response object for the `/[board]/thread/[op ID].json` endpoint.
     *
     * Example URL: [`https://a.4cdn.org/po/thread/570368.json`](https://a.4cdn.org/po/thread/570368.json)
     *
     * Each `/[board]/thread/[op ID].json` file represents a **single thread**,
     * consisting of the original post (OP) and all of its replies.
     */
    export interface ThreadResponse {
        /** Array of posts belonging to this thread (OP first, then replies). */
        posts: ThreadPost[];
    }

    /**
     * Represents a single post within a thread.
     */
    export interface ThreadPost {
        /** The numeric post ID. */
        no: number;

        /**
         * For replies: ID of the thread being replied to.
         * For OP: this value is always `0`.
         */
        resto: number;

        /** If the thread is pinned to the top of the board (OP only). `1` = yes */
        sticky?: 1;

        /** If the thread is closed to replies (OP only). `1` = yes */
        closed?: 1;

        /** Date and time string in format `MM/DD/YY(Day)HH:MM`, EST/EDT timezone. */
        now: string;

        /** UNIX timestamp when the post was created. */
        time: number;

        /** Name user posted with. Defaults to `"Anonymous"`. */
        name: string;

        /** The user's tripcode (e.g., `!tripcode` or `!!securetripcode`). */
        trip?: string;

        /** The poster's ID, if IDs are enabled. Example: `"AbC123ef"` */
        id?: string;

        /**
         * Capcode identifier for special posts.
         * Possible values: `mod`, `admin`, `admin_highlight`, `manager`, `developer`, `founder`
         */
        capcode?: string;

        /** ISO 3166-1 alpha-2 country code (if country flags are enabled). Example: `"US"`, `"JP"` */
        country?: string;

        /** Full country name (if country flags are enabled). Example: `"United States"` */
        country_name?: string;

        /** Board flag code (if board flags are enabled). Example: `"AB"` */
        board_flag?: string;

        /** Name of the board flag (if board flags are enabled). Example: `"Flag Name AB"` */
        flag_name?: string;

        /** Subject text (OP only). Example: `"Welcome to /po/!"` */
        sub?: string;

        /** Comment text (HTML escaped). */
        com?: string;

        /** Unix timestamp + microtime for uploaded attachment (if any). */
        tim?: number;

        /** Filename as it appeared on the poster's device. Example: `"image123"` */
        filename?: string;

        /**
         * File extension of the uploaded file.
         * Examples: `.jpg`, `.png`, `.gif`, `.pdf`, `.swf`, `.webm`
         */
        ext?: string;

        /** Size of the uploaded file in bytes. */
        fsize?: number;

        /** 24-character Base64-packed MD5 hash of the uploaded file. */
        md5?: string;

        /** Image width in pixels. */
        w?: number;

        /** Image height in pixels. */
        h?: number;

        /** Thumbnail width in pixels. */
        tn_w?: number;

        /** Thumbnail height in pixels. */
        tn_h?: number;

        /** If the post's attachment was deleted. `1` = yes */
        filedeleted?: 1;

        /** If the attachment image is spoilered. `1` = yes */
        spoiler?: 1;

        /** Custom spoiler ID for spoilered images (1-10). */
        custom_spoiler?: number;

        /** Total number of replies to the thread (OP only). */
        replies?: number;

        /** Total number of image replies to the thread (OP only). */
        images?: number;

        /** If bump limit has been reached (OP only). `1` = yes */
        bumplimit?: 1;

        /** If image limit has been reached (OP only). `1` = yes */
        imagelimit?: 1;

        /** Category tag for `.swf` uploads (used on `/f/` board). Example: `"Game"` */
        tag?: string;

        /** SEO-friendly URL slug for the thread (OP only). Example: `"welcome-to-po"` */
        semantic_url?: string;

        /** Year the 4chan Pass was purchased, if included via the "since4pass" field. Example: `2019` */
        since4pass?: number;

        /** Number of unique posters in the thread (OP only, only if not archived). */
        unique_ips?: number;

        /** If a mobile-optimized image exists for this post. `1` = yes */
        m_img?: 1;

        /** If the thread has been archived (OP only). `1` = yes */
        archived?: 1;

        /** UNIX timestamp when the thread was archived (OP only). */
        archived_on?: number;
    }

    /**
     * Response object for the `/[board]/threads.json` endpoint.
     *
     * Example URL: [`https://a.4cdn.org/po/threads.json`](https://a.4cdn.org/po/threads.json)
     *
     * The `threads.json` file provides a comprehensive list of all active threads on a board.
     * Each element in the array represents a page, which contains the threads currently visible on that page.
     *
     * Each thread entry includes:
     *  - The thread OP ID (`no`)
     *  - The page number where the thread is listed
     *  - A UNIX timestamp marking the last time the thread was modified
     *  - The number of replies a thread has received
     */
    export type ThreadsResponse = ThreadsPage[];

    /**
     * Represents a single index page within a board's thread listing.
     */
    export interface ThreadsPage {
        /** The index page number that the following `threads` array is on. Example: 1 */
        page: number;

        /** The array of thread entries present on this page. */
        threads: ThreadSummary[];
    }

    /**
     * Represents a summarized thread entry (used in `/threads.json` listings).
     */
    export interface ThreadSummary {
        /** The OP ID of the thread. Example: 570368 */
        no: number;

        /** The UNIX timestamp marking the last modification (post added, edited, deleted, or thread settings changed). Example: 1546294897 */
        last_modified: number;

        /** The total number of replies in the thread. Example: 2 */
        replies: number;
    }
}
