import { ConfirmButton } from './ConfirmButton';
import { Modal } from './Modal';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import type { MeetingCard } from '../types';

/**
 * What a meeting is about, before deciding to process it.
 *
 * A run is minutes of pipeline and a set of AI calls, and the sidebar row can only carry a title —
 * which for "Meet-2" says nothing at all. This is where the recording service's description is read,
 * and it holds the Generate button too, so the decision and the action are in the same place rather
 * than the panel being a detour on the way back to the row.
 *
 * A meeting with no description says so. A blank panel would read as a loading state that never
 * finished, and the difference between "nothing was written" and "nothing arrived" matters to
 * whoever has to go and write it.
 */
export function MeetingInfo({
  meeting,
  busy,
  onGenerate,
  onClose,
}: {
  meeting: MeetingCard;
  busy: boolean;
  onGenerate: (meeting: MeetingCard, reprocess: boolean) => void;
  onClose: () => void;
}) {
  const action = meeting.status === 'NOT_STARTED' ? 'Generate' : 'Reprocess';

  return (
    <Modal
      label={meeting.title}
      width={620}
      onClose={onClose}
      head={<span className="modal__title">{meeting.title}</span>}
    >
      <div className="info info--plain">
        <p className="info__label">What it was about</p>
        {meeting.description ? (
          <p className="info__text">{meeting.description}</p>
        ) : (
          <p className="info__text info__text--absent">
            No description was recorded for this meeting.
          </p>
        )}

        <p className="info__label">Details</p>
        <dl className="facts">
          <dt>Meeting id</dt>
          <dd>{meeting.meetingId}</dd>

          {meeting.listedAt && (
            <>
              <dt>Listed</dt>
              <dd>{formatMeetingDate(meeting.listedAt)}</dd>
            </>
          )}

          {/* Only known once a transcript has been read, so absent before the first run. */}
          {meeting.startedAt && (
            <>
              <dt>Held</dt>
              <dd>
                {[formatMeetingDate(meeting.startedAt), formatMinutes(meeting.durationSeconds)]
                  .filter(Boolean)
                  .join(' · ')}
              </dd>
            </>
          )}

          <dt>Analytics</dt>
          <dd>
            {meeting.status === 'NOT_STARTED'
              ? 'Not generated yet'
              : `${meeting.message}${meeting.processingVersion ? ` · v${meeting.processingVersion}` : ''}`}
          </dd>
        </dl>

        {meeting.error?.message && <p className="note note--error">{meeting.error.message}</p>}

        {meeting.inCatalog && (
          <div className="info__actions">
            <ConfirmButton
              label={action}
              confirmLabel={action === 'Reprocess' ? 'Run again?' : 'Generate?'}
              busyLabel="Starting…"
              busy={busy}
              tone={action === 'Generate' ? 'accent' : 'quiet'}
              onConfirm={() => onGenerate(meeting, meeting.status !== 'NOT_STARTED')}
            />
            <span className="info__hint">
              {action === 'Generate'
                ? 'Runs the pipeline over the transcript — a few minutes.'
                : 'Runs the pipeline again at the next version.'}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
