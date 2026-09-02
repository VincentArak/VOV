---
name: VOV
description: A quest-log task manager where objectives glow gold against midnight-slate depth.
colors:
  midnight-ledger: "#0f172a"
  slate-parchment: "#1e293b"
  torch-ash: "#334155"
  torch-gold: "#fbbf24"
  ember-copper: "#d97706"
  parchment-white: "#f1f5f9"
  fog-slate: "#94a3b8"
  iron-seam: "#475569"
  verdant-seal: "#22c55e"
  amber-warning: "#f59e0b"
  ember-red: "#ef4444"
  beacon-blue: "#3b82f6"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  micro:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.625rem"
    fontWeight: 400
rounded:
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.torch-gold}"
    textColor: "{colors.midnight-ledger}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ember-copper}"
  button-secondary:
    backgroundColor: "{colors.torch-ash}"
    textColor: "{colors.parchment-white}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.iron-seam}"
  button-danger:
    backgroundColor: "{colors.ember-red}"
    textColor: "{colors.ember-red}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.slate-parchment}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.slate-parchment}"
    textColor: "{colors.parchment-white}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: VOV

## Overview

**Creative North Star: "The Torchbearer"**

VOV reads like a lone explorer's quest log carried into a cave: everything sits in a deep midnight-navy dark (`#0f172a`), and the only warmth in the room is the single torch-gold accent (`#fbbf24`) marking what matters right now — the active nav item, the primary action, the objective still glowing at 60% complete. There is no second competing accent color; gold is reserved and precise, the way a torch is the one light source you trust.

Depth is conveyed entirely through three steps of background darkness (surface → surface-raised → surface-overlay) rather than shadows — nothing casts light in this world, things simply sit closer to or further from the dark. The interface is calm and utilitarian at rest (this is an Operate surface: task management, not a marketing page) but the interaction layer — button presses, status chip toggles, quest completion — gets a tactile, game-like snap rather than a corporate fade, because the product's whole premise is that admin work should feel a little bit like play.

**Key Characteristics:**
- Single accent color (torch gold), used sparingly — active states, primary actions, progress fills, never decoration
- Tonal-only depth: three background steps, zero box-shadow
- Dense, utilitarian layout (Operate mode) with playful micro-interactions layered on top
- System font stack throughout — no display/brand typeface, personality comes from color and motion, not type

## Colors

The palette is almost monochrome-navy at rest, with one reserved gold accent and standard semantic colors for status communication.

### Primary
- **Torch Gold** (`#fbbf24`): The only accent in the system. Active nav item background/text, primary button fill, focus rings (`accent/50`), progress bar fill, star/favorite toggle, selected-chip border and background tint. Never used for more than a handful of elements per screen.
- **Ember Copper** (`#d97706`): Torch Gold's hover/pressed state only. Never appears at rest.

### Neutral
- **Midnight Ledger** (`#0f172a`): App background (`body`). The base darkness everything else sits on top of.
- **Slate Parchment** (`#1e293b`): First elevation step — sidebar, cards, modals, inputs, selects, textareas. This is "the page" as opposed to "the void behind the page."
- **Torch Ash** (`#334155`): Second elevation step — hover backgrounds on nav items, unselected chip/pill backgrounds, the progress bar's empty track, `<kbd>` key badges.
- **Parchment White** (`#f1f5f9`): Primary text.
- **Fog Slate** (`#94a3b8`): Secondary/muted text — labels, timestamps, placeholder text, empty-state copy.
- **Iron Seam** (`#475569`): Borders and dividers — card borders, input borders, the sidebar's right-hand divider.

### Semantic (status communication only — never decorative)
- **Verdant Seal** (`#22c55e`): Completed status, the "Quest Complete!" banner, closed-issue chips.
- **Amber Warning** (`#f59e0b`): Blocked/waiting-on-dependency text, pending-review status.
- **Ember Red** (`#ef4444`): Danger actions (delete buttons), destructive confirmation text, abandoned status.
- **Beacon Blue** (`#3b82f6`): Reserved for informational status (currently defined as a token but lightly used — available for future "in review elsewhere" style states).

### Named Rules
**The One Torch Rule.** Torch Gold is the only color allowed to signal "this is active / this is the primary action." If a screen needs to draw attention to two things at once, one of them is wrong, not the palette.

## Typography

**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif (no separate display or mono face)

**Character:** A single, honest system-font stack carries the whole interface — the product's personality comes from color, motion, and vocabulary ("Quest," "Objective," "NPC"), not from typographic flourish.

### Hierarchy
- **Display** (700, 1.5rem/24px, line-height 1.3): Page titles ("Settings", "Dashboard") and the quest title on the detail page. Rare — one per screen.
- **Body** (400, 0.875rem/14px, line-height 1.5): The default for nearly everything — descriptions, list items, form inputs, button labels.
- **Label** (500, 0.75rem/12px, letter-spacing 0.05em, often uppercase): Section headers inside a quest ("OBJECTIVES", "PREREQUISITES"), field labels above inputs.
- **Micro** (400, 0.625rem/10px): The smallest text in the system — progress bar counters ("3/5 objectives"), backup-copy hints in the sidebar footer.

### Named Rules
**The No-Flourish Rule.** There is no italic, no serif, no display weight above 700. If a moment needs more emphasis, reach for color (gold) or motion (framer-motion), not a heavier or fancier typeface.

## Elevation & Depth

VOV uses tonal layering exclusively — zero `box-shadow` anywhere in the codebase today. Depth is "how dark is the background," not "how much light does this cast." Three steps: Midnight Ledger (void) → Slate Parchment (surface, +1) → Torch Ash (interactive/hover, +2). A `border-border` (Iron Seam) hairline typically separates a raised surface from the void behind it, doing the job a shadow would do in a lit system.

### Named Rules
**The Flat-By-Default Rule.** Nothing floats above the page by casting a shadow. If a future component needs to feel "lifted" (e.g., a toast or dropdown), reach for one more tonal step or a border first; only add a soft shadow as a last resort, and keep it ambient/diffuse, never a hard drop-shadow, so it doesn't clash with the otherwise flat system.

## Shapes

Two radius steps plus fully-round pills, no sharp corners anywhere:
- **Medium (8px, `rounded-lg`)**: The default for interactive elements — buttons, inputs, selects, textareas, the attachment/linked-item row containers.
- **Large (12px, `rounded-xl`)**: Containers one size up from their contents — cards, section panels, the modal shell, the "Quest Complete" banner.
- **Full (`rounded-full`)**: Anything chip/pill/circular — status badges, department/tag/role-selector chips, avatars, the progress bar track and fill.

Borders are always 1px, always Iron Seam (`border-border`) at rest, and switch to a gold-tinted border (`border-accent` or `border-accent/50`) on selection/focus rather than changing thickness.

## Components

Interaction character across all components: **tactile and game-like, not corporate.** Hover/active states change background color instantly (`transition-colors`) rather than fading softly; the one exception is the framer-motion "Quest Complete" banner, which pops in with a spring-like scale (`scale: 0.9 → 1`) rather than a plain fade — completion should feel like an event, not a state change.

### Buttons
- **Shape:** 8px radius (`rounded-lg`), never full-round except icon-only variants inside pill contexts.
- **Primary:** Torch Gold background, Midnight Ledger text (dark-on-gold for max contrast), `px-4 py-2` (md) or `px-2.5 py-1` (sm) + `text-sm`/`text-xs`.
- **Secondary:** Torch Ash background, Parchment White text — the "second-most-important action" slot.
- **Danger:** Ember Red at 20% opacity background, full-opacity Ember Red text — deliberately quieter than Primary so delete actions don't visually compete with "accept quest."
- **Ghost:** No background at rest, Fog Slate text; hover adds Torch Ash background and shifts text to Parchment White. Used for low-emphasis actions (Add, Restore, icon-adjacent labels).
- **Hover / Focus:** Instant color swap on hover (no fade duration specified — relies on Tailwind's default `transition-colors`); disabled state drops opacity to 50% and removes the pointer cursor.

### Chips / Pills (roles, departments, tags, dependencies)
- **Shape:** `rounded-full`, 1px border.
- **Unselected:** Iron Seam border, Fog Slate text, transparent fill.
- **Selected:** Torch Gold border, Torch Gold text, Torch Gold fill at 15% opacity (`bg-accent/15`) — the gold never runs at full opacity on a fill this large, keeping large selected areas legible against Parchment White body text elsewhere.

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`).
- **Background:** Slate Parchment.
- **Elevation Strategy:** Tonal only — see Elevation & Depth. No shadow.
- **Border:** 1px Iron Seam.
- **Internal Padding:** 20px (`p-5`) for top-level settings/dashboard cards; 12px (`px-3 py-2`) for compact list rows (attachments, linked items, snapshots).

### Inputs / Fields (Input, Select, Textarea)
- **Style:** Slate Parchment background, Iron Seam border, 8px radius, Parchment White text, Fog Slate placeholder.
- **Focus:** 2px Torch Gold ring at 50% opacity (`focus:ring-2 focus:ring-accent/50`), no border-color change — the ring is the only focus signal.
- **Label:** Label typography (12px, medium, muted) sits directly above the field, never floating/inline.

### Status Badge
- **Shape:** Fully round pill, `px-2 py-0.5`, `text-xs font-medium`, always white text regardless of fill color (fill color comes from per-status semantic tokens, e.g. Verdant Seal for completed).

### Progress Bar
- **Style:** No shadow, no border — a 6px-tall (`h-1.5`) fully-rounded track in Torch Ash, filled with a Torch Gold bar that animates width over 300ms. Micro-typography count ("3/5 objectives") and percentage sit directly above it.

### Navigation (sidebar)
- **Style:** Fixed-width rail, Slate Parchment background, Iron Seam right border. Each item: icon + label, 8px radius, `px-3 py-2`. Active item gets Torch Gold text on a 15%-opacity Torch Gold background — the only place in the whole system where the accent appears as a background fill on an area this large, marking it as the single most important piece of navigational state.
- **Mobile treatment:** none yet — the rail is fixed-width and always visible; there is no collapse/hamburger behavior below any breakpoint (tracked as a known gap, see PRODUCT.md Capabilities and Constraints).

## Do's and Don'ts

### Do:
- **Do** keep Torch Gold reserved for "this is active / this is primary" — one accent, used sparingly (The One Torch Rule).
- **Do** express elevation with the three tonal steps (Midnight Ledger → Slate Parchment → Torch Ash) before reaching for a shadow (The Flat-By-Default Rule).
- **Do** use `rounded-lg` (8px) for anything a user directly interacts with (buttons, inputs) and `rounded-xl` (12px) for the container one level up (cards, modals).
- **Do** let completion/success moments (finishing a quest, closing a linked GitHub issue) feel like an event — a spring-scale pop or a colored banner — not a silent state flip.

### Don't:
- **Don't** introduce a second full-opacity accent color for emphasis; desaturate to Fog Slate or use a semantic status color instead.
- **Don't** add `box-shadow` to cards, modals, or dropdowns as a first instinct — try one more tonal step first.
- **Don't** run Torch Gold at full opacity across a large fill (a whole selected-chip background, a whole active-row background); keep large fills at 15% opacity and let the border/text carry full saturation.
- **Don't** introduce a second typeface or an italic/serif treatment for "emphasis" — reach for color or motion instead (The No-Flourish Rule).
