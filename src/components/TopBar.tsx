import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { isInFlight } from '../lib/useMeetings';
import { formatMeetingDate } from '../lib/format';
import type { MeetingCard } from '../types';

const RESULT_LIMIT = 8;

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

  results: MeetingCard[];
  onPick: (meeting: MeetingCard) => void;

  onHome: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh: () => void;
  refreshing: boolean;

  initial: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const shown = results.slice(0, RESULT_LIMIT);
  const showing = open && filter.trim().length > 0;

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

              if (event.key === 'Escape') setOpen(false);

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

function glyph(meeting: MeetingCard): { icon: IconName; tone: string } {
  if (isInFlight(meeting)) return { icon: 'pending', tone: 'warning' };
  if (meeting.status === 'FAILED') return { icon: 'error', tone: 'critical' };
  if (meeting.status === 'PARTIAL') return { icon: 'warning', tone: 'warning' };
  if (meeting.status === 'COMPLETED') return { icon: 'check', tone: 'good' };

  return { icon: 'circle', tone: 'muted' };
}

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

      aria-label={copied ? 'Link copied' : 'Copy link to this page'}
      title={copied ? 'Link copied' : 'Copy link to this page'}
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(
          () => setCopied(true),

          () => window.prompt('Copy this link', window.location.href),
        );
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={20} />
    </button>
  );
}
