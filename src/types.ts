/**
 * The API's shapes, mirrored.
 *
 * Hand-written rather than generated: the backend's own types carry Zod schemas and
 * Sequelize models that have no business in a browser bundle, and the wire contract is
 * small enough that a copy is cheaper than a build step. When `src/types/chartSpec.ts`
 * changes, this changes with it.
 */

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'table' | 'stat';
export type ValueFormat = 'NUMBER' | 'PERCENT' | 'DURATION_MS' | 'MONEY' | 'TEXT';

export interface SeriesSpec {
  key: string;
  label: string;
  format: ValueFormat;
}

export type Cell = string | number | null;

export interface Chart {
  id: string;
  type: ChartType;
  title: string;
  subtitle: string | null;
  sourceQueryIds: string[];
  data: Record<string, Cell>[];
  xKey: string | null;
  xLabel: string | null;
  yLabel: string | null;
  series: SeriesSpec[];
  stacked: boolean;
  horizontal: boolean;
  columns: SeriesSpec[];
  value: number | string | null;
  caption: string | null;
}

export interface Evidence {
  quote: string;
  speaker: string | null;
  sourceQueryId: string | null;
}

export interface Dashboard {
  answer: string;
  charts: Chart[];
  evidence: Evidence[];
  followUpQuestions: string[];
  caveats: string[];
}

export interface SqlResult {
  id: string;
  purpose: string;
  sql: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  error: string | null;
}

export interface SemanticHit {
  text: string;
  score: number | null;
  documentType: string | null;
  /** Which meeting the quote came from. Null when the index never stamped it. */
  meetingId: string | null;
  row: Record<string, unknown> | null;
}

export interface SemanticResult {
  id: string;
  purpose: string;
  query: string;
  hits: SemanticHit[];
  hitCount: number;
  error: string | null;
}

export interface QueryPlan {
  interpretation: string;
  intent: string;
  answerable: boolean;
  unanswerableReason: string | null;
  assumptions: string[];
}

export interface QueryBundle {
  question: string;
  /** Null for a global answer, which spans many meetings. */
  meetingId: string | null;
  jobId: string | null;
  /** How many meetings the answer is over — the denominator for every number in it. */
  meetingCount: number;
  plan: QueryPlan;
  sql: SqlResult[];
  semantic: SemanticResult[];
  warnings: string[];
  empty: boolean;
}

export interface QueryResponse {
  dashboard: Dashboard | null;
  /** Why there is no dashboard. The bundle is still a complete answer. */
  dashboardError: string | null;
  bundle: QueryBundle;
  /** The rows this answer's charts were saved as — already on the board. */
  saved: SavedChart[];
  /** Present on a global answer: how many meetings it ran over. */
  meetingCount?: number;
}

/** Columns of twelve a card spans: a third, a half, the full row. */
export type Span = 4 | 6 | 12;

export interface SavedChart {
  /** The row's id, not the chart's — two questions can both produce `objections_by_type`. */
  id: string;
  question: string;
  answer: string | null;
  position: number;
  span: Span;
  savedAt: string;
  chart: Chart;
  /** The quotes behind the numbers. Empty when the answer had nothing to quote. */
  evidence: Evidence[];
  caveats: string[];
}

/** `NOT_STARTED` is a catalogued meeting nothing has been run against yet. */
export type JobStatus =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export interface MeetingCard {
  meetingId: string;
  title: string;
  /** What the meeting was about, from the catalogue. Null when nothing was recorded. */
  description: string | null;
  /** True when the catalogue holds a transcript path — the condition for generating. */
  inCatalog: boolean;
  listedAt: string | null;

  /** Null until something has been run for this meeting. */
  jobId: string | null;
  meetingType: string | null;
  /** From the parsed transcript, so null until a run has read one. */
  startedAt: string | null;
  durationSeconds: number | null;

  status: JobStatus;
  currentStep: string | null;
  progress: number;
  message: string;
  processingVersion: number | null;
  /** Stated by the API, not derived from `status` — PARTIAL is queryable, FAILED is not. */
  queryable: boolean;
  /** Labels on the meeting, as the last run set them. Normalised uppercase. */
  tags: string[];
  /** What the last run was told to be sure it captured, so a reprocess can offer it back. */
  focus: string | null;
  error?: { code: string | null; message: string | null };
}

export type TranscriptSource = 'local' | 'gcs';

export interface GenerateInput {
  reprocess: boolean;
  tags: string[];
  focus: string | null;
}

export interface StartAnalyticsInput {
  meetingId: string;
  /** Required by the gcs source: the signed link the worker downloads from. */
  downloadUrl?: string;
  tenantId?: string;
  /** Start a fresh run at the next version even if one is already in flight. */
  reprocess?: boolean;
  /** Omitted means the server's configured default. */
  transcriptSource?: TranscriptSource;
}

/** `POST /buildAnalyticsData` answers outside the `{ data }` envelope. */
export interface StartedJob {
  status: 'STARTED' | 'ALREADY_RUNNING';
  jobId: string;
  meetingId: string;
  statusUri: string;
}
