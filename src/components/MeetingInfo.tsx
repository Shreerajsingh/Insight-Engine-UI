import { useState } from 'react';
import { ConfirmButton } from './ConfirmButton';
import { Modal } from './Modal';
import { TagInput } from './TagInput';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import type { GenerateInput, MeetingCard } from '../types';

export function MeetingInfo({
  meeting,
  busy,
  tagSuggestions,
  onGenerate,
  onClose,
}: {
  meeting: MeetingCard;
  busy: boolean;

  tagSuggestions: string[];
  onGenerate: (meeting: MeetingCard, input: GenerateInput) => void;
  onClose: () => void;
}) {
  const action = meeting.status === 'NOT_STARTED' ? 'Generate' : 'Reprocess';

  /* Seeded from the last run, not blank: only the newest run is queried, so a reprocess with an
     empty focus box would silently discard the focused extraction. */
  const [tags, setTags] = useState<string[]>(meeting.tags);
  const [focus, setFocus] = useState(meeting.focus ?? '');

  const reused =
    meeting.status !== 'NOT_STARTED' &&
    (meeting.tags.length > 0 || meeting.focus !== null) &&
    sameTags(tags, meeting.tags) &&
    focus === (meeting.focus ?? '');

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
        <dl className="facts facts--stacked">
          <dt>Meeting id</dt>
          <dd>{meeting.meetingId}</dd>

          {meeting.listedAt && (
            <>
              <dt>Listed</dt>
              <dd>{formatMeetingDate(meeting.listedAt)}</dd>
            </>
          )}

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
          <>
            <p className="info__label">Tags</p>
            <p className="info__hint info__hint--block">
              Labels for this meeting — SALES, VIASOCKET, FOLLOW-UP. They are what lets you ask a
              question across one kind of call instead of all of them.
            </p>
            <TagInput
              tags={tags}
              suggestions={tagSuggestions}
              disabled={busy}
              onChange={setTags}
            />

            <p className="info__label">Focus for this run</p>
            <p className="info__hint info__hint--block">
              Anything the extraction must be sure to capture, in your words. Everything normally
              extracted still is — this is added to it, not instead of it.
            </p>
            <textarea
              className="field__input info__focus"
              rows={3}
              value={focus}
              maxLength={500}
              disabled={busy}
              placeholder="e.g. Capture every commitment about deliverables and who owns each one."
              aria-label="What this run must be sure to capture"
              onChange={(event) => setFocus(event.target.value)}
            />
            <p className="info__count">{focus.length}/500</p>

            {reused && (
              <p className="info__hint info__hint--block">
                These are what the last run used. Edit or clear them to run differently.
              </p>
            )}

            <div className="info__actions">
              <ConfirmButton
                label={action}
                confirmLabel={action === 'Reprocess' ? 'Run again?' : 'Generate?'}
                busyLabel="Starting…"
                busy={busy}
                tone={action === 'Generate' ? 'accent' : 'quiet'}
                onConfirm={() =>
                  onGenerate(meeting, {
                    reprocess: meeting.status !== 'NOT_STARTED',
                    tags,
                    focus: focus.trim() || null,
                  })
                }
              />
              <span className="info__hint">
                {action === 'Generate'
                  ? 'Runs the pipeline over the transcript — a few minutes.'
                  : 'Runs the pipeline again at the next version. Tags are replaced by what is above.'}
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}
