import { useCallback, useState } from 'react';
import { askQuestion } from './api';
import type { QueryResponse, SavedChart } from '../types';

export interface Answer {
  id: string;
  meetingId: string;
  question: string;
  state: 'pending' | 'done' | 'failed';
  result?: QueryResponse;
  error?: string;
}

/**
 * The board: every question asked this session, and what came back.
 *
 * Answers accumulate instead of replacing each other — that is what makes this a dashboard
 * the user builds by asking rather than a search box. They are kept per meeting and filtered
 * on read, so switching to another meeting and back does not throw away the charts.
 *
 * Newest first, and a question is added as `pending` the moment it is asked: a query is three
 * steps and two AI calls, and a board that shows nothing until it finishes looks broken.
 */
export function useAnswers(onSaved: (saved: SavedChart[]) => void) {
  const [answers, setAnswers] = useState<Answer[]>([]);

  const ask = useCallback(async (meetingId: string, question: string) => {
    const id = crypto.randomUUID();

    setAnswers((current) => [{ id, meetingId, question, state: 'pending' }, ...current]);

    try {
      const result = await askQuestion(meetingId, question);
      setAnswers((current) =>
        current.map((answer) =>
          answer.id === id ? { ...answer, state: 'done', result } : answer,
        ),
      );
      // The API saved these charts as it answered; the board takes them without a refetch.
      onSaved(result.saved);
    } catch (error) {
      setAnswers((current) =>
        current.map((answer) =>
          answer.id === id
            ? { ...answer, state: 'failed', error: (error as Error).message }
            : answer,
        ),
      );
    }
  }, [onSaved]);

  const remove = useCallback((id: string) => {
    setAnswers((current) => current.filter((answer) => answer.id !== id));
  }, []);

  return { answers, ask, remove };
}
