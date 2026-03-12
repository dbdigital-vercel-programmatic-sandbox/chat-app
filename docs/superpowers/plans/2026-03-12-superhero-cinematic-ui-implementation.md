# Superhero Cinematic UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cinematic-dark superhero chat UI with large hero image cards, gradient overlays, controlled motion, and resilient image fallback behavior without changing backend chat functionality.

**Architecture:** Keep all API and chat-state behavior intact while introducing a visual metadata layer for heroes, focused UI subcomponents for hero posters and header strip, and tokenized cinematic styling in global CSS. Add deterministic image load/fallback state handling in the client and verify with targeted unit/UI tests plus lint/build validation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest.

---

## File Structure and Responsibilities

- `lib/heroes.ts`: hero catalog + visual metadata (image URLs, accent, overlays, fallback paths).
- `lib/hero-image-state.ts`: deterministic image state transitions (`loading`/`ready`/`failed`) and one-retry rules.
- `lib/hero-image-state.test.ts`: unit tests for transition rules and terminal retry behavior.
- `components/hero-poster-card.tsx`: reusable cinematic card used on hero selection screen.
- `components/chat-hero-header-strip.tsx`: reusable selected-hero banner in chat pane.
- `app/page.tsx`: integrate new components and preserve existing chat flow.
- `app/globals.css`: cinematic tokens, overlays, motion presets, reduced-motion behavior.
- `public/heroes/spiderman-fallback.svg`: fallback art for Spider-Man card.
- `public/heroes/batman-fallback.svg`: fallback art for Batman card.
- `public/heroes/superman-fallback.svg`: fallback art for Superman card.
- `tests/ui/hero-poster-fallback.test.tsx`: test broken image path and fallback rendering/selection.
- `tests/ui/hero-poster-keyboard-nav.test.tsx`: test keyboard focus and hero selection behavior.
- `package.json`: add UI testing dependencies only if required by current Vitest setup.

## Chunk 1: Hero Visual Data and Deterministic Image State

### Task 1: Extend hero metadata for cinematic visuals

**Files:**

- Modify: `lib/heroes.ts`
- Test: `lib/heroes.test.ts`

- [ ] **Step 1: Write failing tests for visual metadata shape**

Add tests in `lib/heroes.test.ts` asserting each hero includes:

- `imageUrl` (non-empty `https://` string)
- `fallbackImagePath` (`/heroes/<hero>-fallback.svg`)
- `accent` (non-empty CSS color token/value)
- `overlayGradient` (non-empty gradient string)
- `tagline` (non-empty short subtitle).

Also assert spec-aligned values:

- exact approved URL set for Spider-Man, Batman, Superman
- accent family by hero: Spider-Man red, Batman steel-gold, Superman blue-cyan.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/heroes.test.ts`
Expected: FAIL because visual fields do not exist yet.

- [ ] **Step 3: Implement minimal metadata changes**

Update `lib/heroes.ts` hero objects with:

```ts
{
  id: "spiderman",
  label: "Spider-Man",
  blurb: "Friendly neighborhood hero with heart and humor.",
  tagline: "Queens. Midnight. Webline ready.",
  imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Web_of_Spider-Man_Vol_1_129-1.png/640px-Web_of_Spider-Man_Vol_1_129-1.png",
  fallbackImagePath: "/heroes/spiderman-fallback.svg",
  accent: "#e23b3b",
  overlayGradient: "linear-gradient(180deg, rgba(3,5,10,0.04) 20%, rgba(3,5,10,0.88) 88%)",
}
```

Apply equivalent entries for Batman and Superman using the approved URLs and per-hero accents.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/heroes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/heroes.ts lib/heroes.test.ts
git commit -m "feat: add cinematic hero visual metadata"
```

### Task 2: Add deterministic image load/fallback state machine

**Files:**

- Create: `lib/hero-image-state.ts`
- Create: `lib/hero-image-state.test.ts`

- [ ] **Step 1: Write failing tests for transition behavior**

In `lib/hero-image-state.test.ts`, add tests for:

- initial state is `loading`
- `onLoad` transitions to `ready`
- `onError` transitions to `failed`
- `onTimeout` transitions to `failed`
- `retry` is allowed exactly once from `failed`
- after retry is consumed, subsequent `onError`/`onTimeout` remains `failed` and retry is unavailable.

Add edge-case transition tests:

- timeout constant is exported as `HERO_IMAGE_TIMEOUT_MS` and equals `8000`
- timeout only forces `loading -> failed` (never `ready -> failed`)
- `retry` from non-`failed` state is a no-op
- late `onError`/`onTimeout` after `ready` are no-ops.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/hero-image-state.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement minimal state machine**

Create `lib/hero-image-state.ts` with explicit types and pure functions:

```ts
export type HeroImageStatus = "loading" | "ready" | "failed"

export type HeroImageState = {
  status: HeroImageStatus
  retryCount: number
  canRetry: boolean
}

export function createInitialHeroImageState(): HeroImageState {
  return { status: "loading", retryCount: 0, canRetry: true }
}
```

Include transition helpers (for load, error, timeout, retry) with one-retry cap.

Require explicit pure function signatures and no-op rules:

```ts
export function onLoad(state: HeroImageState): HeroImageState
export function onError(state: HeroImageState): HeroImageState
export function onTimeout(state: HeroImageState): HeroImageState
export function retry(state: HeroImageState): HeroImageState
```

Rules:

- disallowed transitions must return input state unchanged
- no function may mutate state in place.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/hero-image-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hero-image-state.ts lib/hero-image-state.test.ts
git commit -m "feat: add deterministic hero image state transitions"
```

### Task 3: Add hero fallback SVG assets

**Files:**

- Create: `public/heroes/spiderman-fallback.svg`
- Create: `public/heroes/batman-fallback.svg`
- Create: `public/heroes/superman-fallback.svg`

- [ ] **Step 1: Write failing existence assertions**

Add a small file-existence test in `lib/heroes.test.ts` that checks each `fallbackImagePath` exists under `public/`.

Use deterministic path resolution (`path.join(process.cwd(), "public", fallbackImagePath.replace(/^\/+/, ""))`) and include one negative assertion proving a non-existent file path fails the check.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/heroes.test.ts`
Expected: FAIL because fallback files are missing.

- [ ] **Step 3: Create minimal fallback SVG posters**

Create three lightweight SVG files (same dimensions) with:

- dark cinematic base
- hero-specific accent glow
- hero label text
- no trademark logos.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/heroes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/heroes/spiderman-fallback.svg public/heroes/batman-fallback.svg public/heroes/superman-fallback.svg lib/heroes.test.ts
git commit -m "feat: add hero fallback poster assets"
```

## Chunk 2: Cinematic UI Composition, Styling, and Verification

### Task 4: Build reusable cinematic hero components

**Files:**

- Create: `components/hero-poster-card.tsx`
- Create: `components/chat-hero-header-strip.tsx`
- Test: `tests/ui/hero-poster-keyboard-nav.test.tsx`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (add UI test dependencies if missing)

- [ ] **Step 1: Write failing keyboard interaction test**

In `tests/ui/hero-poster-keyboard-nav.test.tsx`, verify:

- card receives focus via keyboard traversal
- Enter/Space activates selection callback
- focus-visible style class appears for keyboard users.

Create test runtime setup required for `tests/ui/*.test.tsx`:

- `vitest.config.ts` sets `test.environment = "jsdom"` and `setupFiles = ["./tests/setup.ts"]`
- `tests/setup.ts` imports testing-library matchers/setup.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ui/hero-poster-keyboard-nav.test.tsx`
Expected: FAIL because component does not exist yet.

- [ ] **Step 3: Implement minimal components**

`components/hero-poster-card.tsx`:

- renders poster image + gradient scrim + title/tagline/blurb
- supports states: loading/ready/failed
- supports retry control only when `canRetry` is true
- supports keyboard and pointer interaction parity.

`components/chat-hero-header-strip.tsx`:

- renders compact hero banner with image, gradient overlay, and conversation context.

If missing from the project, add dev dependencies:

- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jsdom`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/ui/hero-poster-keyboard-nav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hero-poster-card.tsx components/chat-hero-header-strip.tsx tests/ui/hero-poster-keyboard-nav.test.tsx vitest.config.ts tests/setup.ts package.json pnpm-lock.yaml
git commit -m "feat: add reusable cinematic hero ui components"
```

### Task 5: Integrate components into page and preserve chat behavior

**Files:**

- Modify: `app/page.tsx`
- Test: `tests/ui/hero-poster-fallback.test.tsx`

- [ ] **Step 1: Write failing fallback behavior test**

In `tests/ui/hero-poster-fallback.test.tsx`, verify:

- when remote image errors, fallback image path renders
- hero card remains selectable in failed-image state
- one retry is available and then disabled after second failure.
- 8s timeout path transitions `loading -> failed` without requiring `onError`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ui/hero-poster-fallback.test.tsx`
Expected: FAIL because integration and state behavior are not yet wired.

- [ ] **Step 3: Implement minimal page integration**

Update `app/page.tsx` to:

- replace hero button grid with `HeroPosterCard` mapping from `HERO_OPTIONS`
- wire deterministic image-state helpers from `lib/hero-image-state.ts`
- keep existing `selectHero`, conversation hydration, message send, and errors intact
- insert `ChatHeroHeaderStrip` into selected hero chat pane.

- [ ] **Step 4: Run tests to verify it passes**

Run: `pnpm test tests/ui/hero-poster-fallback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx tests/ui/hero-poster-fallback.test.tsx
git commit -m "feat: integrate cinematic hero gallery into chat page"
```

### Task 6: Add cinematic CSS tokens, motion rules, and final verification

**Files:**

- Modify: `app/globals.css`
- Create: `tests/ui/hero-motion-reduced.test.tsx`
- Create: `tests/ui/hero-layout-responsive.test.tsx`

- [ ] **Step 1: Write failing assertion for reduced-motion class behavior**

Add focused tests with exact paths:

- `tests/ui/hero-motion-reduced.test.tsx`: verifies reduced-motion branch disables translate/scale animation classes.
- `tests/ui/hero-layout-responsive.test.tsx`: verifies mobile hero gallery stack and chat-shell responsive layout behavior.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ui/hero-motion-reduced.test.tsx tests/ui/hero-layout-responsive.test.tsx`
Expected: FAIL because cinematic classes and responsive rules are not present.

- [ ] **Step 3: Implement minimal styling tokens and rules**

Update `app/globals.css` with:

- cinematic background tokens
- hero accent helper classes
- motion presets (`180-240ms`, cubic-bezier from spec)
- `@media (prefers-reduced-motion: reduce)` overrides disabling translate/scale animations.

- [ ] **Step 4: Run full verification**

Run: `pnpm test -- tests/ui/hero-poster-fallback.test.tsx tests/ui/hero-poster-keyboard-nav.test.tsx tests/ui/hero-motion-reduced.test.tsx tests/ui/hero-layout-responsive.test.tsx`
Expected: PASS.

Run: `pnpm lint && pnpm build`
Expected: PASS with no type or lint regressions.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tests/ui/hero-motion-reduced.test.tsx tests/ui/hero-layout-responsive.test.tsx tests/ui/hero-poster-fallback.test.tsx tests/ui/hero-poster-keyboard-nav.test.tsx
git commit -m "feat: add cinematic styling and verify superhero ui upgrade"
```

## Execution Notes

- Apply @superpowers/test-driven-development per task step order (fail -> implement minimal -> pass).
- Run @superpowers/verification-before-completion before declaring completion.
- Keep UI-only scope: no edits to `app/api/**` routes or persistence modules.

Plan complete and saved to `docs/superpowers/plans/2026-03-12-superhero-cinematic-ui-implementation.md`. Ready to execute?
