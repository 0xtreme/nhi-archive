# Session Notes — 2026-04-18

Scene Explorer + timeline + citations pass.

## What landed this session

### UX fixes
- **Brand → home.** `NHI·ARCHIVE` in the Topbar is now a button. Click resets to the graph hub scene and clears selection.
- **Search → graph scene.** Picking a result in Topbar search or CommandPalette now switches to the Graph view and opens an ego scene seeded on that node, instead of only sliding the EntityDetail drawer open.
- **RadialFocus drag + reset.** Ring-1 and ring-2 nodes are draggable (pointer events with a 4px click-vs-drag threshold). Moved nodes persist via `overrides` Map; a `↺ RESET LAYOUT · N MOVED` button appears bottom-right when any node has been moved. Refocus clears overrides. Focus node stays click-only.
- **Hynek map legend.** Panel now shows code + short label ("NL · Nocturnal light") with the long definition ("Anomalous light in the night sky") as a hover title. Panel header changed to `HYNEK SCALE`.
- **Timeline dots + labels.** Base dot size 12→14, hover/selected 16→20. Added a per-lane greedy collision pass for `labelMode='all'` so ambient labels no longer stack on top of each other; hover/selected/related labels always win. Density `×N` chips still appear at low zoom.

### EntityDetail — 98-citations-at-0:00 fix
Hub entities (Jesse Michels, government, etc.) were showing one "Mentioned throughout the video" citation per video at t=0, producing a wall of 98 identical-looking chips.

New grouping model in `EntityDetail.tsx`:
- `videoGroups`: per video, `substantive` (real timestamped quotes) + `mentions` (t=0 generic placeholders).
- `isGenericQuote(q)` detects the placeholder-shape quotes.
- Header chips replaced: `QUOTES · N` (substantive count) and `APPEARS IN · N VIDEOS`. Old `CITATIONS · N` gone.
- Videos with only mentions render a `MENTIONED` label pointing to `https://www.youtube.com/watch?v=${videoKey}` (no timestamp). Videos with substantive quotes keep the per-timestamp button list.
- Section header: `SOURCES · BY VIDEO` (was `QUOTE SOURCES · GROUPED BY VIDEO`).

## Architecture state

No structural changes this session — all edits were in `src/components-new/` and `src/App.tsx`. The static-first deploy path (chunked graph + MiniSearch + static API overlay via `/api/healthz` probe) set up in commit `31d42e1` is still the shape.

Scene Explorer defaults to Radial Focus (commit `374b02d`). Toggle to Constellation (force-directed) is still there. Drag overrides are a Radial-Focus-only feature.

## Known issues / rough edges

- **Timeline zoom state not URL-synced.** Refresh resets zoom and lane filters. Fine for now.
- **RadialFocus dragged positions don't persist across refocus.** Intentional — the ring positions are meaningless after the focal node changes — but if a user does a lot of manual layout work and then accidentally clicks a neighbor to refocus, they lose it. Could add a "stick overrides across refocus" toggle if it becomes a complaint.
- **Drag-from-ring2 is small on mobile.** 22px touch target is below the 44px iOS guideline. Fine for desktop; flag for mobile QA pass.
- **Ambient label collision pass uses `lane` as the only y key.** Nodes packed high-vs-low within the same lane can still overlap labels if their `y` difference is <16px. In practice the collision packer keeps them further apart, but a stricter pass would compare against exact y.

## Pending / next session

- Mobile QA pass — touch targets, Topbar cramping, EntityDetail drawer on narrow viewports.
- Timeline: should the `×N` density chip be clickable (open a mini popover listing the bucket's nodes)? Right now it's decorative.
- Search result count / "no match" state in CommandPalette. Currently silent on empty.
- Consider surfacing `HYNEK SCALE` hovers on mobile (no hover). Tap-to-reveal would match how other legend panels behave.
- GitHub Pages verification after this commit — hit the deployed URL, walk through: brand click → search pick → radial drag → timeline ambient labels → entity drawer on a hub node.
