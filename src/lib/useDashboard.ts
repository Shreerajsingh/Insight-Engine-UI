import { useCallback, useEffect, useState } from 'react';
import { fetchDashboard, removeSavedChart, saveLayout } from './api';
import { scopeKey, type Scope } from './useRoute';
import type { SavedChart, Span } from '../types';

/**
 * A scope's saved board: what has been asked of it, and how it is arranged.
 *
 * Takes a scope rather than a meeting id, so the global board and a meeting's board are the
 * same hook against different endpoints. They behave identically — that is the point: a
 * chart is a chart, and the only difference is what it was asked over.
 *
 * Every mutation is applied locally first and persisted after. A drag that waited for a round trip
 * before the card moved would feel broken, and the server is only ever being told about an
 * arrangement it has no opinion on — there is nothing it can reject. A failed write puts the reason
 * on screen and refetches, so the board on screen is the board that was stored rather than a local
 * fiction.
 */
export function useDashboard(scope: Scope | null) {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The scope object is rebuilt on every render of the route, so effects key off this
  // string instead — otherwise the board refetches on every keystroke elsewhere.
  const key = scopeKey(scope);

  const load = useCallback(async (target: Scope) => {
    setLoading(true);
    try {
      setCharts(await fetchDashboard(target));
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scope) {
      setCharts([]);
      return;
    }
    void load(scope);
    // `key` stands in for `scope`, which is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, load]);

  /** What a query returns is already saved, so the board takes it without a refetch. */
  const add = useCallback((saved: SavedChart[]) => {
    if (saved.length === 0) return;

    setCharts((current) => {
      // Re-asking a question replaces its charts server-side; mirror that here rather than
      // showing both until the next load.
      const questions = new Set(saved.map((chart) => chart.question));
      const kept = current.filter((chart) => !questions.has(chart.question));

      return [...kept, ...saved].sort(byPosition);
    });
  }, []);

  const persist = useCallback(
    async (next: SavedChart[]) => {
      if (!scope) return;

      try {
        await saveLayout(
          scope,
          next.map((chart) => ({ id: chart.id, position: chart.position, span: chart.span })),
        );
        setError(null);
      } catch (cause) {
        setError(`${(cause as Error).message} — reloading the board`);
        void load(scope);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, load],
  );

  /**
   * Moves a card to another index, renumbering the board.
   *
   * Positions are rewritten densely from zero rather than being nudged. The alternative — inserting
   * at a fractional index — saves a few writes and costs a board whose order eventually depends on
   * float precision.
   */
  const move = useCallback(
    (id: string, toIndex: number) => {
      setCharts((current) => {
        const from = current.findIndex((chart) => chart.id === id);
        if (from === -1 || from === toIndex) return current;

        const reordered = [...current];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(Math.max(0, Math.min(toIndex, reordered.length)), 0, moved);

        const renumbered = reordered.map((chart, index) => ({ ...chart, position: index }));
        void persist(renumbered);
        return renumbered;
      });
    },
    [persist],
  );

  const resize = useCallback(
    (id: string, span: Span) => {
      setCharts((current) => {
        const next = current.map((chart) => (chart.id === id ? { ...chart, span } : chart));
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!scope) return;

      const previous = charts;
      setCharts((current) =>
        current.filter((chart) => chart.id !== id).map((chart, index) => ({ ...chart, position: index })),
      );

      try {
        await removeSavedChart(scope, id);
      } catch (cause) {
        // Put it back: a delete that failed did not happen, and a card that vanishes anyway is a
        // chart someone believes they have lost.
        setError((cause as Error).message);
        setCharts(previous);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, charts],
  );

  return { charts, loading, error, add, move, resize, remove };
}

const byPosition = (a: SavedChart, b: SavedChart) =>
  a.position - b.position || a.savedAt.localeCompare(b.savedAt);
