// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import { importAsString } from "rollup-plugin-string-import";
import { minify as htmlMinifier } from "html-minifier-terser";
import styles from "rollup-plugin-styler";
import terser from "@rollup/plugin-terser";
import metablock from "rollup-plugin-userscript-metablock";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

export default [
    {
        input: "src/index.ts",
        output: {
            file: "build/4chan-yt-playlist.user.js",
            format: "es"
        },
        plugins: [
            typescript({
                tsconfig: "./tsconfig.json",
            }),
            customHtmlMinifyPlugin(),
            importAsString({ include: "**/*.html" }),
            metablock({
                file: "", // IMPORTANT or it defaults to ./metablock.json
                override: { ...pkg.metadata },
            }),
            styles({
                minimize: true,
                mode: ["inject", { singleTag: true }],
            }),
        ],
    },
    {
        input: "src/index.ts",
        output: {
            file: "build/4chan-yt-playlist.min.user.js",
            format: "es",
        },
        plugins: [
            typescript({
                tsconfig: "./tsconfig.json",
            }),
            customHtmlMinifyPlugin(),
            importAsString({ include: "**/*.html" }),
            terser(),
            metablock({
                file: "", // IMPORTANT or it defaults to ./metablock.json
                override: { ...pkg.metadata },
            }),
            styles({
                minimize: true,
                mode: ["inject", { singleTag: true }],
            }),
        ],
    },
    {
        input: "src/index.ts",
        output: {
            file: "build/4chan-yt-playlist.debug.user.js",
            format: "es",
            sourcemap: "inline",
        },
        plugins: [
            typescript({
                tsconfig: "./tsconfig.json",
            }),
            customHtmlMinifyPlugin(),
            importAsString({ include: "**/*.html" }),
            metablock({
                file: "", // IMPORTANT or it defaults to ./metablock.json
                override: { ...pkg.metadata },
            }),
            styles({
                minimize: true,
                mode: ["inject", { singleTag: true }],
            }),
        ],
    },
];

function customHtmlMinifyPlugin() {
    return {
        name: "html-minify",
        async transform(code, id) {
            if (!id.endsWith(".html")) return null;

            const result = await htmlMinifier(code, {
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
            });

            return {
                code: result,
                map: null,
            };
        },
    };
}
