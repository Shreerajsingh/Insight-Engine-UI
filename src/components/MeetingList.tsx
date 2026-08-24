import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import { isInFlight } from '../lib/useMeetings';
import type { JobStatus, MeetingCard } from '../types';

const STORAGE_KEY = 'collapsedGroups';

function readCollapsed(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function MeetingList({
  meetings,
  selectedId,
  generating,
  onSelect,
  onInfo,
}: {
  meetings: MeetingCard[];
  selectedId: string | null;

  generating: Set<string>;
  onSelect: (meeting: MeetingCard) => void;
  onInfo: (meeting: MeetingCard) => void;
}) {
  const ready = meetings.filter((meeting) => meeting.queryable);
  const processing = meetings.filter(isInFlight);
  const notStarted = meetings.filter((meeting) => meeting.status === 'NOT_STARTED');
  const attention = meetings.filter(
    (meeting) =>
      !meeting.queryable && !isInFlight(meeting) && meeting.status !== 'NOT_STARTED',
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);

  const toggle = (label: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(label)) next.add(label);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });

  const groups: { label: string; items: MeetingCard[]; hint?: string }[] = [
    { label: 'Ready to query', items: ready },
    { label: 'Processing', items: processing },
    {
      label: 'Ready to generate',
      items: notStarted,
      hint: 'Run Generate before these can be queried.',
    },
    { label: 'Needs attention', items: attention },
  ];

  return (
    <>
      {groups.map(({ label, items, hint }) => {
        if (items.length === 0) return null;

        const isOpen = !collapsed.has(label);

        const shown = isOpen ? items : items.filter((item) => item.meetingId === selectedId);

        return (
          <section className="group" key={label}>

            <button
              type="button"
              className="group__label group__toggle"
              aria-expanded={isOpen}
              onClick={() => toggle(label)}
            >
              <span className={`group__chevron${isOpen ? ' group__chevron--open' : ''}`}>
                <Icon name="chevron" size={16} />
              </span>
              {label}
              <span className="group__count">{items.length}</span>
            </button>

            {isOpen && hint && <p className="group__hint">{hint}</p>}

            {shown.map((meeting) => (
              <MeetingRow
                key={meeting.meetingId}
                meeting={meeting}
                selected={meeting.meetingId === selectedId}
                busy={generating.has(meeting.meetingId)}
                onSelect={onSelect}
                onInfo={onInfo}
              />
            ))}
          </section>
        );
      })}
    </>
  );
}

function MeetingRow({
  meeting,
  selected,
  busy,
  onSelect,
  onInfo,
}: {
  meeting: MeetingCard;
  selected: boolean;
  busy: boolean;
  onSelect: (meeting: MeetingCard) => void;
  onInfo: (meeting: MeetingCard) => void;
}) {
  const running = isInFlight(meeting);

  const label = action(meeting);

  return (
    <div className={`meeting${selected ? ' meeting--selected' : ''}`}>

      <div className="meeting__top">

        <Icon
          name={glyph(meeting).icon}
          size={18}
          className={`meeting__glyph meeting__glyph--${glyph(meeting).tone}`}
        />

        <button
          type="button"
          className="meeting__pick"
          disabled={!meeting.queryable}
          aria-current={selected}
          onClick={() => onSelect(meeting)}
        >
          <span className="meeting__title" title={meeting.title}>
            {meeting.title}
          </span>
          <span className="meeting__meta">{describe(meeting)}</span>
        </button>

        {meeting.inCatalog && (
          <button
            type="button"
            className="iconbutton iconbutton--small meeting__more"
            aria-label={`About ${meeting.title}`}
            title="What this meeting was about"
            onClick={() => onInfo(meeting)}
          >
            <Icon name="more" size={18} />
          </button>
        )}

      </div>

      {running && (
        <>
          <div className="meeting__step">
            {meeting.message} · {meeting.progress}%
          </div>

          <div
            className="meeting__meter meter"
            role="progressbar"
            aria-valuenow={meeting.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={meeting.message}
          >
            <div className="meter__fill" style={{ width: `${meeting.progress}%` }} />
          </div>
        </>
      )}

      {!running && (meeting.status !== 'NOT_STARTED' || meeting.inCatalog) && (
        <div className="meeting__foot">
          {meeting.status !== 'NOT_STARTED' && <StatusPill status={meeting.status} />}

          {meeting.inCatalog && meeting.status === 'NOT_STARTED' && (
            <button
              type="button"
              className="meeting__action"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                onInfo(meeting);
              }}
            >
              {busy ? 'Starting…' : label}
            </button>
          )}
        </div>
      )}

      {meeting.error?.message && <div className="meeting__error">{meeting.error.message}</div>}
    </div>
  );
}

function glyph(meeting: MeetingCard): { icon: IconName; tone: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good' };

  return { icon: 'circle', tone: 'muted' };
}

function action(meeting: MeetingCard): string {
  if (meeting.status === 'NOT_STARTED') return 'Generate';
  if (meeting.status === 'FAILED') return 'Try again';
  return 'Reprocess';
}

function describe(meeting: MeetingCard): string {
  const parts = meeting.startedAt
    ? [
        formatMeetingDate(meeting.startedAt),
        formatMinutes(meeting.durationSeconds),
        meeting.meetingType,
      ]
    :

      [meeting.listedAt ? `listed ${formatMeetingDate(meeting.listedAt)}` : null];

  if (meeting.processingVersion && meeting.processingVersion > 1) {
    parts.push(`v${meeting.processingVersion}`);
  }
  if (!meeting.inCatalog) parts.push('not in catalogue');

  return parts.filter(Boolean).join(' · ');
}

function StatusPill({ status }: { status: JobStatus }) {
  const tone =
    status === 'COMPLETED'
      ? 'good'
      : status === 'FAILED'
        ? 'failed'
        : status === 'PARTIAL'
          ? 'running'
          : '';

  const label =
    status === 'COMPLETED'
      ? 'Processed'
      : status === 'PARTIAL'
        ? 'Processed, with gaps'
        : status === 'FAILED'
          ? 'Failed'
          : status;

  return (
    <span className={`pill${tone ? ` pill--${tone}` : ''}`}>
      <span className="pill__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
