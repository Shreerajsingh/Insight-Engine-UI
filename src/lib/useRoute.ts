import { useCallback, useEffect, useState } from 'react';

export type View = 'dashboard' | 'ask';

export interface Route {
  /** The meeting the URL names, or null at the root. */
  meetingId: string | null;
  view: View;
}

/**
 * The URL is where the selected meeting lives.
 *
 * Before this, selection was component state: a reload put you back on the first meeting in the
 * list, and a link to what you were looking at did not exist. The path carries it instead —
 * `/m/<meetingId>` for the board, `/m/<meetingId>/ask` for the question view — so a refresh, the
 * back button and a pasted link all land where they should.
 *
 * Written against the History API rather than a router: there are two routes, and a routing library
 * would be more code than the thing it routes.
 *
 * A path rather than a query parameter because that is what the URL is for, with one deployment
 * consequence: any static host serving the built app must rewrite unknown paths to `index.html`, or
 * a reload of `/m/<id>` is a 404 from the server before the app ever runs. The Vite dev server does
 * this already.
 */
export function useRoute(): {
  route: Route;
  /** Pushes a new URL — the back button returns to the previous meeting. */
  go: (meetingId: string | null, view?: View) => void;
  /** Replaces it — for a selection the user did not make, which should not become history. */
  replace: (meetingId: string | null, view?: View) => void;
} {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  // The back and forward buttons are the other way the URL changes.
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback(
    (mode: 'push' | 'replace', meetingId: string | null, view: View = 'dashboard') => {
      const path = build(meetingId, view);
      if (path === window.location.pathname) return;

      window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', path);
      setRoute({ meetingId, view });
    },
    [],
  );

  return {
    route,
    go: useCallback(
      (meetingId: string | null, view?: View) => navigate('push', meetingId, view),
      [navigate],
    ),
    replace: useCallback(
      (meetingId: string | null, view?: View) => navigate('replace', meetingId, view),
      [navigate],
    ),
  };
}

/** `/m/<id>` or `/m/<id>/ask`. Anything else is the root. */
function parse(pathname: string): Route {
  const match = /^\/m\/([^/]+)(?:\/(ask|dashboard))?\/?$/.exec(pathname);
  if (!match) return { meetingId: null, view: 'dashboard' };

  return {
    // Ids are percent-encoded on the way out, so they come back decoded.
    meetingId: safeDecode(match[1]),
    view: match[2] === 'ask' ? 'ask' : 'dashboard',
  };
}

function build(meetingId: string | null, view: View): string {
  if (!meetingId) return '/';

  const base = `/m/${encodeURIComponent(meetingId)}`;
  // The board is the default view, so it stays a bare path — a URL should not carry what it means
  // by default.
  return view === 'ask' ? `${base}/ask` : base;
}

/** A hand-edited URL can hold a stray `%`, which `decodeURIComponent` throws on. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
