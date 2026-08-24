import { useEffect, useState } from 'react';
import { AddMeeting } from './components/AddMeeting';
import { AnswerCard } from './components/AnswerCard';
import { AskBox, GLOBAL_STARTERS, MEETING_STARTERS } from './components/AskBox';
import { DashboardGrid } from './components/DashboardGrid';
import { Icon, type IconName } from './components/Icon';
import { MeetingInfo } from './components/MeetingInfo';
import { MeetingList } from './components/MeetingList';
import { SECTION_GROUPS, SectionPage } from './components/SectionPage';
import { Breadcrumbs, CopyUrlButton, TopBar } from './components/TopBar';
import { generateMeeting } from './lib/api';
import { useAnswers } from './lib/useAnswers';
import { useDashboard } from './lib/useDashboard';
import {
  GLOBAL_SCOPE,
  meetingIdOf,
  scopeKey,
  useRoute,
  type Section,
  type View,
} from './lib/useRoute';
import { isInFlight, useMeetings } from './lib/useMeetings';
import { formatMeetingDate, formatMinutes } from './lib/format';
import type { Answer } from './lib/useAnswers';
import type { GenerateInput, MeetingCard } from './types';
import './app.css';

/**
 * A label/value pair in the header's right-hand cluster.
 *
 * The console's detail pages put the facts that identify a resource — its trigger, its source, its
 * commit — up here as small stacked pairs rather than in a table further down, and it works because
 * these are the things you check before reading anything else. `mono` is for an id, where the
 * character shapes matter more than the line looking tidy.
 */
type Fact = { label: string; value: string; mono?: boolean };

/** How a scope's health reads at a glance: the glyph, its colour, and the word beside the title. */
type Health = { icon: IconName; tone: 'good' | 'warning' | 'critical' | 'muted'; word: string };

export function App() {
  const { meetings, loading, error, refresh } = useMeetings();
  const { route, go, replace, goSection } = useRoute();
  const scope = route.scope;
  const section = route.section;
  const isGlobal = scope?.kind === 'global';
  const selectedId = meetingIdOf(scope);
  const view = route.view;
  const board = useDashboard(scope);
  const { answers, ask, remove } = useAnswers(board.add);
  const [filter, setFilter] = useState('');
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  /** The meeting whose description is open, by id — so polling can refresh what it shows. */
  const [infoId, setInfoId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [theme, setTheme] = useTheme();
  const [navOpen, setNavOpen] = useNav();
  const [refreshing, setRefreshing] = useState(false);

  // Land on something askable rather than on an empty pane — but only when the URL names nothing.
  // A URL that names a scope is a decision already made, by a reload or by whoever sent the link,
  // and overriding it is exactly the behaviour this replaced. `replace`, not `go`: a selection the
  // user did not make should not be a step the back button returns to.
  useEffect(() => {
    if (scope || section) return;

    const first = meetings.find((meeting) => meeting.queryable);
    if (first) replace({ kind: 'meeting', meetingId: first.meetingId }, view);
  }, [meetings, scope, section, view, replace]);

  const needle = filter.trim().toLowerCase();
  const matches = needle
    ? meetings.filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(needle) ||
          meeting.meetingId.toLowerCase().includes(needle),
      )
    : meetings;

  const selected = meetings.find((meeting) => meeting.meetingId === selectedId) ?? null;
  /** The URL names a meeting this list does not hold — a stale link, or a deleted meeting. */
  const missing = selectedId !== null && !loading && selected === null;
  const session = answers.filter((answer) => answer.scopeKey === scopeKey(scope));
  const busy = session.some((answer) => answer.state === 'pending');
  /** Global needs at least one processed meeting to have anything to query. */
  const queryable = meetings.filter((meeting) => meeting.queryable);
  /**
   * Every tag already in use, offered in the popup.
   *
   * Read off the meeting list rather than from an endpoint of its own: the list is already
   * loaded and already polls, so a separate fetch would be a second source of the same truth.
   */
  const tagSuggestions = [...new Set(meetings.flatMap((meeting) => meeting.tags))].sort();

  const onSelect = (meeting: MeetingCard) => go({ kind: 'meeting', meetingId: meeting.meetingId }, view);
  const setView = (next: View) => go(scope, next);

  /** Asking always shows the answer, which lives in the Ask view with its prose and quotes. */
  const onAsk = (question: string) => {
    if (!scope) return;
    if (scope.kind === 'meeting' && !selected) return;

    go(scope, 'ask');
    void ask(scope, question);
  };

  /** Spun for as long as the fetch takes, so the bar's refresh says something happened. */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Press Generate and the row moves to Processing.
   *
   * The pending set is keyed by meeting id rather than being one flag, so generating two meetings
   * at once marks both buttons instead of the last one pressed. The list is refreshed on the way
   * out either way — a failure means the state on screen is no longer trustworthy.
   */
  const onGenerate = async (meeting: MeetingCard, input: GenerateInput) => {
    setGenerating((current) => new Set(current).add(meeting.meetingId));
    setGenerateError(null);

    try {
      await generateMeeting(meeting.meetingId, input);
    } catch (error) {
      setGenerateError(`${meeting.title}: ${(error as Error).message}`);
    } finally {
      setGenerating((current) => {
        const next = new Set(current);
        next.delete(meeting.meetingId);
        return next;
      });
      void refresh();
    }
  };

  // Looked up rather than stored: a generate started from the panel changes the meeting's status,
  // and the panel should show that rather than the snapshot it opened with.
  const info = meetings.find((meeting) => meeting.meetingId === infoId) ?? null;

  const trail: { label: string; onClick?: () => void }[] = [
    { label: 'Meeting Intelligence', onClick: () => go(GLOBAL_SCOPE, view) },
    section
      ? { label: SECTION_GROUPS[section].label }
      : isGlobal
        ? { label: 'All meetings' }
        : { label: selected ? selected.title : (selectedId ?? 'Details') },
  ];

  return (
    <div className="shell">
      <TopBar
        filter={filter}
        onFilter={setFilter}
        /* The same narrowed list the nav renders, so the bar and the panel can never disagree. */
        results={needle ? matches : []}
        onPick={onSelect}
        onHome={() => go(GLOBAL_SCOPE, view)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onRefresh={() => void onRefresh()}
        refreshing={refreshing}
        initial="M"
      />

      <Breadcrumbs trail={trail} />

      <div className="shell__body">
        {/*
          The console's left nav: a titled panel that collapses out of the way, with the resource
          list as its rows. Kept in the DOM when closed rather than unmounted, so reopening it does
          not lose the group folds or the scroll position the user left it at.
        */}
        {/* `inert` rather than `aria-hidden`: the panel collapses to zero width but stays in the
            DOM, so without it every control inside remains tabbable and a keyboard user tabs
            through a panel that is not on screen. `inert` takes the whole subtree out of the tab
            order and out of the accessibility tree at once, which is exactly the intent. */}
        <aside className={`nav${navOpen ? '' : ' nav--closed'}`} inert={!navOpen}>
          <div className="nav__head">
            <Icon name="history" size={20} className="nav__headicon" />
            <h2 className="nav__title">Meetings</h2>
            <button
              type="button"
              className="iconbutton iconbutton--small"
              aria-label="Hide the meetings panel"
              title="Hide panel"
              onClick={() => setNavOpen(false)}
            >
              <Icon name="menu" size={18} />
            </button>
          </div>

          <div className="nav__scroll">
            {/* Pinned above the list and outside the search, because it is not a meeting and
                filtering the meetings should never hide the way back to the global board. */}
            <button
              type="button"
              className={`navitem${isGlobal ? ' navitem--on' : ''}`}
              aria-current={isGlobal ? 'page' : undefined}
              onClick={() => go(GLOBAL_SCOPE, view)}
            >
              <Icon name="apps" size={20} />
              <span className="navitem__body">
                <span className="navitem__title">All meetings</span>
                <span className="navitem__meta">
                  {queryable.length > 0
                    ? `Ask across ${queryable.length} ${queryable.length === 1 ? 'meeting' : 'meetings'}`
                    : 'No processed meetings yet'}
                </span>
              </span>
            </button>

            <div className="nav__rule" />

            {loading && <p className="note note--flush">Loading meetings…</p>}
            {error && <p className="note note--flush note--error">{error}</p>}
            {generateError && <p className="note note--flush note--error">{generateError}</p>}
            {!loading && !error && meetings.length === 0 && (
              <p className="note note--flush">
                No meetings listed yet. The recording service adds them; you can also start one by
                id below.
              </p>
            )}
            {matches.length === 0 && meetings.length > 0 && (
              <p className="note note--flush">Nothing matches “{filter}”.</p>
            )}

            <MeetingList
              meetings={matches}
              selectedId={selectedId}
              generating={generating}
              onSelect={onSelect}
              onInfo={(meeting) => setInfoId(meeting.meetingId)}
            />
          </div>

          {/* The console pins its one secondary action to the bottom of the nav rather than
              floating it in the list, and this is that action. */}
          <div className="nav__foot">
            <AddMeeting onQueued={() => void refresh()} />
          </div>
        </aside>

        {!navOpen && (
          <nav className="rail" aria-label="Sections">
            <button
              type="button"
              className="railbutton"
              aria-label="Show the meetings panel"
              title="Show the meetings panel"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" size={20} />
            </button>

            <span className="rail__rule" />

            {/*
              One button per destination the nav holds, each going to that destination's listing
              rather than merely reopening the panel. A rail that only expands the panel is a
              second hamburger wearing four different glyphs.

              The count rides on the icon, because a rail with no labels has nowhere else to put
              the one thing that makes these worth clicking — whether there is anything in there.
            */}
            {RAIL.map((entry) => {
              const on = entry.section ? section === entry.section : isGlobal;
              const count = entry.section
                ? meetings.filter(SECTION_GROUPS[entry.section].select).length
                : queryable.length;

              return (
                <button
                  type="button"
                  key={entry.label}
                  className={`railbutton${on ? ' railbutton--on' : ''}`}
                  aria-label={`${entry.label}${count > 0 ? `, ${count}` : ''}`}
                  aria-current={on ? 'page' : undefined}
                  title={`${entry.label}${count > 0 ? ` (${count})` : ''}`}
                  onClick={() =>
                    entry.section ? goSection(entry.section) : go(GLOBAL_SCOPE, view)
                  }
                >
                  <Icon name={entry.icon} size={20} />
                  {count > 0 && (
                    <span className="railbutton__count">{count > 9 ? '9+' : count}</span>
                  )}
                </button>
              );
            })}

            <span className="rail__spacer" />

            {/* Adding a meeting is a form, and a form needs the panel, so this is the one rail
                button that legitimately just opens it. */}
            <button
              type="button"
              className="railbutton"
              aria-label="Add a meeting"
              title="Add a meeting"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="add" size={20} />
            </button>
          </nav>
        )}

        <main className="main">
          {section ? (
            <SectionPage
              section={section}
              meetings={meetings}
              generating={generating}
              onOpen={onSelect}
              onInfo={(meeting) => setInfoId(meeting.meetingId)}
            />
          ) : isGlobal ? (
            <Workspace
              health={
                queryable.length > 0
                  ? { icon: 'check', tone: 'good', word: 'Ready' }
                  : { icon: 'circle', tone: 'muted', word: 'Nothing processed' }
              }
              headline="Every processed meeting"
              subline={
                queryable.length > 0
                  ? `Asking across ${queryable.length} of ${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}`
                  : 'Generate one in the panel to have something to ask across'
              }
              facts={[
                { label: 'Scope', value: 'Corpus-wide' },
                { label: 'Processed', value: `${queryable.length} of ${meetings.length}` },
                { label: 'Processing', value: `${meetings.filter(isInFlight).length}` },
                { label: 'Saved charts', value: `${board.charts.length}` },
              ]}
              view={view}
              setView={setView}
              board={board}
              session={session}
              busy={busy}
              onAsk={onAsk}
              onRemoveAnswer={remove}
              starters={GLOBAL_STARTERS}
              askPlaceholder="Ask across every processed meeting…"
              askLabel="Ask a question across all meetings"
              /* Asking with nothing processed would cost a round trip to be told so. */
              blocked={
                queryable.length === 0 && !loading
                  ? 'No meetings have been processed yet, so there is nothing to ask across. Press Generate on one in the panel.'
                  : null
              }
              emptyBoard="Nothing saved yet. Every chart a cross-meeting question produces is kept here — drag the handle to rearrange, and pick a width per card."
              emptyAsk="Nothing asked this session. Each question is planned into SQL across every processed meeting, run on a read-only connection, and turned into charts — which are saved to the Dashboard as they are made."
            />
          ) : missing ? (
            <div className="empty">
              <Icon name="error" size={40} className="empty__icon empty__icon--critical" />
              <p className="empty__title">That meeting is not here</p>
              <p>
                The link names <code>{selectedId}</code>, which is not in the list — it may have been
                removed, or the id may be wrong.
              </p>
              <p>
                <button type="button" className="button" onClick={() => go(null)}>
                  Back to the list
                </button>
              </p>
            </div>
          ) : !selected ? (
            <div className="empty">
              <Icon name="dashboard" size={40} className="empty__icon" />
              <p className="empty__title">Pick a processed meeting</p>
              <p>
                Ask a question about it and the answer comes back as charts. Ask another and it is
                added below — the board is what you have asked, in the order you asked it.
              </p>
              <p>
                A meeting has to be processed first. Press Generate on one in the panel and it will
                show its progress there.
              </p>
              <p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => go(GLOBAL_SCOPE, 'ask')}
                >
                  Ask across all meetings
                </button>
              </p>
            </div>
          ) : (
            <Workspace
              health={healthOf(selected)}
              headline={selected.title}
              subline={
                selected.startedAt
                  ? `Started on ${formatMeetingDate(selected.startedAt)}`
                  : selected.listedAt
                    ? `Listed on ${formatMeetingDate(selected.listedAt)}`
                    : 'No start time recorded'
              }
              facts={[
                { label: 'Type', value: selected.meetingType || '—' },
                { label: 'Duration', value: formatMinutes(selected.durationSeconds) || '—' },
                {
                  label: 'Version',
                  value: selected.processingVersion ? `v${selected.processingVersion}` : '—',
                },
                { label: 'Meeting id', value: selected.meetingId, mono: true },
              ]}
              view={view}
              setView={setView}
              board={board}
              session={session}
              busy={busy}
              onAsk={onAsk}
              onRemoveAnswer={remove}
              starters={MEETING_STARTERS}
              askPlaceholder={`Ask about ${selected.title}…`}
              askLabel="Ask a question about this meeting"
              blocked={null}
              emptyBoard="Nothing saved yet. Every chart a question produces is kept here — drag the handle to rearrange, and pick a width per card."
              emptyAsk="Nothing asked this session. Each question is planned into SQL against this meeting's extracted data, run on a read-only connection, and turned into charts — which are saved to the Dashboard as they are made."
            />
          )}
        </main>
      </div>

      {info && (
        <MeetingInfo
          meeting={info}
          busy={generating.has(info.meetingId)}
          tagSuggestions={tagSuggestions}
          onGenerate={(meeting, input) => {
            void onGenerate(meeting, input);
            setInfoId(null);
          }}
          onClose={() => setInfoId(null)}
        />
      )}
    </div>
  );
}

/**
 * The rail, in order.
 *
 * Global first because it is the only one of these that is a place to ask questions rather than a
 * list of meetings; the three status groups follow in the order a meeting moves through them.
 */
const RAIL: { label: string; icon: IconName; section: Section | null }[] = [
  { label: 'All meetings', icon: 'apps', section: null },
  { label: 'Processed', icon: 'check', section: 'processed' },
  { label: 'Processing', icon: 'pending', section: 'processing' },
  { label: 'Ready to generate', icon: 'circle', section: 'pending' },
];

/** Which glyph and word go in front of a meeting's title, from the one field that decides it. */
function healthOf(meeting: MeetingCard): Health {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning', word: 'Processing' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical', word: 'Failed' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning', word: 'Partial' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good', word: 'Successful' };

  return { icon: 'circle', tone: 'muted', word: 'Not started' };
}

/**
 * The pane: the console's detail-page header, then the two views under it.
 *
 * Two bands. The status band names the thing with its health glyph in front, its identifying facts
 * off to the right, and the link-copying action after them; the tabs choose what fills the rest.
 *
 * There was a third above these — a title row reading "Meeting details" over a band that already
 * named the meeting, carrying actions that were a second route to the dialog the nav row's ⋮ opens.
 * It cost a band of vertical space on every view to restate what the next band said better.
 *
 * Shared by a meeting's workspace and the global one because they are the same thing over a
 * different scope — the board renders the same charts, the ask view runs the same three steps.
 * Only the copy, the facts and the starters differ, so those are props rather than two
 * near-identical trees that drift apart.
 */
function Workspace({
  health,
  headline,
  subline,
  facts,
  view,
  setView,
  board,
  session,
  busy,
  onAsk,
  onRemoveAnswer,
  starters,
  askPlaceholder,
  askLabel,
  blocked,
  emptyBoard,
  emptyAsk,
}: {
  health: Health;
  headline: string;
  subline: string;
  facts: Fact[];
  view: View;
  setView: (next: View) => void;
  board: ReturnType<typeof useDashboard>;
  session: Answer[];
  busy: boolean;
  onAsk: (question: string) => void;
  onRemoveAnswer: (id: string) => void;
  starters: string[];
  askPlaceholder: string;
  askLabel: string;
  /** Why this scope cannot be asked yet, if it cannot. Replaces the ask box. */
  blocked: string | null;
  emptyBoard: string;
  emptyAsk: string;
}) {
  return (
    <>
      {/* The panel the console puts a resource's summary in: one card, hairline border, no shadow —
          it is a region of the page rather than something floating over it. */}
      <section className="statusband">
        <div className="statusband__ident">
          <Icon
            name={health.icon}
            size={22}
            className={`statusband__glyph statusband__glyph--${health.tone}`}
          />
          <div className="statusband__text">
            {/* The word before the colon is the status, spelled out. Colour is never the only
                cue for it — a red glyph and a black title says nothing to anyone who cannot
                separate the two. */}
            <h2 className="statusband__headline" title={headline}>
              <span className={`statusband__word statusband__word--${health.tone}`}>
                {health.word}:
              </span>{' '}
              {headline}
            </h2>
            <p className="statusband__sub">{subline}</p>
          </div>
        </div>

        <dl className="facts">
          {facts.map((fact) => (
            <div className="facts__item" key={fact.label}>
              <dt className="facts__label">{fact.label}</dt>
              <dd className={`facts__value${fact.mono ? ' facts__value--mono' : ''}`} title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}

          {/*
            The copy action, as one more field rather than as a control at the far edge.
            It is a property of the thing the band describes — the link that points at it — so it
            reads better labelled and column-aligned with the id and the version than floated off
            to the right where it belonged to nothing.
          */}
          <div className="facts__item">
            <dt className="facts__label">Link</dt>
            <dd className="facts__value">
              <CopyUrlButton />
            </dd>
          </div>
        </dl>
      </section>

      {/*
        Sticky, so the two views stay reachable while a long board scrolls. A sticky child's
        offsets resolve against the scroll container's PADDING box, so this is full-bleed by
        negative margins that cancel the container's padding and re-apply it here — otherwise
        `top: 0` parks the row below the padding and lets the board scroll through the gap above.
        Opaque for the same reason: charts passing behind a translucent bar read as a fault.
      */}
      <div className="tabbar">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`tab${view === 'dashboard' ? ' tab--on' : ''}`}
            aria-selected={view === 'dashboard'}
            onClick={() => setView('dashboard')}
          >
            <Icon name="dashboard" size={18} />
            Dashboard
            {board.charts.length > 0 && <span className="tab__count">{board.charts.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            className={`tab${view === 'ask' ? ' tab--on' : ''}`}
            aria-selected={view === 'ask'}
            onClick={() => setView('ask')}
          >
            <Icon name="chat" size={18} />
            Ask
            {session.length > 0 && <span className="tab__count">{session.length}</span>}
          </button>
        </div>
      </div>

      {board.error && <p className="note note--error">{board.error}</p>}

      {view === 'dashboard' ? (
        <div className="board">
          {board.loading && <p className="note">Loading the board…</p>}

          {!board.loading && board.charts.length === 0 && (
            <p className="note">
              {emptyBoard}{' '}
              <button type="button" className="chip" onClick={() => setView('ask')}>
                Ask something
              </button>
            </p>
          )}

          {board.charts.length > 0 && (
            <DashboardGrid
              charts={board.charts}
              onMove={board.move}
              onResize={board.resize}
              onRemove={(id) => void board.remove(id)}
            />
          )}
        </div>
      ) : (
        <div className="board">
          {blocked ? (
            <p className="note">{blocked}</p>
          ) : (
            <AskBox
              placeholder={askPlaceholder}
              label={askLabel}
              starters={starters}
              busy={busy}
              onAsk={onAsk}
            />
          )}

          {session.length === 0 && !blocked && <p className="note">{emptyAsk}</p>}

          {session.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              onAsk={onAsk}
              onRemove={() => onRemoveAnswer(answer.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

type Theme = 'light' | 'dark';

/**
 * The theme toggle, stamped on the root element.
 *
 * Unset means "follow the OS", which is the default and the reason the tokens declare their
 * dark values twice — once under `prefers-color-scheme`, once under `[data-theme]`. The
 * choice is remembered because being thrown back to the OS setting on every reload is the
 * thing that makes a toggle feel broken.
 */
function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return [theme, setTheme];
}

/**
 * Whether the nav is showing, remembered.
 *
 * Same reasoning as the group folds: a panel someone deliberately collapsed to get more width for
 * their charts should still be collapsed after a reload. It starts closed on a narrow viewport,
 * where the nav and the board cannot both fit and showing the nav would hide the answer.
 */
function useNav(): [boolean, (next: boolean) => void] {
  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('navOpen');
    if (stored === 'true' || stored === 'false') return stored === 'true';

    return window.innerWidth > 900;
  });

  useEffect(() => {
    localStorage.setItem('navOpen', String(open));
  }, [open]);

  return [open, setOpen];
}
