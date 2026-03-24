# ◈ UFO ARCHIVE — KNOWLEDGE GRAPH & INTELLIGENCE PLATFORM
### Product Design Specification · v1.0

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Core Architecture Overview](#3-core-architecture-overview)
4. [Data Model & Schema](#4-data-model--schema)
5. [Graph View — Specification](#5-graph-view--specification)
6. [Map View — Specification](#6-map-view--specification)
7. [Timeline View — Specification](#7-timeline-view--specification)
8. [Search, Filter & Drill-Down](#8-search-filter--drill-down)
9. [Data Ingestion & Management](#9-data-ingestion--management)
10. [Performance & Lazy Loading Strategy](#10-performance--lazy-loading-strategy)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Tech Stack Recommendations](#12-tech-stack-recommendations)
13. [Phased Delivery Roadmap](#13-phased-delivery-roadmap)
14. [Appendix A — Seed Data Examples](#appendix-a--seed-data-examples)
15. [Automated Web Intelligence Pipeline](#15-automated-web-intelligence-pipeline)

---

## 1. Executive Overview

The UFO Archive is an open-ended, self-expanding knowledge intelligence platform designed to ingest, organize, visualize, and interconnect the entirety of publicly documented information related to Unidentified Aerial / Anomalous Phenomena (UAP/UFO) across human history.

Unlike static databases or wiki-style entries, this platform represents knowledge as a **living graph** — where incidents, people, locations, statements, organizations, and artifacts are first-class nodes, and the relationships between them are traversable edges.

The platform is intended for long-term use. The data set will grow continuously. All design decisions are made with performance, scalability, and progressive disclosure in mind.

---

## 2. Product Vision & Goals

### 2.1 Core Vision

Build the most visually compelling and intellectually navigable UFO/UAP intelligence platform in existence — one that serious researchers, curious newcomers, and dedicated enthusiasts can all use to discover patterns, trace connections, and explore the phenomenon across decades and continents.

### 2.2 Primary Goals

- Represent all public UFO-related knowledge as an interconnected graph of nodes and edges
- Provide multiple complementary views: **Graph**, **Map (geospatial)**, **Timeline**, and **Detail panels**
- Support unlimited data growth with smart lazy loading so performance never degrades
- Allow contributors to add data progressively without requiring a full re-render
- Surface connections that are not obvious from reading flat records
- Remain visually striking and memorable — this is not a government spreadsheet

### 2.3 Non-Goals (Out of Scope v1)

- Photo or video hosting (external links only)
- Real-time data feeds or live scraping
- User accounts or authentication (public read-only in v1)
- AI-generated summaries (designed for future integration)

---

## 3. Core Architecture Overview

### 3.1 High-Level Architecture

The system has four primary layers:

| Layer | Description |
|---|---|
| **Data Store** | Graph database (Neo4j recommended) or document store with graph traversal (e.g. ArangoDB). JSON export for front-end hydration. |
| **API Layer** | REST + GraphQL hybrid. Paginated endpoints by view type. Supports progressive loading, viewport-based queries for map, and neighbour-depth queries for graph. |
| **Frontend Application** | Single-page React/Next.js app. Three primary views: Graph, Map, Timeline. Shared state via Zustand or Jotai. Heavy use of WebGL for rendering. |
| **CMS / Data Admin** | Lightweight admin panel for authorised contributors to add/edit nodes and edges. Schema-validated forms per entity type. |

### 3.2 View Modes

- **Graph View** — Primary interaction mode. Force-directed knowledge graph.
- **Map View** — Geospatial incident clustering on a world map.
- **Timeline View** — Chronological swimlane across the full data set.
- **Detail Panel** — Slide-in drawer rendering the full record of any node.

---

## 4. Data Model & Schema

### 4.1 Node Types

Every record in the system is a typed node. The following node types are defined in v1:

| Node Type | Icon / Visual | Description |
|---|---|---|
| **Incident** | ⬡ Hexagon / Red-orange | A documented sighting, encounter, or UAP event. Core entity of the system. |
| **Person** | ◯ Circle / Cyan | Witnesses, researchers, officials, whistleblowers, investigators, pilots. |
| **Organization** | ▣ Square / Indigo | Government agencies, research groups, military units, NGOs, media outlets. |
| **Location** | ▼ Triangle / Green | Geographic sites: crash sites, hotspots, bases, countries, regions. |
| **Statement** | ◇ Diamond / Gold | Testimonies, declassified documents, press releases, congressional hearings. |
| **Artifact** | ⬟ Pentagon / Silver | Physical objects, retrieved materials, alleged craft, debris, implants. |
| **Designation** | ⬠ Hexstar / Purple | Official case names, file numbers, project codenames (e.g. Project Blue Book #7918). |
| **Event** | ★ Star / Yellow | High-level umbrella events: mass sightings, government programmes, congressional testimonies. |
| **Media** | ▷ Arrow / Teal | Books, documentaries, declassified reports, FOIA releases linked by URL. |

### 4.2 Common Fields (All Nodes)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | System-generated, immutable |
| `node_type` | Enum | One of the 9 types above |
| `label` | String (max 80) | Short display name shown on graph node |
| `summary` | String (max 500) | One-paragraph description for the detail panel |
| `tags` | String[] | Free-text taxonomy tags for filtering |
| `date_start` | ISO 8601 (partial ok) | Can be year-only, decade-only, or full date |
| `date_end` | ISO 8601 (optional) | For ongoing entities or events with duration |
| `confidence` | Enum: high / medium / low / disputed | Credibility rating of the record |
| `sources` | URL[] | External links to primary sources (FOIA docs, articles, archives) |
| `created_at` | Timestamp | Record creation date in system |
| `updated_at` | Timestamp | Last modification timestamp |

### 4.3 Incident-Specific Fields

| Field | Type | Notes |
|---|---|---|
| `lat` | Float | Latitude of incident location |
| `lng` | Float | Longitude of incident location |
| `location_name` | String | Human-readable location description |
| `craft_description` | String | Physical description of observed object(s) |
| `witness_count` | Integer | Approximate number of witnesses |
| `duration_minutes` | Integer (nullable) | Duration of the event if documented |
| `classification` | Enum | Hynek scale: CE1 / CE2 / CE3 / CE4 / CE5 / NL / DD / MA |
| `official_explanation` | String (nullable) | Government / official explanation if any |
| `case_status` | Enum: open / closed / unexplained | Current investigative status |

### 4.4 Edge Types (Relationships)

| Relationship | Direction | Example |
|---|---|---|
| `WITNESSED` | Person → Incident | Bob Lazar WITNESSED S-4 test flight |
| `INVESTIGATED` | Person/Org → Incident | AFOSI INVESTIGATED Roswell |
| `MADE_STATEMENT` | Person → Statement | David Grusch MADE_STATEMENT before Congress |
| `LOCATED_AT` | Incident/Artifact → Location | Roswell debris LOCATED_AT Foster Ranch, NM |
| `PART_OF` | Incident → Event | Roswell incident PART_OF Roswell Event |
| `ASSIGNED_DESIGNATION` | Incident → Designation | Lakenheath ASSIGNED_DESIGNATION BB Case #10073 |
| `RECOVERED` | Org → Artifact | USAF RECOVERED craft debris at Roswell |
| `AFFILIATED_WITH` | Person → Organization | J. Allen Hynek AFFILIATED_WITH Project Blue Book |
| `REFERENCES` | Statement/Media → Incident | UAP Congressional Report REFERENCES Nimitz incident |
| `CORROBORATES` | Statement → Statement | Grusch testimony CORROBORATES Elizondo claims |
| `CONTRADICTS` | Statement → Statement | USAF report CONTRADICTS Roswell crash accounts |
| `PRECEDED` | Event → Event | Kenneth Arnold sighting PRECEDED Roswell Event |

---

## 5. Graph View — Specification

### 5.1 Overview

The Graph View is the primary and most powerful mode. It renders nodes and edges as an interactive, force-directed network. Users can pan, zoom, click, and drag. All other views are secondary lenses on the same underlying data.

### 5.2 Rendering Library

- **Primary recommendation: Sigma.js v2 with WebGL renderer**
  - Handles 100,000+ nodes at 60fps via GPU-accelerated WebGL
  - Custom node and edge rendering via GLSL programs
  - Well-maintained, open-source
- **Alternative:** Cosmograph (commercial, extremely fast for massive graphs)
- **Layout engine:** Graphology + `graphology-layout-forceatlas2` (runs in a WebWorker — non-blocking)
- **Do NOT use:** D3.js for large graphs (SVG-based, slow at scale), vis.js (outdated), Cytoscape.js (SVG-limited)

### 5.3 Node Visual Encoding

| Attribute | Visual Encoding | Notes |
|---|---|---|
| Node type | Shape + base colour | Per type table in Section 4.1 |
| Importance / degree | Node size (radius) | Higher-degree nodes render larger; log scale |
| Confidence level | Border opacity / style | Disputed = dashed ring; low = thin ring; high = solid bright ring |
| Date era | Hue brightness | Older events desaturated; recent events vivid |
| Selected / focused | White glow pulse | Animated radial glow on hover and selection |
| Cluster membership | Faint background halos | Soft translucent halos group related subgraphs |

### 5.4 Edge Visual Encoding

- **Edge colour:** Each relationship type has a distinct colour (e.g. WITNESSED = cyan, INVESTIGATED = amber, CONTRADICTS = red)
- **Edge width:** Scales with edge weight / confidence
- **Edge style:** Directed (arrow tip) for asymmetric relationships; undirected for symmetric
- **Edge label:** Hidden by default; shown on hover with relationship type text
- **Curve:** Curved when multiple edges exist between the same node pair

### 5.5 Camera & Interaction

| Interaction | Behaviour |
|---|---|
| Pan | Click + drag on empty canvas |
| Zoom | Scroll wheel or pinch-to-zoom; min/max zoom bounded |
| Select node | Single click opens Detail Panel (slide-in from right) |
| Focus neighbourhood | Double-click — hides non-adjacent nodes; highlights 1st and 2nd degree neighbours; dims rest |
| Lasso select | Alt + drag draws selection rectangle; sidebar shows batch summary |
| Reset | ESC key or "Reset View" button returns to full graph |
| Search-to-focus | Typing in search bar flies camera to matching node and pulses it |

### 5.6 Lazy Loading Strategy for Graph

The graph must never load all data at once. Use a **progressive neighbourhood loading strategy**:

- **On initial load:** Fetch the top 200 highest-degree nodes only (the "skeleton" graph)
- **On node click:** API call to fetch all direct edges and connected nodes for that node (depth=1). New nodes animate in.
- **On double-click expand:** API call for depth=2 neighbourhood. Progressive ring expansion.
- **On search:** API fetches the specific node + its top 50 connections. Camera flies to it.
- **Background prefetch:** When user is idle, silently prefetch neighbours of currently visible high-degree nodes
- **Memory management:** Nodes not visible for 60 seconds and not in the focused neighbourhood are evicted from the renderer; reloaded on demand
- **Indicator:** Show a subtle "X of Y nodes loaded" counter in the bottom-left corner

### 5.7 Clustering & Grouping

- **Auto-cluster:** Nodes grouped by tag, era, or geography render as a single super-node with a count badge
- **Cluster expand:** Click on a cluster node to explode it into individual nodes with an animation
- **Cluster toggle:** Global toolbar toggle: "Cluster by Era / Location / Type / None"

---

## 6. Map View — Specification

### 6.1 Overview

The Map View renders all Incident and Location nodes geospatially. It is a complementary lens to the Graph View, allowing users to understand the geographic distribution of UAP phenomena across the world and across time.

### 6.2 Mapping Library

- **Primary recommendation: MapLibre GL JS** (open-source, WebGL-based, very high performance)
  - Supports custom styles, 3D terrain, and very large marker sets
  - Free alternative to Mapbox with an identical API
- **Tile provider:** MapTiler (free tier available) or self-hosted via OpenMapTiles
- **Map style:** Custom dark basemap — deep navy / near-black land, dark teal water, minimal muted labels
- **Marker clustering:** `supercluster` library for fast, hierarchical point clustering

### 6.3 Visual Design

- **Base map:** Dark mode. Land = near-black (`#0A1520`). Water = deep navy (`#071020`). Labels minimal, muted teal.
- **Incident markers:** Glowing circular markers. Colour = incident classification (CE1=blue, CE3=purple, CE4=magenta, unclassified=white)
- **Cluster bubbles:** Semi-transparent circles with count badge. Radius scales with count. Pulse animation for high-density clusters.
- **Selected location:** Expands marker, shows info popup, highlights connecting lines to nearby incidents
- **Heat map layer (optional toggle):** Kernel density estimation layer showing global hotspot regions

### 6.4 Map Interactions

- Pan / zoom: Standard MapLibre controls
- **Click marker:** Opens Detail Panel for that Incident. Map stays visible behind the panel.
- **Click cluster:** Zoom to cluster extent with a fly animation
- **Hover:** Tooltip showing Incident label, date, and classification
- **Time filter slider:** Scrub through time (1900–present) to animate the appearance / disappearance of incidents by date
- **Filter sidebar:** Same filter controls as Graph View — type, confidence, classification, era, tags
- **Cross-view link:** Button on any map marker to "Open in Graph" — switches view and focuses that node

### 6.5 Geospatial Lazy Loading

- Load only incidents within the **current map viewport** plus a 20% buffer beyond screen edges
- On zoom out: Automatically switch to clustered mode; on zoom in: progressively reveal individual markers
- API endpoint: `GET /incidents?bbox={minLng,minLat,maxLng,maxLat}&limit=500`
- Prefetch adjacent tiles on pan so markers appear before the user reaches them

---

## 7. Timeline View — Specification

### 7.1 Overview

The Timeline View renders events, incidents, and statements in chronological order along a horizontal axis. It is designed for researchers to trace the evolution of the phenomenon across decades.

### 7.2 Library Recommendation

- `vis-timeline` or Apache ECharts (ThemeRiver variant) for standard swimlane timelines
- For custom rendering: D3.js with SVG (acceptable here — timeline datasets are much smaller than the full graph)

### 7.3 Timeline Behaviour

- **Default range:** 1900–present. User can pan and zoom the time axis.
- **Granularity levels:** Century → Decade → Year → Month. Auto-adjusts based on zoom level.
- **Swimlanes:** Separate lanes per node type (Incidents / Events / Statements / People / Organisations). Each lane toggleable.
- **Event cards:** Compact cards on the timeline showing label, date, and node type icon. Click opens Detail Panel.
- **Connections:** When a node is selected, lines appear linking all related nodes across their swimlane positions.
- **Density row:** A thin bar at the top of the timeline showing incident density over time, colour-coded by era.

### 7.4 Timeline Lazy Loading

- Load only the visible time window plus ±10% buffer on each side
- API endpoint: `GET /nodes?date_from=YYYY&date_to=YYYY&types[]=incident&types[]=event`
- Fetch more as user pans; animate cards sliding in from left or right

---

## 8. Search, Filter & Drill-Down

### 8.1 Global Search

- Always-visible search bar at top of screen (`Cmd+K` / `Ctrl+K` shortcut)
- Full-text search across: `label`, `summary`, `tags`, `location_name`, `sources` text
- Results shown as a command-palette-style dropdown with node type icons
- Selecting a result flies camera to that node (Graph) or pans to location (Map)
- Backed by a dedicated full-text index — **Meilisearch** or **Typesense** recommended for fast fuzzy search

### 8.2 Filter Panel

Collapsible side panel with the following filter dimensions:

- **Node type:** Checkboxes per type
- **Date range:** Dual-handle range slider (1900–present)
- **Confidence:** Toggle buttons: high / medium / low / disputed
- **Classification:** Hynek scale filter for incidents
- **Country / Region:** Searchable multi-select dropdown
- **Tags:** Multi-select tag cloud
- **Organisation:** Filter to nodes connected to a specific org

Filters apply across all views simultaneously — switching from Graph to Map preserves active filters. Active filters shown as dismissible chips below the search bar.

### 8.3 Detail Panel

- Slide-in panel from the right (60% screen width on desktop; full-screen on mobile)
- Shows all fields for the selected node, formatted by node type
- Includes: label, summary, date(s), confidence badge, classification, all tags
- **Source links:** Clickable hyperlinks to external references (FOIA docs, archives, news articles)
- **Related nodes section:** Grouped by relationship type with mini-cards. Click any related node to navigate to it.
- **Media links:** If a node has associated images/video (external URL only), shown as linked thumbnails with external icon
- **Breadcrumb trail:** Tracks navigation path through nodes — allows back-navigation

---

## 9. Data Ingestion & Management

### 9.1 Admin Data Entry Interface

A minimal but functional admin interface for trusted contributors:

- Schema-driven forms per node type (all required fields, validation, dropdowns for enums)
- **Relationship builder:** Search for existing nodes and draw edges between them. Select edge type from dropdown.
- **Bulk import:** CSV/JSON import with column mapping UI for batch loading historical records
- **Audit log:** Every creation and edit logged with timestamp and contributor identifier
- **Staging mode:** New contributions enter a "pending" state, reviewed before going live in the graph

### 9.2 Suggested Initial Seed Data Categories

The following should be seeded at minimum to make the graph meaningfully navigable on launch:

- **Major incident cases:** Roswell, Rendlesham, Nimitz, Phoenix Lights, Levelland, Shag Harbour, Kecksburg, Cash-Landrum, Travis Walton, JAL1628, Tehran, Stephenville, O'Hare 2006
- **Key personnel:** J. Allen Hynek, Bob Lazar, Luis Elizondo, David Grusch, Jacques Vallée, Timothy Good, Nick Pope, James Fox, Stanton Friedman
- **Organizations:** Project Blue Book, AATIP, AARO, MUFON, NUFORC, Condon Committee, CSETI, To The Stars Academy
- **Events:** 1947 wave, Belgian UFO wave, 1952 Washington DC flyovers, 2023 Congressional hearings
- **Documents:** Robertson Panel report, Condon Report, 2021 ODNI UAP Preliminary Assessment, Pentagon UAP videos

### 9.3 Data Versioning

- All nodes are versioned. Editing a node creates a new version; previous versions accessible via detail panel history tab.
- Deleted nodes are soft-deleted (archived, not removed) so graph integrity is maintained.

---

## 10. Performance & Lazy Loading Strategy

### 10.1 Design Principles

- The user should never wait more than **2 seconds** for any primary view to first render
- The graph should never load all data — it loads intelligently based on user context
- All heavy computation (layout, clustering) runs in **Web Workers** — never blocking the UI thread
- All API responses are paginated by default; no unbounded queries permitted

### 10.2 Graph Loading Tiers

| Tier | Trigger | What Loads |
|---|---|---|
| **Tier 0 — Skeleton** | App initialisation | Top 150–200 nodes by degree centrality. No edge labels. |
| **Tier 1 — Focus** | Single click on node | All 1st-degree neighbours and their edges. |
| **Tier 2 — Expand** | Double-click on node | 1st and 2nd-degree neighbourhood (depth=2). |
| **Tier 3 — Search** | Text search result selected | Searched node + top 50 connections. Camera flies to it. |
| **Tier 4 — Filter** | Filter panel applied | Re-queries API with filters; re-runs layout on returned subset. |
| **Background** | User idle > 10 seconds | Silently prefetches neighbours of top visible high-degree nodes. |

### 10.3 API Endpoint Design

| Endpoint | Purpose |
|---|---|
| `GET /graph/skeleton` | Returns top N nodes by degree. Used on initial load. |
| `GET /graph/node/:id/neighbourhood?depth=1` | Returns node + neighbours to specified depth. |
| `GET /nodes?types[]&date_from&date_to&tags[]` | Filtered node list for Timeline and Map views. |
| `GET /incidents?bbox=minLng,minLat,maxLng,maxLat` | Viewport-bounded incident fetch for Map view. |
| `GET /search?q=&limit=20` | Full-text search. Returns matching node summaries. |
| `GET /node/:id` | Full detail for a single node. Feeds Detail Panel. |

### 10.4 Caching Strategy

- Skeleton graph response cached in browser `localStorage` with 24hr TTL
- Node neighbourhoods cached in-memory for the session; evicted LRU after 500 nodes
- Search index responses cached for 1 hour in-memory
- **Server-side:** API responses cached in Redis with 15-minute TTL; invalidated on any write

### 10.5 Target Performance Benchmarks

| Metric | Target |
|---|---|
| Initial graph skeleton render | < 1.5 seconds |
| Node neighbourhood load on click | < 800ms |
| Search result display | < 300ms |
| Map viewport load | < 1 second |
| Graph FPS with 5,000 visible nodes | > 45 fps (WebGL target: 60fps) |
| Detail Panel open animation | < 200ms |

---

## 11. UI/UX Design System

### 11.1 Aesthetic Direction

The visual identity should feel like a **classified intelligence terminal meets deep-space observatory** — dark, precise, luminous. This is a serious research tool with visual drama.

- **Theme:** Dark mode only. No light mode in v1.
- **Colour palette:** Deep navy backgrounds, cyan/teal primary accents, amber for warnings, red for contradictions, gold for high-importance statements
- **Typography:** Monospace for headings and labels (e.g. JetBrains Mono, IBM Plex Mono); humanist sans for body text (e.g. IBM Plex Sans, Source Sans Pro)
- **Motion:** Purposeful and restrained. Nodes animate in with a particle-dissolve entrance. Camera movements use smooth easing curves. No idle animation unless selected.
- **Borders and lines:** Thin (1px), sharp. No rounded corners on data containers. Rounded only on interactive buttons.

### 11.2 Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-primary` | `#0A1520` | Main app background |
| `--color-bg-surface` | `#0D1B2A` | Panel and card backgrounds |
| `--color-bg-elevated` | `#1E3A5F` | Hover states, selected rows |
| `--color-accent-primary` | `#00C8FF` | Primary actions, links, focus rings |
| `--color-accent-secondary` | `#7B2FBE` | Secondary actions, org nodes |
| `--color-accent-success` | `#00E5A0` | High confidence indicators |
| `--color-accent-warning` | `#FFB800` | Statement nodes, low confidence |
| `--color-accent-danger` | `#FF4444` | Contradiction edges, disputed records |
| `--color-text-primary` | `#C8D8E8` | Primary body text |
| `--color-text-muted` | `#5577AA` | Labels, metadata, secondary text |
| `--color-border` | `#1E3A5F` | Container borders, dividers |

### 11.3 Responsive Behaviour

| Breakpoint | Layout |
|---|---|
| Desktop (>1280px) | Full three-panel layout: Toolbar | Graph Canvas | Detail Panel |
| Tablet (768–1280px) | Graph Canvas full width; Detail Panel as slide-over |
| Mobile (<768px) | Map View as default; Graph View accessible but simplified; tap to open Detail Panel full-screen |

The Map View is more usable on touch devices; the Graph View is optimised for mouse / trackpad.

### 11.4 Accessibility

- All interactive elements have visible focus indicators
- Node information is accessible via keyboard navigation in the Detail Panel
- Colour is never the sole encoding — all encodings also use shape or label
- ARIA labels on all graph controls

---

## 12. Tech Stack Recommendations

### 12.1 Frontend

| Category | Recommendation | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR for initial load perf; RSC for data prefetch |
| Graph Renderer | Sigma.js v2 + Graphology | WebGL, open-source, handles 100k+ nodes |
| Map Renderer | MapLibre GL JS | WebGL map, open-source, custom dark styles |
| State Management | Zustand | Minimal boilerplate, performant for large state |
| Data Fetching | TanStack Query v5 | Caching, background refetch, pagination built-in |
| Search UI | cmdk | Command-palette pattern for search overlay |
| Styling | Tailwind CSS + CSS Variables | Utility-first with design token layer |
| Animation | Framer Motion | Panel transitions, node entrance animations |
| Timeline | vis-timeline or custom D3 | Swimlane timeline with zoom/pan |

### 12.2 Backend

| Category | Recommendation | Rationale |
|---|---|---|
| API Framework | Node.js + Fastify | Fast, lightweight, excellent plugin ecosystem |
| Primary Database | Neo4j | Native graph traversal; Cypher query language; ideal for this data model |
| Alternative DB | PostgreSQL + Apache AGE | If Neo4j licensing is a concern; AGE adds a graph extension to Postgres |
| Search Engine | Meilisearch | Self-hosted, fast, typo-tolerant full-text search |
| Cache Layer | Redis | API response caching; session storage |
| File Storage | Cloudflare R2 (S3-compatible) | For exported graph snapshots and bulk import files |

### 12.3 Deployment

- **Frontend:** Vercel or Cloudflare Pages
- **Backend API:** Railway, Render, or self-hosted VPS (minimum 4GB RAM for Neo4j)
- **Neo4j:** Neo4j AuraDB (managed cloud) for simplest start; Neo4j Community Edition for cost control
- **CI/CD:** GitHub Actions for automated deploy on merge to main

---

## 13. Phased Delivery Roadmap

| Phase | Timeline | Deliverables |
|---|---|---|
| **Phase 0** | Week 1–2 | Database schema setup (Neo4j); seed data import (50–100 nodes); REST API skeleton with neighbourhood endpoints |
| **Phase 1** | Week 3–5 | Graph View: skeleton load, node rendering, Sigma.js integration, force-directed layout in Web Worker, node click → Detail Panel |
| **Phase 2** | Week 6–7 | Neighbourhood lazy loading (Tier 1 + Tier 2); Search overlay (Meilisearch); Filter panel; active filter chips |
| **Phase 3** | Week 8–9 | Map View: MapLibre integration, custom dark style, incident markers, clustering, viewport-bounded API, time scrubber |
| **Phase 4** | Week 10–11 | Timeline View: swimlanes per node type, zoom/pan time axis, incident density row |
| **Phase 5** | Week 12–13 | Admin data entry UI: schema forms per type, relationship builder, bulk CSV import, staging workflow |
| **Phase 6** | Week 14 | Polish: animations, transitions, colour system, typography, responsive behaviour, accessibility pass |
| **Phase 7** | Week 15+ | Ongoing: expand seed data to 1,000+ nodes; performance profiling; user feedback; AI summary integration (future) |

---

## Appendix A — Seed Data Examples

### A.1 Sample Incident Node

```json
{
  "id": "uuid-generated",
  "node_type": "incident",
  "label": "1947 Roswell Incident",
  "date_start": "1947-07-08",
  "location_name": "Roswell, New Mexico, USA",
  "lat": 33.3943,
  "lng": -104.5230,
  "craft_description": "Disc-shaped debris field; metallic material with unusual properties",
  "witness_count": 12,
  "classification": "CE2",
  "official_explanation": "Weather balloon (1947); Project Mogul balloon (1994 revision)",
  "case_status": "unexplained",
  "confidence": "high",
  "tags": ["crash retrieval", "New Mexico", "1947", "USAF", "debris", "cover-up"],
  "summary": "Debris from an unidentified object was recovered by USAF personnel from the Foster Ranch near Roswell, NM. The Army Air Force initially announced recovery of a 'flying disc' before retracting to a weather balloon explanation. Multiple witnesses, including the recovery officer Major Jesse Marcel, later contradicted the official account.",
  "sources": [
    "https://www.archives.gov/research/military/air-force/ufos",
    "https://www.nsa.gov/Portals/70/documents/news-features/declassified-documents/ufo"
  ]
}
```

### A.2 Sample Edge

```json
{
  "from_node_id": "person-jesse-marcel",
  "to_node_id": "incident-1947-roswell",
  "relationship": "INVESTIGATED",
  "notes": "Major Marcel was the intelligence officer who personally recovered the debris from the Foster Ranch site and delivered it to Fort Worth AAF.",
  "confidence": "high",
  "sources": ["https://archive.org/details/roswell-marcel-interview-1979"]
}
```

### A.3 Priority Incident Seed List

The following incidents should be prioritised in the initial data load — they form the central nodes around which many other entities cluster:

| Date | Location | Label | Tags |
|---|---|---|---|
| 1947-06-24 | Mt Rainier, WA | Kenneth Arnold Sighting | coined "flying saucers", civilian pilot, 1947 wave |
| 1947-07-08 | Roswell, NM | Roswell Incident | crash retrieval, USAF, debris, cover-up |
| 1952-07-19 | Washington DC | DC Flyover Wave | radar confirmation, Capitol, jet interception |
| 1957-11-02 | Levelland, TX | Levelland Incident | CE2, EM vehicle stalling, multiple witnesses |
| 1965-12-09 | Kecksburg, PA | Kecksburg Incident | crash retrieval, acorn-shaped object, NASA |
| 1967-10-04 | Shag Harbour, NS | Shag Harbour Incident | crash into water, Canadian DND, radar |
| 1969 | USA | Project Blue Book Closed | 17,835 cases, 701 unexplained, Hynek |
| 1980-12-26 | Rendlesham Forest, UK | Rendlesham Forest Incident | RAF Bentwaters, USAF personnel, CE2/CE3, 3 nights |
| 1986-11-17 | Alaska airspace | JAL1628 Incident | Japanese Airlines 747, military radar, 50 minutes |
| 1989–1990 | Belgium | Belgian UFO Wave | mass sightings, F-16 pursuit, radar confirmation |
| 1997-03-13 | Phoenix, AZ | Phoenix Lights | thousands of witnesses, two separate events, governor |
| 2004-11-14 | Pacific Ocean | Nimitz / Tic-Tac Incident | USS Princeton, FLIR footage, Fravor, Dietrich |
| 2006-11-07 | O'Hare Airport, IL | O'Hare Airport Incident | United Airlines staff, disc, punched hole in clouds |
| 2008-01-08 | Stephenville, TX | Stephenville Incident | large craft, F-16 pursuit, police officers |
| 2023-07-26 | Washington DC | Grusch Congressional Testimony | whistleblower, retrieval programme, NHI |

### A.4 Priority Person Nodes

| Label | Role | Key Connections |
|---|---|---|
| J. Allen Hynek | Astronomer, Project Blue Book scientific advisor | Blue Book, CE classification system |
| Jacques Vallée | Computer scientist, UFO researcher | Hynek, Project Blue Book, interdimensional hypothesis |
| Bob Lazar | Alleged S-4 physicist | Area 51, S-4, propulsion systems |
| Stanton Friedman | Nuclear physicist, researcher | Roswell, MJ-12 documents |
| Luis Elizondo | Former AATIP director | AATIP, TTSA, Pentagon UAP programme |
| David Grusch | Former NGA officer, whistleblower | AARO, UAP crash retrieval programme, 2023 testimony |
| Nick Pope | Former MoD UFO desk | UK MoD, Rendlesham, government policy |
| James Fox | Documentary filmmaker | Witness testimonies, The Phenomenon (2020) |
| Timothy Good | Author, researcher | Above Top Secret, global case research |

---

*— END OF SPECIFICATION —*

*UFO Archive Platform · Design Spec v1.0*
*This document is a living specification and should be updated as implementation decisions are made.*

---

## 15. Automated Web Intelligence Pipeline

### 15.1 Overview

Manual data entry alone cannot scale to the volume of publicly available UFO/UAP information. The platform requires an automated pipeline that continuously crawls trusted sources across the web, extracts structured entity data, validates it against the schema, and either auto-ingests or queues records for human review — all without human intervention per record.

This pipeline is the long-term data engine of the platform. It transforms the UFO Archive from a manually curated database into a self-growing knowledge graph.

### 15.2 Pipeline Architecture

The pipeline consists of five sequential stages:

```
[ Source Registry ]
        ↓
[ Crawler / Fetcher ]
        ↓
[ AI Extraction Engine ]
        ↓
[ Validation & Deduplication ]
        ↓
[ Staging → Graph DB ]
```

Each stage is independently scalable and runs as a separate service (microservice or worker process). Failures at any stage are logged and retried independently.

### 15.3 Stage 1 — Source Registry

A curated, versioned registry of trusted data sources. Each source entry defines:

| Field | Description |
|---|---|
| `source_id` | Unique identifier |
| `name` | Human-readable name (e.g. "NUFORC Online Database") |
| `url` | Base URL or sitemap URL |
| `source_type` | Enum: `structured_db`, `news_archive`, `government_foia`, `wiki`, `forum`, `pdf_archive`, `social_feed` |
| `trust_level` | Enum: `primary` / `secondary` / `tertiary` |
| `crawl_frequency` | Enum: `daily` / `weekly` / `monthly` / `on_demand` |
| `extraction_method` | Enum: `structured_scrape`, `llm_extract`, `rss_feed`, `api`, `pdf_parse` |
| `last_crawled_at` | Timestamp |
| `active` | Boolean |

#### Priority Source List (Initial Registry)

| Source | Type | Trust Level | Method |
|---|---|---|---|
| NUFORC (nuforc.org) | Structured DB | Primary | Structured scrape |
| MUFON Case Management System | Structured DB | Primary | API / scrape |
| National Archives FOIA UAP docs | Government FOIA | Primary | PDF parse |
| Pentagon / AARO official releases (aaro.mil) | Government | Primary | Scrape + PDF parse |
| CIA FOIA Reading Room (UFO docs) | Government FOIA | Primary | PDF parse |
| UK National Archives UFO files | Government FOIA | Primary | PDF parse |
| Project Blue Book Archive (bluebookarchive.org) | Historical archive | Primary | Scrape + PDF |
| The Black Vault (theblackvault.com) | FOIA aggregator | Secondary | Structured scrape |
| UFO Evidence (ufoevidence.org) | Research archive | Secondary | Structured scrape |
| Wikipedia UAP/UFO articles | Wiki | Secondary | MediaWiki API |
| NICAP (nicap.org) | Historical archive | Secondary | Structured scrape |
| OpenMinds (openminds.tv) | News | Secondary | RSS + scrape |
| The Debrief (thedebrief.org) | News | Secondary | RSS feed |
| Liberation Times (liberationtimes.com) | News | Secondary | RSS feed |
| Reddit r/UFOs (high-karma posts only) | Forum | Tertiary | Reddit API |
| Congressional Records (congress.gov) | Government | Primary | Structured scrape |
| Hansard / UK Parliament UAP debates | Government | Primary | Structured scrape |
| Internet Archive Wayback Machine | Archive | Secondary | API |

New sources can be added via the admin UI without code changes. The crawler respects `robots.txt` and configured rate limits per domain.

### 15.4 Stage 2 — Crawler / Fetcher

A distributed web crawler responsible for fetching raw content from registered sources on schedule.

#### Technology Recommendation

- **Primary:** [Crawlee](https://crawlee.dev/) (Node.js) — handles JS-rendered pages, rate limiting, proxy rotation, request queuing
- **Alternative:** Scrapy (Python) for simpler static-HTML sources
- **PDF fetching:** Direct HTTP download stored to S3/R2 bucket for async processing
- **Headless browser:** Playwright (via Crawlee) for JavaScript-rendered pages (e.g. NUFORC)

#### Crawler Behaviour

- Respects `robots.txt` and `Crawl-delay` headers
- Configurable per-domain rate limit (default: 1 request / 3 seconds)
- Rotating user-agent strings to avoid blocks
- Deduplication via URL hash — does not re-fetch unchanged pages (uses `ETag` / `Last-Modified` headers where available)
- Content fingerprinting: SHA-256 hash of raw content stored; if hash unchanged since last crawl, page is skipped
- All raw HTML/PDF stored to object storage with source URL, crawl timestamp, and content hash — raw content is never discarded
- Failed fetches retried 3× with exponential backoff, then logged to a dead-letter queue for manual review

#### Crawl Queue Management

- Job queue managed via **BullMQ** (Redis-backed)
- Scheduled jobs created from Source Registry crawl frequencies
- Priority queue: government/FOIA sources > structured databases > news > forums
- Max concurrency: configurable per source (default 3 parallel workers per domain)

### 15.5 Stage 3 — AI Extraction Engine

The extraction engine reads raw content (HTML or PDF text) and uses a combination of rule-based parsing and LLM-based extraction to produce structured node and edge data conforming to the schema in Section 4.

#### 15.5.1 Extraction Strategy by Source Type

| Source Type | Primary Method | Fallback |
|---|---|---|
| `structured_db` | CSS/XPath selector scraping → direct field mapping | LLM extraction if layout changes |
| `government_foia` | PDF text extraction (PyMuPDF) → LLM extraction | Manual queue |
| `news_archive` | Article body extraction (Readability.js) → LLM extraction | — |
| `wiki` | MediaWiki API → structured JSON → field mapping | LLM for infobox fields |
| `pdf_archive` | PDF text extraction → LLM extraction | OCR (Tesseract) for scanned PDFs |
| `forum` | Post body extraction → LLM classification + extraction | Discard if low confidence |
| `rss_feed` | RSS item fields → LLM enrichment | — |

#### 15.5.2 LLM Extraction Prompting

The LLM extraction layer uses a structured output prompt instructing the model to return JSON conforming to the node schema. Example prompt pattern:

```
SYSTEM:
You are a UFO/UAP data extraction specialist. Extract structured information
from the provided text and return ONLY a valid JSON object. Do not include
any explanation or preamble. If a field cannot be determined, use null.

Schema: { node_type, label, date_start, location_name, lat, lng,
summary, tags, confidence, craft_description, witness_count, classification,
official_explanation, case_status, persons_mentioned[], organizations_mentioned[],
external_source_url }

Confidence rules:
- "high": Multiple corroborating sources, official documentation, or physical evidence
- "medium": Single credible source, witness testimony without corroboration
- "low": Single unverified source, anonymous report
- "disputed": Contradicting accounts exist in other records

USER:
Source URL: {url}
Source type: {source_type}
Raw content:
{extracted_text_truncated_to_4000_tokens}
```

- **Model:** Claude 3.5 Haiku (fast, cost-effective for high-volume extraction) with Sonnet escalation for complex FOIA documents
- **Structured output:** Enforce JSON schema via tool use / structured output mode — never parse free-text LLM responses
- **Batch processing:** Group up to 20 short articles per LLM call where possible to reduce API cost
- **Relationship extraction:** A second LLM pass extracts mentioned entities and inferred relationships (e.g. "Colonel Blanchard ordered the retrieval" → `INVESTIGATED` edge from Person to Incident)

#### 15.5.3 Named Entity Recognition (NER)

Before LLM extraction, run a lightweight NER pass to pre-identify:

- **Person names** → candidate Person nodes
- **Location names** → geocoded via Nominatim (OpenStreetMap) or Google Geocoding API
- **Dates** → normalised to ISO 8601 including partial dates (e.g. "Summer 1947" → `1947-06`)
- **Organization names** → matched against known org list in registry

Recommended library: **spaCy** (`en_core_web_trf` model) or **GLiNER** for zero-shot NER.

#### 15.5.4 Geocoding

All location strings extracted from text must be geocoded to lat/lng for Map View:

- Primary: **Nominatim** (OpenStreetMap — free, self-hostable)
- Fallback: **Google Geocoding API** for ambiguous or historical place names
- All geocoding results cached to avoid repeated lookups
- Store both the raw `location_name` string and the resolved `lat`/`lng` plus a `place_confidence` score

### 15.6 Stage 4 — Validation & Deduplication

Before any record enters the graph, it must pass validation and deduplication checks.

#### 15.6.1 Schema Validation

- Validate extracted JSON against the node schema using **Zod** (TypeScript) or **Pydantic** (Python)
- Required fields: `node_type`, `label`, `summary`, `confidence`
- Date format validation: must be parseable ISO 8601 (full or partial)
- Coordinate range check: lat in [-90, 90], lng in [-180, 180]
- Records failing validation are sent to the Review Queue with validation errors attached

#### 15.6.2 Deduplication

Deduplication operates at two levels:

**Level 1 — URL-based dedup:**
- If `external_source_url` already exists in the database, skip ingestion
- Source URL hash stored in a fast lookup table (Redis SET)

**Level 2 — Semantic dedup:**
- Generate a text embedding of `label + summary + date_start + location_name`
- Compare against embeddings of existing nodes using cosine similarity
- Similarity > 0.92 → probable duplicate; flag to Review Queue with both records side-by-side
- Similarity 0.75–0.92 → auto-merge candidate: create a `CORROBORATES` edge rather than a new node
- Similarity < 0.75 → treat as new unique node
- Embedding model: `text-embedding-3-small` (OpenAI) or `nomic-embed-text` (self-hosted via Ollama)
- Embedding store: **pgvector** (PostgreSQL extension) or **Qdrant** (dedicated vector DB)

#### 15.6.3 Pipeline Confidence Scoring

Each auto-extracted record receives a pipeline confidence score (separate from the human-assigned `confidence` field):

| Signal | Score |
|---|---|
| Source trust level = primary | +0.30 |
| Source trust level = secondary | +0.15 |
| Source trust level = tertiary | +0.05 |
| LLM extraction confidence = high | +0.25 |
| NER geocoding matched | +0.10 |
| Date fully resolved (not partial) | +0.10 |
| Corroborating duplicate source found | +0.15 |
| Schema validation passed all fields | +0.10 |

Records scoring **≥ 0.70 are auto-approved** for ingestion. Records scoring < 0.70 enter the Review Queue.

### 15.7 Stage 5 — Staging & Ingestion

#### 15.7.1 Auto-Ingestion Path

Records passing validation and scoring ≥ 0.70 are:

1. Written to the graph database with `status: auto_ingested`
2. Tagged with `pipeline_source`, `crawled_at`, `extraction_model`, and `pipeline_confidence` metadata
3. Full-text search index (Meilisearch) updated immediately
4. A `NEW_NODE` event emitted to the message queue for downstream consumers

#### 15.7.2 Review Queue

Records not meeting the auto-ingestion threshold are placed in a human review queue with:

- Side-by-side view of raw source text and extracted JSON
- Inline field editing before approval
- One-click approve / reject / merge-with-existing
- Bulk actions for processing similar records at once
- Filter by source, node type, validation error, date range

The Review Queue UI is part of the Admin panel (Section 9.1).

#### 15.7.3 Relationship Auto-Creation

After a node is ingested, the pipeline runs a relationship resolution pass:

- Cross-references `persons_mentioned` against existing Person nodes (fuzzy name match via Jaro-Winkler similarity)
- Cross-references `organizations_mentioned` against existing Org nodes
- Cross-references `location_name` against existing Location nodes
- For each match above 0.85 similarity → auto-creates the appropriate edge with `confidence: low`, flagged for human confirmation
- Unmatched mentions become candidate stub nodes (`status: stub`) for future resolution

### 15.8 Monitoring & Observability

The admin dashboard includes a **Pipeline Monitor** panel showing:

| Metric | Display |
|---|---|
| Crawl jobs queued / running / failed | Live count badges |
| Records extracted (last 24h / 7d / 30d) | Sparkline chart |
| Auto-ingested vs review queue ratio | Bar chart |
| Source health status | Green / amber / red per source |
| Duplicate detection rate | % of records flagged |
| LLM API cost (last 30 days) | Running cost counter |
| Dead-letter queue size | Alert if > 50 items |
| Extraction latency P50 / P95 | Per source type |

Alerts via email or Slack webhook for:
- Any source failing to crawl for > 2× its scheduled interval
- Dead-letter queue exceeding 100 items
- LLM API error rate > 5% over 1 hour
- Review Queue backlog exceeding 500 unreviewed records

### 15.9 Ethical & Legal Considerations

| Concern | Mitigation |
|---|---|
| `robots.txt` compliance | Crawler checks and enforces `robots.txt` on every domain before any request |
| Rate limiting / ToS | Per-domain rate limits configurable in Source Registry; respectful crawl delays enforced |
| Copyright | Raw content stored only for extraction; only structured facts shown in the UI — not reproduced text |
| Personal data | Names of private individuals (non-public-figures) marked `public: false` and excluded from the public graph |
| LLM hallucination | All LLM-extracted records carry `pipeline_confidence` metadata. Low-confidence records are never auto-ingested. |
| Source attribution | Every node retains its `sources[]` array. Detail Panel always shows original source links. |

### 15.10 Pipeline Technology Summary

| Component | Recommended Tool | Purpose |
|---|---|---|
| Crawl orchestration | Crawlee (Node.js) + Playwright | Web crawling, JS rendering |
| Job queue | BullMQ + Redis | Scheduled and event-driven job management |
| PDF extraction | PyMuPDF (`fitz`) | Text extraction from PDF documents |
| OCR (scanned docs) | Tesseract via `pytesseract` | Scanned FOIA document text recovery |
| NER | spaCy (`en_core_web_trf`) or GLiNER | Named entity recognition |
| Geocoding | Nominatim (self-hosted) | Location string → lat/lng |
| LLM extraction | Claude 3.5 Haiku (bulk) / Sonnet (complex) | Structured entity extraction |
| Schema validation | Zod (TS) or Pydantic (Python) | JSON schema enforcement |
| Deduplication — semantic | Qdrant + `nomic-embed-text` | Vector similarity search |
| Deduplication — URL | Redis SET | Hash-based URL dedup |
| Message queue | BullMQ or RabbitMQ | Pipeline stage communication |
| Object storage | Cloudflare R2 | Raw content archiving |
| Pipeline monitoring | Custom admin dashboard panel | Metrics, alerts, queue health |

