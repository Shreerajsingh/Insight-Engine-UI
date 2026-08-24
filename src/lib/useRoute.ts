import { useCallback, useEffect, useState } from 'react';

export type View = 'dashboard' | 'ask';

export type Scope = { kind: 'meeting'; meetingId: string } | { kind: 'global' };

export const GLOBAL_SCOPE: Scope = { kind: 'global' };

export type Section = 'processed' | 'processing' | 'pending';

const SECTIONS: Section[] = ['processed', 'processing', 'pending'];

interface Route {
  scope: Scope | null;

  section: Section | null;
  view: View;
}

export function meetingIdOf(scope: Scope | null): string | null {
  return scope?.kind === 'meeting' ? scope.meetingId : null;
}

export function scopeKey(scope: Scope | null): string | null {
  if (!scope) return null;
  return scope.kind === 'global' ? 'global' : `meeting:${scope.meetingId}`;
}

/* Paths, not hashes: any static host serving the build must rewrite unknown paths to
   index.html, or a reload of /m/<id> 404s before the app runs. Vite dev does this already. */
export function useRoute(): {
  route: Route;

  go: (scope: Scope | null, view?: View) => void;

  replace: (scope: Scope | null, view?: View) => void;

  goSection: (section: Section) => void;
} {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback(
    (
      mode: 'push' | 'replace',
      scope: Scope | null,
      section: Section | null,
      view: View = 'dashboard',
    ) => {
      const path = build(scope, section, view);
      if (path === window.location.pathname) return;

      window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', path);
      setRoute({ scope, section, view });
    },
    [],
  );

  return {
    route,
    go: useCallback(
      (scope: Scope | null, view?: View) => navigate('push', scope, null, view),
      [navigate],
    ),
    replace: useCallback(
      (scope: Scope | null, view?: View) => navigate('replace', scope, null, view),
      [navigate],
    ),
    goSection: useCallback(
      (section: Section) => navigate('push', null, section, 'dashboard'),
      [navigate],
    ),
  };
}

function parse(pathname: string): Route {
  const global = /^\/global(?:\/(ask|dashboard))?\/?$/.exec(pathname);
  if (global) return { scope: GLOBAL_SCOPE, section: null, view: asView(global[1]) };

  const section = /^\/s\/([a-z]+)\/?$/.exec(pathname);

  if (section && (SECTIONS as string[]).includes(section[1])) {
    return { scope: null, section: section[1] as Section, view: 'dashboard' };
  }

  const meeting = /^\/m\/([^/]+)(?:\/(ask|dashboard))?\/?$/.exec(pathname);
  if (!meeting) return { scope: null, section: null, view: 'dashboard' };

  return {

    scope: { kind: 'meeting', meetingId: safeDecode(meeting[1]) },
    section: null,
    view: asView(meeting[2]),
  };
}

function build(scope: Scope | null, section: Section | null, view: View): string {
  if (section) return `/s/${section}`;
  if (!scope) return '/';

  const base = scope.kind === 'global' ? '/global' : `/m/${encodeURIComponent(scope.meetingId)}`;

  return view === 'ask' ? `${base}/ask` : base;
}

function asView(segment: string | undefined): View {
  return segment === 'ask' ? 'ask' : 'dashboard';
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
