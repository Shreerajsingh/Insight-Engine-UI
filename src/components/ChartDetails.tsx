import { ChartCard } from './ChartCard';
import { Modal } from './Modal';
import { formatMeetingDate } from '../lib/format';
import type { SavedChart } from '../types';

export function ChartDetails({
  saved,
  showQuestion = true,
}: {
  saved: SavedChart;

  showQuestion?: boolean;
}) {
  return (
    <div className="info">
      {showQuestion && (
        <>
          <p className="info__label">Question</p>
          <p className="info__text">{saved.question}</p>
        </>
      )}

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

export function ChartExpanded({ saved, onClose }: { saved: SavedChart; onClose: () => void }) {
  return (
    <Modal
      label={saved.chart.title}
      onClose={onClose}
      head={

        <div className="modal__ask">
          <p className="modal__asklabel">Question</p>
          <h2 className="modal__asktext">{saved.question}</h2>
        </div>
      }
    >
      <ChartCard chart={saved.chart} expanded />
      <ChartDetails saved={saved} showQuestion={false} />
    </Modal>
  );
}
