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

## Second pass (same day)

After review the user pushed back on three things; all landed:

### Timeline — rewritten
The collision-pack + label-dedup pass wasn't enough. Replaced the per-node-dot layout with a **bucket-first** renderer:

- Per lane × year-bucket (size adapts with zoom: 10 yr at <0.9×, 5 yr at 1×, 2 yr at 1.6×, 1 yr at 3×+), render one tile with `×N` count + glyph.
- Single-item buckets still render as a small square (so lanes with few events don't look heavier than they are).
- Click a multi-item bucket → popover (chronologically sorted list with date + label). Picking a row selects it in EntityDetail.
- `JUMP · 1950s … 2020s` decade chips scroll the view container.
- The previous density-`×N` chip is now the primary visual, not an overlay.

### Light mode
New `.nhi-theme-light` class on `<html>` overrides design tokens (`--nhi-ink*`, `--nhi-bone`, `--nhi-fog*`, `--nhi-hairline*`, accents). Body background now reads from `var(--nhi-ink)` so the theme swap sticks. Topbar gets a ☀/☾ button to toggle; preference persists to `localStorage`.

Known gap: many components still use hardcoded `rgba(14,20,36,…)` backgrounds, which look muddy on a light ground. Passed over LandingHub (stat chips, perspective cards); the rest is a known rough edge — see "Light mode v1 scope" below.

### LandingHub
`maxWidth` 980 → 1400; perspective grid `minmax(260px,1fr)` → `minmax(300px,1fr)` with 14px gap. At 1440px viewport this gives exactly 4 columns. Below ~1280 it flows down to 3, then 2, then 1.

## Light mode v1 scope

Token-responsive: Topbar, LandingHub, Timeline, EntityDetail top bar, Map legend.

Still hardcoded dark — will look muddy in light mode until tokenised:
- `SceneCanvas` overlay gradient + community halos
- `RadialFocus` focus-glow gradient + NodeBubble backgrounds (`rgba(20,26,46,…)`)
- EntityDetail body panels
- Scene Explorer header bar backgrounds
- TimelineView bucket tile backgrounds (mostly tokenised, a couple still `rgba(20,26,46,0.62)` — fine against grey-ish light ink-2 but not ideal)

Acceptable as v1 — theme toggle works, obvious views are readable, no infinite-yak-shave before ship.

## Next chapter — onboarding layer

User pointed at `docs/NHI_Archive_Onboarding_Design.md` (NHI-ARCH-ONB-001, v1.0). Read end-to-end. It's a complete spec for a parallel narrative-first entry point.

Key constraints for implementation:

- **Routes.** `/` = onboarding long-scroll, `/archive` = existing expert view. Landing logic uses `localStorage['nhi_onboarding_complete']` / `nhi_preferred_view`. Header pill toggle persists choice.
- **Five acts, single scroll.** Hook (July 2023 Grusch hearing) → Reframe (stigma trace 1969→2017) → Evidence (3 tiers: Documented / Sworn / Claimed) → Cast (6 named witnesses, institutional) → Handoff (3 doorways: timeline, graph, map).
- **Deep-link contract to expert view.** `?seed=<node_id>` / `?filter=<tier>` / `?era=<YYYY>` / `?tutorial=on`. Tutorial overlay only on first arrival, gated by `localStorage['nhi_tutorial_seen']`.
- **Content in static JSON**, not hardcoded JSX. `content/onboarding.ts` with an `OnboardingStep[]` shape. Keeps copy iteration and future i18n cheap.
- **Phased build (3× ~1 week each).** Phase 1 ships static MVP (5-step flow, real copy, placeholder portraits, only Step 5 doorways wired); Phase 2 wires deep-links + tutorial + real witness cards; Phase 3 adds motion/progress rail.
- **Ship-early rule explicit in the doc.** Static MVP is 80% of the value — do not block it on polish.

Tech-fit notes against current repo:
- Doc suggests Next.js App Router. Current stack is Vite + React + GH Pages static deploy. Recommend **keep Vite** and add `/` as a new scene within the existing SPA (react-router or a simple route guard); avoid Next.js migration for a single narrative page. Revisit only if SSR/SEO becomes a requirement.
- Design tokens (`--nhi-ink`, `--nhi-bone`, `--nhi-sky`, …) already match the doc's "classified intelligence terminal meets deep-space observatory" aesthetic — the components in §8 can be built on the existing system directly without a second CSS layer.
- Analytics is called out (Plausible/PostHog) — not currently wired. Leave for Phase 3.
- Performance budget 120KB gz for onboarding JS is easily met if we share the existing React + tokens runtime and keep the onboarding page free of `react-force-graph-2d` / Leaflet / `supercluster` imports.

Suggested Phase 1 slicing for next session:
1. Add a top-level route switcher (`/` vs `/archive`) without ripping out current `App.tsx`
2. Build `OnboardingPage` + the 5 Act components from §6 with real copy from §9
3. Wire Step 5 doorways to `/archive?view=…`
4. Header pill toggle + localStorage gate
5. Skip portraits, deep-link seeds, tutorial overlay — those land in Phase 2

## Standing rough edges (not blocking)

- Mobile QA pass — touch targets in RadialFocus, Topbar cramping, EntityDetail drawer on narrow viewports, Timeline bucket tiles below 44px on small lanes.
- CommandPalette "no match" state is currently silent.
- Hynek map legend hover-titles don't surface on mobile (no hover). Tap-to-reveal still owed.
- Light-mode hardcoded-rgba cleanup (see "Light mode v1 scope" above).
