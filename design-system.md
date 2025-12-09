# HJ Hockey App – Design System

_Last updated: 2025-03-12_

## 1. Purpose

This document defines the visual design rules for the **HJ Hockey App** and explains how to use the **HJ Token Pack** in code.

The goals are:

- **Consistency** – similar elements look and behave the same everywhere.
- **Scalability** – rebranding (e.g., to *HJ All Stars*) or adding dark mode is done by updating tokens, not hand-editing components.
- **Speed** – designers and developers (and Codex/Copilot) can work faster using a shared vocabulary.
- **Safety** – visual changes are made in one place and cascade predictably.

This file should live in the repo alongside the code (e.g. `docs/design-system.md`) and be kept in sync with the single CSS entrypoint at `src/styles/hj-tokens.css` (tokens + global primitives).


## 2. Implementation

The Hockey for Juniors design system is implemented via CSS custom properties and a single global stylesheet.

- **Single source of truth:** `src/styles/hj-tokens.css` now contains both tokens and all global/layout/component primitives (formerly split across `App.css` + tokens).
- **Tokens:** all tokens use the `--hj-*` namespace (e.g., `--hj-color-brand`, `--hj-space-4`, `--hj-radius-md`, `--hj-font-size-lg`, `--hj-duration-default`).
- **Global primitives:** page shell, cards, section headers, filters, fixtures, standings, teams list, buttons, etc., all live in this file and consume the tokens.
- **Imports:** load `src/styles/hj-tokens.css` once from the app entry point; do not import other theme CSS files. There is no `App.css` anymore.


## 3. Core Concepts

### 3.1 Design Tokens

Design tokens are **named design decisions** – colour, spacing, typography, radius, etc. – exposed as CSS variables.

Example:

```css
:root {
  --hj-color-brand-primary: #0a3a82;
  --hj-space-md: 12px;
  --hj-font-weight-semibold: 600;
}
```

Components never hard-code these values directly; they refer to tokens:

```css
.card {
  background-color: var(--hj-card-bg);
  border-radius: var(--hj-card-radius);
  padding: var(--hj-card-padding-y) var(--hj-card-padding-x);
}
```

This means changing one token updates every component that uses it.


### 3.2 Token Layers

The HJ Token Pack is organised into two layers:

1. **Foundation tokens** – raw design primitives (colour, spacing, type).  
2. **Alias / component tokens** – semantic names used by components (e.g. `--hj-card-bg`, `--hj-team-link-color`).

Foundation rarely changes. Alias tokens are where we express component-level design choices.


## 4. HJ Token Pack Overview

The HJ Token Pack and global primitives are defined in `src/styles/hj-tokens.css`.
Legacy token/theme files have been removed; only this file should be imported.

### 4.1 Foundation Tokens (examples)

- **Colours**
  - `--hj-color-brand-primary` – main brand blue.
  - `--hj-color-brand-secondary` – accent green.
  - `--hj-color-text-primary` – default text.
  - `--hj-color-page-bg` – app background.
  - `--hj-color-surface` – card background.
  - `--hj-color-border-subtle` – light borders.

- **Typography**
  - `--hj-font-family-base`
  - `--hj-font-size-xs | sm | md | lg | xl`
  - `--hj-font-weight-regular | medium | semibold | bold`
  - `--hj-line-height-tight | normal | loose`

- **Spacing**
  - `--hj-space-xxs | xs | sm | md | lg | xl | 2xl`

- **Radius**
  - `--hj-radius-sm | md | lg | pill`

- **Elevation**
  - `--hj-elevation-0 | 1 | 2`

- **Motion**
  - `--hj-transition-fast`
  - `--hj-transition-normal`


### 4.2 Alias / Component Tokens (examples)

- **Page**
  - `--hj-page-bg`
  - `--hj-page-text-color`

- **Cards**
  - `--hj-card-bg`
  - `--hj-card-radius`
  - `--hj-card-padding-y`
  - `--hj-card-padding-x`
  - `--hj-card-shadow`
  - `--hj-card-border-color`

- **Team Links**
  - `--hj-team-link-color`
  - `--hj-team-link-color-hover`
  - `--hj-team-link-font-size`
  - `--hj-team-link-font-weight`

- **Sections**
  - `--hj-section-title-size`
  - `--hj-section-title-weight`
  - `--hj-section-title-color`

- **Chips / badges**
  - `--hj-chip-bg`
  - `--hj-chip-radius`
  - `--hj-chip-font-size`


## 5. Global Styles & Conventions

### 5.1 Body

```css
body {
  font-family: var(--hj-font-family-base);
  color: var(--hj-page-text-color);
  background-color: var(--hj-page-bg);
}
```

All page-level typography and background colours inherit from tokens.


### 5.2 Cards

Used by: Fixtures, Standings, Teams, Page Intro, Feedback blocks.

```css
.card {
  background-color: var(--hj-card-bg);
  border-radius: var(--hj-card-radius);
  padding: var(--hj-card-padding-y) var(--hj-card-padding-x);
  box-shadow: var(--hj-card-shadow);
  border: 1px solid var(--hj-card-border-color);
}
```

**Guidelines:**

- Use `.card` for any primary grouped content block.
- Avoid redefining radius, shadows, or padding on individual card components unless layout absolutely requires it. Prefer minor modifiers (e.g. `.card.card--compact`).


### 5.3 Team Links

Used by: Fixtures, Standings, Teams list, and anywhere a team name navigates to a team profile.

```css
.team-link {
  font-weight: var(--hj-team-link-font-weight);
  font-size: var(--hj-team-link-font-size);
  color: var(--hj-team-link-color);
  text-decoration: none;
  line-height: var(--hj-line-height-tight);
  cursor: pointer;
  transition: color var(--hj-transition-fast), opacity var(--hj-transition-fast);
  padding: var(--hj-space-xxs) 0;
}

@media (hover: hover) and (pointer: fine) {
  .team-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    color: var(--hj-team-link-color-hover);
  }
}

.team-link:active {
  opacity: 0.75;
}
```

**Guidelines:**

- Any clickable team name **must** use `.team-link`.
- Never hard-code colours or weights for team name links; adjust the token values instead.
- Maintain adequate tap target by preserving padding (neither reduce to 0 nor wrap in inline elements that clip it).


### 5.4 Section Titles

Used by headings like `"U11 BOYS — Fixtures"` or `"U16 GIRLS — Standings"`.

```css
.section-title {
  font-size: var(--hj-section-title-size);
  font-weight: var(--hj-section-title-weight);
  color: var(--hj-section-title-color);
}
```

Apply this class in JSX for section headings to keep typography consistent.


## 6. How to Use Tokens in CSS & Components

### 6.1 When creating or updating CSS

1. **Check tokens first**  
   Before adding a raw value (e.g. `border-radius: 18px;`), look for an existing token that fits.
2. **Prefer semantic alias tokens**  
   Use `--hj-card-radius` instead of `--hj-radius-lg` inside `.card`. Component-level tokens can change independently even if the foundation stays the same.
3. **Introduce new tokens intentionally**  
   - If a style is truly unique to one component, using a literal value is acceptable.  
   - If two or more components will share a pattern, create a new alias token instead.

### 6.2 When building new components

1. Decide which existing component your new one is closest to (`card`, `chip`, `team-link`, etc.).  
2. Reuse that component’s tokens where possible.  
3. If new semantics are needed, add a new token to `hj-tokens.css` and use it in your CSS.

**Example: new “Pool badge”**

```css
.pool-badge {
  background-color: var(--hj-chip-bg);
  border-radius: var(--hj-chip-radius);
  padding: 0 var(--hj-space-sm);
  font-size: var(--hj-chip-font-size);
  color: var(--hj-color-text-secondary);
}
```


## 7. Workflow with Codex / Copilot

We want Codex/Copilot to respect the design system instead of inventing random styles.

### 7.1 Example prompt: refactor to tokens

> “In `src/styles/hj-tokens.css`, replace hard-coded colors, spacing, and radius used in cards, section headers, and links with the appropriate variables from `--hj-*` tokens. Ensure `.card`, `.team-link`, and `.section-title` all use token-based values. Do not change component logic, only CSS.”

### 7.2 Example prompt: new component

> “Create a `TournamentBadge` component that uses the existing HJ tokens: card background `--hj-card-bg`, small pill radius `--hj-chip-radius`, font-size `--hj-chip-font-size`, and text color `--hj-color-text-secondary`. Add styles to `src/styles/hj-tokens.css` using these tokens only.”


## 8. Making Changes Safely

### 8.1 Changing a foundation token

- **Impact:** potentially affects many components.  
- **Process:**
  1. Identify all alias tokens that reference it.
  2. Consider whether the change should happen at the alias layer instead.
  3. Test Fixtures, Standings, Teams, and Feedback on mobile & desktop.

### 8.2 Changing an alias / component token

- Safe way to adjust a single pattern (e.g. make cards tighter or links bolder).
- After changes, check all components that use that alias (document them in comments if needed).

### 8.3 Adding a new token

- Place it logically: foundation vs alias section.
- Follow the naming convention: `--hj-[category]-[name]`.
- Prefer clarity over brevity (e.g. `--hj-color-surface-highlight` better than `--hj-color-hl`).


## 9. Naming Conventions

- Prefix: **`--hj-`** for all tokens to keep them scoped and searchable.
- Structure: `--hj-[domain]-[descriptor]`, for example:
  - `--hj-color-brand-primary`
  - `--hj-card-shadow`
  - `--hj-team-link-font-weight`

Class names also follow a simple pattern:

- Generic components: `.card`, `.section-title`, `.team-link`
- Variations/modifiers: `.card--compact`, `.card--alert` (future use)


## 10. Dark Mode & Theming (Future)

The token pack already includes a dark-mode `@media (prefers-color-scheme: dark)` override skeleton.

To enable a full dark theme later:

1. Expand the dark-mode section in `hj-tokens.css` to redefine page, surface, border, and text tokens.
2. Avoid using raw colours in any component CSS; always go via tokens.
3. Optional: support manual theme switching by applying tokens to `.theme-dark` in addition to `:root`.


## 11. Quick Checklist for Contributors

Before you merge UI changes:

- [ ] Did you use design tokens instead of hard-coded values where appropriate?
- [ ] Do new components reuse existing component tokens where possible?
- [ ] Are team names using the `.team-link` class and respecting its tokens?
- [ ] Do cards still look consistent across Fixtures, Standings, Teams, and Feedback?
- [ ] Have you updated this `design-system.md` if you added or significantly changed tokens?


---

If you are unsure whether a new style belongs as a token, ask:

> “Will this likely be reused or adjusted in more than one place?”  

If the answer is **yes**, make it a token.
