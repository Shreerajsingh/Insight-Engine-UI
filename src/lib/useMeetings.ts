import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMeetings } from './api';
import type { MeetingCard } from '../types';

const WHILE_PROCESSING_MS = 4_000;

const WHEN_IDLE_MS = 30_000;

const isInFlight = (meeting: MeetingCard) =>
  meeting.status === 'QUEUED' || meeting.status === 'PROCESSING';

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
