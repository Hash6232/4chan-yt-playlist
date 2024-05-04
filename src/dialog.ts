class Dialog {

    constructor() {

        document.body.insertAdjacentHTML("beforeend", "<div id=\"playlist-embed\" class=\"dialog hide\"><div><ul class=\"tabs\"></ul><div class=\"move\"></div><a class=\"jump\" href=\"javascript:;\" title=\"Jump to post\">→</a><a class=\"close\" href=\"javascript:;\" title=\"Close\">×</a></div><div id=\"playlist\"></div></div>");

        switch(location.hostname) {

            case "boards.4chan.org":
                // Retrieve last saved position from storage
                this.setPos(GM_getValue("4chan Dialog Coordinates", [ "10%", "5%", null, null ]));

                const quickReply = document.getElementById("shortcut-qr");

                if (! quickReply) throw new Error("Unable to append toggle button.");

                quickReply.insertAdjacentHTML("beforebegin", "<span id=\"shortcut-playlist\" class=\"shortcut brackets-wrap\"><a id=\"playlist-toggle\" class=\"disabled\" title=\"Toggle YouTube playlist\" href=\"javascript:;\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 512 512\"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill=\"currentColor\" d=\"M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V192h416v234z\"/></svg></a></span>");
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

    }

    size: [ w: number, h: number ] = [ 0, 0 ];
    cursorPos: [ x: number, y: number ] = [ 0, 0 ];
    header: [ y: number, o: number, fixed: boolean, autohide: boolean ] = [ 0, 0, true, false ];

    get node() {
        return document.getElementById("playlist-embed")
    }

    get toggle() {
        return document.getElementById("playlist-toggle")
    }

    open() {
        if (! this.node || ! this.toggle) return;

        this.node.classList.remove("hide");
        this.toggle.classList.remove("disabled");
    }

    close() {
        if (! this.node || ! this.toggle) return;

        this.node.classList.add("hide");
        this.toggle.classList.add("disabled");
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