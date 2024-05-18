import { C } from "./config";
import { Playlist } from "./playlist";

class Dialog {

    constructor(playlist: Playlist) {

        document.addEventListener("DOMContentLoaded", () => {

            // HTML
            document.body.insertAdjacentHTML("beforeend", "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>");

            // Dialog topbar
            const tabs = this.self?.querySelector("ul") as HTMLUListElement;
            const move = this.self?.querySelector(".move") as HTMLElement;
            const jump = this.self?.querySelector(".jump") as HTMLAnchorElement;
            const close = this.self?.querySelector(".close") as HTMLAnchorElement;

            tabs.addEventListener("click", switchTab);
            move.addEventListener("mousedown", toggleDrag);
            jump.addEventListener("click", () => { playlist.jumpTo(playlist.track) });
            close.addEventListener("click", () => { this.toggle(true) });
            document.addEventListener("mouseup", toggleDrag);

            // Set position from cache
            switch (true) {
                case C.fourchan:
                    setPos(GM_getValue("4chan Dialog Coordinates", [ "10%", "5%", null, null ]));
                    break;

                case C.warosu:
                    setPos(GM_getValue("Warosu Dialog Coordinates", [ "10%", "5%", null, null ]));
                    break;
            }

        });

        // Toggler

        document.addEventListener("DOMContentLoaded", () => {

            switch (true) {
                case C.fourchan:
                    document.getElementById("navtopright")?.insertAdjacentHTML("afterbegin", "[<a class=\"playlist-toggle native\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a>] ");
                    document.getElementById("navbotright")?.insertAdjacentHTML("afterbegin", "[<a class=\"playlist-toggle native\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a>] ");
                    document.getElementById("settingsWindowLinkMobile")?.insertAdjacentHTML("beforebegin", "<a class=\"playlist-toggle native\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a> ");

                    document.querySelectorAll(".playlist-toggle.native").forEach((l) => { (l as HTMLElement).onclick = initOrToggle });
                    break;

                case C.warosu:
                    const lastLink = document.getElementById("p" + C.thread)?.querySelector("a:last-of-type");
                    lastLink?.nextElementSibling?.insertAdjacentHTML("beforebegin", "[<a class=\"playlist-toggle\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">Playlist</a>]");

                    (document.querySelector(".playlist-toggle") as HTMLElement).onclick = initOrToggle;
                    break;
            }

        });

        document.addEventListener("4chanXInitFinished", () => {

            document.getElementById("shortcut-qr")?.insertAdjacentHTML("beforebegin", "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a class=\"playlist-toggle disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><span class=\"icon--alt-text\">YouTube Playlist</span><svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\" fill=\"currentColor\" /></svg></a></span>");

            (document.querySelector(".playlist-toggle:not(.native)") as HTMLElement).onclick = initOrToggle;

        });

        // Local functions

        function switchTab(e: MouseEvent) {

            if (! playlist.player) return;
            if (! (e.target as HTMLElement)?.dataset.page) return;
            const index = (e.target as HTMLElement).dataset.page || "0";
            playlist.player.cuePlaylist(playlist.toPages()[parseInt(index)]);

        };

        function initOrToggle(): void {

            if (playlist.checking || playlist.isEmpty()) return;
            if (! playlist.player) return initAPI();

            return playlist.dialog?.toggle()

        }

        function toggleDrag(e: MouseEvent) {

            if (! playlist.dialog?.self) return;
        
            switch(e.type) {
                case "mouseup":
                    if (! playlist.dialog.dragging) return;
        
                    playlist.dialog.dragging = false;
                    document.removeEventListener("mousemove", moveDialog);
        
                    GM_setValue((C.fourchan ? "4chan" : "Warosu") + " Dialog Coordinates", [ 
                        playlist.dialog.self.style.top, playlist.dialog.self.style.right, 
                        playlist.dialog.self.style.bottom, playlist.dialog.self.style.left 
                    ]);
        
                    break;
        
                case "mousedown":
                    if (e.button !== 0) return;
        
                    e.preventDefault(); // avoid selection while dragging
                    
                    const rect = playlist.dialog.self.getBoundingClientRect();
        
                    playlist.dialog.snapshot.size[0] = rect.width;
                    playlist.dialog.snapshot.size[1] = rect.height;
        
                    playlist.dialog.snapshot.cursor[0] = e.x - rect.x;
                    playlist.dialog.snapshot.cursor[1] = e.y - rect.y;

                    if (C.fourchan && (C.fixedNav || C.fixedHeader)) {
                        const topbar = document.getElementById(C.fourchanX ? "header-bar" : "boardNavMobile");

                        if (topbar) {
                            playlist.dialog.snapshot.topbar[0] = topbar.getBoundingClientRect().y || 0;
                            playlist.dialog.snapshot.topbar[1] = topbar.offsetHeight || 0;
                            playlist.dialog.snapshot.topbar[2] = C.fourchanX ? C.fixedHeader : C.fixedNav;
                            playlist.dialog.snapshot.topbar[3] = C.fourchanX ? C.autohideHeader : C.autohideNav;
                        }
                    }
        
                    playlist.dialog.dragging = true;
                    document.addEventListener("mousemove", moveDialog);
        
                    break;
            }
        
        };
        
        function moveDialog(e: MouseEvent) {
        
            if (! playlist.dialog?.self) return;
        
            e.preventDefault(); // avoid selection while dragging
        
            const sW = document.documentElement.clientWidth,
                sH = document.documentElement.clientHeight,
                x = e.x - playlist.dialog.snapshot.cursor[0],
                y = e.y - playlist.dialog.snapshot.cursor[1],
                w = playlist.dialog.snapshot.size[0],
                h = playlist.dialog.snapshot.size[1],
                maxX = sW - w;
        
            let minY = 0, maxY = sH - h;
        
            if (playlist.dialog.snapshot.topbar[2]) {
                const [ y, offset, fixed, autohide ] = playlist.dialog.snapshot.topbar;

                if (fixed && ! autohide) {
                    if (y < offset) {
                        minY += offset;
                    } else {
                        maxY -= offset;
                    }
                }
            }
        
            if (y > maxY) {
                playlist.dialog.self.style.bottom = 0 + "px";
                playlist.dialog.self.style.removeProperty("top");
            } else {
                playlist.dialog.self.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
                playlist.dialog.self.style.removeProperty("bottom");
            }
            
            if (x > maxX) {
                playlist.dialog.self.style.right = 0 + "px";
                playlist.dialog.self.style.removeProperty("left");
            } else {
                playlist.dialog.self.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
                playlist.dialog.self.style.removeProperty("right");
            }
        
        };

        function initAPI() {

            if (playlist.state > 0 || playlist.player) return;
            if (playlist.state < 0) return failedLoad();
            
            playlist.state = 1;
        
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(script);
        
            setTimeout(() => {
                if (playlist.state < 1) return;
                playlist.state = -1;
                failedLoad();
            }, 5000);
        
            script.onerror = () => { failedLoad(); playlist.state = -1; };
        
            function failedLoad() {
                const msg = "Unable to load YouTube Iframe API.\nPress F12 and follow the instructions in the console.";

                switch(true) {
                    case C.fourchanX:
                        document.dispatchEvent(new CustomEvent("CreateNotification", {
                            detail: { type: "error", content: msg }
                        }));
                        break;

                    default:
                        alert(msg);
                        break;
                }

                console.info("Unable to load YouTube Iframe API\n\n" +
                    "4chanX's Settings > Advanced > Javascript Whitelist\n\n" +
                    "  https://www.youtube.com/iframe_api\n" +
                    "  https://www.youtube.com/s/player/" +
                    "\n\nFilters in your AdBlock extension\n\n" +
                    "  @@||www.youtube.com/iframe_api$script,domain=4chan.org\n" +
                    "  @@||www.youtube.com/s/player/*$script,domain=4chan.org\n"
                )
            }
        
        };

        function setPos(coordinates: (string | null)[]) {            
            coordinates.forEach((pos, index) => {
                if (! pos || ! playlist.dialog?.self) return;
    
                switch(index) {
                    case 0:
                        playlist.dialog.self.style.top = pos;
                        break;
                    
                    case 1:
                        playlist.dialog.self.style.right = pos;
                        break;
                    
                    case 2:
                        playlist.dialog.self.style.bottom = pos;
                        break;
                    
                    case 3:
                        playlist.dialog.self.style.left = pos;
                        break;
                }
            })
        };

    }

    dragging = false;
    snapshot = {
        size: [0, 0] as [ w: number, h: number ],
        cursor: [0, 0] as [ x: number, y: number ],
        topbar: [0, 0, false, false ] as [ y: number, offset: number, fixed: boolean, autohide: boolean ]
    }

    get self() {
        return document.getElementById("playlist-embed")
    }

    get toggleBtn() {
        return document.querySelector(".playlist-toggle:not(.native)") as HTMLElement | null
    }

    toggle(close?: boolean) {

        if (close || ! this.self?.classList.contains("hide")) {
            this.self?.classList.add("hide");
            if (C.fourchanX) this.toggleBtn?.classList.add("disabled");
            
        } else {
            this.self?.classList.remove("hide");
            if (C.fourchanX) this.toggleBtn?.classList.remove("disabled");
        }
        
    }

    updateTabs(amount: number) {

        const tabs = this.self?.querySelector("ul");
        if (! tabs) return console.error("No <ul> present in dialog.");
        while (tabs?.lastChild) tabs.removeChild(tabs.lastChild);

        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);
        }

    }

}

 export { Dialog }