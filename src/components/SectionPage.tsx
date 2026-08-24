import { Icon, type IconName } from './Icon';
import { CopyUrlButton } from './TopBar';
import { isInFlight } from '../lib/useMeetings';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import type { Section } from '../lib/useRoute';
import type { MeetingCard } from '../types';

/**
 * A status group as its own page: the console's resource-list view.
 *
 * These three groups exist in the nav already, as folds in a 256px column. That is the right place
 * to pick one meeting out of a few and the wrong place to answer anything about the group — a row
 * there fits a title and a date, so "which of these failed, and why" means opening each one in
 * turn. Given the width of the main pane the same rows carry their error, their progress and their
 * version, and the question is answered by reading down a column.
 *
 * Two of the three have no board and never will: a meeting still processing has no extracted data
 * to chart, and one that has never run has nothing at all. This is the whole of what the app can
 * show about them, which is why they get a page rather than a tab on a board that would be empty.
 */

interface Group {
  label: string;
  /** What the group is, in one line — the same sentence the nav's hint carries. */
  blurb: string;
  icon: IconName;
  tone: 'good' | 'warning' | 'critical' | 'muted';
  select: (meeting: MeetingCard) => boolean;
}

export const SECTION_GROUPS: Record<Section, Group> = {
  processed: {
    label: 'Processed',
    blurb: 'Analytics have been generated, so these can be asked questions.',
    icon: 'check',
    tone: 'good',
    select: (meeting) => meeting.queryable,
  },
  processing: {
    label: 'Processing',
    blurb: 'The pipeline is running. Progress updates on its own — nothing to do but wait.',
    icon: 'pending',
    tone: 'warning',
    select: isInFlight,
  },
  pending: {
    label: 'Ready to generate',
    blurb:
      'Listed by the recording service but not queryable yet. Generate runs the pipeline; a run that failed can be started again.',
    icon: 'circle',
    tone: 'muted',
    // Everything that is neither queryable nor running: never started, and failed. One page rather
    // than two because the action is the same on both — run it — and splitting them would put a
    // one-row table under a heading on most days.
    select: (meeting) => !meeting.queryable && !isInFlight(meeting),
  },
};

export function SectionPage({
  section,
  meetings,
  generating,
  onOpen,
  onInfo,
}: {
  section: Section;
  /** Every meeting; the page selects its own. */
  meetings: MeetingCard[];
  generating: Set<string>;
  onOpen: (meeting: MeetingCard) => void;
  onInfo: (meeting: MeetingCard) => void;
}) {
  const group = SECTION_GROUPS[section];
  const rows = meetings.filter(group.select);

  return (
    <>
      <section className="statusband">
        <div className="statusband__ident">
          <Icon
            name={group.icon}
            size={22}
            className={`statusband__glyph statusband__glyph--${group.tone}`}
          />
          <div className="statusband__text">
            <h2 className="statusband__headline">{group.label}</h2>
            <p className="statusband__sub">{group.blurb}</p>
          </div>
        </div>

        <dl className="facts">
          <div className="facts__item">
            <dt className="facts__label">Meetings</dt>
            <dd className="facts__value">{rows.length}</dd>
          </div>

          <div className="facts__item">
            <dt className="facts__label">Link</dt>
            <dd className="facts__value">
              <CopyUrlButton />
            </dd>
          </div>
        </dl>
      </section>

      <div className="board board--flush">
        {rows.length === 0 ? (
          <p className="note">Nothing is {group.label.toLowerCase()} right now.</p>
        ) : (
          <div className="listing">
            <table className="table">
              <thead>
                <tr>
                  <th className="listing__statuscol">Status</th>
                  <th>Meeting</th>
                  <th>{section === 'pending' ? 'Listed' : 'Held'}</th>
                  <th>{section === 'processing' ? 'Progress' : 'Detail'}</th>
                  <th className="listing__actioncol" />
                </tr>
              </thead>
              <tbody>
                {rows.map((meeting) => (
                  <Row
                    key={meeting.meetingId}
                    meeting={meeting}
                    section={section}
                    busy={generating.has(meeting.meetingId)}
                    onOpen={onOpen}
                    onInfo={onInfo}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Row({
  meeting,
  section,
  busy,
  onOpen,
  onInfo,
}: {
  meeting: MeetingCard;
  section: Section;
  busy: boolean;
  onOpen: (meeting: MeetingCard) => void;
  onInfo: (meeting: MeetingCard) => void;
}) {
  const running = isInFlight(meeting);
  const mark = healthOf(meeting);

  return (
    <tr>
      <td>
        <span className="listing__status">
          <Icon name={mark.icon} size={18} className={`listing__glyph listing__glyph--${mark.tone}`} />
          {mark.word}
        </span>
      </td>

      <td>
        {/* The title is the link when there is somewhere to go, and plain text when there is not —
            rather than a link that lands on an empty board and looks broken. */}
        {meeting.queryable ? (
          <button type="button" className="listing__link" onClick={() => onOpen(meeting)}>
            {meeting.title}
          </button>
        ) : (
          <span className="listing__title">{meeting.title}</span>
        )}
        <span className="listing__id">{meeting.meetingId}</span>
      </td>

      <td className="listing__when">
        {section === 'pending'
          ? meeting.listedAt
            ? formatMeetingDate(meeting.listedAt)
            : '—'
          : meeting.startedAt
            ? [formatMeetingDate(meeting.startedAt), formatMinutes(meeting.durationSeconds)]
                .filter(Boolean)
                .join(' · ')
            : '—'}
      </td>

      <td>
        {running ? (
          <>
            <div className="listing__step">
              {meeting.message} · {meeting.progress}%
            </div>
            <div
              className="meter"
              role="progressbar"
              aria-valuenow={meeting.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={meeting.message}
            >
              <div className="meter__fill" style={{ width: `${meeting.progress}%` }} />
            </div>
          </>
        ) : meeting.error?.message ? (
          // The reason it failed, in full. This is the column the nav could not give it.
          <span className="listing__error">{meeting.error.message}</span>
        ) : (
          <span className="listing__when">
            {[
              meeting.meetingType || null,
              meeting.processingVersion ? `v${meeting.processingVersion}` : null,
              meeting.inCatalog ? null : 'not in catalogue',
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </span>
        )}
      </td>

      <td className="listing__actioncol">
        {/* Opens the panel rather than starting the run: a run carries tags and a focus
            instruction, and there is one way in — the one with the fields on it. */}
        {meeting.inCatalog && !running && (
          <button
            type="button"
            className="textbutton textbutton--compact"
            disabled={busy}
            onClick={() => onInfo(meeting)}
          >
            {busy ? 'Starting…' : action(meeting)}
          </button>
        )}
      </td>
    </tr>
  );
}

/** What pressing the button does, in the user's terms rather than the API's. */
function action(meeting: MeetingCard): string {
  if (meeting.status === 'NOT_STARTED') return 'Generate';
  if (meeting.status === 'FAILED') return 'Try again';
  return 'Reprocess';
}

/** The glyph and the word, which always travel together — colour is never the only cue. */
function healthOf(meeting: MeetingCard): { icon: IconName; tone: string; word: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning', word: 'Processing' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical', word: 'Failed' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning', word: 'Partial' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good', word: 'Processed' };

  return { icon: 'circle', tone: 'muted', word: 'Not started' };
}
