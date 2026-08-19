import { useCallback, useEffect, useState } from 'react';

export type View = 'dashboard' | 'ask';

/**
 * What is being looked at: one meeting, or every meeting at once.
 *
 * A discriminated union rather than a nullable meeting id, because "global" and "nothing
 * selected" are different states that would otherwise both be `null` — and the difference
 * decides which API the board and the ask box talk to.
 */
export type Scope = { kind: 'meeting'; meetingId: string } | { kind: 'global' };

export const GLOBAL_SCOPE: Scope = { kind: 'global' };

export interface Route {
  scope: Scope | null;
  view: View;
}

/** The meeting a route names, or null when it is global or empty. */
export function meetingIdOf(scope: Scope | null): string | null {
  return scope?.kind === 'meeting' ? scope.meetingId : null;
}

/** A stable key per scope — for the hooks that fetch and cache per board. */
export function scopeKey(scope: Scope | null): string | null {
  if (!scope) return null;
  return scope.kind === 'global' ? 'global' : `meeting:${scope.meetingId}`;
}

/**
 * The URL is where the selected scope lives.
 *
 * Before this, selection was component state: a reload put you back on the first meeting in the
 * list, and a link to what you were looking at did not exist. The path carries it instead —
 * `/m/<meetingId>` for a meeting's board, `/global` for the cross-meeting one, and `/ask`
 * appended for the question view — so a refresh, the back button and a pasted link all land
 * where they should.
 *
 * Written against the History API rather than a router: there are four routes, and a routing
 * library would be more code than the thing it routes.
 *
 * A path rather than a query parameter because that is what the URL is for, with one deployment
 * consequence: any static host serving the built app must rewrite unknown paths to `index.html`, or
 * a reload of `/m/<id>` is a 404 from the server before the app ever runs. The Vite dev server does
 * this already.
 */
export function useRoute(): {
  route: Route;
  /** Pushes a new URL — the back button returns to the previous scope. */
  go: (scope: Scope | null, view?: View) => void;
  /** Replaces it — for a selection the user did not make, which should not become history. */
  replace: (scope: Scope | null, view?: View) => void;
} {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  // The back and forward buttons are the other way the URL changes.
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback(
    (mode: 'push' | 'replace', scope: Scope | null, view: View = 'dashboard') => {
      const path = build(scope, view);
      if (path === window.location.pathname) return;

      window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', path);
      setRoute({ scope, view });
    },
    [],
  );

  return {
    route,
    go: useCallback(
      (scope: Scope | null, view?: View) => navigate('push', scope, view),
      [navigate],
    ),
    replace: useCallback(
      (scope: Scope | null, view?: View) => navigate('replace', scope, view),
      [navigate],
    ),
  };
}

/** `/global[/ask]`, `/m/<id>[/ask]`. Anything else is the root. */
function parse(pathname: string): Route {
  const global = /^\/global(?:\/(ask|dashboard))?\/?$/.exec(pathname);
  if (global) return { scope: GLOBAL_SCOPE, view: asView(global[1]) };

  const meeting = /^\/m\/([^/]+)(?:\/(ask|dashboard))?\/?$/.exec(pathname);
  if (!meeting) return { scope: null, view: 'dashboard' };

  return {
    // Ids are percent-encoded on the way out, so they come back decoded.
    scope: { kind: 'meeting', meetingId: safeDecode(meeting[1]) },
    view: asView(meeting[2]),
  };
}

function build(scope: Scope | null, view: View): string {
  if (!scope) return '/';

  const base = scope.kind === 'global' ? '/global' : `/m/${encodeURIComponent(scope.meetingId)}`;
  // The board is the default view, so it stays a bare path — a URL should not carry what it means
  // by default.
  return view === 'ask' ? `${base}/ask` : base;
}

function asView(segment: string | undefined): View {
  return segment === 'ask' ? 'ask' : 'dashboard';
}

/** A hand-edited URL can hold a stray `%`, which `decodeURIComponent` throws on. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
