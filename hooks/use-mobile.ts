import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Tracks the mobile breakpoint.
 *
 * A media query is an external store, so `useSyncExternalStore` models it
 * directly — no effect writing state on mount, which React Compiler flags as a
 * cascading render.
 */
function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches

/** No viewport on the server; treat it as desktop so layouts render wide. */
const getServerSnapshot = () => false

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
