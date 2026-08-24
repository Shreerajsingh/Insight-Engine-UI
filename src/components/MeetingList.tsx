import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import { isInFlight } from '../lib/useMeetings';
import type { JobStatus, MeetingCard } from '../types';

/** Groups the user collapsed, remembered — a sidebar arranged once should stay arranged. */
const STORAGE_KEY = 'collapsedGroups';

function readCollapsed(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * The picker: every meeting the dashboard knows about, grouped by what can be done with it.
 *
 * Four states, four things to do. A processed meeting is picked and queried; one being processed
 * shows how far along it is; a catalogued one that has never run gets a Generate button; a failed
 * one gets another go. Grouping by that rather than by status keeps the question "what do I do
 * with this row" answered by where the row is.
 *
 * All four groups are in one list because a meeting moves between them while the page is open —
 * that is what the polling is for. Hiding the unprocessed ones would leave someone wondering
 * whether the recording service had listed their meeting at all.
 */
export function MeetingList({
  meetings,
  selectedId,
  generating,
  onSelect,
  onInfo,
}: {
  meetings: MeetingCard[];
  selectedId: string | null;
  /** Meeting ids with a generate request in flight, so the button can say so. */
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
        // A collapsed group still shows the selected meeting: hiding what is on screen behind a
        // fold leaves no way to see which meeting the main pane belongs to.
        const shown = isOpen ? items : items.filter((item) => item.meetingId === selectedId);

        return (
          <section className="group" key={label}>
            {/* The heading is the control: a group is folded by clicking its name, which is where
                anyone would click anyway. */}
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
      {/* Title and action share a row: an action alone on a line reads as unattached to anything,
          and a row that is mostly whitespace makes a list of ten meetings twice as long to scan. */}
      <div className="meeting__top">
        {/* The status glyph, in front of the title, as the console fronts every row in a resource
            list. It repeats what the group heading and the pill below already say — deliberately:
            it is the cue you get without reading, and the words are the cue you get when you do. */}
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

        {/* What the meeting was about, and the same action, in a panel with room for a sentence.
            Offered on every catalogued row: a title of "Meet-2" is not a decision. */}
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
          {/* A meter, not a chart: one ratio against a known limit. */}
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

      {/*
        The row's footer: what state it is in, and the one thing to do about it.
        A status pill only where status is news — "Not started" is already said by the group the row
        sits in and by the button offering to start it.

        The action opens the panel rather than starting the run. A run carries tags and a focus
        instruction, and the row has nowhere to put them; starting from here would mean starting
        untagged and unfocused every time — the convenient path quietly being the one that loses
        information. So there is one way in, and it is the one with the fields on it.
      */}
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

/** Which glyph fronts the row, from the one field that decides it. */
function glyph(meeting: MeetingCard): { icon: IconName; tone: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good' };

  return { icon: 'circle', tone: 'muted' };
}

/** What pressing the button does, in the user's terms rather than the API's. */
function action(meeting: MeetingCard): string {
  if (meeting.status === 'NOT_STARTED') return 'Generate';
  if (meeting.status === 'FAILED') return 'Try again';
  return 'Reprocess';
}

/**
 * The meta line: whatever is known.
 *
 * A catalogued meeting that has never run has no start time, duration or type — those come from
 * the transcript. It falls back to when the recording service listed it, which is the only date
 * that exists yet.
 */
function describe(meeting: MeetingCard): string {
  const parts = meeting.startedAt
    ? [
        formatMeetingDate(meeting.startedAt),
        formatMinutes(meeting.durationSeconds),
        meeting.meetingType,
      ]
    : // Nothing about a run to show yet, so the listing date is the line. "Not processed" is not
      // added: the group the row sits in says it, the button offers to fix it, and a third mention
      // only made the line long enough to truncate.
      [meeting.listedAt ? `listed ${formatMeetingDate(meeting.listedAt)}` : null];

  if (meeting.processingVersion && meeting.processingVersion > 1) {
    parts.push(`v${meeting.processingVersion}`);
  }
  if (!meeting.inCatalog) parts.push('not in catalogue');

  return parts.filter(Boolean).join(' · ');
}

/** Status carries its label as well as its colour — the colour is never the only cue. */
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
