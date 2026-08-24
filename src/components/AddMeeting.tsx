import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { fetchTranscriptSource, startAnalytics } from '../lib/api';
import type { StartedJob, TranscriptSource } from '../types';

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

        ...(source ? { transcriptSource: source } : {}),
        ...(needsUrl && downloadUrl.trim() ? { downloadUrl: downloadUrl.trim() } : {}),
        ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {}),
        ...(reprocess ? { reprocess: true } : {}),
      });

      setResult(started);

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
        <Icon name="add" size={18} />
        Add meeting
      </button>
    );
  }

  return (
    <form className="add" onSubmit={submit}>
      <div className="add__head">
        <span className="group__label add__title">Process a meeting</span>
        <button
          type="button"
          className="iconbutton iconbutton--small"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" size={18} />
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
