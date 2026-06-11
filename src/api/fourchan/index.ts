/**
 * 4chan API Client
 *
 * @description
 * A typed client for interacting with the official 4chan API endpoints,
 * served under the `a.4cdn.org` domain as static JSON files.
 *
 * @see https://github.com/4chan/4chan-API
 */

import type { FourchanAPIResponses } from "./types";

/**
 * Base URL for 4chan's JSON API.
 * @example "https://a.4cdn.org"
 */
export const API_BASE = "https://a.4cdn.org";

/**
 * Media content base URL for user-submitted attachments.
 * @example "https://i.4cdn.org"
 */
export const MEDIA_BASE = "https://i.4cdn.org";

/**
 * 4chan API client functions grouped in a single namespace-like object.
 */
export const FourchanAPIClient = {
    /**
     * Fetch all available boards and their metadata.
     *
     * @endpoint `GET https://a.4cdn.org/boards.json`
     * @returns A list of boards and their configuration options.
     * @example
     * const boards = await FourchanAPIClient.getBoards();
     */
    async getBoards(): Promise<FourchanAPIResponses.BoardsResponse> {
        const res = await fetch(`${API_BASE}/boards.json`);
        if (!res.ok) throw new Error(`Failed to fetch boards: ${res.status}`);
        return res.json();
    },

    /**
     * Fetch all active threads on a given board.
     *
     * @endpoint `GET https://a.4cdn.org/{board}/threads.json`
     * @param board - The board name (e.g. "po", "g", "a").
     * @returns A list of thread summaries, including modification time and reply count.
     * @example
     * const threads = await FourchanAPIClient.getThreads("po");
     */
    async getThreads(board: string): Promise<FourchanAPIResponses.ThreadsResponse> {
        const res = await fetch(`${API_BASE}/${board}/threads.json`);
        if (!res.ok)
            throw new Error(
                `Failed to fetch threads for /${board}/: ${res.status}`
            );
        return res.json();
    },

    /**
     * Fetch the catalog of a board.
     *
     * @endpoint `GET https://a.4cdn.org/{board}/catalog.json`
     * @param board - The board name (e.g. "po", "a").
     * @returns A JSON representation of the board catalog with OPs and preview replies.
     * @example
     * const catalog = await FourchanAPIClient.getCatalog("po");
     */
    async getCatalog(board: string): Promise<FourchanAPIResponses.CatalogResponse> {
        const res = await fetch(`${API_BASE}/${board}/catalog.json`);
        if (!res.ok)
            throw new Error(
                `Failed to fetch catalog for /${board}/: ${res.status}`
            );
        return res.json();
    },

    /**
     * Fetch the archive list for a given board.
     *
     * @endpoint `GET https://a.4cdn.org/{board}/archive.json`
     * @param board - The board name.
     * @returns A list of thread IDs that have been archived (no longer accepting posts).
     * @example
     * const archive = await FourchanAPIClient.getArchive("po");
     */
    async getArchive(board: string): Promise<FourchanAPIResponses.ArchiveResponse> {
        const res = await fetch(`${API_BASE}/${board}/archive.json`);
        if (!res.ok)
            throw new Error(
                `Failed to fetch archive for /${board}/: ${res.status}`
            );
        return res.json();
    },

    /**
     * Fetch a specific index page for a board.
     *
     * @endpoint `GET https://a.4cdn.org/{board}/{page}.json`
     * @param board - The board name.
     * @param page - Index page number (1-based).
     * @returns The threads and preview replies found on the given index page.
     * @example
     * const indexPage = await FourchanAPIClient.getIndexPage("po", 1);
     */
    async getIndexPage(
        board: string,
        page: number
    ): Promise<FourchanAPIResponses.IndexPageResponse> {
        const res = await fetch(`${API_BASE}/${board}/${page}.json`);
        if (!res.ok)
            throw new Error(
                `Failed to fetch index page ${page} for /${board}/: ${res.status}`
            );
        return res.json();
    },

    /**
     * Fetch a full thread including the OP and all replies.
     *
     * @endpoint `GET https://a.4cdn.org/{board}/thread/{opId}.json`
     * @param board - The board name (e.g. "po").
     * @param opId - The OP (original post) ID of the thread.
     * @returns The complete thread data with all replies.
     * @example
     * const thread = await FourchanAPIClient.getThread("po", 570368);
     */
    async getThread(
        board: string,
        opId: number
    ): Promise<FourchanAPIResponses.ThreadResponse> {
        const res = await fetch(`${API_BASE}/${board}/thread/${opId}.json`);
        if (!res.ok)
            throw new Error(
                `Failed to fetch thread /${board}/${opId}/: ${res.status}`
            );
        return res.json();
    },
};
