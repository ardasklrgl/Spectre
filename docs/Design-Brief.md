# Betterpad — desktop design brief

Design proposal · 11 November 2026

## Figma prompt

Design Betterpad, a compact desktop capture utility with a separate floating study note. Create four app surfaces: quick capture, study note, searchable history, and settings. Show the capture and study note together over a sample fullscreen lecture PDF. Treat the PDF as context, not part of Betterpad. Keep browser prototype controls outside the app frames.

Use restrained charcoal surfaces, near-white text, fine neutral dividers, consistent outline icons and compact controls. The study note should feel like a quiet, continuously editable sticky note, not a chat conversation. The capture box is an input, not a full chat window. No marketing copy, onboarding slogans, decorative gradients, dashboard statistics, AI response bubbles, or colourful sticky notes. Essential controls only. Preserve the distinction between saving a capture and continuing to edit a study note.

Build editable frames, reusable components and named variables. Prioritise a desktop composition at 1440 × 900, with app windows at their actual logical sizes. Include an uncluttered component/state sheet and a second 1280 × 800 usage composition. The UI will later be implemented in Tauri; do not introduce navigation or behaviours that depend on being a website.

## Product contract

Betterpad appears above the user's current work, including fullscreen apps. The user can capture text, screenshots and files, retrieve saved captures, or keep a persistent study note beside their material. Ordinary capture produces no AI response.

| Surface | Main job | Dismissal | Restore |
| --- | --- | --- | --- |
| Capture | Save a thought or attachments quickly | Successful save, click-away, Escape or shortcut | Unsubmitted draft, attachments and position |
| Study note | Keep writing and reading while studying | Shortcut or × only | Text, formatting, scroll position, size and position |
| History | Find and inspect captures | Click-away, Escape, × or shortcut | Search, selected capture, scroll and geometry |
| Settings | Adjust shortcuts and appearance | × or Escape | Current preferences |

Clicking back into a lecture must leave the study note visible. It must not look disabled when it loses focus.

## App frames

### Quick capture

- Default frame: **420 × 64**. Rounded rectangle, 16 px radius.
- One row: discreet drag grip, plus button, input, save arrow.
- Placeholder: **Capture a thought…**
- No app title, tabs, explanatory footer or AI model selector inside this window.
- Single-line start; grow upwards or within available screen space for multiline content.
- Plus menu: Attach file, Screenshot, History, Study note.
- Attachments become compact removable chips below the input.
- Save is disabled while empty. Enter saves; Shift–Enter inserts a line break.
- After a successful save, dismiss and show one brief **Saved** confirmation.
- Save failure: preserve everything and show **Couldn’t save. Try again.** with Retry.

### Study note

- Default frame: **440 × 468**; minimum **280 × 240**.
- 42 px draggable header: note icon, **Study note**, overflow menu, ×.
- 42 px formatting bar: paragraph-style selector, bold, italic, underline, bullet list, numbered list, indent. Formatting controls reflect the selection.
- Overflow menu: hide/show formatting bar; export.
- Continuous rich-text editor. No Edit/Preview mode, block-by-block textarea swapping, or visible Markdown delimiters.
- Body padding: 20 px vertically, 22 px horizontally. Body **14 px / 1.35**.
- **Paragraph margins: 0.** Enter and wrapped lines use the same line rhythm. Blank lines occur only when the user inserts them. Bullets also use zero vertical margins.
- Tab indents inside the editor; Shift–Tab outdents. They must not move focus into another app.
- Formatting shortcuts: ⌘B / ⌘I / ⌘U. Normal continuous selection and undo/redo.
- Bottom status strip: **Saving…**, **Saved**, or explicit save failure. Optional quiet word count.
- Resize from edges/corners; lower-right grip is a discoverability cue.
- Inactive note remains readable. Avoid reducing text opacity on blur.

### History

- Default frame: **860 × 560**; minimum **600 × 360**.
- Draggable 42 px header: History, new-capture action, ×.
- Left column: **275 px**, containing search, All / Text / Files filters, and a chronological list grouped Today / Yesterday.
- Each item: type icon, first-line title, two-line excerpt, timestamp and attachment count when applicable. Never turn every item into an elevated card.
- Right column: timestamp and Copy/Delete actions, capture title, selectable text, attachment preview or filename.
- Selected row uses a subtle filled surface; no bright accent strip.
- Search matches text and filenames. Show the selected matching result; show a clean empty state if none match.
- Deletion offers Undo. Copy confirms briefly.
- Example content: lecture screenshots, office-hour questions, project thoughts, links and PDFs. These are illustrative samples, not user records.

### Settings

- Default frame: **660 × 480**.
- Short sections and aligned rows, no card grid or large navigation rail.
- Shortcut rows show the existing bindings. An eventual shortcut recorder must handle conflicts explicitly.
- Study note controls: formatting-bar visibility and text size. Paragraph spacing stays at zero.
- Production settings should retain access to storage and import from the earlier demo; these are not interactive storage operations in this design prototype.

## Visual variables

| Variable | Value |
| --- | --- |
| Window background | `#191919` |
| Editor background | `#171717` |
| Hover | `#2B2B2B` |
| Selected control | `#303030` |
| Primary text | `#EDEDEB` |
| Secondary text | `#B0B0AB` |
| Muted text | `#969691` |
| Divider / window edge | `#383838` |
| Focus outline | `#D4D4CD` |
| Save button | light neutral fill, dark icon |
| Window radius | 12 px |
| Control radius | 6 px |
| Capture radius | 16 px |
| Spacing scale | 4, 8, 12, 16, 20, 24 px |
| Window shadow | `0 18px 55px #00000038`, `0 3px 12px #00000024` |
| Typography | System UI; controls 12 px, body 14 px, metadata 10–11 px |
| Icons | 16 px, consistent 1.6 px rounded outline stroke |

Use a system font deliberately: this is a small utility beside other desktop applications. Spend visual character on proportions, alignment and responsiveness. The light sample PDF and the prototype's navigation bar are not app theme decisions.

## Existing shortcuts

| Action | Binding |
| --- | --- |
| Capture | Control–Option–Space |
| Screenshot | Control–Option–S |
| History | Control–Option–H |
| Study note | Command–Shift–N |

The web mockup displays these as references. It cannot demonstrate global shortcuts, fullscreen overlays, Screen Recording permission, OS-level focus restoration or native file persistence.

## Components and states to create in Figma

1. Floating window: active, inactive, resized, compact minimum size.
2. Capture composer: empty, typing, multiline, with attachments, saving, failed save.
3. Icon button: default, hover, pressed, keyboard focus, disabled; accessible label and tooltip.
4. Formatting bar: no selection, selected text, list context, hidden.
5. Study note: empty, populated, saving, saved, failed save; no forced paragraph gaps.
6. Search: idle, typing, filtered results, no results.
7. History row: default, hover, selected; text, image, file and link variants.
8. Attachment chip: normal, long filename, removable.
9. Menu: open, item hover, keyboard focus.
10. Confirmation: saved, copied, deleted with Undo.

Keep keyboard focus visible, body/control contrast at least 4.5:1, and text legible when the note loses focus. Do not communicate selected state through colour alone. Use generous invisible hit regions around small icons where space allows. Motion is limited to a 140 ms window reveal and simple menu transitions; respect reduced motion.

## Prototype scope

The accompanying HTML lets us discuss size, hierarchy, density, window layering, note editing and history navigation. It supports sample captures, filename chips, search/filtering, drag/resize, formatting, and browser-local draft persistence. The file picker previews filenames only; the screenshot action inserts a labelled sample. Storage, permissions, global shortcuts, OS overlays and production editor behaviour require the desktop app.

The top navigation, backdrop switch, Reset control and browser-prototype footer belong only to the review canvas. Do not build them into the app.

## Review decisions

- Is 420 × 64 small enough for capture?
- Keep the formatting bar visible, or default to the quiet version?
- Is the note comfortable at 440 px, and should 13, 14 or 16 px be the default text size?
- Does the two-column history earn its space, or should list-only be an additional compact view?

Approve the composition and interaction hierarchy before adapting the application code.
