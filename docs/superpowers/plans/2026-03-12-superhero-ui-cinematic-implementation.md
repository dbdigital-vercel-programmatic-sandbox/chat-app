# Superhero Cinematic UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a cinematic-dark UI for hero selection and chat while preserving current chat functionality.

**Architecture:** Extend hero metadata with visual attributes, add deterministic image-state logic with fallback assets, and restyle the current page state branches into a cinematic gallery plus upgraded split chat shell. Keep API/chat logic untouched.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Vitest

---

## Chunk 1: Hero Visual Data + Deterministic Image State

### Task 1: Hero metadata and image state helper

**Files:**

- Modify: `lib/heroes.ts`
- Create: `lib/hero-image-state.ts`
- Test: `lib/hero-image-state.test.ts`

- [ ] **Step 1: Write failing tests for image transitions**
- [ ] **Step 2: Run `pnpm test -- lib/hero-image-state.test.ts` and confirm RED**
- [ ] **Step 3: Implement minimal state transition helper to satisfy tests**
- [ ] **Step 4: Extend hero metadata with visual fields and fallback paths**
- [ ] **Step 5: Re-run `pnpm test -- lib/hero-image-state.test.ts` and confirm GREEN**

## Chunk 2: Cinematic UI Implementation

### Task 2: Hero gallery and chat-shell redesign

**Files:**

- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `public/heroes/spiderman-fallback.svg`
- Create: `public/heroes/batman-fallback.svg`
- Create: `public/heroes/superman-fallback.svg`

- [ ] **Step 1: Implement cinematic hero card gallery with image overlays and motion**
- [ ] **Step 2: Add deterministic image loading/error/timeout/retry integration**
- [ ] **Step 3: Upgrade split chat shell visual styling (mission rail + hero header stage)**
- [ ] **Step 4: Add cinematic tokens/utilities/animations in global CSS with reduced-motion support**
- [ ] **Step 5: Ensure mobile/touch/focus behavior parity and no hover-only critical affordance**

## Chunk 3: Verification

### Task 3: Quality checks

**Files:**

- Modify if needed: `next.config.mjs`

- [ ] **Step 1: Run targeted tests: `pnpm test -- lib/hero-image-state.test.ts`**
- [ ] **Step 2: Run lint: `pnpm lint`**
- [ ] **Step 3: Run build: `pnpm build`**
- [ ] **Step 4: Fix any issues and re-run until all pass**

Plan complete and saved to `docs/superpowers/plans/2026-03-12-superhero-ui-cinematic-implementation.md`. Ready to execute.
