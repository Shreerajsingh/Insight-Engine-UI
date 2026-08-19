import type { Scope } from './useRoute';
import type {
  MeetingCard,
  QueryResponse,
  SavedChart,
  Span,
  StartAnalyticsInput,
  StartedJob,
  TranscriptSource,
} from '../types';

/** Empty in development: the Vite proxy puts the API on this origin. */
const BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * One place that knows the envelope and the error shape.
 *
 * The API answers `{ data: ... }` on success and `{ error: { message } }` on failure, so
 * the unwrapping and the message extraction happen once here rather than at every call
 * site. A failed request throws with the server's own message — a 422 from the plan
 * validator says exactly what was wrong with the query, and losing that in favour of
 * "Request failed" would make the app undiagnosable.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await call<{ data?: T }>(path, init);

  if (body.data === undefined) throw new Error('The API returned an unexpected response.');
  return body.data;
}

/**
 * The same call without the `{ data }` envelope.
 *
 * `POST /buildAnalyticsData` predates that convention and answers `{ status, jobId, ... }` at
 * the top level. Wrapping it here to look enveloped would be a lie about the API, so the two
 * shapes are two functions over one transport.
 */
async function requestFlat<T>(path: string, init?: RequestInit): Promise<T> {
  return call<T>(path, init);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (cause) {
    throw new Error('Could not reach the API. Is the backend running on port 3000?', { cause });
  }

  // 204 is the documented answer to a delete: there is no body to parse, and treating an empty
  // one as a malformed response would make every successful delete look like a failure.
  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    // The server's own message names the bad field or the missing transcript — far more use
    // than "Request failed", so it is what surfaces.
    throw new Error(body?.error?.message ?? `The API returned ${response.status}.`);
  }
  if (!body) throw new Error('The API returned an unexpected response.');

  return body;
}

export const fetchMeetings = () => request<MeetingCard[]>('/meetings');

/**
 * Which transcript backend the server is configured for.
 *
 * Read from readiness, which already reports it, rather than from a new endpoint. Returns null
 * on any failure — this is a hint that decides whether the add form asks for a download URL,
 * not a dependency, so a form that asks for one field too few beats a form that will not open.
 *
 * Readiness answers 503 when a dependency is down and still names the source, so the status is
 * deliberately not checked.
 */
export async function fetchTranscriptSource(): Promise<TranscriptSource | null> {
  try {
    const response = await fetch(`${BASE}/api/v1/health/ready`);
    const body = (await response.json()) as {
      checks?: { transcriptSource?: { name?: string } };
    };
    const name = body.checks?.transcriptSource?.name;

    return name === 'local' || name === 'gcs' ? name : null;
  } catch {
    return null;
  }
}

/**
 * Queues a meeting for processing. Returns as soon as the job is enqueued — the pipeline runs
 * for minutes, and its progress arrives through the meeting list like every other run's.
 */
export const startAnalytics = (input: StartAnalyticsInput) =>
  requestFlat<StartedJob>('/buildAnalyticsData', {
    method: 'POST',
    body: JSON.stringify(input),
  });

/**
 * Processes a catalogued meeting. The id is all the client sends — where the transcript lives is
 * the catalogue's business, and a browser passing a storage path back would be the client telling
 * the server where to read from.
 */
export const generateMeeting = (meetingId: string, reprocess = false) =>
  requestFlat<StartedJob>(`/meetings/${encodeURIComponent(meetingId)}/generate`, {
    method: 'POST',
    body: JSON.stringify({ reprocess }),
  });

export const askQuestion = (meetingId: string, question: string) =>
  request<QueryResponse>(`/query/${encodeURIComponent(meetingId)}`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

/**
 * The same question, asked of every processed meeting.
 *
 * No id in the path and none in the body: the scope is the whole corpus, decided by the
 * server from what has finished processing. A client passing a meeting list would be the
 * browser deciding what the corpus is.
 */
export const askGlobal = (question: string) =>
  request<QueryResponse>('/query/global', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

/**
 * One board per scope, and one path builder for both.
 *
 * The global board lives at its own route rather than at a meeting route called with a
 * reserved id — the reserved key is the server's storage detail, and a client that had to
 * know it would be a client coupled to the schema.
 */
const dashboardPath = (scope: Scope) =>
  scope.kind === 'global'
    ? '/global/dashboard'
    : `/meetings/${encodeURIComponent(scope.meetingId)}/dashboard`;

export const fetchDashboard = (scope: Scope) => request<SavedChart[]>(dashboardPath(scope));

/** The whole arrangement, because moving one card renumbers its neighbours. */
export const saveLayout = (
  scope: Scope,
  layout: { id: string; position: number; span: Span }[],
) =>
  request<{ updated: number }>(dashboardPath(scope), {
    method: 'PATCH',
    body: JSON.stringify({ layout }),
  });

/** 204, so there is no body to unwrap. */
export async function removeSavedChart(scope: Scope, id: string): Promise<void> {
  await call<unknown>(`${dashboardPath(scope)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
