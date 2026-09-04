# VOV — Quest-Style Task Manager

A single-user, browser-based task manager with quest-log UX, multi-map locations, department trees, and NPC-style member profiles. All data is stored locally in IndexedDB.

## Features

- **Dashboard** — Overview of due today, overdue, in progress, and tracked quests
- **Quest Log** — Tasks with 5 statuses, subtasks, progress bars, drag-to-reorder
- **Living World Map** — A literal four-continent Kanban atlas: drag quests across irregular coastlines to change status, preserve their exact map position, or cast them into the animated Backlog maelstrom. Includes pan/zoom, search, difficulty filters, a minimap, custom generated islands, and the original uploaded-map archive.
- **Departments** — Tree-structured org chart with member management
- **NPC Profiles** — Avatar, role, title, contact, bio, and notes per person
- **World Tree** — a repository's real Git topology grown as an ancient tree: `main` is the trunk, branches are limbs forking at the commit they diverged from, merged branches arc back into the trunk, pull requests are quests on a parchment scroll
- **Auto-Backup** — 4 local copies (live + on-save + 2 daily snapshots)
- **PWA** — Installable, works offline

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Run with Docker

```bash
docker compose up --build        # http://localhost:8173
```

The host port is `8173`, not `8080` — 8080 collides with too many other dev
tools. Override it with `VOV_PORT=9000 docker compose up` if 8173 is taken too.

Multi-stage build: `npm ci && npm run build` on `node:22-alpine`, then the static
bundle behind `nginx:1.27-alpine` with SPA fallback so `/world-tree` and the other
client-side routes resolve on a hard refresh.

For live reload inside a container instead:

```bash
docker compose --profile dev up dev   # http://localhost:5173
```

The dev service bind-mounts the repo but keeps `node_modules` in a named volume,
so Linux-native binaries are not shadowed by a Windows or macOS host copy, and
enables watcher polling because bind mounts do not emit inotify events.

> Nothing is persisted in the container. VOV keeps its data in the browser's
> IndexedDB and calls the GitHub API straight from the page, so the image serves
> static files only — your data lives in whichever browser you open it with.

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
