import { useEffect, useState } from 'react';
import { fetchTranscriptSource, startAnalytics } from '../lib/api';
import type { StartedJob, TranscriptSource } from '../types';

/**
 * Queue a meeting for processing.
 *
 * The pipeline is started by id, not by upload: the transcript already exists somewhere the
 * worker can read — a fixture directory locally, a signed GCS link in production — so what
 * this form collects is a reference, not a file.
 *
 * It reports `ALREADY_RUNNING` as the distinct outcome it is rather than as success. A repeat
 * request returns the in-flight job instead of starting a second, so someone who typed an id
 * that is already processing needs to be told that, not shown a tick.
 *
 * `reprocess` is the deliberate override: the same meeting again, at the next version. It is a
 * checkbox rather than the default because a full run is a set of AI calls, not a page refresh.
 */
export function AddMeeting({ onQueued }: { onQueued: () => void }) {
  const [open, setOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [source, setSource] = useState<TranscriptSource | ''>('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [reprocess, setReprocess] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StartedJob | null>(null);
  const [serverSource, setServerSource] = useState<TranscriptSource | null>(null);

  // Asked for when the form opens, because "server default" can itself be gcs — and then the
  // download URL is required even though the user picked nothing.
  useEffect(() => {
    if (open && !serverSource) void fetchTranscriptSource().then(setServerSource);
  }, [open, serverSource]);

  const effectiveSource = source || serverSource;
  const needsUrl = effectiveSource === 'gcs';
  const canSubmit = meetingId.trim().length > 0 && (!needsUrl || downloadUrl.trim().length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const started = await startAnalytics({
        meetingId: meetingId.trim(),
        // Omitted rather than sent empty: the body is `.strict()`, and an empty string is not
        // the same request as "use the server's default".
        ...(source ? { transcriptSource: source } : {}),
        ...(needsUrl && downloadUrl.trim() ? { downloadUrl: downloadUrl.trim() } : {}),
        ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {}),
        ...(reprocess ? { reprocess: true } : {}),
      });

      setResult(started);
      // The card appears in "Processing" straight away rather than at the next poll.
      onQueued();

      if (started.status === 'STARTED') {
        setMeetingId('');
        setDownloadUrl('');
        setReprocess(false);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="button button--ghost add__open" onClick={() => setOpen(true)}>
        + Add meeting
      </button>
    );
  }

  return (
    <form className="add" onSubmit={submit}>
      <div className="add__head">
        <span className="group__label add__title">Process a meeting</span>
        <button type="button" className="button button--ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <label className="field">
        <span className="field__label">Meeting id</span>
        <input
          className="field__input"
          value={meetingId}
          placeholder="the id in the source system"
          autoFocus
          onChange={(event) => setMeetingId(event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Transcript from</span>
        <select
          className="field__input"
          value={source}
          onChange={(event) => setSource(event.target.value as TranscriptSource | '')}
        >
          <option value="">
            {serverSource ? `Server default — ${serverSource}` : 'Server default'}
          </option>
          <option value="local">local — a fixture file</option>
          <option value="gcs">gcs — a signed link</option>
        </select>
      </label>

      {needsUrl && (
        <label className="field">
          <span className="field__label">
            Download URL — required by the {source === 'gcs' ? 'gcs source' : 'server default'}
          </span>
          <input
            className="field__input"
            value={downloadUrl}
            placeholder="https://…"
            onChange={(event) => setDownloadUrl(event.target.value)}
          />
        </label>
      )}

      <label className="field">
        <span className="field__label">Tenant id (optional)</span>
        <input
          className="field__input"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
      </label>

      <label className="field field--inline">
        <input
          type="checkbox"
          checked={reprocess}
          onChange={(event) => setReprocess(event.target.checked)}
        />
        <span>Reprocess — run again at the next version</span>
      </label>

      <button
        type="submit"
        className="button button--primary add__submit"
        disabled={!canSubmit || busy}
      >
        {busy ? 'Queueing…' : 'Start processing'}
      </button>

      {error && <p className="note note--error add__note">{error}</p>}

      {result && (
        <p className="note add__note">
          {result.status === 'STARTED'
            ? `Queued ${result.meetingId}. It will show its progress above as it runs.`
            : `${result.meetingId} is already being processed — showing that run rather than starting a second. Tick reprocess to force a new one.`}
        </p>
      )}
    </form>
  );
}
