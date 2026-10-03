import C from "../config";
import { loadHistory } from "../utils";

// Warosu search results render one table per hit, each holding a comment cell
// whose id is empty. The thread id is only available from the row's links, so
// the post scraper cannot be reused here.
const RESULT_CELL = "#postform div.content table td.comment";
const THREAD_LINK = 'a[href*="/thread/"]';

const MATCH_CLASS = "in-history";

function threadIdOf(cell: Element): string | null {
    const link = cell.querySelector<HTMLAnchorElement>(THREAD_LINK);
    const id = link?.pathname.split("/").pop();
    return id && /^\d+$/.test(id) ? id : null;
}

function highlightSearchResults() {
    const history = loadHistory();
    if (!history) return;

    const cells = document.querySelectorAll<HTMLElement>(RESULT_CELL);

    for (const cell of cells) {
        const threadId = threadIdOf(cell);
        if (!threadId) continue;

        if (!(C.board + "." + threadId in history)) continue;

        cell.classList.add(MATCH_CLASS);
    }
}

export { highlightSearchResults };