class Config {
    readonly isFourchan: boolean;
    readonly isWarosu: boolean;
    readonly board: string;
    readonly thread: number;

    private _parsingUpdate: boolean = false;

    constructor() {
        this.isFourchan = location.hostname === "boards.4chan.org";
        this.isWarosu = location.hostname === "warosu.org";

        const pathname = location.pathname.split("/");
        this.board = pathname[1];
        this.thread = parseInt(pathname[3]) || 0;
    }

    get threadFullId() {
        return this.board + "." + this.thread;
    }

    // Warosu search results, e.g. /jp/?task=search2&... The query string is the
    // only discriminator, which is why this is checked at runtime rather than
    // relying on the userscript match alone.
    get isWarosuSearch() {
        if (!this.isWarosu) return false;

        return (new URLSearchParams(location.search).get("task") ?? "").startsWith("search");
    }

    get parsingUpdate() {
        return this._parsingUpdate;
    }

    set parsingUpdate(state: boolean) {
        this._parsingUpdate = state;
    }

    readonly native = {
        get extensionDisabled() {
            return !!unsafeWindow?.Config.disableAll;
        },
        get threadUpdaterEnabled() {
            return !!unsafeWindow?.Config.threadUpdater;
        },
        get threadDead() {
            return !!unsafeWindow?.ThreadUpdater.dead;
        },
        get headerEnabled() {
            return !!unsafeWindow?.Config.dropDownNav;
        },
    };

    readonly fourchanX = {
        get enabled() {
            return !!unsafeWindow?.FCX;
        },
        get fixedHeader() {
            if (!this.enabled) return false;
            return document.documentElement.classList.contains("fixed");
        },
        get autohideHeader() {
            if (!this.enabled) return false;
            return document.documentElement.classList.contains("autohide");
        },
        get bottomHeader() {
            if (!this.enabled) return false;
            return document.documentElement.classList.contains("bottom-header");
        },
    };
}

export default new Config();
