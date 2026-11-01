import * as React from "react"

const noop = () => () => {}

/** Reads a query param on the client without an effect. Server render sees null. */
export function useQueryParam(name: string) {
  return React.useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get(name),
    () => null
  )
}

/** False during SSR and hydration, true after. */
export function useHydrated() {
  return React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

const initial: Record<string, string | null> = {}

/** Like useQueryParam, but keeps the value from the first page load across client navigations. */
export function useInitialQueryParam(name: string) {
  return React.useSyncExternalStore(
    noop,
    () => {
      if (!(name in initial)) initial[name] = new URLSearchParams(window.location.search).get(name)
      return initial[name] ?? null
    },
    () => null
  )
}
