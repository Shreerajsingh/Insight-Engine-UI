import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { isInFlight } from '../lib/useMeetings';
import { formatMeetingDate } from '../lib/format';
import type { MeetingCard } from '../types';

/** How many matches the search offers before it stops listing and says how many it left out. */
const RESULT_LIMIT = 8;

/**
 * The app bar: what the console puts across the top of every page.
 *
 * Three regions, left to right — the wordmark anchors the left, search takes the middle, and the
 * utilities and the avatar close the right.
 *
 * Search both filters the nav and jumps: typing narrows the panel's list, and the panel that drops
 * under the field lists the same matches so a meeting can be picked without looking away from what
 * you just typed. One filter drives both, so there is never a question of which search you are
 * looking at the results of. Picking a result clears the box, because the search was a way to get
 * somewhere rather than a state worth staying in — and leaving it set would keep the nav filtered
 * down to the one meeting you had just finished finding.
 */
export function TopBar({
  filter,
  onFilter,
  results,
  onPick,
  onHome,
  theme,
  onToggleTheme,
  onRefresh,
  refreshing,
  initial,
}: {
  filter: string;
  onFilter: (next: string) => void;
  /** Every meeting matching the filter, already narrowed by the caller. */
  results: MeetingCard[];
  onPick: (meeting: MeetingCard) => void;
  /** The wordmark's destination — the same place the breadcrumb root goes. */
  onHome: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** The avatar's letter. One glyph, because that is all the console shows either. */
  initial: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  /**
   * Whether the results panel is showing.
   *
   * Separate from "is there a filter", because the panel has to be dismissible without clearing
   * what was typed — Escape, or a click elsewhere, should put the panel away and leave the nav
   * filtered by the term that is still in the box.
   */
  const [open, setOpen] = useState(false);

  const shown = results.slice(0, RESULT_LIMIT);
  const showing = open && filter.trim().length > 0;

  // A click outside closes the panel. On `mousedown` rather than `click`, so pressing a result
  // still lands on the result — a `click` listener here would fire first and unmount it.
  useEffect(() => {
    if (!showing) return;

    const onDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showing]);

  const pick = (meeting: MeetingCard) => {
    onPick(meeting);
    onFilter('');
    setOpen(false);
    searchRef.current?.blur();
  };

  // "/" focuses search, which is the console's shortcut and the reason its placeholder says so.
  // Ignored while the caret is already in a field, or the shortcut would type into the thing the
  // user is halfway through filling in.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="topbar">
      {/* A button, not a link: it navigates in-app, and an anchor would put a stray hash on the
          URL that the History-API routing then has to ignore. */}
      <button type="button" className="brand" onClick={onHome} title="Meeting Intelligence">
        <Logo size={30} />
        <span className="brand__word">
          Meeting<span className="brand__word2">Intelligence</span>
        </span>
      </button>

      <div className="omnibox" ref={boxRef}>
        <div className={`omni${showing ? ' omni--open' : ''}`}>
          <Icon name="search" size={20} className="omni__icon" />
          <input
            ref={searchRef}
            className="omni__input"
            type="search"
            value={filter}
            placeholder="Search (/) for meetings by title or id"
            aria-label="Search meetings"
            role="combobox"
            aria-expanded={showing}
            aria-controls="omni-results"
            autoComplete="off"
            onChange={(event) => {
              onFilter(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              // Escape puts the panel away without clearing the term — see `open` above.
              if (event.key === 'Escape') setOpen(false);
              // Enter on a single match goes there, which is what someone who typed an exact id
              // expects rather than having to reach for the mouse to confirm the only answer.
              if (event.key === 'Enter' && shown.length === 1) pick(shown[0]);
            }}
          />
          {filter && (
            <button
              type="button"
              className="iconbutton iconbutton--small"
              aria-label="Clear the search"
              onClick={() => {
                onFilter('');
                setOpen(false);
              }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {showing && (
          <div className="omni__results" id="omni-results" role="listbox">
            {shown.length === 0 ? (
              <p className="omni__none">No meeting matches “{filter.trim()}”.</p>
            ) : (
              shown.map((meeting) => {
                const mark = glyph(meeting);

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="omni__result"
                    key={meeting.meetingId}
                    // A meeting with no analytics cannot be asked about, so picking it would land
                    // on a pane with nothing in it. The row still lists — it is how you learn the
                    // meeting exists — but it says why it is not a destination.
                    disabled={!meeting.queryable}
                    onClick={() => pick(meeting)}
                  >
                    <Icon name={mark.icon} size={18} className={`omni__glyph omni__glyph--${mark.tone}`} />
                    <span className="omni__resulttext">
                      <span className="omni__resulttitle">{meeting.title}</span>
                      <span className="omni__resultmeta">
                        {[
                          meeting.startedAt ? formatMeetingDate(meeting.startedAt) : null,
                          meeting.queryable ? null : 'not processed yet',
                          meeting.meetingId,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                );
              })
            )}

            {/* Never a silent truncation: a list that stops at eight without saying so reads as
                "these are all of them". */}
            {results.length > shown.length && (
              <p className="omni__none">
                {results.length - shown.length} more match — keep typing to narrow it.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="topbar__tools">
        <button
          type="button"
          className={`iconbutton${refreshing ? ' iconbutton--spinning' : ''}`}
          aria-label="Refresh the meeting list"
          title="Refresh"
          onClick={onRefresh}
        >
          <Icon name="refresh" size={20} />
        </button>

        <button
          type="button"
          className="iconbutton"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          onClick={onToggleTheme}
        >
          <Icon name={theme === 'dark' ? 'light' : 'dark'} size={20} />
        </button>


        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
      </div>
    </header>
  );
}

/** Which glyph fronts a result, from the one field that decides it. */
function glyph(meeting: MeetingCard): { icon: IconName; tone: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good' };

  return { icon: 'circle', tone: 'muted' };
}

/**
 * The rail under the bar: where you are, as a path.
 *
 * Every crumb but the last is a link, which is the whole point of the pattern — the console's
 * breadcrumb is how you get back up a level without hunting for a back button. The last one is
 * plain text because it is the page you are on, and a link to here would do nothing.
 */
export function Breadcrumbs({
  trail,
}: {
  trail: { label: string; onClick?: () => void }[];
}) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;

        return (
          <span className="crumbs__item" key={`${crumb.label}-${index}`}>
            {index > 0 && <span className="crumbs__sep">/</span>}
            {crumb.onClick && !last ? (
              <button type="button" className="crumbs__link" onClick={crumb.onClick}>
                {crumb.label}
              </button>
            ) : (
              <span className={last ? 'crumbs__here' : undefined} aria-current={last ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * The copy-the-URL action, which the console offers on every detail page.
 *
 * Icon only. As a labelled text button it was the widest thing in the status band and the loudest
 * thing on the page after the headline — disproportionate for a utility nobody reaches for twice in
 * a session, and it dragged the band's right edge around as the label changed width on success.
 * A round icon button costs one glyph, aligns with the health glyph at the other end of the band,
 * and does not resize when it confirms.
 *
 * It confirms in place rather than with a toast: the feedback belongs where the click landed, and a
 * toast for something this small is a notification about nothing. It reverts on its own, because a
 * button stuck showing a tick has stopped saying anything.
 */
export function CopyUrlButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={`iconbutton${copied ? ' iconbutton--done' : ''}`}
      // The label carries the state, so the confirmation is not colour-and-glyph alone.
      aria-label={copied ? 'Link copied' : 'Copy link to this page'}
      title={copied ? 'Link copied' : 'Copy link to this page'}
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(
          () => setCopied(true),
          // A clipboard write can be refused — an insecure origin, or a denied permission. Saying
          // nothing would look like the click missed.
          () => window.prompt('Copy this link', window.location.href),
        );
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={20} />
    </button>
  );
}
