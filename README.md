# Simple Table

> A fast, no-fuss table builder for everyday work — made to get a table on paper in minutes, not to fight with spreadsheets.

Simple Table is an Arabic-first (RTL) web app for creating, editing, and printing result tables. It was built as a personal work tool: open the page, type your rows, hit print — that's the whole workflow.

**Live demo:** <https://simple--table.vercel.app>

---

## Highlights

- **Ready instantly** — the page opens with a filled-in sample report (24 students) so you can see the shape of a result sheet; clear it, or add a new tab, and start typing
- **Edit mode** — one toggle reveals the per-column and per-row tools:
  - move rows and columns around
  - rename columns inline
  - drag or nudge column widths
  - add/remove rows and columns
  - attach a photo and one or more tags to a name cell
  - grade cells can always be typed into, even with edit mode off
- **Grade colouring** — grades are bucketed automatically into four tiers: **18+** green, **14+** blue, **10+** amber, below that red. A `0` is stored as `#` (absent) and still counts as zero in the statistics
- **Sorting** — sort by name (the `الاسم` column) or by grade, ascending or descending, straight from the sort menu
- **Three layouts** — *Classic* (banded rows), *Soft* (light banding) and *Compact* (tight rows) to match what you're printing
- **Live statistics** — count, average, most common score and highest score, updated as you type
- **Print & PDF** — the print dialog can print every table, only the current one, or a hand-picked selection; each sheet carries its own header, statistics, signature line, and a header row that repeats on every page
- **Editable title & signature** — the blue band doubles as the report title, and the signature under the table is editable in edit mode
- **Multiple tables** — tabs keep separate tables side by side, each with its own rows, columns and signature
- **Themes** — light/dark mode (remembered between visits), full Arabic RTL interface, installable as a PWA
- **Auto-saved** — everything persists in your browser's local storage; close the tab and come back later

---

## Tech stack

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| UI       | [React 19](https://react.dev) + TypeScript 6    |
| Styling  | Tailwind CSS 3 (PostCSS)                        |
| Build    | [Vite](https://vite.dev) 8                      |
| Icons    | lucide-react                                    |
| Linting  | oxlint                                          |
| PWA      | Web app manifest + `public/table.png` icon      |

---

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## All commands

| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the dev server with HMR       |
| `npm run build`   | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Serve the production build          |
| `npm run lint`    | Run oxlint                          |

---

## Notes

- Everything lives in your browser, under these `localStorage` keys:

  | Key                | What it holds                                                             |
  | ------------------ | ------------------------------------------------------------------------- |
  | `exam-tables`      | every table (rows, columns, title, signature, cell photos and tags)       |
  | `exam-table-style` | the selected layout (`classic` / `soft` / `compact`)                      |
  | `tdaim-theme`      | `light` or `dark`                                                         |
  | `tdaim-direction`  | `rtl` or `ltr`                                                            |

  No account, no server, no uploads — the only external request the app makes is the Cairo web font from Google Fonts.
- Cell photos are embedded as base64 data URLs inside `exam-tables`, so they count against the browser's storage quota (~5 MB). Keep them small.
- Printing is handled by the browser's own print dialog, so "Save as PDF" is always an option. The document title is set to the printed table names first, so the saved PDF gets a meaningful filename.
