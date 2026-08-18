import { ChartCard } from './ChartCard';
import { Modal } from './Modal';
import { formatMeetingDate } from '../lib/format';
import type { SavedChart } from '../types';

/**
 * Everything about a saved chart except the chart.
 *
 * A number on a dashboard a week later is only as good as its provenance: the question that
 * produced it, the sentence the agent wrote about it, the quotes behind it, and the caveats saying
 * which result was a sample or which assumption was made. The Ask view shows all of that as an
 * answer; this is the same material attached to the one chart that survived onto the board.
 */
export function ChartDetails({ saved }: { saved: SavedChart }) {
  return (
    <div className="info">
      <p className="info__label">Question</p>
      <p className="info__text">{saved.question}</p>

      {saved.answer && (
        <>
          <p className="info__label">Answer</p>
          <p className="info__text">{saved.answer}</p>
        </>
      )}

      {saved.evidence.length > 0 && (
        <>
          <p className="info__label">What was said</p>
          {saved.evidence.map((item, index) => (
            <blockquote className="quote" key={index}>
              “{item.quote}”
              {item.speaker && <span className="quote__who">— {item.speaker}</span>}
            </blockquote>
          ))}
        </>
      )}

      {saved.caveats.length > 0 && (
        <>
          <p className="info__label">Worth knowing</p>
          <ul className="notes">
            {saved.caveats.map((caveat, index) => (
              <li key={index}>{caveat}</li>
            ))}
          </ul>
        </>
      )}

      <p className="info__meta">
        {saved.chart.sourceQueryIds.length > 0 && <>from {saved.chart.sourceQueryIds.join(', ')} · </>}
        saved {formatMeetingDate(saved.savedAt)}
      </p>
    </div>
  );
}

/**
 * One chart at full size, with everything known about it.
 *
 * The grid trades plot size for overview — a card at a third of a row is a thumbnail, and a table
 * inside one is a column of ellipses. This is where a chart is actually read: the same spec, given
 * the whole window, with its details beside it rather than behind a toggle.
 */
export function ChartExpanded({ saved, onClose }: { saved: SavedChart; onClose: () => void }) {
  return (
    <Modal
      label={saved.chart.title}
      onClose={onClose}
      head={
        <span className="modal__question" title={saved.question}>
          {saved.question}
        </span>
      }
    >
      <ChartCard chart={saved.chart} expanded />
      <ChartDetails saved={saved} />
    </Modal>
  );
}
