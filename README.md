# Video Stitcher

Browser-based video editing tool that combines, overlays, and enriches videos — entirely client-side. No server, no uploads. All processing happens in your browser.

## Highlights

- 🎬 **Stitch videos** sequentially with 17 scene transitions (fade, wipe, slide, zoom, and more)
- 🖼️ **Picture-in-Picture overlay** — place a video or image on top of another, with position, size, and flip controls
- 🔊 **Side-by-side mode** — combine two videos horizontally
- ✏️ **Text overlays** — add custom text with size, position, color, and multiline support
- 🎵 **Background music** — add music to stitched videos (mix or replace)
- 💾 **Auto-save** — video list is persisted automatically; switch tabs or refresh without losing your work
- 🚫 **100% private** — files never leave your machine

## Overview

Video Stitcher is a client-side video editing web application. It uses [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) to perform video encoding, filtering, and processing directly in the browser — no backend server required.

Built with React and TypeScript, it provides a drag-and-drop interface for arranging video clips, applying transitions, adding overlays and text, and exporting the result as an MP4 file.

https://github.com/user-attachments/assets/7a79b571-636e-4fd0-85d3-5b782cd3ebbe

## Tech Stack

| Technology | Purpose |
|---|---|
| [React 18](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) | In-browser video processing |
| [react-dropzone](https://react-dropzone.js.org/) | Drag-and-drop file uploads |

## Installation

```bash
git clone https://github.com/yourname/video-stitcher.git
cd video-stitcher
npm install
```

## Development

```bash
npm run dev
```

This starts the Vite dev server (typically at `http://localhost:5173`). The app requires Cross-Origin Isolation headers (`COOP`/`COEP`) for FFmpeg.wasm — these are configured in `vite.config.ts` automatically.

## Production Build

```bash
npm run build
```

Output is generated in the `dist/` folder. Serve it with any static file server.

## Usage

### Stitching Videos

1. **Add videos** — drag and drop video files (MP4, WebM, MOV, MKV, AVI) into the drop zone
2. **Arrange the order** — drag items in the list to reorder, or use the duplicate/remove buttons
3. **Configure transitions** — select a transition type and duration for each clip boundary
4. **Optional: add text** — expand a clip's settings and type text overlay content
5. **Stitch** — click "Stitch Videos" and wait for the export to complete
6. **Download** — save the resulting MP4 or preview it in a new tab

### Picture-in-Picture Overlay

1. Switch to the **Overlay** mode in the header
2. Select a **main video** (background) and an **overlay** (picture-in-picture source — video or image)
3. Configure position, size, audio source, video length, and horizontal flip options
4. Click **Create Picture-in-Picture**

### Side-by-Side Mode

1. Switch to the **Side-by-Side** mode in the header
2. Select a left and right video
3. Click **Create Side-by-Side**

### Background Music

After stitching, click **Add Background Music** in the result panel. Choose a music file and select either *Mix* (layered over original audio) or *Replace* (original audio removed).

### Saving and Loading

- **Save List** — exports the current video list (order, transitions, text overlays) as a JSON file
- **Load List** — imports a previously saved JSON file; video files are retrieved from the browser's local storage
- **Clear List** — removes all videos and resets the project

## Supported Formats

| Type | Formats |
|---|---|
| Video | MP4, WebM, MOV, MKV, AVI |
| Image (overlay) | PNG, JPG, WebP, GIF |
| Audio (music) | MP3, WAV, and common browser-supported audio |

## Browser Support

Requires a modern browser with [WebAssembly](https://caniuse.com/wasm) and [SharedArrayBuffer](https://caniuse.com/sharedarraybuffer) support (Chrome, Edge, Firefox, Safari 16.4+).

## License

This project is open source. See [LICENSE](LICENSE) for details.
