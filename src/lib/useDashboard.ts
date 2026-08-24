import { useCallback, useEffect, useState } from 'react';
import { fetchDashboard, removeSavedChart, saveLayout } from './api';
import { scopeKey, type Scope } from './useRoute';
import type { SavedChart, Span } from '../types';

export function useDashboard(scope: Scope | null) {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  }, [key, load]);

  const add = useCallback((saved: SavedChart[]) => {
    if (saved.length === 0) return;

    setCharts((current) => {

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

    [key, load],
  );

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

        setError((cause as Error).message);
        setCharts(previous);
      }
    },

    [key, charts],
  );

  return { charts, loading, error, add, move, resize, remove };
}

const byPosition = (a: SavedChart, b: SavedChart) =>
  a.position - b.position || a.savedAt.localeCompare(b.savedAt);
