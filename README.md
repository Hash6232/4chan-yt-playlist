# 4chan - YouTube Playlist

A userscript that wraps all YouTube links in a 4chan (or Warosu) thread into a playlist, playing videos one after another.

## Features

- Plays videos one after another from a scrollable track list
- Auto-updates playlist as new links are added to the thread
- Validates each link so only playable videos are queued
- Draggable dialog with track listing, track titles, and active track highlighting
- Previous / Next track controls and loop toggle
- Members-only video detection with automatic skip
- Video title fetching and prefetching around the current track
- Remembers last played track and dialog position across sessions
- 4chan X integration (header shortcut, notifications)
- Dedicated Warosu support

## Installation

Download from [GitHub Releases](https://github.com/Hash6232/4chan-yt-playlist/releases)

## Development

```bash
npm install
npm run build
```

Outputs to `build/`:
- `4chan-yt-playlist.user.js` — development build
- `4chan-yt-playlist.min.user.js` — minified build
- `4chan-yt-playlist.debug.user.js` — debug build with inline sourcemaps

## Compatibility

- 4chan (native & 4chan X)
- Warosu
