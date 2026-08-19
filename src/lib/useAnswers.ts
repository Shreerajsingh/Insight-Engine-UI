import { useCallback, useState } from 'react';
import { askGlobal, askQuestion } from './api';
import { scopeKey, type Scope } from './useRoute';
import type { QueryResponse, SavedChart } from '../types';

export interface Answer {
  id: string;
  /** Which board this was asked of — `meeting:<id>` or `global`. */
  scopeKey: string;
  question: string;
  state: 'pending' | 'done' | 'failed';
  result?: QueryResponse;
  error?: string;
}

/**
 * Every question asked this session, and what came back.
 *
 * Answers accumulate instead of replacing each other — that is what makes this a dashboard
 * the user builds by asking rather than a search box. They are kept per scope and filtered on
 * read, so switching between a meeting and the global board and back does not throw away
 * either one's answers.
 *
 * Newest first, and a question is added as `pending` the moment it is asked: a query is three
 * steps and two AI calls, and a board that shows nothing until it finishes looks broken.
 */
export function useAnswers(onSaved: (saved: SavedChart[]) => void) {
  const [answers, setAnswers] = useState<Answer[]>([]);

  const ask = useCallback(
    async (scope: Scope, question: string) => {
      const id = crypto.randomUUID();
      const key = scopeKey(scope) ?? 'global';

      setAnswers((current) => [{ id, scopeKey: key, question, state: 'pending' }, ...current]);

      try {
        // The only place the two paths differ. Everything downstream — the charts, the
        // evidence, the saved rows — comes back in one shape, because the server composes
        // both with the same agent.
        const result =
          scope.kind === 'global'
            ? await askGlobal(question)
            : await askQuestion(scope.meetingId, question);

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
    },
    [onSaved],
  );

  const remove = useCallback((id: string) => {
    setAnswers((current) => current.filter((answer) => answer.id !== id));
  }, []);

  return { answers, ask, remove };
}
