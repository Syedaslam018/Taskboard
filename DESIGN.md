---
name: TaskBoard
description: A focused collaborative workspace for turning team intent into visible progress.
colors:
  primary: "#0b9286"
  primary-soft: "#e5faf6"
  ink: "#142321"
  ink-dark: "#071211"
  surface: "#ffffff"
  surface-dark: "#0d1a18"
  neutral-bg: "#f4f7f6"
  neutral-bg-dark: "#071211"
  line: "#dbe5e2"
  line-dark: "#203c36"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#062d2b"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.875rem"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.875rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: TaskBoard

## Overview

**Creative North Star: "The Quiet Control Room"**

TaskBoard is designed as a calm operating surface for collaborative work. The interface stays quiet at rest so progress, priority, presence, and next actions carry the visual signal. Its futuristic quality comes from precision: cool ink surfaces, aqua status light, compact uppercase labels, and crisp structural borders.

The system favors restrained density over ornamental chrome. Light mode uses a cool paper background with bright surfaces; dark mode uses deep green-black ink with lifted panels. A single aqua accent establishes focus, action, and product identity while semantic colors remain reserved for task state and urgency.

**Key Characteristics:**

- Cool ink-and-aqua palette with a single dominant accent.
- Thin structural borders and soft ambient elevation.
- Compact labels paired with confident, close-tracked headings.
- Rounded but disciplined surfaces: 12px controls, 16px containers.
- One icon language and one clear action signal per surface.

## Colors

The palette is intentionally low-saturation around a vivid aqua signal. Color is used to orient and prioritize, not decorate every surface.

### Primary

- **Signal Aqua** (`{colors.primary}`): Primary actions, active states, brand marks, focus, and live presence.
- **Signal Wash** (`{colors.primary-soft}`): Quiet backgrounds behind selected or highlighted controls.

### Neutral

- **Cool Paper** (`{colors.neutral-bg}`): Light application canvas.
- **Deep Ink** (`{colors.ink-dark}`): Dark application canvas and brand mark contrast.
- **Raised Surface** (`{colors.surface}`): Cards, menus, dialogs, and fields in light mode.
- **Ink Surface** (`{colors.surface-dark}`): Cards, menus, dialogs, and fields in dark mode.
- **Structural Line** (`{colors.line}` / `{colors.line-dark}`): Dividers, field strokes, card boundaries, and Kanban structure.

### Named Rules

**The Signal Rarity Rule.** Aqua is the attention signal; keep it concentrated on actions, current context, presence, and selected states.

## Typography

**Display Font:** Inter, with a system sans fallback

**Body Font:** Inter, with a system sans fallback

**Character:** Compact and operational. Headings use close tracking and medium weight for confidence; small uppercase labels provide navigation and grouping without competing with the content.

### Hierarchy

- **Display** (600, `clamp(1.875rem, 4vw, 3rem)`, 1.1): Page titles and first-viewport context.
- **Title** (600, 1.125rem, 1.25): Section headings such as queues, activity, and boards.
- **Body** (400, 0.875rem, 1.5): Tasks, descriptions, activity, and supporting copy.
- **Label** (600, 0.6875rem, 1.2, uppercase, `0.08em`): Workspace context, field labels, and compact metadata.

### Named Rules

**The Two-Speed Type Rule.** Let close-tracked headings establish hierarchy, then let readable body copy do the explaining; do not make every text element loud.

## Layout

Authenticated screens use a sticky 64px top bar followed by a centered content container with responsive 16–24px padding. Standard pages cap their reading width while boards use a full-bleed horizontal canvas. Dashboard content uses a compact four-part metric strip above a two-column work/activity split. Workspace pages use asymmetric board/activity columns. On narrow screens, controls stack and cards collapse to one column.

The spacing rhythm is based on 8px increments, with 16px internal control spacing, 20–24px card padding, and larger separation above page titles than below them.

## Elevation & Depth

TaskBoard uses a hybrid of structural lines and soft ambient depth. Cards have a 1px line at rest and a diffuse shadow that becomes more noticeable on interactive hover. Dark mode relies primarily on tonal surface separation; shadows stay subtle and never become a glow effect.

### Shadow Vocabulary

- **Ambient Surface:** `0 16px 40px rgb(20 35 33 / 0.07)` in light mode and `0 18px 48px rgb(0 0 0 / 0.28)` in dark mode; used for cards, menus, and dialogs.
- **Task Lift:** `0 5px 14px rgb(20 35 33 / 0.06)`; used by draggable task cards.

### Named Rules

**The Border-First Rule.** Structural lines establish hierarchy; elevation supports interaction and layering rather than replacing the grid.

## Shapes

Controls use 12px corners, cards and dialogs use 16px corners, and small metadata uses 8px corners. Pills are reserved for compact status or priority labels. Inputs are filled surfaces with a single structural stroke and an aqua focus border.

## Components

### Buttons

- **Shape:** 12px corners with compact 8px vertical / 14px horizontal padding.
- **Primary:** Signal Aqua background with dark ink text; hover deepens the aqua and inverts text only when needed for contrast.
- **Secondary:** Raised surface with a structural line; hover lifts the tonal surface.
- **Ghost:** Transparent at rest, tonal surface on hover.
- **Focus:** Visible aqua ring on keyboard focus.

### Cards / Containers

- **Corner Style:** 16px for primary containers, 12px for task cards and compact controls.
- **Background:** Raised light surface or ink surface in dark mode.
- **Shadow Strategy:** Ambient surface shadow at rest; task lift for draggable card interaction.
- **Border:** 1px structural line; interactive cards shift the line to aqua on hover.
- **Internal Padding:** 20px by default, 24px on larger dashboard panels.

### Inputs / Fields

- **Style:** Filled surface, 1px structural line, 12px corners, compact 14px text.
- **Focus:** Aqua border with a soft aqua ring.
- **Labels:** Uppercase, muted, letter-spaced labels above fields.

### Navigation

- **Style:** Sticky translucent top bar with a 64px rhythm, brand mark at left, current context beside it, and icon actions at right.
- **Brand:** Deep ink rounded-square mark with an aqua layout glyph.
- **Mobile:** Product name collapses while context and icon actions remain available.

### Kanban Board

The board is the signature work surface: muted columns sit on the application canvas, tasks use raised white/ink cards, and the add-column affordance is a dashed structural extension rather than another heavy card.

## Do's and Don'ts

### Do:

- **Do** use aqua sparingly for focus, action, live presence, and selected states.
- **Do** keep surfaces quiet and let hierarchy come from spacing, type, and structural lines.
- **Do** preserve the 8px spacing rhythm and the 12px / 16px radius split.
- **Do** make interactive states visible with border, tonal, or shadow changes.
- **Do** maintain the light and dark surface relationships together.

### Don't:

- **Don't** return to a generic blue primary palette or saturate every card with accent color.
- **Don't** use gradients, decorative grid textures, or ornamental glow as a substitute for hierarchy.
- **Don't** stack nested rounded cards when a clear section or list will do.
- **Don't** use emoji or untracked glyphs in place of the existing stroke icon system.
- **Don't** make every metric a floating hero card; use compact grouped summaries for dashboard stats.
