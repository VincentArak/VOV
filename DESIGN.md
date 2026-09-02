---
name: VOV
description: A task manager wearing World of Warcraft's interface — gold on midnight, quest text on parchment.
colors:
  midnight: "#0a0a16"
  panel: "#171730"
  panel-raised: "#252546"
  sunken: "#05050d"
  torch-gold: "#ffd100"
  ember: "#c4a300"
  gold-hi: "#f8e7a0"
  gold: "#c9a44c"
  gold-mid: "#a8802f"
  gold-lo: "#6b4a18"
  bronze: "#8a6a2e"
  frame-dark: "#1a1208"
  parchment-hi: "#f0dcb4"
  parchment: "#dcc49c"
  parchment-lo: "#c9a97a"
  parchment-dark: "#402605"
  ink: "#2e1f0f"
  ink-title: "#350000"
  ink-objective: "#4d2e00"
  ink-shadow: "#7d590d"
  ink-gold: "#6b5200"
  text: "#ffffff"
  text-muted: "#a8a8a8"
  text-dim: "#7f7f7f"
  tracker-normal: "#cccccc"
  tracker-complete: "#999999"
  tracker-header: "#bf9c00"
  qd-trivial: "#808080"
  qd-standard: "#40bf40"
  qd-difficult: "#ffd100"
  qd-verydifficult: "#ff8040"
  qd-impossible: "#ff1a1a"
  quality-poor: "#9d9d9d"
  quality-common: "#ffffff"
  quality-uncommon: "#1eff00"
  quality-rare: "#0070dd"
  quality-epic: "#a335ee"
  quality-legendary: "#ff8000"
  quality-artifact: "#e6cc80"
  quality-heirloom: "#00ccff"
  success: "#1aff1a"
  warning: "#ff8040"
  danger: "#ff1a1a"
  info: "#00bff3"
  xp-fill: "#94008c"
  xp-fill-hi: "#b81fae"
  xp-fill-lo: "#6a0064"
  xp-rested: "#0063e0"
  bar-gold-hi: "#ffe066"
  bar-green-hi: "#4dff4d"
  bar-green-lo: "#00c000"
  class-mage: "#3fc7eb"
  class-hunter: "#aad372"
  class-demonhunter: "#a330c9"
  class-druid: "#ff7c0a"
  class-warrior: "#c69b6d"
  alliance: "#4a54e8"
  horde: "#e50d12"
typography:
  display:
    fontFamily: "Metamorphous, Cinzel, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Metamorphous, Cinzel, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.3
  heading:
    fontFamily: "Metamorphous, Cinzel, Georgia, serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.15em"
  body:
    fontFamily: "Amethysta, Marcellus, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Amethysta, Marcellus, Georgia, serif"
    fontSize: "12px"
    fontWeight: 400
  micro:
    fontFamily: "Amethysta, Marcellus, Georgia, serif"
    fontSize: "11px"
    fontWeight: 400
  tiny:
    fontFamily: "Barlow Condensed, Roboto Condensed, sans-serif"
    fontSize: "10px"
    fontWeight: 400
  nano:
    fontFamily: "Barlow Condensed, Roboto Condensed, sans-serif"
    fontSize: "9px"
    fontWeight: 400
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.frame-dark}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hi}"
  button-secondary:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  button-danger:
    backgroundColor: "#3a0d0d"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-parchment:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
  input:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  status-badge:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    textColor: "{colors.text}"
---

# Design System: VOV

## Overview

**Creative North Star: "The Quest Log"**

VOV wears World of Warcraft's interface. Not a fantasy-flavoured skin — the
actual grammar of the game's UI: a midnight-blue panel that is deliberately not
black, one gold accent doing all the emphasis work, forged-metal borders that
overflow their own frames, and quest text set in dark ink on an aged sheet of
parchment.

The palette is taken from Blizzard's own FrameXML source rather than sampled by
eye, so `#171730` really is `TOOLTIP_DEFAULT_BACKGROUND_COLOR` and `#ffd100`
really is `NORMAL_FONT_COLOR`. Where a value could only come from a bitmap —
the parchment sheet, the gold border ramp — it is marked as estimated in
`src/index.css` rather than presented as canon. No Blizzard art is used: every
frame, bevel and texture is CSS, and the two typefaces are open-licenced
stand-ins for the game's commercial faces.

The mapping runs deeper than colour. Task priority uses the game's
quest-difficulty scale, because grey-means-skip-it and red-means-this-will-kill-you
is the same judgement a priority field asks for. A task awaiting review shows the
bobbing `?` of a quest ready to turn in. Departments read as Repositories and the
relationship graph reads as The Realm, because in this project that is what they
are.

**Key Characteristics:**
- One gold accent (`#ffd100`) carries every active and primary state; nothing else competes
- Depth is tonal — four background steps, and metal borders drawn with layered box-shadows, never a soft drop shadow
- Two typefaces in opposition: an ornate face for titles against a glyphic serif for body copy
- Dark panels everywhere except quest prose, which sits on parchment in near-black ink
- Completion recedes toward the background; it is never struck through

## Colors

Near-monochrome midnight with a single gold accent, plus two borrowed semantic
scales (quest difficulty and item quality) that carry real meaning rather than
decoration.

### Primary
- **Torch Gold** (`#ffd100`): The only accent. Active nav, primary buttons, section headings, progress fill, focus rings, the tracked star. Its scarcity is what makes it read as important.
- **Ember** (`#c4a300`): Gold's quieter register — field labels, group headings, secondary emphasis.

### Neutral
- **Midnight** (`#0a0a16`): The page behind everything.
- **Panel** (`#171730`): Every card, sidebar and dialog. The blue channel is double red/green — this is the single most identifying value in the system, and using black here collapses the whole look.
- **Panel Raised** (`#252546`): Hover fills, chips, keycaps.
- **Sunken** (`#05050d`): Inputs and icon slots, which read as carved into the panel.
- **White / Muted / Dim** (`#ffffff` / `#a8a8a8` / `#7f7f7f`): Body, secondary, tertiary text.

### Metal (ESTIMATED — sampled from screenshots, no source constant exists)
- **Gold Highlight → Gold → Gold Mid → Gold Low** (`#f8e7a0` → `#c9a44c` → `#a8802f` → `#6b4a18`): The four-stop ramp every border gradient runs through.
- **Frame Dark** (`#1a1208`): The near-black outline that sits outside the metal.

### Parchment
- **Sheet** (`#f0dcb4` / `#dcc49c` / `#c9a97a`, ESTIMATED): Highlight, midtone and shadow of the quest sheet.
- **Ink** (`#2e1f0f`) / **Ink Title** (`#350000`) / **Ink Objective** (`#4d2e00`): Body, title and objective text on parchment.
- **Ink Shadow** (`#7d590d`): Titles on parchment take a dark-gold shadow, never black.
- **Ink Gold** (`#6b5200`): Torch Gold darkened for parchment. Gold at full brightness is unreadable on the sheet, so any gold-coded value (a "difficult" priority chip, for example) drops to this on light ground.

### Quest Difficulty → task priority
`#808080` trivial · `#40bf40` standard · `#ffd100` difficult · `#ff8040` very difficult · `#ff1a1a` impossible.

### Class Colours → relationship types
Bonds in The Realm graph use the game's class palette so each type has a distinct, saturated identity: `#3fc7eb` Mage cyan (collaborator) · `#aad372` Hunter green (reports to) · `#a330c9` Demon Hunter purple (mentor) · `#ff7c0a` Druid orange (assists) · `#c69b6d` Warrior tan (peer).

### Item Quality → available for linked-item and rarity signals
`#9d9d9d` poor · `#ffffff` common · `#1eff00` uncommon · `#0070dd` rare · `#a335ee` epic · `#ff8000` legendary · `#e6cc80` artifact · `#00ccff` heirloom.

### Named Rules
**The One Torch Rule.** Gold marks what is active or primary and nothing else. If two things on a screen are gold, one of them is wrong.

**The Not-Black Rule.** Panels are `#171730`. Reaching for `#000` or a neutral grey anywhere a panel belongs is the fastest way to lose the look.

## Typography

**Display / Title face:** Metamorphous (open-licenced stand-in for Morpheus)
**Body face:** Amethysta (open-licenced stand-in for Friz Quadrata)
**Numeric face:** Barlow Condensed (stand-in for Arial Narrow), tabular figures

**Character:** The game's hierarchy comes from switching family, not from weight.
An ornate title against a glyphic serif body reads as hierarchy even at the same
size and colour — which is why this system has almost no bold text.

### Hierarchy
- **Display** (Metamorphous, 30px): Page titles. One per screen, gold, with a soft outer glow.
- **Title** (Metamorphous, 18px): Quest titles on parchment, dialog headings.
- **Heading** (Metamorphous, 12px, 0.15em tracking, uppercase): Section and group labels.
- **Body** (Amethysta, 13px): Default text.
- **Small** (Amethysta, 12px): Dense rows, chips, status text.
- **Micro** (Amethysta, 11px): Metadata under a quest row, help text, field hints.
- **Tiny / Nano** (Barlow Condensed, 10px / 9px): Counters, timestamps, keycaps, nav hover hints.

### Named Rules
**The Family-Not-Weight Rule.** Emphasis comes from switching to Metamorphous or to gold. Bold is nearly absent; there is no italic and no second serif.

**The Hard Shadow Rule.** Text on dark surfaces carries `1px 1px 0 rgba(0,0,0,0.85)`. Text on parchment carries none, except titles, which take a dark-gold shadow.

## Layout

Pages are a single column against a fixed 240px sidebar, capped at `max-w-5xl`
for list and dashboard screens and `max-w-3xl` for the quest sheet, so prose
never runs to a fatiguing measure. The sidebar collapses behind a trigger below
the `lg` breakpoint.

Density is tight — 12–20px card padding, 6px between list rows — because these
screens are read at a glance rather than browsed.

## Elevation & Depth

No soft drop shadows. Depth is four tonal steps (Midnight → Panel → Panel Raised,
with Sunken below the page for inset fields) plus forged metal edges built from
stacked `box-shadow` rings: a near-black outline, a gold ring, an inner top
highlight, and an inner darkening.

This reproduces the game's 9-slice borders, whose art overflows the frame's own
bounds — an action button is 36px but its border texture is 66px. That overflow
is why WoW frames read as objects rather than rectangles, and stacked shadows are
how CSS gets there without an image.

### Named Rules
**The Forged-Edge Rule.** A raised surface gets a metal ring, not a blur. The only blur in the system is the ambient darkness under a modal.

## Shapes

Corners are nearly square — 2–4px, 6px on the ornate frame. WoW frames are
geometrically rectangular and only look rounded because the corner art is a
curved metal fitting, so anything softer than 6px immediately reads as a modern
web app instead.

Pills (`9999px`) are reserved for avatars and progress tracks.

## Components

### Buttons
- **Primary:** Gold gradient, near-black text, 3px radius, semibold. Depresses on `:active`.
- **Secondary:** Panel gradient with a gold ring.
- **Danger:** Deep red field with bright red text — deliberately quieter than primary so destructive actions do not out-shout the main one.
- **Ghost:** No fill; muted text warming to gold.
- **Hover:** An additive white overlay (`mix-blend-mode: plus-lighter`), matching the game's `alphaMode="ADD"` highlight. Not an opacity or background change.

### Cards
Panel fill, metal ring, 4px radius, 12–20px padding. The `ornate` variant swaps
the ring for a real four-stop gradient border and is reserved for dialogs and the
one hero surface on a page. The `parchment` variant flips to the aged sheet with
ink text.

### Inputs
Sunken fill with an inset shadow so the field reads as carved. Focus adds a gold
ring plus outer glow; the border colour never changes.

### Status Badge
Small square-ish pill, white text, colour by state, with a hairline gold ring.

### Progress Bar
Black track with a gold ring; fill is a gold gradient (`#ffe066` → `#ffd100` → `#c4a300`) that switches to green (`#4dff4d` → `#1aff1a` → `#00c000`) at 100%. A
white spark trails the leading edge — the detail that identifies a WoW bar at a
glance. The spark is suppressed at 0% so it does not sit orphaned at the left.

### Quest Row
Difficulty pip, tracking star, title, metadata line, optional progress bar and a
status badge. A quest ready for review shows a bobbing gold `?`.

### Divider
A gold rule fading at both ends with a rotated diamond at its centre.

## Do's and Don'ts

### Do:
- **Do** keep `#171730` as the panel colour — it is the system's fingerprint.
- **Do** build elevation from tonal steps and metal rings, never a soft shadow.
- **Do** signal completion by receding toward the background (`#cccccc` → `#999999` on dark, `#000000` → `#333333` on parchment) and, on parchment, by appending "(Complete)".
- **Do** switch typeface to create hierarchy before reaching for weight.
- **Do** put quest prose on parchment and interface chrome on dark panels.

### Don't:
- **Don't** introduce a second accent colour; use a difficulty or quality colour if a second signal is genuinely needed.
- **Don't** use strikethrough or heavy transparency for completed items.
- **Don't** round corners past 6px.
- **Don't** use `opacity` or a background swap for hover where the additive overlay belongs.
- **Don't** embed Blizzard textures, icons, or the Friz Quadrata / Morpheus typefaces — the look is reproduced, not lifted.
