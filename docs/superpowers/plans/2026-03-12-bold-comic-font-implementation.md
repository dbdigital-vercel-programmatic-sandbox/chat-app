# Bold Comic Font Swap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current display font with a bold comic-style face (`Bebas Neue`) while keeping body and utility text readability unchanged.

**Architecture:** Keep the existing font-variable architecture intact and only swap the `--font-display` source in `app/layout.tsx`. Protect the change with a targeted regression test that checks layout font declarations directly. Validate outcome with lint/build and explicit manual checks on the three approved display surfaces.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest

---

## File Structure

- Modify: `app/layout.tsx` - replace `Cinzel` with `Bebas_Neue` and keep `--font-display` wiring unchanged.
- Create: `tests/ui/display-font-layout.test.ts` - regression test that asserts `Bebas_Neue` is configured as display font and `Cinzel` is removed.
- Verify-only reference: `app/page.tsx` - confirm the three approved display surfaces still use `[font-family:var(--font-display)]`.

## Chunk 1: Font Swap + Regression Guard

### Task 1: Add a failing regression test for layout display font

**Files:**

- Create: `tests/ui/display-font-layout.test.ts`
- Test target: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("layout display font", () => {
  it("uses Bebas_Neue for --font-display and removes Cinzel", () => {
    const layoutSource = readFileSync("app/layout.tsx", "utf8")

    expect(layoutSource).toContain("Bebas_Neue")
    expect(layoutSource).toContain('variable: "--font-display"')
    expect(layoutSource).not.toContain("Cinzel")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/ui/display-font-layout.test.ts`
Expected: FAIL because `app/layout.tsx` still contains `Cinzel` and does not contain `Bebas_Neue`.

- [ ] **Step 3: Write minimal implementation**

Update `app/layout.tsx`:

```ts
import { Bebas_Neue, Geist_Mono, Manrope } from "next/font/google"

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
})
```

Then replace `cinzel.variable` in the `<html className={cn(...)}` call with `bebasNeue.variable`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/ui/display-font-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx tests/ui/display-font-layout.test.ts
git commit -m "feat: switch display font to Bebas Neue"
```

## Chunk 2: Verification and Stability Checks

### Task 2: Verify typography scope and project health

**Files:**

- Verify: `app/page.tsx`
- Verify: `app/layout.tsx`

- [ ] **Step 1: Confirm display-font scope in UI surfaces**

Check `app/page.tsx` for the three approved display surfaces:

- Hero selection title (`Choose Your Champion` heading)
- Hero card names (`hero.label` heading)
- Active chat hero header title (`Chat with ...` heading)

Expected: each uses `[font-family:var(--font-display)]`; body copy, controls, and utility labels do not.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS with no new lint errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: PASS with no type/build regressions.

- [ ] **Step 4: Manual responsive + theme check**

Run: `pnpm dev`

Then verify at mobile (`<=768px`) and desktop (`>=1024px`), in both light and dark themes:

- display headings render with comic tone,
- no clipping or unreadable wrapping,
- chat/body text remains readable sans,
- typography behavior is unchanged across theme switch.

- [ ] **Step 5: Stop local server and record verification outcome**

Stop the `pnpm dev` process (Ctrl+C), then record pass/fail notes in the implementation PR or task log.
