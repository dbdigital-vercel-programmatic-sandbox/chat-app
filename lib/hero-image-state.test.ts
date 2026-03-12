import { describe, expect, it } from "vitest"

import {
  createHeroImageState,
  nextHeroImageState,
  type HeroImageEvent,
} from "./hero-image-state"

describe("hero image state", () => {
  it("starts in loading state with zero retries", () => {
    expect(createHeroImageState()).toEqual({ status: "loading", retries: 0 })
  })

  it("transitions from loading to ready on load", () => {
    const next = nextHeroImageState(createHeroImageState(), "load")

    expect(next).toEqual({ status: "ready", retries: 0 })
  })

  it("transitions from loading to failed on error or timeout", () => {
    const events: HeroImageEvent[] = ["error", "timeout"]

    for (const event of events) {
      expect(nextHeroImageState(createHeroImageState(), event)).toEqual({
        status: "failed",
        retries: 0,
      })
    }
  })

  it("allows only one retry from failed", () => {
    const firstRetry = nextHeroImageState(
      { status: "failed", retries: 0 },
      "retry"
    )

    expect(firstRetry).toEqual({ status: "loading", retries: 1 })

    const secondRetry = nextHeroImageState(
      { status: "failed", retries: 1 },
      "retry"
    )

    expect(secondRetry).toEqual({ status: "failed", retries: 1 })
  })

  it("keeps failed state terminal after retry failure", () => {
    const afterRetryFailure = nextHeroImageState(
      { status: "loading", retries: 1 },
      "error"
    )

    expect(afterRetryFailure).toEqual({ status: "failed", retries: 1 })
    expect(nextHeroImageState(afterRetryFailure, "retry")).toEqual({
      status: "failed",
      retries: 1,
    })
  })
})
