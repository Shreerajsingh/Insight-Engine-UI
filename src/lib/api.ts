import type { Scope } from './useRoute';
import type {
  GenerateInput,
  MeetingCard,
  QueryResponse,
  SavedChart,
  Span,
  StartAnalyticsInput,
  StartedJob,
  TranscriptSource,
} from '../types';

const BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await call<{ data?: T }>(path, init);

  if (body.data === undefined) throw new Error('The API returned an unexpected response.');
  return body.data;
}

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

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok) {

    throw new Error(body?.error?.message ?? `The API returned ${response.status}.`);
  }
  if (!body) throw new Error('The API returned an unexpected response.');

  return body;
}

export const fetchMeetings = () => request<MeetingCard[]>('/meetings');

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

export const startAnalytics = (input: StartAnalyticsInput) =>
  requestFlat<StartedJob>('/buildAnalyticsData', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const generateMeeting = (meetingId: string, input: GenerateInput) =>
  requestFlat<StartedJob>(`/meetings/${encodeURIComponent(meetingId)}/generate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const askQuestion = (meetingId: string, question: string) =>
  request<QueryResponse>(`/query/${encodeURIComponent(meetingId)}`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

export const askGlobal = (question: string) =>
  request<QueryResponse>('/query/global', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

const dashboardPath = (scope: Scope) =>
  scope.kind === 'global'
    ? '/global/dashboard'
    : `/meetings/${encodeURIComponent(scope.meetingId)}/dashboard`;

export const fetchDashboard = (scope: Scope) => request<SavedChart[]>(dashboardPath(scope));

export const saveLayout = (
  scope: Scope,
  layout: { id: string; position: number; span: Span }[],
) =>
  request<{ updated: number }>(dashboardPath(scope), {
    method: 'PATCH',
    body: JSON.stringify({ layout }),
  });

export async function removeSavedChart(scope: Scope, id: string): Promise<void> {
  await call<unknown>(`${dashboardPath(scope)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
