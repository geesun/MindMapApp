# MindMap

A lightweight, cross-platform mind map desktop application built with **Tauri 2 + Vue 3 + TypeScript**.

---

## Features

### Core Editing
- Create, open, and save mind maps as `.mindmap.md` files (Markdown-based, human-readable format)
- Import any standard `.md` file and automatically convert headings / lists into a mind map tree
- Add child nodes (`Tab`), sibling nodes (`Enter`), delete nodes (`Delete` / `Backspace`)
- Rename nodes inline with double-click or `F2`
- Drag & drop to reparent nodes
- Promote a node up one level (`Shift+Tab`)
- Copy / Cut / Paste nodes (`Cmd/Ctrl + C/X/V`)
- Full Undo / Redo (`Cmd/Ctrl + Z / Shift+Z`)

### Layout
- **Radial** — nodes radiate outward from the center
- **Tree Left→Right** — classic horizontal tree
- **Tree Top→Bottom** — vertical tree

### Styling
- Per-node background color, text color, and shape (`rect`, `rounded`, `pill`, `ellipse`, `hexagon`)
- Bold / italic / underline / strikethrough text
- Global connector line style: color, width, type (`straight` / `curved`), curve mode
- Canvas background: solid color + optional pattern (`none`, `dots`, `grid`, `diagonal`)
- Dark / Light theme toggle

### File & Safety
- **Autosave** — 30-second debounce; files with a saved path are updated in-place silently; new unsaved maps are written to a draft in `AppLocalData/drafts/`
- **Draft recovery** — welcome screen lists unsaved drafts so you can recover after a crash; drafts are automatically deleted when the file is properly saved
- **Unsaved-changes guard** — prompted when closing the window, pressing `Cmd+Q`, creating a new map, or opening another file
- Recent files list on the welcome screen

### Export
- Export canvas as **PNG** or **SVG**

### UI / UX
- Welcome screen with quick-action cards and recent/draft file lists
- Status bar showing node count, selected node, autosave state, layout, and zoom controls
- Chinese / English interface toggle
- Keyboard shortcuts for all common actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Pinia |
| Desktop shell | Tauri 2 (Rust) |
| Rendering engine | LeaferJS |
| Build tool | Vite |

---

## Development Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Rust (stable) | latest | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Platform deps | — | See [Tauri prerequisites](https://tauri.app/start/prerequisites/) |

> **macOS** — Xcode Command Line Tools required: `xcode-select --install`
>
> **Windows** — Microsoft C++ Build Tools (MSVC) required.
>
> **Ubuntu** — `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Install dependencies

```bash
npm install
```

### Start dev mode (hot-reload)

```bash
npm run tauri dev
```

### Type check only

```bash
npx tsc --noEmit
```

### Rust compile check

```bash
cd src-tauri && cargo check
```

---

## Building Release Packages

### macOS — Installation Note

macOS may show **"MindMap is damaged and can't be opened"** for unsigned builds downloaded from the internet. This is a Gatekeeper restriction, not an actual problem with the file. To fix it, run this command in Terminal after moving the app to `/Applications`:

```bash
xattr -cr /Applications/MindMap.app
```

Then open the app normally.

---

### macOS — Universal DMG (arm64 + x86_64)

Use the provided script on any Mac (Apple Silicon or Intel):

```bash
./scripts/build-dmg.sh
```

The script will:
1. Check that `node`, `npm`, `cargo`, `rustup` are installed
2. Install both `aarch64-apple-darwin` and `x86_64-apple-darwin` Rust targets
3. Run `npm install`
4. Build a Universal Binary DMG via `npx tauri build --target universal-apple-darwin`

Output:
```
src-tauri/target/universal-apple-darwin/release/bundle/dmg/MindMap_0.1.0_universal.dmg
```

You can also build for a single architecture:

```bash
# Apple Silicon only
npx tauri build --target aarch64-apple-darwin

# Intel only
npx tauri build --target x86_64-apple-darwin
```

---

### Windows — NSIS installer + MSI

Run on a Windows machine (PowerShell or CMD):

```bat
scripts\build-win.bat
```

The script will:
1. Check that `node`, `npm`, `cargo`, `rustup` are installed
2. Install the `x86_64-pc-windows-msvc` Rust target
3. Run `npm install`
4. Build via `npx tauri build --target x86_64-pc-windows-msvc`

Output:
```
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\MindMap_0.1.0_x64-setup.exe
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\MindMap_0.1.0_x64_en-US.msi
```

---

### Ubuntu — DEB package

Run on an Ubuntu machine:

```bash
./scripts/build-deb.sh
```

The script will:
1. Check that `node`, `npm`, `cargo`, `rustup` are installed
2. Install the `x86_64-unknown-linux-gnu` Rust target
3. Run `npm install`
4. Build via `npx tauri build --target x86_64-unknown-linux-gnu --bundles deb`

Output:
```
src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb
```

---

## Project Structure

```
MindMapApp/
├── src/                        # Vue frontend
│   ├── components/             # UI components (Toolbar, RightPanel, Canvas, etc.)
│   ├── composables/            # Business logic hooks
│   │   ├── useAutosave.ts      # 30s autosave + draft management
│   │   ├── useExport.ts        # PNG / SVG export
│   │   ├── useLocale.ts        # i18n (zh / en)
│   │   ├── useMindmapFile.ts   # Open / save / import / serialize
│   │   ├── useRecentFiles.ts   # Recent file list (localStorage)
│   │   └── useTheme.ts         # Dark / light theme
│   ├── stores/
│   │   └── mindmap.ts          # Pinia store — all map state & actions
│   └── types/
│       └── mindmap.ts          # Core domain types
├── src-tauri/                  # Tauri / Rust backend
│   ├── capabilities/
│   │   └── default.json        # Tauri ACL permissions
│   ├── icons/                  # App icons (generated from icon.svg)
│   └── src/
│       └── lib.rs              # Window events, menu, Tauri commands
├── scripts/
│   ├── build-dmg.sh            # macOS Universal DMG build script
│   ├── build-deb.sh            # Ubuntu DEB build script
│   └── build-win.bat           # Windows NSIS/MSI build script
├── test/                       # Sample .mindmap.md / .md fixtures
└── README.md
```

---

## App Icons

Source file: `src-tauri/icons/icon.svg`

Regenerate all platform icons from SVG:

```bash
npx tauri icon src-tauri/icons/icon.svg -o src-tauri/icons
```

---

## License

MIT
