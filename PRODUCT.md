# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single person (or a small team acting through one shared browser profile) managing their own tasks and a lightweight org structure — solo operators, small team leads, or hobbyist project owners who want a task manager that feels less like corporate software and more like a game log they actually enjoy opening.

## Product Purpose

VOV is a personal task manager reframed as a game "quest log": tasks are quests with statuses, subtasks ("objectives"), priorities, and dependencies. It exists so that day-to-day task tracking (due/overdue/in-progress work, org structure, people) feels motivating rather than like a chore, while keeping full data ownership.

## Positioning

Unlike cloud task managers (Todoist, Linear, Jira, etc.), VOV runs entirely client-side — all data lives in the browser's IndexedDB, with local auto-backups (4 rolling copies) and manual JSON export/import; there is no account and no server. It also frames the domain differently: departments become org trees, team members become "NPC" profiles with bios, and physical/virtual locations become uploadable "world maps" you can pin quests to.

## Operating Context

- Single browser profile / origin = the data store; opening the app from a different URL or browser shows an empty state, not missing data (documented explicitly in Settings → About).
- Installable as a PWA, works offline.
- No login, no multi-device sync built in — cross-device continuity is manual (Settings → Export/Import).
- As of this pass, quests can optionally be linked to GitHub issues (via a user-supplied personal access token, calling the GitHub REST API directly from the browser) and to Jira tickets (deep-link + clipboard only — Jira Cloud does not support direct browser API calls without a backend, so there is no real sync there).

## Capabilities and Constraints

- Stack: React 19 + TypeScript + Vite, Tailwind CSS v4 (single hardcoded dark theme, no light mode yet), Dexie/IndexedDB for storage, Zustand for UI state, react-router-dom v7, framer-motion.
- No backend/server component and no plan to add one for core functionality; the GitHub integration works specifically because GitHub's API allows direct CORS calls from a browser with a token — Jira does not, which is a hard constraint, not an oversight.
- No test suite, no CI, no accessibility tooling currently wired in (tracked separately in GitHub issue #1 on VincentArak/VOV).
- Terminology: "Quest" = task, "Mission" = higher-level task grouping, "Objectives" = subtasks, "NPC profile" = person/team-member record, "World Map" = uploaded image with pinnable location nodes.

## Brand Commitments

Name is "VOV". Tone is playful/gamified but not childish — quest-log framing over generic productivity-app language ("Accept quest" not "Start task", etc., per existing copy in QuestDetailPage).

## Evidence on Hand

No user research, testimonials, or usage data exists yet — this is an early-stage personal project (single init commit in git history as of this pass). Do not fabricate metrics, users, or quotes.

## Product Principles

1. Data ownership over convenience — local-first, exportable, no vendor lock-in, even where that means less automatic sync.
2. Gamified framing should stay functional, not decorative — the quest/mission/NPC vocabulary must map cleanly to real task-management concepts, never obscure them.
3. Single dark theme, single user, single browser tab is the supported case today; anything else (light mode, multi-user, multi-device) is future scope, not a current bug.
4. External integrations (GitHub/Jira) are opt-in and clearly labeled with their real capabilities/limits — no implying sync exists where it doesn't (see Jira: deep-link only).

## Accessibility & Inclusion

No formal accessibility standard has been adopted yet. A baseline audit (contrast, focus states, aria labels, keyboard navigation for modals/drag-reorder) is tracked as known debt in GitHub issue #1 on VincentArak/VOV and is in scope for the v1 polish pass on Dashboard and Quests pages.
