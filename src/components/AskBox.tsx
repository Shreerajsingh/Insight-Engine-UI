import { useState } from 'react';
import type { MeetingCard } from '../types';

/**
 * The question box, and the suggestions under it.
 *
 * Enter asks and shift-enter breaks a line, which is the convention for a box that is
 * mostly one line but occasionally three. The suggestions are there because a blank box
 * that accepts anything is the hardest kind to start with — they are examples of the shape
 * of question this pipeline answers well, not a menu.
 */
const STARTERS = [
  'What objections did the customer raise and how serious were they?',
  'Who talked more, the rep or the customer?',
  'What did we commit to as next steps?',
  'Which questions were left unanswered?',
];

export function AskBox({
  meeting,
  busy,
  onAsk,
}: {
  meeting: MeetingCard;
  busy: boolean;
  onAsk: (question: string) => void;
}) {
  const [question, setQuestion] = useState('');

  const submit = () => {
    const trimmed = question.trim();
    if (trimmed.length < 3 || busy) return;

    onAsk(trimmed);
    setQuestion('');
  };

  return (
    <section className="ask">
      <div className="ask__row">
        <textarea
          className="ask__input"
          rows={1}
          value={question}
          placeholder={`Ask about ${meeting.title}…`}
          aria-label="Ask a question about this meeting"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="button button--primary"
          onClick={submit}
          disabled={busy || question.trim().length < 3}
        >
          {busy ? 'Working…' : 'Ask'}
        </button>
      </div>

      <div className="chips">
        {STARTERS.map((starter) => (
          <button
            type="button"
            className="chip"
            key={starter}
            disabled={busy}
            onClick={() => onAsk(starter)}
          >
            {starter}
          </button>
        ))}
      </div>
    </section>
  );
}
