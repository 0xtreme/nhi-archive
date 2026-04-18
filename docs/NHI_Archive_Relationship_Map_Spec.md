# NHI Archive — Relationship Map View

**Design Document · v1.0 · April 2026**

| | |
|---|---|
| **Doc ID** | `NHI-ARCH-RELMAP-001` |
| **Owner** | Praveen |
| **Project** | nhi-archive |
| **Layer** | Expert View — 4th tab |
| **Status** | Ready for build |
| **Related** | `NHI-ARCH-ONB-001` (Onboarding Layer) |
| **Repo** | `0xtreme/nhi-archive` |

---

## Abstract

Add a fourth view to the existing Archive Expert View, alongside Graph / Map / Timeline. The **Relationship Map** is a hand-composed, editorial portrait network — the "investigative journalism wall" version of the data. Named figures (Grusch, Fravor, Elizondo, Mellon, etc.) rendered as portrait cards, connected by coloured lines that encode the *type* of relationship.

**Why this view exists.** The existing Graph is abstract dots-and-lines optimised for thousands of nodes. Newcomers and editorial readers need the *human* version — faces, titles, one-line context, clearly typed relationships. The Relationship Map answers "*who are these people and how do they connect*" in a single glance. Graph answers "*what's in this dataset*."

**Out of scope for v1.** Editing the map in-browser. Uploading new portraits. Fullscreen presentation mode. Mobile drag-to-rearrange. These are all viable v2 items — keep the data model clean enough to absorb them later.

---

## Table of Contents

1. [What We're Building](#1-what-were-building)
2. [Where It Lives In The Product](#2-where-it-lives-in-the-product)
3. [Library & Stack](#3-library--stack)
4. [Data Model](#4-data-model)
5. [Node Design — The Portrait Card](#5-node-design--the-portrait-card)
6. [Edge Design — The Relationship Lines](#6-edge-design--the-relationship-lines)
7. [Layout — Hand-Placed Coordinates](#7-layout--hand-placed-coordinates)
8. [Interactions](#8-interactions)
9. [Legend, Filters & Controls](#9-legend-filters--controls)
10. [Accessibility & Performance](#10-accessibility--performance)
11. [v1 Node Roster — What To Seed](#11-v1-node-roster--what-to-seed)
12. [Build Plan & Acceptance Criteria](#12-build-plan--acceptance-criteria)
13. [Open Questions](#13-open-questions)

---

## 1. What We're Building

A new route `/archive?view=network` (or equivalent — see §2) that renders a fixed, hand-laid-out portrait network of the most important named figures in the UAP/NHI field. The user can pan, zoom, hover nodes for detail, click nodes to open the Archive's person page, filter by relationship type, and export the current view as PNG.

**Key visual references for the developer:**
- **Paul Butler's "Facebook friendship map"** (2010) — tone of layered line density.
- **ProPublica's Epstein network visualizations** — portrait nodes, typed edges, editorial layout.
- **Kumu.io published maps** (e.g. Les Misérables example at embed.kumu.io) — the interactive feel we want.
- **Panama Papers / OCCRP relationship maps** — density of information per node without clutter.

This is **not** a force-directed blob. Nodes have fixed x/y coordinates authored by hand. The composition is the craft — like a magazine spread, not an auto-generated graph.

---

## 2. Where It Lives In The Product

The Relationship Map is a **4th view tab inside the existing Archive Expert View**, alongside Graph, Map, and Timeline.

### Header / view toggle

```
[ Graph ]  [ Map ]  [ Timeline ]  [ Network ]  ← new tab
```

- All four tabs share the same header, search, and filter state where applicable.
- Selected tab persists to `localStorage` as `nhi_archive_view=network`.
- Deep-linkable: `/archive?view=network` loads directly to this tab.

### Entry points from elsewhere

| From | How |
|---|---|
| Onboarding Step 4 (The Cast) handoff card | `→ /archive?view=network` — arrives on this tab with the tutorial overlay enabled |
| Timeline view, clicking a person | Opens that person's detail; "See in Network" link inside jumps to Network view, zoomed to that node |
| Graph view, clicking a person node | Same — cross-view jump preserved |
| Direct link / share | `/archive?view=network&focus=grusch_2023` zooms and highlights a specific node |

### Routing contract

| Query param | Effect |
|---|---|
| `?view=network` | Select the Network tab |
| `?focus=[node_id]` | Pan/zoom to that node on load, flash its glow briefly |
| `?filter=[edge_type]` | Pre-apply an edge-type filter (e.g. `?filter=testified_together`) |
| `?tutorial=on` | Show the first-arrival tutorial overlay (same pattern as the other views) |

---

## 3. Library & Stack

### Primary library: **React Flow** (`@xyflow/react`)

MIT-licensed. Node components are plain React — full control over the portrait card markup and styling. Pan, zoom, minimap, selection, and edge rendering all come free.

**Required install:**

```bash
pnpm add @xyflow/react
# (no additional layout library needed — positions are hand-authored)
```

**Why React Flow specifically and not the existing Sigma.js:**
- Sigma.js is WebGL, optimised for thousands of nodes. React Flow is DOM/SVG, optimised for dozens of highly-customised nodes. Different tools, different jobs.
- Portrait cards with Tailwind, hover states, and HTML tooltips are native React — trying to render custom HTML per node in Sigma is possible but painful.
- Future features (inline editing, rich card content, embedded video, etc.) stay cheap.

**Do not bring in:**
- `dagre`, `elkjs`, or any auto-layout library. Positions are hand-authored. Keep the bundle lean.
- A graph analysis library (Cytoscape, graphology). This view is presentational — analysis lives in the existing Graph view.

### Supporting dependencies

| Purpose | Library |
|---|---|
| Styling | Tailwind + existing CSS variables from `NHI-ARCH-ONB-001` §8 |
| PNG export | `html-to-image` — one function call, works with React Flow |
| Portrait storage | Static images in `/public/portraits/[node_id].webp` (see §5 for specs) |

---

## 4. Data Model

The Relationship Map reads from two JSON files checked into the repo. Keep them separate from the main Graph's data — this view is curated and editorial, not a reflection of every node in the Archive.

### `data/network/nodes.json`

```ts
export type NetworkNode = {
  id: string;              // stable slug, matches Archive person node id
  name: string;            // display name, e.g. "David Grusch"
  role: string;            // one-line title, e.g. "Former NRO representative to UAP Task Force"
  tier: 'witness' | 'official' | 'advocate' | 'institution';
  portrait: string;        // path relative to /public, e.g. "/portraits/grusch_2023.webp"
  position: { x: number; y: number };  // hand-authored, pixel coordinates
  archiveNodeId: string;   // id of corresponding node in the main Graph
  hoverSummary?: string;   // 1-2 sentence summary shown on hover
  tags?: string[];         // e.g. ["navy", "pilot", "2023_hearing"]
};
```

**Example record:**

```json
{
  "id": "grusch_2023",
  "name": "David Grusch",
  "role": "Fmr. NRO rep. to UAP Task Force",
  "tier": "witness",
  "portrait": "/portraits/grusch_2023.webp",
  "position": { "x": 320, "y": 280 },
  "archiveNodeId": "person_grusch_david",
  "hoverSummary": "Testified under oath to House Oversight, July 2023. Claims knowledge of non-human craft and biologics programs.",
  "tags": ["intelligence", "2023_hearing", "whistleblower"]
}
```

### `data/network/edges.json`

```ts
export type NetworkEdge = {
  id: string;              // e.g. "e_grusch_fravor_2023"
  source: string;          // node id
  target: string;          // node id
  type: EdgeType;          // see §6
  label?: string;          // optional, shown on hover only
  year?: number;           // for time-filtering in v2
};

export type EdgeType =
  | 'testified_together'
  | 'same_program'
  | 'advised_advocated'
  | 'contradicted'
  | 'succeeded_in_role';
```

**Example record:**

```json
{
  "id": "e_grusch_fravor_2023",
  "source": "grusch_2023",
  "target": "fravor_nimitz",
  "type": "testified_together",
  "label": "House Oversight, Jul 26 2023",
  "year": 2023
}
```

### Why this shape

- **Separation from the main graph** — the Archive's graph may have thousands of nodes. This view shows maybe 25. Keep the curation deliberate.
- **`archiveNodeId` link** — every portrait card is a doorway into the broader Archive. Clicking a node opens the full person page in `/person/[id]`.
- **`position` is authoritative** — no auto-layout ever runs. The dev commits positions to JSON; the file is the source of truth.
- **`EdgeType` is a closed union** — five types max, deliberately. If the type space grows unchecked, the legend becomes unreadable.

---

## 5. Node Design — The Portrait Card

Each node is a custom React Flow node component: `<PortraitNode />`.

### Visual structure

```
┌──────────────────────────────┐
│                              │
│        ◯  (portrait)         │  ← circular crop, 64px
│                              │
│       David Grusch           │  ← 14px medium
│    Fmr. NRO rep., UAPTF      │  ← 11px muted
│                              │
└──────────────────────────────┘
```

- **Card width:** 160px fixed
- **Card height:** varies (roughly 120–140px) — do not set a fixed height; let content size it
- **Portrait:** circular, 64px diameter, centred. Use `border-radius: 50%` + `object-fit: cover`.
- **Card background:** `var(--bg-panel)` (existing token)
- **Border:** 1px solid, colour tied to `tier`:
  - `witness` → `--accent-cyan` (#22d3ee)
  - `official` → `--hilite-amber` (#fbbf24)
  - `advocate` → `--signal-green` (#34d399)
  - `institution` → `--ink-muted` (#9ca3af, thicker 1.5px)
- **Border radius:** `var(--border-radius-lg)` (12px)
- **Padding:** 12px all round

### Portrait assets

- **Format:** `.webp` with `.jpg` fallback
- **Source dimensions:** 256×256px square, centre-cropped to face
- **Served dimensions:** 128×128px (2× for retina, displayed at 64px)
- **Storage:** `/public/portraits/[node_id].webp`
- **Fallback:** if the portrait is missing, show a monogram — initials in the tier colour on panel background, same circular shape. This must not break the layout.
- **Licensing note for v1:** use AI-generated or properly licensed illustrated portraits. Do not scrape press agency photos. See §13.

### States

| State | Visual |
|---|---|
| Default | As described above |
| Hover | Border brightens, subtle scale to 1.02, shadow `0 4px 12px rgba(34,211,238,0.15)` |
| Focused (via `?focus=[id]`) | 2s glow animation on mount, then settles to default |
| Dimmed (when a filter excludes this node) | Opacity 0.25, pointer-events: none |
| Selected | Border 2px, accent-cyan regardless of tier |

### Component sketch

```tsx
// src/views/network/PortraitNode.tsx
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { NetworkNode } from '@/data/network/types';

const TIER_BORDER: Record<NetworkNode['tier'], string> = {
  witness: 'border-[var(--accent-cyan)]',
  official: 'border-[var(--hilite-amber)]',
  advocate: 'border-[var(--signal-green)]',
  institution: 'border-[var(--ink-muted)] border-[1.5px]',
};

export function PortraitNode({ data }: NodeProps<NetworkNode>) {
  return (
    <div
      className={`
        w-40 rounded-xl border bg-[var(--bg-panel)] p-3
        text-center transition-transform hover:scale-[1.02]
        ${TIER_BORDER[data.tier]}
      `}
      role="button"
      aria-label={`${data.name}, ${data.role}`}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <img
        src={data.portrait}
        alt={data.name}
        width={64}
        height={64}
        loading="lazy"
        className="mx-auto rounded-full object-cover"
        onError={(e) => {
          // fall back to monogram — replace with a <Monogram /> component
          e.currentTarget.replaceWith(/* monogram element */);
        }}
      />

      <div className="mt-2 text-sm font-medium text-[var(--ink-primary)]">
        {data.name}
      </div>
      <div className="text-xs text-[var(--ink-muted)] leading-tight">
        {data.role}
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
```

**Critical note on handles.** React Flow requires a `<Handle>` on every node to anchor edges. Keep them visually invisible (`opacity: 0`) but functionally present. We're not drawing handshake-style UX for connecting nodes — the user never creates edges. Handles are structural only.

---

## 6. Edge Design — The Relationship Lines

The coloured lines are the whole point of this view. They encode the *type* of relationship, and they do it clearly enough that a user can glance at the map and understand the structure without reading anything.

### The five edge types

| Type | Colour | Style | Meaning |
|---|---|---|---|
| `testified_together` | `#E24B4A` (red) | Solid, 2px | Witnesses who appeared at the same sworn testimony |
| `same_program` | `#185FA5` (blue) | Solid, 2px | Worked within the same official program (AATIP, AARO, UAPTF) |
| `advised_advocated` | `#BA7517` (amber) | Dashed `4 3`, 1.8px | Advisory, advocacy, or media relationship — no shared employment |
| `contradicted` | `#6B7280` (grey) | Solid, 1.5px | Publicly disputed the other party's account |
| `succeeded_in_role` | `#34D399` (teal) | Dotted, 1.5px | Held the same institutional role at different times |

**Rules on edge types:**
- **Colour is for type, never for strength.** Don't introduce a "strong vs weak" encoding — it's ambiguous and makes the map feel opinionated.
- **Five types, hard cap.** If a new relationship appears, map it to the closest existing type. Expanding past five breaks the legend.
- **No edge labels on the canvas.** Labels go in the hover popover. Floating text on lines is the fastest way to make this look amateur.
- **Bezier curves, not straight lines.** Straight lines clip into node cards. Use React Flow's `default` edge type (`bezier`) or `smoothstep`.

### Custom edge component

React Flow supports edge type registration. Define one custom edge per type (or one generic edge that branches on `data.type`). The latter is cleaner:

```tsx
// src/views/network/TypedEdge.tsx
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

const STYLES: Record<string, { stroke: string; dash: string; width: number }> = {
  testified_together: { stroke: '#E24B4A', dash: '0',    width: 2 },
  same_program:       { stroke: '#185FA5', dash: '0',    width: 2 },
  advised_advocated:  { stroke: '#BA7517', dash: '4 3',  width: 1.8 },
  contradicted:       { stroke: '#6B7280', dash: '0',    width: 1.5 },
  succeeded_in_role:  { stroke: '#34D399', dash: '2 4',  width: 1.5 },
};

export function TypedEdge(props: EdgeProps) {
  const [path] = getBezierPath(props);
  const style = STYLES[props.data?.type ?? 'same_program'];
  return (
    <BaseEdge
      id={props.id}
      path={path}
      style={{
        stroke: style.stroke,
        strokeWidth: style.width,
        strokeDasharray: style.dash,
        opacity: 0.85,
      }}
    />
  );
}
```

### Edge hover behaviour

- Hovering any edge: stroke width +0.5px, opacity 1.0, other edges dim to 0.25.
- A small tooltip appears near the cursor showing `edge.label || edgeType` and `edge.year`.
- Hover has a 150ms delay — don't trigger on accidental mouse travel.

---

## 7. Layout — Hand-Placed Coordinates

This is the part most developers want to automate. **Resist that instinct.** The editorial quality of this view is entirely in the composition. An auto-layout will produce a diagram that looks like every other network on the internet.

### How positions are authored

- Positions are pixels on a virtual canvas, typed as `{ x: number; y: number }` per node.
- The canvas is conceptually ~1600×1200 — big enough for 25 nodes to breathe, small enough to fit on a laptop without excessive panning.
- Positions are committed to `data/network/nodes.json`. That file is the source of truth.
- Changes are made by editing JSON directly, re-saving, and reloading. There is no in-app editor in v1.

### Compositional rules for whoever authors the positions

1. **Tier clustering.** Institutions top-left, witnesses centre, officials upper-right, advocates bottom-centre. The reader's eye should traverse a clear spatial logic.
2. **Key figures at the optical centre.** Grusch, Fravor, Elizondo are the emotional core. They go roughly in the middle.
3. **Minimum 160px between any two nodes' centres.** Cards are 160px wide — less gap and they collide visually.
4. **Edge crossings are unavoidable — minimise, don't eliminate.** A few crossings signal density; many signal chaos.
5. **Preserve vertical rhythm.** Nodes roughly aligned to an 80px vertical grid read as composed.

### Zoom / pan defaults

- **Initial zoom:** `fitView` with `padding: 0.2` so the full network fits on-screen on load.
- **Zoom range:** `minZoom: 0.4`, `maxZoom: 2.0`. Beyond 2x the portraits pixelate; below 0.4x the cards become unreadable.
- **Pan bounds:** loose — 400px beyond any node. Prevents infinite scroll into empty space.

### `<ReactFlow />` configuration

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={{ portrait: PortraitNode }}
  edgeTypes={{ typed: TypedEdge }}
  fitView
  fitViewOptions={{ padding: 0.2 }}
  minZoom={0.4}
  maxZoom={2.0}
  nodesDraggable={false}    // editorial layout — users must not move nodes
  nodesConnectable={false}  // no edge creation from the UI
  elementsSelectable={true}
  proOptions={{ hideAttribution: true }}  // only if using React Flow Pro
>
  <Background gap={24} color="var(--grid-line)" />
  <Controls showInteractive={false} />
  <MiniMap pannable zoomable nodeColor={(n) => tierColor(n.data.tier)} />
</ReactFlow>
```

**`nodesDraggable={false}` is load-bearing.** Users dragging nodes breaks the editorial composition. If a user wants to reposition — they don't; we do.

---

## 8. Interactions

| Action | Result |
|---|---|
| **Click a node** | Opens a side panel (see below) with the person's full detail. URL updates to `?focus=[id]`. |
| **Double-click a node** | Opens the corresponding Archive person page (`/person/[id]`) in the same tab. |
| **Hover a node** | Small tooltip appears near cursor showing `hoverSummary`. 300ms delay. |
| **Click background** | Deselects, closes side panel, URL `focus` param cleared. |
| **Hover an edge** | Highlights edge, dims others to 0.25 opacity, shows edge tooltip with `label` + `year`. |
| **Pan (drag background)** | Standard React Flow pan. |
| **Zoom (wheel / pinch)** | Standard React Flow zoom, clamped to `minZoom`/`maxZoom`. |
| **Cmd/Ctrl+F** | Focuses the search input (see §9). |
| **Esc** | Clears selection, closes side panel. |

### The side panel (right-docked)

When a node is clicked, a 360px-wide panel slides in from the right:

```
┌──────────────────────────┐
│  [ portrait 120px ]  [x] │
│                          │
│  David Grusch            │
│  Fmr. NRO rep., UAPTF    │
│                          │
│  ─── Summary ───         │
│  Two-paragraph bio...    │
│                          │
│  ─── Connections ───     │
│  • Testified with Fravor │
│  • Testified with Graves │
│  • Former colleague of…  │
│                          │
│  [ Open full profile → ] │
└──────────────────────────┘
```

- Panel content is rendered from the same data that powers the Archive's `/person/[id]` page — no duplication.
- Panel does not block interaction with the map. Map remains pannable/zoomable while open.
- Closing: click the ×, click the background, or press Esc.

---

## 9. Legend, Filters & Controls

### Always-visible legend (top-left overlay)

```
─── Relationships ───
━━━ Testified together
━━━ Same program
- - - Advised / advocated
━━━ Contradicted
· · · Succeeded in role
```

- Legend is a floating panel, `position: absolute; top: 16px; left: 16px`.
- Background: `var(--bg-panel)` with 12px padding, border-radius 12px.
- Legend items are **clickable** — clicking one filters the map to only that edge type (toggle on/off). Active filters highlight the legend item.
- Max 4 filters active at once (i.e. at most one deactivated). If the user tries to deactivate all, show a toast: "At least one relationship type must be active."

### Search (top-right overlay)

- Simple text input, placeholder "Find a person…"
- Matches against `name`, `role`, and `tags`.
- On match, pan/zoom to the node and briefly glow it (same effect as `?focus=[id]`).
- Keyboard: Cmd/Ctrl+F focuses the input.

### Export controls (bottom-right overlay)

- `[ Export PNG ]` — captures current viewport, downloads via `html-to-image`.
- `[ Reset view ]` — returns to initial `fitView` zoom and position.
- `[ ? ]` — opens the tutorial overlay.

### Tutorial overlay (first arrival)

Triggered by `?tutorial=on` or by clicking the `[?]` button. Same pattern as the other Archive views — four sequential tooltips:

1. "Every card is a person or institution. Click for detail."
2. "Lines show how they're connected. Each colour is a different type of relationship."
3. "Click the legend to filter. Search to find someone specific."
4. "Double-click any card to open the full profile."

Dismissal writes `localStorage` flag `nhi_network_tutorial_seen=true`.

---

## 10. Accessibility & Performance

### Accessibility

- **Every node has `role="button"` and `aria-label="[name], [role]"`.** Screen readers announce the person before their title.
- **Keyboard navigation:** Tab cycles nodes in DOM order (which = JSON file order — keep this sorted logically). Enter = open side panel. Shift+Enter = open full profile.
- **Focus ring:** 2px cyan outline, offset 2px. Never remove the native focus outline without replacing it.
- **Legend and controls are keyboard-navigable.** Tab-stops in a sensible order.
- **`prefers-reduced-motion`:** disables all scale/glow/slide animations. Side panel appears instantly. Edge hover still dims others (that's information, not decoration).
- **Colour is not the only cue.** Edge style (solid / dashed / dotted) duplicates the colour signal. A colour-blind user can still tell edge types apart.

### Performance

| Target | Value |
|---|---|
| Initial render with 25 nodes and 40 edges | < 300ms after tab switch |
| Pan/zoom frame rate | Locked 60fps |
| Total view bundle (lazy-loaded) | < 180KB gzipped (React Flow is ~120KB of that) |
| Image weight per portrait | < 20KB WebP |
| Total portrait payload (25 nodes) | < 500KB |

**Lazy-load the view.** The Relationship Map should not be in the main Archive bundle. Use a dynamic import so the React Flow library + portrait images only load when the user switches to this tab:

```tsx
const NetworkView = dynamic(() => import('@/views/network/NetworkView'), {
  loading: () => <LoadingShell />,
  ssr: false,
});
```

---

## 11. v1 Node Roster — What To Seed

Ship the first version with these 18 nodes. This is the right density — enough to feel substantive, sparse enough to read clearly. Additions come in v1.1.

### Witnesses (tier: `witness`) — 6 nodes

| id | Name | Role |
|---|---|---|
| `grusch_2023` | David Grusch | Fmr. NRO rep., UAP Task Force |
| `fravor_nimitz` | Cmdr. David Fravor | U.S. Navy (Ret.), Nimitz incident |
| `graves_fa18` | Lt. Ryan Graves | Fmr. F/A-18 pilot |
| `elizondo_aatip` | Luis Elizondo | Fmr. AATIP director |
| `gallaudet_navy` | R. Adm. Tim Gallaudet | Fmr. Oceanographer of the Navy |
| `mellon_osd` | Chris Mellon | Fmr. Deputy Asst. Sec. of Defense |

### Officials (tier: `official`) — 4 nodes

| id | Name | Role |
|---|---|---|
| `kirkpatrick_aaro` | Sean Kirkpatrick | Fmr. director, AARO |
| `moultrie_dod` | Ronald Moultrie | Fmr. Under Sec. of Defense for Intelligence |
| `bray_navy` | Scott Bray | Fmr. Deputy Dir., Naval Intelligence |
| `hegseth_dod` | Pete Hegseth | Secretary of Defense (current) |

### Advocates / Politicians (tier: `advocate`) — 4 nodes

| id | Name | Role |
|---|---|---|
| `luna_house` | Rep. Anna Paulina Luna | Co-chair, House UAP task force |
| `burchett_house` | Rep. Tim Burchett | UAP hearings sponsor |
| `reid_senate` | Sen. Harry Reid | Architect of AATIP funding |
| `loeb_galileo` | Dr. Avi Loeb | Harvard, Galileo Project |

### Institutions (tier: `institution`) — 4 nodes

| id | Name | Role |
|---|---|---|
| `aaro` | AARO | All-domain Anomaly Resolution Office |
| `aatip` | AATIP | Advanced Aerospace Threat Identification Program |
| `uaptf` | UAPTF | UAP Task Force |
| `house_oversight` | House Oversight Cmte. | Congressional oversight body |

### Seed edges — at least 25 to make the map feel alive

Examples the developer can use to start:

- `grusch_2023 ↔ fravor_nimitz` — `testified_together` (Jul 2023)
- `grusch_2023 ↔ graves_fa18` — `testified_together` (Jul 2023)
- `elizondo_aatip ↔ aatip` — `same_program`
- `grusch_2023 ↔ uaptf` — `same_program`
- `mellon_osd → luna_house` — `advised_advocated`
- `kirkpatrick_aaro ↔ grusch_2023` — `contradicted`
- `kirkpatrick_aaro ↔ aaro` — `same_program`
- `elizondo_aatip → kirkpatrick_aaro` — `succeeded_in_role`
- ... and so on. The historian/researcher on the project should finalise the full list.

---

## 12. Build Plan & Acceptance Criteria

Three phases, each independently shippable.

### Phase 1 — Static MVP (~3 days)

- [ ] Install React Flow, create `/archive?view=network` route and tab
- [ ] Create `PortraitNode` component with all tier styles
- [ ] Create `TypedEdge` component handling all 5 edge types
- [ ] Seed `nodes.json` with all 18 v1 nodes, hand-placed positions
- [ ] Seed `edges.json` with 25+ relationships
- [ ] Use monogram placeholders for portraits — no images yet
- [ ] Pan, zoom, minimap working
- [ ] `nodesDraggable={false}` enforced
- [ ] Background grid using existing design tokens

**Acceptance:** The map renders. You can pan, zoom, and see the composition. Internal demo-ready.

### Phase 2 — Interaction & Polish (~3 days)

- [ ] Click-to-select opens the right-docked side panel
- [ ] Side panel pulls from the Archive's existing person data
- [ ] Double-click opens `/person/[id]` in the same tab
- [ ] Hover tooltips on nodes and edges
- [ ] Legend overlay with toggle filtering
- [ ] Search input with pan-to-match
- [ ] Export PNG button (via `html-to-image`)
- [ ] Deep-linking: `?focus=[id]`, `?filter=[type]` work
- [ ] Replace monograms with real portraits (AI-generated or licensed — see §13)

**Acceptance:** Every interaction in §8 works. A non-technical user can navigate the map without instruction.

### Phase 3 — Accessibility & Tutorial (~2 days)

- [ ] Keyboard navigation (Tab, Enter, Shift+Enter, Esc, Cmd/Ctrl+F)
- [ ] Screen-reader labels on all nodes and controls
- [ ] Focus rings on everything focusable
- [ ] `prefers-reduced-motion` respected everywhere
- [ ] First-arrival tutorial overlay
- [ ] `localStorage` flag prevents replay for returning users
- [ ] Edge style (dash/dot) verified as distinguishable for colour-blind users
- [ ] Lighthouse accessibility score > 95

**Acceptance:** Ready for public release. An expert accessibility reviewer finds no critical issues.

### Overall definition of done

- [ ] Renders correctly on Chrome, Safari, Firefox, Edge (latest two versions each)
- [ ] Mobile (tap-to-select works, pan-zoom works via touch) — landscape orientation recommended via a subtle hint on portrait mobile
- [ ] Bundle weight under budget (§10)
- [ ] Integrates with existing Archive header, search, and URL-routing contract
- [ ] No console errors, no a11y warnings
- [ ] README in `src/views/network/` documents the JSON shape so a non-developer can add a node by hand

---

## 13. Open Questions

Genuine decisions to resolve before or during Phase 2. Don't block Phase 1 on these.

1. **Portrait licensing.** Real photos = likeness/press-agency fraught. AI-generated = ethically ambiguous for real named public figures. **Recommendation:** commission one illustrator to produce 18 stylised portraits in a consistent register. One-time cost, zero licensing risk, visual coherence is a feature.

2. **Does the Network view share filter state with the Graph view?** If a user filters the Graph to "2023 hearing participants" and switches to Network, should Network inherit the filter? **Recommendation:** no, for v1. Keep views independent. Revisit if users ask.

3. **Mobile experience.** At 360px wide, an 18-node editorial map is probably unreadable. **Recommendation:** show the map with a pan/zoom hint banner on mobile. Consider a separate "list view" fallback in v2.

4. **Time filtering.** Every edge has an optional `year`. Do we add a time slider in v1? **Recommendation:** no. Ship the fundamental view first. Time-scrubbing is a v2 feature — when we add it, it becomes the signature interaction.

5. **Handling updates.** When a new witness testifies, do we add them to this curated map? **Recommendation:** yes, but deliberately. Additions to this view are editorial decisions, not automatic. New Archive nodes do not auto-appear here.

6. **Print / PDF export.** Is there demand for a printable A3 poster version? **Recommendation:** punt to v2. If users export PNG repeatedly, that's signal.

---

**End of document** · `NHI-ARCH-RELMAP-001` · v1.0 · 2026.04
