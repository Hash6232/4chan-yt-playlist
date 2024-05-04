import { Playlist } from "./playlist";

class Dialog {

    constructor(playlist: Playlist) {

        document.body.insertAdjacentHTML("beforeend", "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>");

        switch(location.hostname) {

            case "boards.4chan.org":
                // Retrieve last saved position from storage
                this.setPos(GM_getValue("4chan Dialog Coordinates", [ "10%", "5%", null, null ]));

                // Add dialog toggle
                document.getElementById("shortcut-qr")?.insertAdjacentHTML("beforebegin", "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a id=\"playlist-toggle\" class=\"disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 512 512\"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill=\"currentColor\" d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\"/></svg></a></span>");
                break;
                

            case "warosu.org":
                // Retrieve last saved position from storage
                this.setPos(GM_getValue("Warosu Dialog Coordinates", [ "10%", "5%", null, null ]));

                const childNodes = [...document.body.childNodes];
                const delimeter = childNodes.find(n => n.nodeType === 3 &&
                    (n as HTMLElement).nextElementSibling?.tagName === "DIV"
                ) as HTMLElement;
                    
                if (! delimeter?.nextElementSibling) throw new Error("Unable to append toggle link.");

                delimeter.nextElementSibling.insertAdjacentHTML("beforebegin", "[ <a id=\"playlist-toggle\" href=\"javascript:;\" title=\"Toggle YouTube playlist\">playlist</a> ]")
                break;

        }

        // Dialog topbar
        const move = this.node?.querySelector(".move") as HTMLElement;
        const jump = this.node?.querySelector(".jump") as HTMLAnchorElement;
        const close = this.node?.querySelector(".close") as HTMLAnchorElement;

        move.addEventListener("mousedown", toggleDrag);
        jump.addEventListener("click", () => { playlist.jumpTo(playlist.track) });
        close.addEventListener("click", () => { playlist.dialog?.toggle(true) });

        // Dialog drag defuser
        document.addEventListener("mouseup", toggleDrag);

        // Dialog tabs events
        const tabs = this.node?.querySelector("ul") as HTMLUListElement;
        tabs.addEventListener("click", (e) => {
            if (! playlist.player) return;
            if (! e.target || (e.target as HTMLElement).tagName !== "A") return;
            const index = (e.target as HTMLElement).dataset.page || "0";
            playlist.player.cuePlaylist(playlist.toPages()[parseInt(index)])
        });

        // Dialog toggle
        this.shortcut?.addEventListener("click", () => {
            if (playlist.checking || playlist.isEmpty()) return;
            if (! playlist.player) return playlist.initAPI();

            return playlist.dialog?.toggle()
        })

        // Drag callback functions

        function toggleDrag(e: MouseEvent) {

            if (! playlist.dialog || ! playlist.dialog.node) return;
        
            switch(e.type) {
                case "mouseup":
                    if (! playlist.dialog.node.classList.contains("dragging")) return;
        
                    playlist.dialog.node.classList.remove("dragging");
                    document.removeEventListener("mousemove", moveDialog);
        
                    let key: string;
                    switch (location.hostname) {
                        case "boards.4chan.org":
                            key = "4chan Dialog Coordinates";
                            break;
                        case "warosu.org":
                            key = "Warosu Dialog Coordinates";
                            break;
                        default:
                            return;
                    }
        
                    GM_setValue(key, [ 
                        playlist.dialog.node.style.top, playlist.dialog.node.style.right, 
                        playlist.dialog.node.style.bottom, playlist.dialog.node.style.left 
                    ]);
        
                    break;
        
                case "mousedown":
                    if (e.button !== 0) return;
        
                    e.preventDefault(); // avoid selection while dragging
                    
                    const rect = playlist.dialog.node.getBoundingClientRect();
        
                    playlist.dialog.size[0] = rect.width;
                    playlist.dialog.size[1] = rect.height;
        
                    playlist.dialog.cursorPos[0] = e.x - rect.x;
                    playlist.dialog.cursorPos[1] = e.y - rect.y;
        
                    if (document.getElementById("header-bar")) {
                        playlist.dialog.header[0] = document.getElementById("header-bar")?.getBoundingClientRect().y || 0;
                        playlist.dialog.header[1] = document.getElementById("header-bar")?.offsetHeight || 0;
                        playlist.dialog.header[2] = document.documentElement.classList.contains("fixed");
                        playlist.dialog.header[3] = document.documentElement.classList.contains("autohide");
                    }
        
                    playlist.dialog.node.classList.add("dragging");
                    document.addEventListener("mousemove", moveDialog);
        
                    break;
            }
        
        }
        
        function moveDialog(e: MouseEvent) {
        
            if (! playlist.dialog || ! playlist.dialog.node) return;
        
            e.preventDefault(); // avoid selection while dragging
        
            const sW = document.documentElement.clientWidth,
                sH = document.documentElement.clientHeight,
                x = e.x - playlist.dialog.cursorPos[0],
                y = e.y - playlist.dialog.cursorPos[1],
                w = playlist.dialog.size[0],
                h = playlist.dialog.size[1],
                maxX = sW - w;
        
            let minY = 0, maxY = sH - h;
        
            if (document.getElementById("header-bar")) {
                const fixed = playlist.dialog.header[2];
                const autohide = playlist.dialog.header[3];
        
                if (fixed && ! autohide) {
                    if (playlist.dialog.header[0] < playlist.dialog.header[1]) {
                        minY += playlist.dialog.header[1];
                    } else {
                        maxY -= playlist.dialog.header[1];
                    }
                }
            }
        
            if (y > maxY) {
                playlist.dialog.node.style.bottom = 0 + "px";
                playlist.dialog.node.style.removeProperty("top");
            } else {
                playlist.dialog.node.style.top = y > minY ? ((y * 100) / sH) + "%" : minY + "px";
                playlist.dialog.node.style.removeProperty("bottom");
            }
            
            if (x > maxX) {
                playlist.dialog.node.style.right = 0 + "px";
                playlist.dialog.node.style.removeProperty("left");
            } else {
                playlist.dialog.node.style.left = x > 0 ? ((x * 100) / sW) + "%" : 0 + "px";
                playlist.dialog.node.style.removeProperty("right");
            }
        
        }

    }

    size: [ w: number, h: number ] = [ 0, 0 ];
    cursorPos: [ x: number, y: number ] = [ 0, 0 ];
    header: [ y: number, o: number, fixed: boolean, autohide: boolean ] = [ 0, 0, true, false ];

    get node() {
        return document.getElementById("playlist-embed")
    }

    get shortcut() {
        return document.getElementById("playlist-toggle")
    }

    toggle(close?: boolean) {

        if (close || ! this.node?.classList.contains("hide")) {
            this.node?.classList.add("hide");
            this.shortcut?.classList.add("disabled");
        } else {
            this.node?.classList.remove("hide");
            this.shortcut?.classList.remove("disabled");
        }
        
    }

    updateTabs(amount: number) {

        const tabs = this.node?.querySelector("ul");
        if (! tabs) return console.error("No <ul> present in dialog.");
        while (tabs?.lastChild) tabs.removeChild(tabs.lastChild);

        for (let i = 0; i < amount; i++) {
            tabs.insertAdjacentHTML("beforeend", `<li><a href="javascript:;" data-page="${i}">${i + 1}</a></li>`);
        }

    }

    setPos(coordinates: (string | null)[]) {
        coordinates.forEach((pos, index) => {
            if (! pos || ! this.node) return;

            switch(index) {
                case 0:
                    this.node.style.top = pos;
                    break;
                
                case 1:
                    this.node.style.right = pos;
                    break;
                
                case 2:
                    this.node.style.bottom = pos;
                    break;
                
                case 3:
                    this.node.style.left = pos;
                    break;
            }
        })
    }

}

export { Dialog }