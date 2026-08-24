import { Icon, type IconName } from './Icon';
import { CopyUrlButton } from './TopBar';
import { isInFlight } from '../lib/useMeetings';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import type { Section } from '../lib/useRoute';
import type { MeetingCard } from '../types';

interface Group {
  label: string;

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

function action(meeting: MeetingCard): string {
  if (meeting.status === 'NOT_STARTED') return 'Generate';
  if (meeting.status === 'FAILED') return 'Try again';
  return 'Reprocess';
}

function healthOf(meeting: MeetingCard): { icon: IconName; tone: string; word: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning', word: 'Processing' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical', word: 'Failed' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning', word: 'Partial' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good', word: 'Processed' };

  return { icon: 'circle', tone: 'muted', word: 'Not started' };
}
