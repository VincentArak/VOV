# VOV — Quest-Style Task Manager

A single-user, browser-based task manager with quest-log UX, multi-map locations, department trees, and NPC-style member profiles. All data is stored locally in IndexedDB.

## Features

- **Dashboard** — Overview of due today, overdue, in progress, and tracked quests
- **Quest Log** — Tasks with 5 statuses, subtasks, progress bars, drag-to-reorder
- **World Maps** — Upload images, place location nodes, create quests at locations
- **Departments** — Tree-structured org chart with member management
- **NPC Profiles** — Avatar, role, title, contact, bio, and notes per person
- **Auto-Backup** — 4 local copies (live + on-save + 2 daily snapshots)
- **PWA** — Installable, works offline

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build & Deploy

```bash
npm run build
npm run preview
```

Deploy to [Vercel](https://vercel.com) — connect this repo and deploy. The included `vercel.json` handles SPA routing.

> **Note:** Deployed app runs in the browser; your data still lives in that browser's IndexedDB. Use Settings → Export for cross-device backup.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New quest |
| `/` | Focus search |
| `⌘S` | Force backup now |

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Dexie (IndexedDB)
- Zustand, Framer Motion, React Router
