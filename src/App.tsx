import { useEffect, useMemo, useState } from 'react';
import type MiniSearch from 'minisearch';
import {
  buildDefaultFilters,
  filterGraph,
  getYear,
  normalizeGraphData,
} from './lib/archive';
import { loadChunkedGraph, searchNodeIds } from './lib/chunkedGraph';
import { CommandPalette } from './components-new/CommandPalette';
import { EntityDetail } from './components-new/EntityDetail';
import { MapView } from './components-new/MapView';
import { SourcesView } from './components-new/SourcesView';
import { StatusBar } from './components-new/StatusBar';
import { TimelineView } from './components-new/TimelineView';
import { Topbar } from './components-new/Topbar';
import { SceneExplorer } from './components-new/scene/SceneExplorer';
import { NetworkView } from './components-new/network/NetworkView';
import { Onboarding } from './components-new/onboarding/Onboarding';
import type { ArchiveGraph, ArchiveNode, FilterState, ViewMode } from './types';

type Route = 'onboarding' | 'archive';

/**
 * Hash router — GH Pages can't rewrite paths, so the two entry points
 * live under `#/onboarding` and `#/archive`. First-time visitors land
 * on onboarding; returning visitors (who completed it once or set a
 * preference) land on the archive. The hash also carries handoff
 * params like `#/archive?view=network&focus=grusch_2023`.
 */
function getInitialRoute(): Route {
  if (typeof window === 'undefined') return 'archive';
  const raw = window.location.hash.replace(/^#/, '');
  const [path] = raw.split('?');
  if (path === '/archive') return 'archive';
  if (path === '/onboarding') return 'onboarding';
  // No explicit route in the URL — fall back to the stored preference
  // or the first-visit default.
  let preferred: string | null = null;
  let completed = false;
  try {
    preferred = window.localStorage.getItem('nhi_preferred_view');
    completed = window.localStorage.getItem('nhi_onboarding_complete') === 'true';
  } catch {
    // storage blocked — treat as first-time visitor
  }
  if (preferred === 'archive') return 'archive';
  if (preferred === 'onboarding') return 'onboarding';
  return completed ? 'archive' : 'onboarding';
}

function parseArchiveHashParams(): { view?: ViewMode; focus?: string | null } {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.replace(/^#/, '');
  const [path, query] = raw.split('?');
  if (path !== '/archive' || !query) return {};
  const params = new URLSearchParams(query);
  const view = params.get('view') ?? undefined;
  const focus = params.get('focus');
  return {
    view: (['graph', 'map', 'timeline', 'network', 'sources'] as ViewMode[]).includes(
      view as ViewMode,
    )
      ? (view as ViewMode)
      : undefined,
    focus: focus ?? null,
  };
}

const EMPTY_GRAPH: ArchiveGraph = { generated_at: '', nodes: [], edges: [] };

function toggle<T>(values: T[], value: T, allValues: T[]): T[] {
  if (values.includes(value)) {
    const withoutValue = values.filter((item) => item !== value);
    return withoutValue.length === 0 ? [...allValues] : withoutValue;
  }
  return [...values, value];
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => getInitialRoute());
  const [graphData, setGraphData] = useState<ArchiveGraph>(EMPTY_GRAPH);
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const p = parseArchiveHashParams();
    return p.view ?? 'graph';
  });
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => buildDefaultFilters([]));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingSceneSeed, setPendingSceneSeed] = useState<string | null>(null);
  const [sceneResetToken, setSceneResetToken] = useState(0);
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1280) return 'tablet';
    return 'desktop';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('nhi-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('nhi-theme-light', theme === 'light');
    try {
      window.localStorage.setItem('nhi-theme', theme);
    } catch {
      // storage unavailable (private mode, quota) — in-memory state still works
    }
  }, [theme]);

  // React to hash changes — e.g. the Onboarding handoff cards set
  // window.location.hash to '#/archive?view=network&focus=grusch_2023'
  // and we need to swap route + viewMode + seed the scene.
  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = getInitialRoute();
      setRoute(nextRoute);
      if (nextRoute === 'archive') {
        const params = parseArchiveHashParams();
        if (params.view) setViewMode(params.view);
        if (params.focus) {
          setSelectedNodeId(params.focus);
          if (params.view === 'graph' || !params.view) {
            setPendingSceneSeed(params.focus);
          }
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setBreakpoint(w < 768 ? 'mobile' : w < 1280 ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const applyGraph = (payload: ArchiveGraph, index: MiniSearch | null) => {
      if (!isMounted) return;
      const normalized = normalizeGraphData(payload);
      setGraphData(normalized);
      setSearchIndex(index);
      setFilters(buildDefaultFilters(normalized.nodes));
    };

    const loadMonolithic = async () => {
      const response = await fetch('./data/graph.seed.json', {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`graph.seed -> ${response.status}`);
      const payload = (await response.json()) as ArchiveGraph;
      applyGraph(payload, null);
    };

    const load = async () => {
      try {
        const { graph, searchIndex: idx } = await loadChunkedGraph(controller.signal);
        applyGraph(graph, idx);
      } catch {
        try {
          await loadMonolithic();
        } catch {
          // Both chunked and monolithic fetches failed — stay on the
          // empty-graph initial state; UI will show the empty states.
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const nodeLookup = useMemo(() => {
    const lookup = new Map<string, ArchiveNode>();
    for (const node of graphData.nodes) lookup.set(node.id, node);
    return lookup;
  }, [graphData.nodes]);

  const years = useMemo(
    () =>
      graphData.nodes
        .map((node) => getYear(node.date_start))
        .filter((year): year is number => year !== null),
    [graphData.nodes],
  );

  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();

  const queryMatchedIds = useMemo(() => {
    if (!searchIndex) return undefined;
    return searchNodeIds(searchIndex, query);
  }, [searchIndex, query]);

  const filteredGraph = useMemo(
    () =>
      filterGraph(graphData.nodes, graphData.edges, filters, query, queryMatchedIds),
    [filters, graphData.edges, graphData.nodes, query, queryMatchedIds],
  );

  const selectedNode = selectedNodeId ? (nodeLookup.get(selectedNodeId) ?? null) : null;

  const onSelectNode = (id: string) => {
    setSelectedNodeId(id);
  };

  // Topbar search result / CommandPalette pick — switch to the Graph view
  // and ask the Scene Explorer to open an ego scene seeded on this node.
  // The EntityDetail slide-over also opens because selectedNodeId is set,
  // but now the actual graph contextualises the entity instead of being a
  // sidebar-only surprise.
  const onSearchPick = (id: string) => {
    setSelectedNodeId(id);
    setViewMode('graph');
    setPendingSceneSeed(id);
  };

  const onBrandClick = () => {
    // Brand always returns to the archive hub — the onboarding has its
    // own explicit entry via the pill toggle.
    goToArchive('#/archive');
    setViewMode('graph');
    setSelectedNodeId(null);
    setPendingSceneSeed(null);
    setSceneResetToken((n) => n + 1);
  };

  const persistPreferredView = (next: Route) => {
    try {
      window.localStorage.setItem('nhi_preferred_view', next);
    } catch {
      // ignore
    }
  };

  // Programmatic navigation helpers — keep hash, preference, and React
  // state consistent. Called by the pill toggle and the onboarding
  // handoff cards.
  const goToOnboarding = () => {
    persistPreferredView('onboarding');
    setRoute('onboarding');
    if (window.location.hash !== '#/onboarding') {
      window.history.pushState(null, '', '#/onboarding');
    }
  };

  const goToArchive = (hash = '#/archive') => {
    persistPreferredView('archive');
    try {
      window.localStorage.setItem('nhi_onboarding_complete', 'true');
    } catch {
      // ignore
    }
    setRoute('archive');
    // Parse any ?view/?focus params encoded in the hash the caller supplied.
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const params = new URLSearchParams(hash.slice(qIdx + 1));
      const v = params.get('view');
      const f = params.get('focus');
      if (v && (['graph', 'map', 'timeline', 'network', 'sources'] as ViewMode[]).includes(v as ViewMode)) {
        setViewMode(v as ViewMode);
      }
      if (f) {
        setSelectedNodeId(f);
        setPendingSceneSeed(f);
      }
    }
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
  };

  // Suppress unused-var warnings for values we may surface again in a later pass
  void minYear;
  void maxYear;
  void setQuery;
  void setFilters;
  void toggle;

  const statusNodesVisible = filteredGraph.nodes.length;
  const statusNodesTotal = graphData.nodes.length;

  return (
    <div
      className="nhi-root"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--nhi-ink)',
        overflow: 'hidden',
      }}
    >
      <Topbar
        viewMode={viewMode}
        onViewChange={setViewMode}
        searchIndex={searchIndex}
        nodeLookup={nodeLookup}
        onSelectNode={onSearchPick}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onBrandClick={onBrandClick}
        breakpoint={breakpoint}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        route={route}
        onRouteChange={(r) => (r === 'onboarding' ? goToOnboarding() : goToArchive())}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(n) => onSearchPick(n.id)}
        searchIndex={searchIndex}
        nodeLookup={nodeLookup}
        totalNodes={graphData.nodes.length}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {route === 'onboarding' && (
          <Onboarding onGoToArchive={goToArchive} breakpoint={breakpoint} />
        )}
        {route === 'archive' && viewMode === 'graph' && (
          <SceneExplorer
            onSelectEntity={onSelectNode}
            selectedId={selectedNodeId}
            breakpoint={breakpoint}
            pendingSeedId={pendingSceneSeed}
            onPendingSeedConsumed={() => setPendingSceneSeed(null)}
            resetToHubToken={sceneResetToken}
          />
        )}
        {route === 'archive' && viewMode === 'map' && (
          <MapView
            nodes={filteredGraph.nodes}
            onSelect={onSelectNode}
            breakpoint={breakpoint}
          />
        )}
        {route === 'archive' && viewMode === 'timeline' && (
          <TimelineView
            nodes={filteredGraph.nodes}
            edges={filteredGraph.edges}
            selectedId={selectedNodeId}
            onSelect={onSelectNode}
            breakpoint={breakpoint}
          />
        )}
        {route === 'archive' && viewMode === 'network' && (
          <NetworkView breakpoint={breakpoint} />
        )}
        {route === 'archive' && viewMode === 'sources' && (
          <SourcesView breakpoint={breakpoint} />
        )}
      </div>

      {route === 'archive' && selectedNode && (
        <EntityDetail
          node={selectedNode}
          edges={filteredGraph.edges}
          nodeLookup={nodeLookup}
          onClose={() => setSelectedNodeId(null)}
          onNavigate={onSelectNode}
          breakpoint={breakpoint}
        />
      )}

      <StatusBar
        screen={route === 'onboarding' ? 'ONBOARDING' : viewMode.toUpperCase()}
        nodesLoaded={statusNodesVisible}
        nodesTotal={statusNodesTotal}
        selectedId={selectedNodeId}
      />
    </div>
  );
}
