import { useCallback, useState } from 'react';
import { askGlobal, askQuestion } from './api';
import { scopeKey, type Scope } from './useRoute';
import type { QueryResponse, SavedChart } from '../types';

export interface Answer {
  id: string;

  scopeKey: string;
  question: string;
  state: 'pending' | 'done' | 'failed';
  result?: QueryResponse;
  error?: string;
}

export function useAnswers(onSaved: (saved: SavedChart[]) => void) {
  const [answers, setAnswers] = useState<Answer[]>([]);

  const ask = useCallback(
    async (scope: Scope, question: string) => {
      const id = crypto.randomUUID();
      const key = scopeKey(scope) ?? 'global';

      setAnswers((current) => [{ id, scopeKey: key, question, state: 'pending' }, ...current]);

      try {

        const result =
          scope.kind === 'global'
            ? await askGlobal(question)
            : await askQuestion(scope.meetingId, question);

        setAnswers((current) =>
          current.map((answer) =>
            answer.id === id ? { ...answer, state: 'done', result } : answer,
          ),
        );

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
