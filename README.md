# Meeting Dashboard — Frontend

The browser client for dashboard search: pick a processed meeting, ask questions about it in
English, and keep the charts that come back.

It lives inside the backend repo for now so both halves run from one checkout. Nothing here
imports from `../src` — the two talk over HTTP only — so lifting this directory out later is a
move, not a refactor.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

The backend is expected on `http://localhost:3000`; `/api` is proxied there, so no CORS and no
configuration for the usual setup. Point it elsewhere with `VITE_PROXY_TARGET`, or serve the
built app from another origin and set `VITE_API_BASE` — the backend's `WEB_ORIGINS` allowlist
has to name that origin.

```bash
npm run build        # typecheck + production bundle into dist/
npm run typecheck
```

## What it does

**ⓘ on a catalogued row** opens what the meeting was about — the catalogue's `description` — with
its id, when it was listed, when it was held once that is known, and where its analytics stand. The
Generate button lives in that panel too, so the decision and the action are in one place rather than
the panel being a detour back to the row. A title like "Meet-2" is not a decision, and a run is
minutes of pipeline and a set of AI calls.

**Anything with a cost asks first.** Generate, Reprocess, Try again and a card's Remove arm on the
first click and act on the second — the label becomes a question, a ✕ appears beside it, Escape
cancels, and an unanswered question disarms itself after five seconds so a stale armed button is
never waiting for a click meant for something else. Two clicks in place rather than a dialog: each
of these belongs to one row or one card, and a modal would take over the page to protect a click.
`window.confirm` was the other option — it blocks the page, can't be themed, and reads as a browser
warning rather than as part of this app.

**Generate** is the main path: the sidebar lists the `meetings` catalogue the recording service
writes, and pressing Generate on a row posts to `/api/v1/meetings/:meetingId/generate`. The client
sends an id and nothing else — where the transcript lives is the catalogue's business. The row moves
to Processing and reports the pipeline's own step messages from there. A meeting that has already
run offers Reprocess instead, and a failed one Try again.

**Add meeting** is the ad-hoc path for a meeting not in the catalogue. It queues a run: `POST /api/v1/buildAnalyticsData` with a meeting id. The pipeline
starts from a reference, not an upload — the transcript already sits where the worker can read
it — so the form asks for the id, which transcript backend to read from, and the signed link
when that backend is `gcs`. It reads the server's configured default from readiness, because
"server default" can itself be `gcs`, and then the link is required even though nothing was
picked. `ALREADY_RUNNING` is reported as itself rather than as success: a repeat request returns
the in-flight job instead of starting a second, and `Reprocess` is the deliberate way to ask for
a fresh run at the next version.

**The sidebar** is one card per meeting in four groups — ready to query, processing, ready to
generate, needs attention — grouped by what can be done with the row rather than by status. Each
group folds by clicking its heading, and what is folded is remembered, so a long list can be kept
down to the part being worked on; a collapsed group still shows the selected meeting, since hiding it
would leave no way to see which meeting the main pane belongs to. Past four meetings a filter appears
above the list, matching on title or id. Processing meetings show the pipeline's own step message and
percentage and are polled every four seconds — thirty when nothing is in flight, and not at all
while the tab is hidden. They are shown disabled rather than hidden, because their progress is
the answer to "why can't I ask about this one yet".

**The URL names the meeting**: `/m/<meetingId>` for its board, `/m/<meetingId>/ask` for the question
view. A reload stays where it was, the back button moves between meetings, and a link to what you are
looking at exists. Auto-selecting the first queryable meeting on an empty URL uses `replaceState`, so
a choice the user did not make never becomes a step back. A URL naming a meeting the list does not
hold says so instead of silently jumping elsewhere.

Written against the History API — two routes do not need a routing library — with one deployment
consequence: **a static host serving the built app must rewrite unknown paths to `index.html`**, or a
reload of `/m/<id>` is a 404 from the server before the app runs. The Vite dev server already does
this.

**Two views per meeting.** *Dashboard* is the saved board — every chart the meeting's questions
have produced, arranged. *Ask* is this session's questions in full: the answer in prose, its charts,
the quotes behind them, the caveats, and — folded away — the plan and the SQL that produced them.

Charts are saved by the API as it answers, not by a pin button, so a board survives a reload and
returning to a meeting shows what has already been asked. Re-asking the same question replaces that
question's charts rather than adding a second copy.

The header is one sticky row — the meeting's name, its type as a chip, the date and duration, and the
two tabs right-aligned with their underline landing on the header's own rule. 62px, so a long board
can be scrolled without losing track of what is being looked at, and without a stacked eyebrow,
heading and meta line spending a third of the fold to say three short things.

**Every card can show its whole answer.** ⓘ folds the question, the prose answer, the verbatim
quotes and the caveats out below the chart; ⤢ opens the chart at full size with the same material
beside it — which is where a table or a dense bar chart is actually read, since a card at a third of
a row is a thumbnail. Both read the saved row, so nothing is re-fetched and nothing about an answer
is lost by putting its chart on a board.

**The grid** is twelve columns. Drag a card's handle to reorder it, or focus the handle and use ←/→;
pick ⅓, ½ or full width per card. Every change is applied on screen first and written back as a
whole arrangement — a drag renumbers a card's neighbours, so sending one card's new index would
leave the board briefly holding two cards at the same place. A failed write says so and reloads the
board rather than leaving a local fiction on screen. `Remove` drops a card from the board for good;
below 900px every card goes full width, because a third of a phone is 100px of plot.

## Where the charts come from


The frontend chooses nothing about a chart. `POST /api/v1/query/:meetId` returns a dashboard
spec — chart type, data rows, series keys, axis labels, number formats — composed by the chart
agent from the rows the query returned (`AGENTS.md` → `chartComposer`). This app renders that
spec and formats its values. Deciding that a duration is a duration happens on the server, where
the column name is known.

When `dashboard` is null — the chart agent is unconfigured, or returned something unusable — the
bundle's result sets are rendered as tables instead, and the reason is shown. The query still
ran, so its rows are still the answer.

## Chart conventions, and why they are not negotiable

The palette is eight hues in a fixed order, validated so that adjacent pairs stay
distinguishable under the common colour-vision deficiencies in both light and dark mode. Series
take slots by position and never by rank, so filtering never repaints a series someone has
already learned. There is no ninth slot: a generated hue is indistinguishable from an existing
one, so a pie folds its tail into "Other" instead.

Every chart can be switched to a table. That is the accessibility floor — and it is also what
makes the lighter palette slots legal on the light surface, where three of them fall below 3:1
contrast.

The rest is one rule repeated: thin marks, hairline gridlines on the value axis only, no dashes,
axis labels on muted ink, legends only when there are two or more series, and numbers in the
tooltip put through the same formatter as the axis. Most of the chart code is turning a Recharts
default off.

## Layout

```
src/
  lib/          api client, formatters, palette, the two state hooks
  components/   sidebar, ask box, answer card, chart card
  components/charts/   one file per form: category (bar/line/area), pie, stat, table
  types.ts      the API's shapes, mirrored by hand
  theme.css     design tokens — every colour in the app is one of these
  app.css       layout and components
```
