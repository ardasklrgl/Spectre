# Validation record

Current compact/fullscreen revision:

- Passed: full TypeScript type check and Vite production build (`npm run build`).
- Passed: Rust `cargo check --offline` with locally installed stable toolchain and cached dependencies.
- Passed: UI mechanical detector (no findings).
- Desktop visual inspection unavailable: native computer-control service failed to start.
- Requires manual check: Control–Option–Space and Control–Option–H over a fullscreen browser, on multiple monitors, followed by text entry, saving, and dismissing back to the browser.

Passed: both Rust storage tests (Swift JSON compatibility and capture/attachment/failure roundtrip). No fullscreen runtime claim is made from compilation alone.

Screenshot/resume revision: frontend production build and Rust compile check passed. Manual checks still required: permission denied/granted, region selection on desktop and fullscreen, cancellation, click-away on both views, native file picker remaining visible, history filter/selection/scroll resumption, draft caret resumption, and drag position retention.

Study-notepad revision: full frontend type-check/production build and all four Rust tests passed, including study text/geometry restart persistence, empty and Unicode notes, separation from capture draft, invalid geometry rejection, and failed-save preservation. No native desktop UI access is available for live fullscreen, global shortcut, drag/resize or blur verification.

Study-note visibility revision: removed focus-loss and Escape dismissal. Shortcut and × still flush autosave before hiding. Capture/history click-away behaviour is unchanged. Frontend type-check and production build verified; native focus behaviour still requires a live check.

Markdown preview revision: full frontend type-check/production build, Markdown server-render tests (formatting, task lists, tables, literal code, raw HTML and URL handling), and all five Rust persistence tests passed. Legacy plain-text note migration preserves the original file. Live desktop visual inspection remains unavailable.

Live Markdown revision: frontend type-check/production build, Markdown render checks, and new block-editing checks passed. The latter verify complete source partitioning, CRLF/Unicode preservation, isolated edits, block deletion, and whole-note replacement. No Rust storage changes. Live keyboard/pointer interaction remains unverified without native desktop UI access.

Rich-text trial: frontend build/type-check passed. Tiptap DOM interaction checks passed for Markdown import (headings, bold, tasks, tables, code), selected-text formatting, canonical JSON roundtrip, continuous cross-paragraph edits, undo/redo, and paragraph creation. Rust compilation passed; persistence tests include rich-document save/load, original-note backup preservation, and rejection of invalid rich documents. Native macOS interaction remains unverified.

Compact-spacing/Tab revision: frontend build passed. Real DOM keydown tests pass for Tab inserting a literal tab without losing focus, Shift–Tab removal, list nesting/outdenting, and consuming Tab on an unindentable first list item. Existing editor import/formatting/undo checks also pass. Paragraph margins are zero; live visual measurement is unavailable.


## 2026-11-12 — approved design implementation

- TypeScript + Vite production build: passed.
- Rich editor, Markdown and live Markdown checks: passed.
- Browser verification: rich editor loading, typing, paragraph spacing and toolbar; history/settings layout.
- Fixed empty-note hydration using an explicit empty paragraph document.
- Added recoverable delete/restore and a Rust regression test; Rust unavailable here, so this test and native compilation are NOT run for this revision.
- Fullscreen, global shortcuts, native drag/resize and export dialog require macOS testing.

## Figma Make export adoption

- Uses exported 16px icon paths, capture grid, neutral grey palette, 100px Paragraph control, 26px note status strip, compact history rows and grouped settings.
- Retains Tiptap, Rust persistence and native window commands.
- Frontend build and rich editor checks pass; native macOS build not run in this Linux environment.
