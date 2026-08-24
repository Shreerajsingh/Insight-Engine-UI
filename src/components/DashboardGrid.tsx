import { useState } from 'react';
import { ChartCard } from './ChartCard';
import { Icon } from './Icon';
import { ChartDetails, ChartExpanded } from './ChartDetails';
import { ConfirmButton } from './ConfirmButton';
import type { SavedChart, Span } from '../types';

const SPANS: { span: Span; label: string; name: string }[] = [
  { span: 4, label: '⅓', name: 'a third of the row' },
  { span: 6, label: '½', name: 'half the row' },
  { span: 12, label: '1', name: 'the full row' },
];

export function DashboardGrid({
  charts,
  onMove,
  onResize,
  onRemove,
}: {
  charts: SavedChart[];
  onMove: (id: string, toIndex: number) => void;
  onResize: (id: string, span: Span) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const [showInfo, setShowInfo] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleInfo = (id: string) =>
    setShowInfo((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const expanded = charts.find((chart) => chart.id === expandedId) ?? null;

  const drop = (target: SavedChart) => {
    if (!dragging || dragging === target.id) return;

    onMove(dragging, charts.findIndex((chart) => chart.id === target.id));
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="dash">
      {charts.map((saved, index) => (
        <section
          key={saved.id}
          className={`dash__cell${over === saved.id ? ' dash__cell--over' : ''}${
            dragging === saved.id ? ' dash__cell--dragging' : ''
          }`}
          style={{ gridColumn: `span ${saved.span}` }}
          onDragOver={(event) => {

            event.preventDefault();
            setOver(saved.id);
          }}
          onDragLeave={() => setOver((current) => (current === saved.id ? null : current))}
          onDrop={() => drop(saved)}
        >
          <header className="dash__bar">

            {/* Only the handle is draggable: a card-wide drag swallows every click inside it. */}
            <span
              className="dash__handle"
              draggable
              role="button"
              tabIndex={0}
              aria-label={`Reorder ${saved.chart.title}`}
              title="Drag to reorder"
              onDragStart={() => setDragging(saved.id)}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}

              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && index > 0) onMove(saved.id, index - 1);
                if (event.key === 'ArrowRight' && index < charts.length - 1) {
                  onMove(saved.id, index + 1);
                }
              }}
            >
              <Icon name="drag" size={18} />
            </span>

            <span className="dash__question" title={saved.question}>
              {saved.question}
            </span>

            <button
              type="button"
              className={`dash__icon${showInfo.has(saved.id) ? ' dash__icon--on' : ''}`}
              aria-label={`Details of ${saved.chart.title}`}
              aria-pressed={showInfo.has(saved.id)}
              title="The question, the answer and the quotes behind this chart"
              onClick={() => toggleInfo(saved.id)}
            >
              <Icon name="info" size={18} />
            </button>

            <button
              type="button"
              className="dash__icon"
              aria-label={`Expand ${saved.chart.title}`}
              title="Open at full size"
              onClick={() => setExpandedId(saved.id)}
            >
              <Icon name="expand" size={18} />
            </button>

            <span className="dash__spans" role="group" aria-label="Card width">
              {SPANS.map(({ span, label, name }) => (
                <button
                  key={span}
                  type="button"
                  className={`dash__span${saved.span === span ? ' dash__span--on' : ''}`}

                  aria-label={`Width: ${name}`}
                  title={`Width: ${name}`}
                  aria-pressed={saved.span === span}
                  onClick={() => onResize(saved.id, span)}
                >
                  {label}
                </button>
              ))}
            </span>

            <ConfirmButton
              className="dash__remove"
              label="Remove"
              confirmLabel="Remove?"
              tone="danger"
              onConfirm={() => onRemove(saved.id)}
            />
          </header>

          <ChartCard chart={saved.chart} />

          {showInfo.has(saved.id) && <ChartDetails saved={saved} />}
        </section>
      ))}

      {expanded && <ChartExpanded saved={expanded} onClose={() => setExpandedId(null)} />}
    </div>
  );
}
