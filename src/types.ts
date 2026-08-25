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

  meetingId: string | null;
  jobId: string | null;

  meetingCount: number;

  /** How many of those meetings actually contributed a row; null when nothing names a meeting. */
  meetingsInResults: number | null;
  plan: QueryPlan;
  sql: SqlResult[];
  semantic: SemanticResult[];
  warnings: string[];
  empty: boolean;

  /** Every query errored. Distinct from `empty`, which means they ran and matched nothing. */
  failed: boolean;
}

export interface QueryResponse {
  dashboard: Dashboard | null;

  dashboardError: string | null;
  bundle: QueryBundle;

  saved: SavedChart[];

  meetingCount?: number;
}

export type Span = 4 | 6 | 12;

export interface SavedChart {

  id: string;
  question: string;
  answer: string | null;
  position: number;
  span: Span;
  savedAt: string;
  chart: Chart;

  evidence: Evidence[];
  caveats: string[];
}

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

  description: string | null;

  inCatalog: boolean;
  listedAt: string | null;

  jobId: string | null;
  meetingType: string | null;

  startedAt: string | null;
  durationSeconds: number | null;

  status: JobStatus;
  currentStep: string | null;
  progress: number;
  message: string;
  processingVersion: number | null;

  queryable: boolean;

  tags: string[];

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

  downloadUrl?: string;
  tenantId?: string;

  reprocess?: boolean;

  transcriptSource?: TranscriptSource;
}

export interface StartedJob {
  status: 'STARTED' | 'ALREADY_RUNNING';
  jobId: string;
  meetingId: string;
  statusUri: string;
}
