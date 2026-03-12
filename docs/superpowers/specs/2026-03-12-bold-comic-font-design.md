# Bold Comic Font Direction Design

Date: 2026-03-12
Status: Approved in chat

## Goal

Increase superhero personality through typography by introducing a bold comic-style display font while preserving readability across chat content and UI controls.

## Scope

In scope:

- Replace the current display font source in the app shell.
- Keep body and mono typography unchanged for legibility and technical clarity.
- Verify display font usage appears in intended high-impact surfaces.

Out of scope:

- Color, layout, or animation redesign.
- Backend/API/data model changes.
- Broad typography refactors across unrelated components.

## Approaches Considered

### A) Hero-display swap (chosen)

- Keep `Manrope` for body/UI text.
- Replace `Cinzel` display source with `Bebas Neue`.
- Continue using display typography only in headline-style surfaces.

Why chosen:

- Delivers a stronger comic/superhero tone with minimal risk.
- Preserves chat readability and avoids disruptive global typography shifts.
- Fits existing font-variable architecture in `app/layout.tsx` and `app/globals.css`.

### B) Dual-comic stack

- Use two comic-leaning display fonts (`Bebas Neue` + `Anton`) for different emphasis tiers.

Trade-off:

- More expressive, but higher visual noise and harder consistency management.

### C) Full comic treatment

- Shift both display and body families toward comic style.

Trade-off:

- Strongest personality but highest readability/accessibility risk, especially in dense chat text.

## Current System Context

- `app/layout.tsx` currently registers `Manrope` (`--font-sans`), `Cinzel` (`--font-display`), and `Geist_Mono` (`--font-mono`).
- `app/globals.css` maps theme tokens with `@theme inline`, including `--font-sans`, and the `html` base applies `font-sans`.
- Existing visual direction is already cinematic; this change should be additive and targeted.

## Proposed Design

### Typography Roles

- **Body/UI text:** keep `Manrope` for readability in prompts, messages, controls, and utility text.
- **Display text:** move to `Bebas Neue` for hero headings, section titles, and hero-name callouts.
- **Mono text:** keep `Geist_Mono` for code-like and technical surfaces.

### File-Level Changes

#### `app/layout.tsx`

- Replace `Cinzel` import with `Bebas_Neue` from `next/font/google`.
- Configure `Bebas_Neue` with `subsets: ["latin"]`, `variable: "--font-display"`, and `display: "swap"`.
- Keep className composition pattern unchanged; only swap the display font source.

#### `app/globals.css`

- Keep existing token structure and base rules unchanged.
- Preserve `--font-display` availability for existing display-typography usage.
- Do not alter `--font-sans` or `html` base assignment.

### Intended Display Surfaces (Explicit)

In scope for `--font-display` usage:

- Hero selection screen main title.
- Hero card name text (the character name only).
- Active chat hero header title.

Out of scope for `--font-display` usage (must remain `Manrope`):

- Chat message bubbles and streamed assistant text.
- Prompt input, labels, and helper text.
- Conversation list items, timestamps, and button text.
- System/utility copy (errors, toasts, placeholders).

## Data Flow and Runtime Behavior

- No functional data-flow changes.
- Font loading behavior remains non-blocking through `display: "swap"`.
- On delayed network load, fallback font renders first and then swaps to `Bebas Neue`.

## Risks and Mitigations

- **Risk:** condensed display font becomes hard to read at small sizes.
  - **Mitigation:** restrict display usage to headline-scale text and hero-name callouts only; keep body text, form labels, and utility labels on `Manrope`.
- **Risk:** unintended inheritance of display font to body text.
  - **Mitigation:** verify typography hierarchy and explicit classes in key screens.

## Validation and Success Criteria

Manual checks:

- On hero selection view, the main page title and each hero card name render with display styling.
- On active chat view, the hero header title renders with display styling.
- Chat message text, prompt composer text, conversation row text, and button labels render with sans styling.
- Typography behavior is unchanged between light and dark themes.
- Mobile (`<= 768px`) and desktop (`>= 1024px`) show no clipping or unreadable wraps in display headings.

Project verification:

- `pnpm lint`
- `pnpm build`

Success criteria:

- Exactly the three in-scope surfaces use display typography (hero selection title, hero card names, active chat hero header title).
- All out-of-scope text surfaces remain sans typography.
- No clipping/wrapping regressions are observed for display headings at mobile and desktop checkpoints.
- No build/lint regressions are introduced by the font swap.
