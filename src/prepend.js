const fs = require('fs')

try {
    // Read metadata JSON
    const meta = fs.readFileSync('./src/metadata.json', 'utf8');

    // Parse data and calculate padding offset
    const json = JSON.parse(meta);
    const offset = Math.max(0, ...Object.keys(json).map(k => k.length));

    // Fill header line by line with JSON content
    let header = "// ==UserScript==";

    for (const k in json) {
        const prefix = "\n// @" + k + " ".repeat(offset + 1 - k.length);

        if (! Array.isArray(json[k])) {
            header += prefix + json[k];
        } else {
            for (const i in json[k]) {
                header += prefix + json[k][i];
            }
        }
    }

    header += "\n// ==/UserScript==";

    // Overwrite the bundled script prepending the metadata
    input = fs.readFileSync('./4chan-x-yt-playlist.user.js', 'utf8');
    fs.writeFileSync('./4chan-x-yt-playlist.user.js', header + "\n\n" + input);
} catch (err) {
    console.log(err)
}
