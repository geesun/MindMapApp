# AGENTS Guide for MindMap

This document is for coding agents working in this repository.
It captures practical commands, architecture context, and coding conventions.

## 1) Project Snapshot

- Stack: Tauri 2 + Vue 3 + TypeScript + Pinia + LeaferJS.
- Frontend lives in `src/`.
- Tauri/Rust backend lives in `src-tauri/`.
- Package manager: npm (lockfile is `package-lock.json`).
- Main app entry points:
  - `src/main.ts`
  - `src/App.vue`
  - `src-tauri/src/main.rs`
  - `src-tauri/src/lib.rs`

## 2) Setup Commands

Run from repository root unless noted otherwise.

- Install JS deps:
  - `npm install`
- Start web dev server only:
  - `npm run dev`
- Start Tauri desktop dev app:
  - `npm run tauri dev`

## 3) Build Commands

- Frontend production build:
  - `npm run build`
- Full desktop build (host platform):
  - `npm run tauri build`
- macOS Apple Silicon DMG:
  - `npx tauri build --target aarch64-apple-darwin`
- macOS Intel DMG:
  - `npx tauri build --target x86_64-apple-darwin`
- Linux DEB (x86_64 target):
  - `npx tauri build --target x86_64-unknown-linux-gnu --bundles deb`
- Ubuntu helper script for DEB:
  - `./scripts/build-deb.sh`

## 4) Lint / Format / Typecheck

Important: there is currently **no ESLint/Prettier config** in this repo.

- Typecheck (primary static check):
  - `npx tsc --noEmit`
- Rust compile check (from `src-tauri/`):
  - `cargo check`

Notes:
- A known existing TypeScript issue may appear about `src/main.ts` importing `App.vue`.
- Do not hide or ignore errors unless explicitly requested.

## 5) Test Commands

There is currently **no configured JS unit-test framework** (no Vitest/Jest/Cypress setup).

- If you need to run Rust tests (if present):
  - `cd src-tauri && cargo test`
- If you need to run a single Rust test (if present):
  - `cd src-tauri && cargo test <test_name_substring>`
  - Example: `cd src-tauri && cargo test deserialize`

### Single-test equivalent for current codebase

Because JS test infra is absent, "single test" means targeted manual validation:

- Start app: `npm run tauri dev`
- Use a specific fixture from `test/` (for example `test/simple.md`)
- Validate only the feature touched (import/layout/export/etc.)

## 6) Useful Operational Commands

- Regenerate all app icons from SVG:
  - `npx tauri icon src-tauri/icons/icon.svg -o src-tauri/icons`
- Build Rust app only (no bundle), from `src-tauri/`:
  - `cargo build --release`

## 7) Architecture Notes

- State store: `src/stores/mindmap.ts` (Pinia setup store).
- File IO and serialization: `src/composables/useMindmapFile.ts`.
- Export logic: `src/composables/useExport.ts`.
- Locale switching: `src/composables/useLocale.ts`.
- Theme switching: `src/composables/useTheme.ts`.

Key domain types:
- `LayoutType = 'radial' | 'tree-lr' | 'tree-tb'`
- Node shapes: `rect | rounded | pill | ellipse | hexagon`

Current file strategy:
- Save/Open: `.mindmap.md`
- Import: `.md`

## 8) Code Style Guidelines

Follow existing local style in each file. Prefer consistency over personal preference.

### Imports

- Group order (typical):
  1. Framework/external packages
  2. Internal composables/stores/types/components
  3. Side-effect imports
- Use relative imports used by surrounding code.
- Keep type imports explicit when useful (`import type { ... }`).

### Formatting

- In `src/**/*.ts` and `.vue` scripts, dominant style is:
  - single quotes
  - no semicolons
  - trailing commas optional (follow nearby lines)
- Keep lines readable; avoid dense one-liners for complex logic.
- Avoid introducing new formatting tooling unless requested.

### TypeScript Practices

- `strict` mode is enabled; preserve strict typing.
- Avoid `any`; prefer narrow unions and explicit interfaces.
- Keep composables return types clear.
- Validate nullable values before use (`if (!x) return`).

### Vue / Pinia Conventions

- Use `<script setup lang="ts">` for components.
- Keep reactive primitives near top: `ref`, `computed`, store/composable instances.
- Store mutations should go through store actions when available.
- Reuse existing patterns for dialogs (`showXDialog`, `pendingAction`).

### Naming

- Components: PascalCase filenames (`CanvasArea.vue`).
- Composables: `useXxx.ts`.
- Store actions: verb-based (`addChild`, `deleteNode`, `setLayout`).
- Booleans: `is/has/can/show` prefixes where practical.

### Error Handling

- Fail safely and early with guard clauses.
- For user-cancel flows (file dialogs), return silently.
- For recoverable IO failures, keep app state consistent and avoid crashes.
- Do not swallow errors if user feedback is required.

### Comments

- Add comments only for non-obvious logic.
- Prefer short, intent-focused comments over narration.

## 9) UI/UX Guardrails Already in Use

- Welcome screen: no toolbar/right panel/status bar.
- Toolbar style: icon + text modern rounded buttons.
- Right panel no operation-log section.
- Root node style remains fixed indigo/white emphasis.

## 10) Git and Change Hygiene for Agents

- Do not revert unrelated user changes.
- Keep edits scoped to requested work.
- Do not commit unless explicitly asked.
- Avoid destructive git commands.

## 11) Cursor / Copilot Rules Status

Checked paths:
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

Result:
- No Cursor/Copilot rule files were found at the time of writing.

If these files are later added, update this AGENTS.md to reflect them.
