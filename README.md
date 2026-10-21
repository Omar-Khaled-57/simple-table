# Simple Table

> A fast, no-fuss table builder for everyday work — made to get a table on paper in minutes, not to fight with spreadsheets.

Simple Table is an Arabic-first (RTL) web app for creating, editing, and printing result tables. It was built as a personal work tool: open the page, type your rows, hit print — that's the whole workflow.

---

## Highlights

- **Instant start** — the table is ready the moment the page loads; no setup, no templates
- **Edit mode** — one toggle reveals per-column and per-row tools:
  - move rows and columns around
  - rename columns inline
  - drag or nudge column widths
  - add/remove rows and columns
- **Sorting** — sort by name or grade, ascending or descending, in one click
- **Three layouts** — *Classic*, *Soft*, and *Compact* styles to match what you're printing
- **Live statistics** — count, average, most common score, and highest score update as you type
- **Print & PDF** — a print dialog with per-table headers, statistics, and an editable signature line
- **Multiple tables** — tabs keep separate tables side by side
- **Cells with more** — attach an image or tag to any cell
- **Themes** — light/dark mode, full Arabic RTL interface
- **Auto-saved** — everything persists in your browser's local storage; close the tab and come back later

---

## Tech stack

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| UI       | [React 19](https://react.dev) + TypeScript      |
| Styling  | Tailwind CSS                                    |
| Build    | [Vite](https://vite.dev)                        |
| Icons    | lucide-react                                    |
| Linting  | oxlint                                          |

---

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## All commands

| Command              | What it does                     |
| -------------------- | -------------------------------- |
| `npm run dev`        | Start the dev server with HMR    |
| `npm run build`      | Type-check and build for prod    |
| `npm run preview`    | Serve the production build       |
| `npm run lint`       | Run oxlint                       |

---

## Notes

- All data lives in `localStorage` under `exam-tables` and `exam-table-style` — nothing ever leaves your machine.
- Printing is handled by the browser's own print dialog, so "Save as PDF" is always an option.
