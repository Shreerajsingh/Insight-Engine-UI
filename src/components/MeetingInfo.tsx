import { useState } from 'react';
import { ConfirmButton } from './ConfirmButton';
import { Modal } from './Modal';
import { TagInput } from './TagInput';
import { formatMeetingDate, formatMinutes } from '../lib/format';
import type { GenerateInput, MeetingCard } from '../types';

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
  tagSuggestions,
  onGenerate,
  onClose,
}: {
  meeting: MeetingCard;
  busy: boolean;
  /** Tags already used on other meetings, so one idea is not spelled two ways. */
  tagSuggestions: string[];
  onGenerate: (meeting: MeetingCard, input: GenerateInput) => void;
  onClose: () => void;
}) {
  const action = meeting.status === 'NOT_STARTED' ? 'Generate' : 'Reprocess';

  /**
   * Seeded from the last run, not blank.
   *
   * A reprocess with an empty focus box replaces a focused extraction with an unfocused one, and
   * because only the newest run is queried, that quietly throws the focused data away. Starting
   * from what the last run used makes keeping it the default and clearing it the deliberate act.
   */
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

/** Order-insensitive, because the chips are a set and the user did not choose their order. */
function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}
