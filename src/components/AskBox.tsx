import { useState } from 'react';
import { Icon } from './Icon';

/**
 * The question box, and the suggestions under it.
 *
 * Enter asks and shift-enter breaks a line, which is the convention for a box that is
 * mostly one line but occasionally three. The suggestions are there because a blank box
 * that accepts anything is the hardest kind to start with — they are examples of the shape
 * of question this pipeline answers well, not a menu.
 *
 * Takes a placeholder and its own starters rather than a meeting, because the global box
 * needs different examples: the questions worth asking of one call ("who talked more") and
 * of the whole corpus ("which objections keep coming up") barely overlap, and offering the
 * meeting set globally would suggest questions that answer badly across meetings.
 */
export function AskBox({
  placeholder,
  label,
  starters,
  busy,
  onAsk,
}: {
  placeholder: string;
  label: string;
  starters: string[];
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
          placeholder={placeholder}
          aria-label={label}
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
          className="button button--primary ask__send"
          onClick={submit}
          disabled={busy || question.trim().length < 3}
        >
          {busy ? <span className="spinner" /> : <Icon name="send" size={18} />}
          {busy ? 'Working…' : 'Ask'}
        </button>
      </div>

      <div className="chips">
        {starters.map((starter) => (
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

/** Questions one meeting answers well: what happened in it, and who said what. */
export const MEETING_STARTERS = [
  'What objections did the customer raise and how serious were they?',
  'Who talked more, the rep or the customer?',
  'What did we commit to as next steps?',
  'Which questions were left unanswered?',
];

/**
 * Questions the corpus answers well, and one meeting cannot.
 *
 * Every one is an aggregate, a ranking or a trend — the shapes the global schema doc steers
 * the interpreter towards. A question about a single phrasing inside one call is a worse fit
 * here, because the columns that hold phrasings are not enumerable corpus-wide.
 */
export const GLOBAL_STARTERS = [
  'Which objection types come up most often across all meetings?',
  'What questions do customers ask that we most often leave unanswered?',
  'Which topics take up the most time across meetings?',
  'Which entities or products come up in more than one meeting?',
];
