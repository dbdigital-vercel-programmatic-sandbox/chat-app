export type HeroImageStatus = "loading" | "ready" | "failed"
export type HeroImageEvent = "load" | "error" | "timeout" | "retry"

export type HeroImageState = {
  status: HeroImageStatus
  retries: number
}

export function createHeroImageState(): HeroImageState {
  return {
    status: "loading",
    retries: 0,
  }
}

export function nextHeroImageState(
  state: HeroImageState,
  event: HeroImageEvent
): HeroImageState {
  if (event === "load") {
    return { ...state, status: "ready" }
  }

  if (event === "error" || event === "timeout") {
    return { ...state, status: "failed" }
  }

  if (event === "retry") {
    if (state.status !== "failed" || state.retries >= 1) {
      return state
    }

    return {
      status: "loading",
      retries: state.retries + 1,
    }
  }

  return state
}
