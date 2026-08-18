import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMeetings } from './api';
import type { MeetingCard } from '../types';

/** How often the list is refreshed while something is still being processed. */
const WHILE_PROCESSING_MS = 4_000;
/** And when nothing is: slow enough to be free, often enough to notice a new meeting. */
const WHEN_IDLE_MS = 30_000;

const isInFlight = (meeting: MeetingCard) =>
  meeting.status === 'QUEUED' || meeting.status === 'PROCESSING';

/**
 * The meeting list, kept current by polling.
 *
 * Polling rather than a socket because progress is already a polled resource on the backend
 * — the pipeline writes a step and a percentage to a row, and there is nothing to push. The
 * interval follows the work: four seconds while a meeting is being processed, thirty when
 * none is, and nothing at all while the tab is hidden.
 *
 * A failed refresh does not clear the list. The meetings on screen were real a moment ago,
 * and replacing them with an error because one poll missed would be worse than showing them
 * slightly stale.
 */
export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setMeetings(await fetchMeetings());
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const anyInFlight = meetings.some(isInFlight);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(timer.current);
      if (document.hidden) return;

      timer.current = window.setTimeout(async () => {
        await refresh();
        schedule();
      }, anyInFlight ? WHILE_PROCESSING_MS : WHEN_IDLE_MS);
    };

    // A tab that comes back into view refreshes at once rather than waiting out its timer.
    const onVisible = () => {
      if (!document.hidden) void refresh();
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [anyInFlight, refresh]);

  return { meetings, loading, error, refresh };
}

export { isInFlight };
