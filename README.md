# 24grid

24grid is a browser-based split-screen video composer for building cinematic multi-panel edits. It lets you choose a layout, import local video clips, drag clips into panels, adjust each clip's start time, resize panel dividers, preview the composition on a canvas, and export the result as an MP4.

The app is built with React, TypeScript, Vite, Tailwind CSS, WebCodecs, and `mp4-muxer`.

## Features

- Browser-native video composition with no server upload flow.
- Eight built-in split-screen layouts:
  - Side by Side
  - Stacked
  - Left Main
  - Right Main
  - Top Main
  - 2x2 Grid
  - Three Pips
  - Quad Pips
- Landscape and portrait output modes:
  - `16:9` renders at `1280x720`
  - `9:16` renders at `720x1280`
- Local video clip library with drag-and-drop upload.
- Drag clips from the library onto layout slots.
- Clear individual slots without removing clips from the library.
- Resize supported panel dividers directly in the preview.
- Per-slot timing offsets so each clip can start from a different timestamp.
- Live HTML canvas preview.
- MP4 export at 30 fps using H.264 through WebCodecs.

## How It Works

24grid keeps all video processing in the browser:

1. Video files are selected locally through the file picker or drag-and-drop.
2. Each file is represented with a local object URL and metadata from a hidden video element.
3. The chosen layout defines normalized panel rectangles.
4. The preview loop draws the assigned video frames into an HTML canvas using cover-fit cropping.
5. Export captures canvas frames, encodes them with `VideoEncoder`, muxes them with `mp4-muxer`, and downloads an `.mp4` file.

No backend is required for the current workflow.

## Requirements

- Node.js 18 or newer.
- npm.
- A modern Chromium-based browser for MP4 export, because export depends on WebCodecs `VideoEncoder`.

Previewing and arranging clips may work in more browsers than exporting, but MP4 export requires WebCodecs support for the configured H.264 codec.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

Run TypeScript checking:

```bash
npm run typecheck
```

## Project Structure

```text
.
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── src
    ├── App.tsx
    ├── ClipLibrary.tsx
    ├── LandingPage.tsx
    ├── LayoutPicker.tsx
    ├── PanelResizer.tsx
    ├── SlotTimingEditor.tsx
    ├── SplitPreview.tsx
    ├── layouts.ts
    ├── main.tsx
    ├── types.ts
    └── useCanvasPreview.ts
```

## Key Files

- `src/App.tsx` controls the main studio workflow, selected layout, clip assignments, timing offsets, playback state, aspect ratio, and export.
- `src/layouts.ts` defines the built-in layouts as normalized panel rectangles.
- `src/ClipLibrary.tsx` handles local video import, metadata extraction, clip thumbnails, and drag sources.
- `src/SplitPreview.tsx` owns the preview surface, hidden video elements, drop targets, slot clearing, and optional panel resizing.
- `src/useCanvasPreview.ts` runs the canvas render loop and draws clips or placeholders into each panel.
- `src/PanelResizer.tsx` detects shared layout edges and updates panel geometry during pointer dragging.
- `src/SlotTimingEditor.tsx` provides per-panel start-time controls.
- `src/LandingPage.tsx` renders the public-facing landing screen and entry point into the studio.

## Composition Workflow

1. Open the app and enter the studio.
2. Choose a layout.
3. Select `16:9` or `9:16`.
4. Add local video files to the clip library.
5. Drag clips onto preview slots.
6. Resize panel dividers where supported by the current layout.
7. Adjust clip start times if needed.
8. Preview playback.
9. Export an MP4.

## Export Behavior

The export path records the canvas at 30 fps and downloads an MP4 file named with the active layout id, for example:

```text
splitscreen-4-grid.mp4
```

Current export characteristics:

- Codec: H.264 via WebCodecs.
- Container: MP4 via `mp4-muxer`.
- Bitrate: `6_000_000`.
- Frame rate: `30`.
- Maximum duration: 60 seconds.
- Output resolution follows the selected aspect ratio.
- Audio is not currently muxed into the export.

## Known Limitations

- Export depends on browser WebCodecs support and may not work in every browser.
- Export is currently video-only.
- The maximum exported duration is capped at 60 seconds.
- Clip data is stored only in memory for the active session.
- Imported files are not persisted between refreshes.
- There is no backend, account system, project saving, or cloud storage in the current implementation.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- WebCodecs
- `mp4-muxer`

## Development Notes

- Layout panels use normalized `x`, `y`, `w`, and `h` values from `0` to `1`.
- The canvas preview always runs through `requestAnimationFrame` and reads the latest layout and video state through refs.
- The resize tool works by finding shared vertical or horizontal panel boundaries.
- Video clips are muted and looped in the preview.

## License

No license file is currently included.
