# Superhero Chat Cinematic UI Design

Date: 2026-03-12
Status: Approved in chat

## Goal

Transform the existing superhero chat UI into a visually striking cinematic-dark experience that becomes a clear product moat while preserving all existing chat functionality and backend behavior.

## Scope

In scope for this UI pass:

- Hero selection redesigned into large cinematic image cards with gradient overlays.
- Moderate UX upgrade of the main chat shell (split layout retained, hierarchy improved).
- High-impact but controlled motion system (hover, entrance, subtle depth).
- Real web image URLs for Spider-Man, Batman, and Superman.
- Robust fallback behavior for image load failures.
- Mobile-responsive behavior for hero gallery and split chat shell.

Out of scope:

- Backend/API changes.
- Conversation data model changes.
- New chat product features unrelated to UI.

## Chosen Approach

Use a **Cinematic Gallery + Split Chat** approach.

Why this approach:

- Delivers maximum visual impact while keeping proven chat interaction flow.
- Fits existing app architecture (`app/page.tsx`) with low technical risk.
- Keeps implementation focused on UI and visual polish rather than functional rework.

## Current System Context

- Main client UI is in `app/page.tsx` with hero selection and chat states in one component.
- Design tokens are currently generic shadcn defaults in `app/globals.css`.
- Hero metadata currently includes only `id`, `label`, and `blurb` in `lib/heroes.ts`.

## Proposed Visual Direction

### Theme

- Cinematic dark base (deep charcoal/blue-black backgrounds).
- Atmospheric layered backgrounds (radial + linear gradients, subtle texture/noise look).
- Hero-specific accent colors used sparingly to keep palette cohesive:
  - Spider-Man: red accent
  - Batman: steel-gold accent
  - Superman: blue-cyan accent

### Motion

- High-impact but controlled motion profile with explicit limits:
  - hover transition duration: 180-240ms
  - easing: `cubic-bezier(0.22, 1, 0.36, 1)`
  - card lift translateY: max `-6px`
  - card scale: max `1.02`
  - image scale: max `1.04`
- Hero card hover effects:
  - card translate/scale lift
  - image scale to roughly 1.04
  - stronger overlay glow
  - title/meta slight upward movement
- Entrance animations use staggered fades/translates (120ms stagger, max 3 items visible at once); no heavy JS loops.
- Reduced motion rule: under `prefers-reduced-motion: reduce`, disable scale/translate animations and keep only instant state changes.

## Information Architecture and Layout

### Hero Selection Screen

- Replace simple button grid with 3 cinematic poster cards.
- Card composition:
  - full-bleed hero image
  - bottom gradient scrim for text legibility
  - hero title, tagline, and blurb
  - subtle CTA treatment indicating entry into chat
- Interaction parity:
  - hover effects also have keyboard focus-visible equivalents
  - touch users get static elevated card treatment on tap-active
  - no critical affordance is hover-only
- Keep current `selectHero` behavior unchanged behind the new card UI.

### Chat Screen

- Keep split chat architecture with improved visual hierarchy.
- Left rail becomes a mission-log style conversation panel.
- Right pane becomes the primary chat stage with:
  - hero-themed cinematic header strip
  - refined spacing and contrast for message readability
  - preserved prompt/composer behavior and model selector flow

## Component and File-Level Design

### `lib/heroes.ts`

Extend each hero definition to include visual metadata:

- `imageUrl`: external image URL
- `tagline`: short cinematic subtitle
- `accent`: color token value
- `overlayGradient`: card-specific overlay treatment
- `imageCredit` (optional): attribution text if shown

### `app/page.tsx`

- Refactor presentation concerns into clear UI blocks while preserving existing chat logic.
- Hero selection state renders cinematic card gallery instead of outline buttons.
- Selected hero state renders upgraded split chat shell visuals.
- Add non-blocking image loading state handling per hero:
  - `loading`
  - `ready`
  - `failed`
- Deterministic state transitions:
  - initialize each selected-card image as `loading`
  - on image `onLoad`, transition `loading -> ready`
  - on image `onError`, transition `loading -> failed`
  - on timeout at 8s without `onLoad`, force `loading -> failed`
  - retry trigger: user presses retry control on failed card, which resets state to `loading` and re-attempts once
  - terminal behavior: after the single retry attempt, any later `onError` or timeout remains `failed` and retry control is hidden/disabled

### `app/globals.css`

- Add cinematic design tokens and utility classes for:
  - background atmosphere
  - card overlays and glow states
  - motion/easing presets
  - accent color usage
- Preserve existing theme token compatibility for shadcn components.

### Optional UI Extraction

If extraction is needed for maintainability, limit to:

- `components/hero-poster-card.tsx`
- `components/chat-hero-header-strip.tsx`

No other component extraction is included in this pass.

## External Image Asset Strategy

Use curated web-hosted hero imagery, with local fallback behavior if remote fetch fails.

Candidate URL set (initial defaults):

- Spider-Man: `https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Web_of_Spider-Man_Vol_1_129-1.png/640px-Web_of_Spider-Man_Vol_1_129-1.png`
- Batman: `https://upload.wikimedia.org/wikipedia/en/c/c7/Batman_Infobox.jpg`
- Superman: `https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Supermanflying.png/640px-Supermanflying.png`

Fallback behavior:

- If image fails, display hero-specific local fallback and continue allowing hero selection:
  - Spider-Man fallback: `public/heroes/spiderman-fallback.svg`
  - Batman fallback: `public/heroes/batman-fallback.svg`
  - Superman fallback: `public/heroes/superman-fallback.svg`
- Never block chat functionality due to asset failure.

## Data Flow

Functional data flow remains unchanged:

1. User selects hero.
2. Existing `selectHero` flow loads/creates conversation.
3. Existing message hydration and send logic remains intact.
4. Visual state updates independently (hover/active/loading/fallback) without modifying API contracts.

## Error Handling

- Keep existing alert handling for chat errors.
- Treat remote image failures as non-fatal UI events.
- Log image errors for debugging but avoid user-blocking error states.

## Performance and Accessibility

- Prefer CSS-driven animation to reduce runtime overhead.
- Keep motion smooth during message streaming and typing (target 60fps on modern desktop; no dropped-frame spikes from continuous JS animation loops).
- Ensure text contrast over imagery via gradient scrims with minimum contrast ratio >= 4.5:1 for body text and >= 3:1 for large headings.
- Preserve keyboard/focus behavior on selectable hero cards and conversation controls.
- Ensure responsive layout for mobile and desktop.

## Testing Strategy

### Manual UI Validation

- Hero gallery renders all 3 posters with correct labels and blurbs.
- Hover effects trigger correctly on desktop without jitter.
- Selecting each hero still opens usable chat and conversation list.
- Conversation switching/new chat flow remains functional.
- Prompt submit/streaming flow remains unchanged.
- Broken image URL path shows fallback visual and remains clickable.
- Mobile viewport confirms stacked card layout and readable chat shell.

### Project Verification

- Run lint and build after UI changes:
  - `pnpm lint`
  - `pnpm build`
- Fix any style/type issues introduced by visual metadata additions.

### Automated Verification

- Add/modify test file: `tests/ui/hero-poster-fallback.test.tsx` for image error fallback behavior.
- Add/modify test file: `tests/ui/hero-poster-keyboard-nav.test.tsx` for keyboard focus/selection behavior.
- Required test command: `pnpm test -- tests/ui/hero-poster-fallback.test.tsx tests/ui/hero-poster-keyboard-nav.test.tsx`.

## Rollout

1. Add hero visual metadata and image URLs.
2. Implement cinematic hero gallery UI.
3. Upgrade split chat shell visuals and theming.
4. Add image fallback handling.
5. Run verification (lint/build + manual checks).

## Notes

- Real character imagery may have licensing/copyright implications depending on deployment context.
- If legal/commercial restrictions arise, swap to original SVG artwork using the same metadata interface.
