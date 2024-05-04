// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import metablock from 'rollup-plugin-userscript-metablock';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'build/4chan-x-yt-playlist.user.js',
      format: 'es'
    },
    plugins: [typescript(), metablock({
      file: './metadata.json'
    })]
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'build/4chan-x-yt-playlist.min.user.js',
      format: 'es'
    },
    plugins: [typescript(), terser(), metablock({
      file: './metadata.json'
    })]
  }
];