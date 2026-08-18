import { useEffect, useState } from 'react';
import { AddMeeting } from './components/AddMeeting';
import { AnswerCard } from './components/AnswerCard';
import { AskBox } from './components/AskBox';
import { DashboardGrid } from './components/DashboardGrid';
import { MeetingInfo } from './components/MeetingInfo';
import { MeetingList } from './components/MeetingList';
import { generateMeeting } from './lib/api';
import { useAnswers } from './lib/useAnswers';
import { useDashboard } from './lib/useDashboard';
import { useRoute, type View } from './lib/useRoute';
import { useMeetings } from './lib/useMeetings';
import { formatMeetingDate, formatMinutes } from './lib/format';
import type { MeetingCard } from './types';
import './app.css';

export function App() {
  const { meetings, loading, error, refresh } = useMeetings();
  const { route, go, replace } = useRoute();
  const selectedId = route.meetingId;
  const view = route.view;
  const board = useDashboard(selectedId);
  const { answers, ask, remove } = useAnswers(board.add);
  const [filter, setFilter] = useState('');
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  /** The meeting whose description is open, by id — so polling can refresh what it shows. */
  const [infoId, setInfoId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [theme, setTheme] = useTheme();

  // Land on something askable rather than on an empty pane — but only when the URL names nothing.
  // A URL that names a meeting is a decision already made, by a reload or by whoever sent the link,
  // and overriding it is exactly the behaviour this replaced. `replace`, not `go`: a selection the
  // user did not make should not be a step the back button returns to.
  useEffect(() => {
    if (selectedId) return;

    const first = meetings.find((meeting) => meeting.queryable);
    if (first) replace(first.meetingId, view);
  }, [meetings, selectedId, view, replace]);

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
  const session = answers.filter((answer) => answer.meetingId === selectedId);
  const busy = session.some((answer) => answer.state === 'pending');

  const onSelect = (meeting: MeetingCard) => go(meeting.meetingId, view);
  const setView = (next: View) => go(selectedId, next);

  /** Asking always shows the answer, which lives in the Ask view with its prose and quotes. */
  const onAsk = (question: string) => {
    if (!selected) return;

    go(selected.meetingId, 'ask');
    void ask(selected.meetingId, question);
  };

  /**
   * Press Generate and the row moves to Processing.
   *
   * The pending set is keyed by meeting id rather than being one flag, so generating two meetings
   * at once marks both buttons instead of the last one pressed. The list is refreshed on the way
   * out either way — a failure means the state on screen is no longer trustworthy.
   */
  const onGenerate = async (meeting: MeetingCard, reprocess: boolean) => {
    setGenerating((current) => new Set(current).add(meeting.meetingId));
    setGenerateError(null);

    try {
      await generateMeeting(meeting.meetingId, reprocess);
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__head">
          <h1 className="sidebar__title">Meetings</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>

        {meetings.length > 4 && (
          <div className="sidebar__filter">
            <input
              className="field__input"
              type="search"
              value={filter}
              placeholder="Filter by title or id"
              aria-label="Filter meetings"
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        )}

        <div className="sidebar__scroll">
          <AddMeeting onQueued={() => void refresh()} />

          {loading && <p className="note">Loading meetings…</p>}
          {error && <p className="note note--error">{error}</p>}
          {generateError && <p className="note note--error">{generateError}</p>}
          {!loading && !error && meetings.length === 0 && (
            <p className="note">
              No meetings listed yet. The recording service adds them; you can also start one by
              id above.
            </p>
          )}
          {matches.length === 0 && meetings.length > 0 && (
            <p className="note">Nothing matches “{filter}”.</p>
          )}

          <MeetingList
            meetings={matches}
            selectedId={selectedId}
            generating={generating}
            onSelect={onSelect}
            onGenerate={onGenerate}
            onInfo={(meeting) => setInfoId(meeting.meetingId)}
          />
        </div>
      </aside>

      <main className="main">
        {missing ? (
          <div className="empty">
            <p className="empty__title">That meeting is not here</p>
            <p>
              The link names <code>{selectedId}</code>, which is not in the list — it may have been
              removed, or the id may be wrong.
            </p>
            <p>
              <button type="button" className="chip" onClick={() => go(null)}>
                Back to the list
              </button>
            </p>
          </div>
        ) : !selected ? (
          <div className="empty">
            <p className="empty__title">Pick a processed meeting</p>
            <p>
              Ask a question about it and the answer comes back as charts. Ask another and it is
              added below — the board is what you have asked, in the order you asked it.
            </p>
            <p>
              A meeting has to be processed first. Press Generate on one in the list and it will
              show its progress there.
            </p>
          </div>
        ) : (
          <>
            {/* Sticky, so the meeting being looked at and the two views stay reachable while a
                long board scrolls. One row: the identity on the left, the views on the right — a
                stacked eyebrow, title and meta line cost 110px of every screen to say three things
                that fit on two lines. */}
            <div className="main__sticky">
              <div className="head">
                <div className="head__ident">
                  <h2 className="head__title" title={selected.title}>
                    {selected.title}
                  </h2>
                  <p className="head__meta">
                    {selected.meetingType && (
                      <span className="head__type">{selected.meetingType}</span>
                    )}
                    <span className="head__facts">
                      {[
                        selected.startedAt ? formatMeetingDate(selected.startedAt) : null,
                        formatMinutes(selected.durationSeconds),
                        selected.status === 'PARTIAL' ? 'processed with gaps' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </p>
                </div>

                <div className="tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    className={`tab${view === 'dashboard' ? ' tab--on' : ''}`}
                    aria-selected={view === 'dashboard'}
                    onClick={() => setView('dashboard')}
                  >
                    Dashboard
                    {board.charts.length > 0 && (
                      <span className="tab__count">{board.charts.length}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={`tab${view === 'ask' ? ' tab--on' : ''}`}
                    aria-selected={view === 'ask'}
                    onClick={() => setView('ask')}
                  >
                    Ask
                    {session.length > 0 && <span className="tab__count">{session.length}</span>}
                  </button>
                </div>
              </div>
            </div>

            {board.error && <p className="note note--error">{board.error}</p>}

            {view === 'dashboard' ? (
              <div className="board">
                {board.loading && <p className="note">Loading the board…</p>}

                {!board.loading && board.charts.length === 0 && (
                  <p className="note">
                    Nothing saved yet. Every chart a question produces is kept here — drag the
                    handle to rearrange, and pick a width per card.{' '}
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
                <AskBox meeting={selected} busy={busy} onAsk={onAsk} />

                {session.length === 0 && (
                  <p className="note">
                    Nothing asked this session. Each question is planned into SQL against this
                    meeting's extracted data, run on a read-only connection, and turned into
                    charts — which are saved to the Dashboard as they are made.
                  </p>
                )}

                {session.map((answer) => (
                  <AnswerCard
                    key={answer.id}
                    answer={answer}
                    onAsk={onAsk}
                    onRemove={() => remove(answer.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {info && (
        <MeetingInfo
          meeting={info}
          busy={generating.has(info.meetingId)}
          onGenerate={(meeting, reprocess) => {
            void onGenerate(meeting, reprocess);
            setInfoId(null);
          }}
          onClose={() => setInfoId(null)}
        />
      )}
    </div>
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
