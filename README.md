# Betterpad — Tauri edition

A custom dark capture composer built with React, TypeScript and Tauri 2. Rust owns storage, drafts and desktop integration. The Swift demo remains available in the parent project.

## Design-demo implementation

The capture, study note, history and settings use the approved demo's charcoal palette, system font, outline icons, control spacing, radii and layout. Capture is 420 × 64, history 860 × 560, settings 660 × 480, and a new study note 440 × 468 logical pixels. Existing notes keep their remembered geometry. The browser review canvas, PDF backdrop and tabs are excluded from the app.

Study notes retain continuous rich editing and zero extra paragraph spacing. The note's overflow menu hides the toolbar, exports Markdown, and offers undo/redo. Settings controls text size and toolbar visibility. History offers All/Text/Files filters and recoverable deletion: Undo restores a capture from the local Trash directory.

The frontend production build and all three editor/Markdown checks pass in this Linux environment. Rust and a macOS host are unavailable, so the updated native build, export dialog and OS window behaviour need verification on macOS. Historical checks in VALIDATION.md are not claims about this revision.

## Run on your Mac

Requires Node.js (20.19+ or 22.12+), a current stable Rust toolchain (at least 1.90 for current shortcut plugin), and Xcode Command Line Tools.

Install Rust from https://rustup.rs if needed. Then quit the original Betterpad demo to free its shortcuts and double-click `run.command`, or run:

```sh
cd /Users/ardasiklaroglu/betterpad/tauri
npm ci
npm run desktop
```

If opening from a downloaded source archive, use its actual folder path instead. `run.command` checks dependencies and prints what's missing; it does not install Rust or modify your system automatically.

For an app bundle, double-click `build.command`. This runs the frontend build, Rust tests, then the Tauri bundle build. The output goes to `src-tauri/target/release/bundle/macos/`.

For a browser-only visual preview, use `npm run dev`. Saving and desktop functionality are deliberately disabled outside Tauri; the preview does not invent saved data.

## Use

- Control–Option–Space: toggle capture.
- Control–Option–H: history.
- Control–Option–S: select screenshot region.
- Plus menu: attach, screenshot, history, settings.
- Enter saves; Shift–Enter adds a line; Escape preserves draft and hides.
- Paste images or drop files to attach; click Remove to discard an attachment.
- Settings offers Command–Shift modifiers if another app owns the defaults.
- Menu bar plus icon provides Capture, History, Settings and Quit.

The composer expands for multiple lines and attachment previews. History provides note and filename search, image previews, copying, opening original files, and recoverable deletion. Screenshot selection uses macOS screencapture and may require Screen Recording permission for Betterpad Tauri. Original audio/voice and AI are not implemented.

## Existing captures

Tauri uses its own app data directory (`~/Library/Application Support/com.ardasiklaroglu.betterpad.tauri/` on macOS), so running both versions cannot overwrite the same draft. Settings → Import captures copies saved captures from `~/Library/Application Support/Betterpad/`, skips existing IDs, and leaves source captures untouched. The Swift draft is not imported. Test import on a backup before relying on it.

The persisted JSON retains the original Swift timestamps (seconds since 2001-01-01 UTC) and camelCase fields. Each entry retains Markdown, metadata and copied attachments. Rust writes temporary capture directories before publishing them and keeps failed drafts. No server, accounts, external AI, OCR or sync.

## Validation on a machine with dependencies

```sh
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run bundle
```

Then manually verify shortcut focus, draft recovery after relaunch, screenshots and cancellation, file pasting/drops, large attachments, import, save failures, multiple monitors, full-screen Spaces, and denied Screen Recording permissions. The focus code and transparent window need particular macOS validation. Transparency uses Tauri's macOS private API feature; this is a directly distributed development build, not a Mac App Store submission.

Dependency versions use compatible major ranges; lockfiles will be produced on the first successful installation. No lockfiles are fabricated in this offline build environment.

## Dismiss, resume and drag

Clicking another app hides Betterpad without changing that app's focus. Control–Option–Space restores the last view; Control–Option–H toggles history. Hidden views retain draft/caret, history filter, selection and scroll. The capture's dotted handle and empty frame area drag the window; history drags from the title area. Reopening the same view preserves its position. Native file dialogs and screenshot selection temporarily suspend click-away dismissal.

Screenshot capture now checks Screen Recording access before invoking region selection. If missing, it requests access and provides setup guidance instead of saving a wallpaper-only capture. It hides Betterpad without reactivating another app, so screenshot selection stays in the current fullscreen Space. You must fully quit and relaunch after granting access. Actual macOS capture and click-away behaviour need manual validation.

## Study notepad — Command–Shift–N

A separate black window with white text for ongoing study notes. Toggle with Command–Shift–N, use Study note in the menu bar, or Settings → Open note. Enter adds lines; nothing is submitted to capture history. Drag the header to move, drag any edge or corner to resize. Clicking another app leaves it visible. Only the shortcut or × button hides it; Escape leaves it open. Reopening retains the same editor, scroll, position and size. It uses the same fullscreen overlay behaviour as capture.

Text autosaves after a short typing pause and is flushed before hiding or normal menu-bar quit. Errors keep the current text available with Retry. Window geometry is saved after move/resize settles. Text and geometry persist across restarts as `study-note.md` and `study-note-window.json` in the Tauri collection folder. Geometry restores on startup; disconnected-monitor positions fall back to a visible monitor. The note shortcut is independent of the capture modifier preset. If Command–Shift–N is taken, use the menu bar or Settings entry.

This version provides one ongoing study note. Fullscreen placement, native resizing, dragging, staying visible while unfocused, and global shortcut interaction still require a live check on macOS.

## Live Markdown study notes

Study notes use one in-place, block-based live Markdown surface. Click a rendered heading, paragraph, list or code block to edit its source in place; click elsewhere and it renders automatically. There is no separate Edit/Preview mode. Other blocks stay rendered while editing. A blank line completes a paragraph; lists continue their markers on Enter and an empty list item ends the list. Arrow keys cross block boundaries, and Continue writing appends a new block. Command–A selects the whole source for replacement.

Headings keep their size while being edited, and fenced-code editing uses monospace. Autosave, window dragging/resizing, toggle/× dismissal, and .md storage are unchanged. Existing study-note.txt files are still read as a fallback and retained untouched.

The renderer supports headings, emphasis, strikethrough, lists, read-only task checkboxes, quotes, fenced/inline code, tables, and external links. Remote images are represented by alt text; raw HTML is literal text. This is a small block editor, not the full Obsidian editor/plugin system.

Checks: `node scripts/test-markdown.mjs` and `node scripts/test-live-markdown.mjs`.

## Rich-text editor trial (current study editor)

The study note now uses Tiptap/ProseMirror for one continuous formatted document. This replaces the custom live-Markdown block editor. Select across paragraphs, use normal Enter/Backspace, and use Command–B/I/U or the small formatting toolbar for bold, italic, underline, headings, lists and checkboxes. Command–Z and Shift–Command–Z provide undo/redo. Markdown-style typing shortcuts still work, but the underlying text is edited as rich text.

Existing Markdown is imported when no rich document exists. Before the first rich save, the original is backed up as `study-note-before-rich.md`. `study-note-rich.json` is the authoritative document (so underline and other rich marks survive relaunch); `study-note.md` is also written as a Markdown export. The older `.txt` fallback is retained. External changes to the Markdown export do not override an existing rich document.

The editor loads only in the study window. Capture/history and their keyboard shortcuts are unchanged. The study note still stays open when clicking elsewhere and hides via Command–Shift–N or ×. Geometry and autosave remain unchanged.

Run editor checks with `node scripts/test-rich-editor.mjs`. These exercise the real editor in a DOM environment: importing headings/tasks/tables/code, selected-text formatting, JSON roundtrip, cross-paragraph replacement, undo/redo and paragraph creation. Native macOS pointer/keyboard feel and fullscreen operation still require a live check. The old live-Markdown source files/tests remain as reference; they are not mounted in the study window.

Study editor spacing: body text uses 1.2 line height with zero paragraph margins, so Enter has the same spacing as a wrapped line. Tab inserts a four-column tab in normal text/code and indents list items; Shift–Tab reverses indentation. Table cell navigation remains standard. Tab from editor text does not move focus to the toolbar or another app.
