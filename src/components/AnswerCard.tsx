import { ChartCard } from './ChartCard';
import { DataTable } from './charts/DataTable';
import { tablesFromBundle } from '../lib/fallback';
import type { Answer } from '../lib/useAnswers';

/**
 * One asked question and everything that came back: the answer, its charts, the quotes
 * behind them, and — folded away — the plan and the SQL that produced them.
 *
 * Answers accumulate on the board rather than replacing each other, so a session builds up
 * into a dashboard the user assembled by asking. Each one can be removed, which is the only
 * editing this needs: the way to change a chart is to ask a better question.
 */
export function AnswerCard({ answer, onAsk, onRemove }: {
  answer: Answer;
  onAsk: (question: string) => void;
  onRemove: () => void;
}) {
  return (
    <article className="answer">
      <header className="answer__head">
        <p className="answer__question">{answer.question}</p>
        <button type="button" className="button button--ghost" onClick={onRemove}>
          Remove
        </button>
      </header>

      {answer.state === 'pending' && (
        <div className="answer__body">
          <p className="note">
            <span className="spinner" aria-hidden="true" /> Planning the query, running it,
            and composing the charts. Three steps, two of them AI calls — this takes a moment.
          </p>
        </div>
      )}

      {answer.state === 'failed' && (
        <div className="answer__body">
          <p className="note note--error">{answer.error}</p>
        </div>
      )}

      {answer.state === 'done' && <AnswerBody answer={answer} onAsk={onAsk} />}
    </article>
  );
}

function AnswerBody({ answer, onAsk }: { answer: Answer; onAsk: (question: string) => void }) {
  const { dashboard, dashboardError, bundle, saved } = answer.result!;

  // No dashboard is not no answer: the rows are here, so they go on screen as tables.
  const charts = dashboard?.charts ?? tablesFromBundle(bundle);
  const prose = dashboard?.answer ?? proseWithoutAnAgent(bundle);

  // The denominator, stated. "14 objections" over 4 meetings and over 400 are different
  // findings, and a global answer that does not say which is showing half a number.
  const across = bundle.meetingId === null ? bundle.meetingCount : null;

  return (
    <>
      {across !== null && (
        <p className="answer__scope">
          Across {across} {across === 1 ? 'meeting' : 'meetings'}
        </p>
      )}

      <p className="answer__text">{prose}</p>

      <div className="answer__body">
        {charts.length > 0 && (
          <div className="grid">
            {charts.map((chart) => (
              <ChartCard chart={chart} key={chart.id} />
            ))}
          </div>
        )}

        {saved.length > 0 && (
          <p className="card__foot" style={{ marginTop: 10 }}>
            {saved.length === 1 ? 'This chart is' : `These ${saved.length} charts are`} saved to
            the {across !== null ? 'global' : "meeting's"} dashboard.
          </p>
        )}

        {dashboardError && (
          <p className="note" style={{ marginTop: charts.length > 0 ? 14 : 0 }}>
            Charts were not composed — {dashboardError}. The query results are shown as
            tables instead.
          </p>
        )}

        {dashboard && dashboard.evidence.length > 0 && (
          <>
            <p className="section__label">What was said</p>
            {dashboard.evidence.map((item, index) => (
              <blockquote className="quote" key={index}>
                “{item.quote}”
                {item.speaker && <span className="quote__who">— {item.speaker}</span>}
              </blockquote>
            ))}
          </>
        )}

        {(dashboard?.caveats.length || bundle.warnings.length) > 0 && (
          <>
            <p className="section__label">Worth knowing</p>
            <ul className="notes">
              {(dashboard?.caveats ?? []).map((caveat, index) => (
                <li key={index}>{caveat}</li>
              ))}
              {/* Only when the agent did not already restate them in the user's terms. */}
              {!dashboard && bundle.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </>
        )}

        {dashboard && dashboard.followUpQuestions.length > 0 && (
          <>
            <p className="section__label">Ask next</p>
            <div className="chips">
              {dashboard.followUpQuestions.map((question) => (
                <button
                  type="button"
                  className="chip"
                  key={question}
                  onClick={() => onAsk(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </>
        )}

        <Provenance answer={answer} />
      </div>
    </>
  );
}

/**
 * How the answer was produced, folded away.
 *
 * Kept in the UI rather than in a log because a wrong number is only diagnosable next to the
 * SQL that produced it and the reading the planner took of the question. It is the second
 * thing anyone asks of an AI-generated chart, and answering it in the same view is what
 * makes the chart trustable at all.
 */
function Provenance({ answer }: { answer: Answer }) {
  const { bundle } = answer.result!;

  return (
    <details className="disclosure">
      <summary>How this was answered — the plan, the SQL and the rows</summary>

      <p className="card__subtitle" style={{ marginTop: 10 }}>
        Read as: {bundle.plan.interpretation} ({bundle.plan.intent})
      </p>

      {bundle.plan.assumptions.length > 0 && (
        <ul className="notes">
          {bundle.plan.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      )}

      {bundle.sql.map((result) => (
        <div key={result.id} style={{ marginTop: 14 }}>
          <p className="card__subtitle">
            <strong style={{ color: 'var(--text-primary)' }}>{result.id}</strong> — {result.purpose}
          </p>
          <pre className="sql">{result.sql}</pre>
          {result.error ? (
            <p className="note note--error" style={{ marginTop: 8 }}>{result.error}</p>
          ) : (
            <p className="card__foot">
              {result.rowCount} row{result.rowCount === 1 ? '' : 's'}
              {result.truncated ? ' (capped — this is a sample)' : ''}
            </p>
          )}
        </div>
      ))}

      {bundle.semantic.map((result) => (
        <div key={result.id} style={{ marginTop: 14 }}>
          <p className="card__subtitle">
            <strong style={{ color: 'var(--text-primary)' }}>{result.id}</strong> — searched for
            “{result.query}”
          </p>
          {result.error ? (
            <p className="note note--error" style={{ marginTop: 8 }}>{result.error}</p>
          ) : (
            <DataTable
              columns={[
                { key: 'documentType', label: 'Type', format: 'TEXT' },
                { key: 'text', label: 'Matched text', format: 'TEXT' },
                { key: 'score', label: 'Score', format: 'NUMBER' },
              ]}
              rows={result.hits.map((hit) => ({
                documentType: hit.documentType,
                text: hit.text,
                score: hit.score,
              }))}
            />
          )}
        </div>
      ))}
    </details>
  );
}

/** The prose slot, when no agent wrote it. Descriptive, and honest about being a fallback. */
function proseWithoutAnAgent(bundle: { sql: { rowCount: number }[] }): string {
  const rows = bundle.sql.reduce((total, result) => total + result.rowCount, 0);
  return `${rows} row${rows === 1 ? '' : 's'} came back for this question.`;
}
