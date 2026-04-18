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
import type { ArchiveGraph, ArchiveNode, FilterState, ViewMode } from './types';

const EMPTY_GRAPH: ArchiveGraph = { generated_at: '', nodes: [], edges: [] };

function toggle<T>(values: T[], value: T, allValues: T[]): T[] {
  if (values.includes(value)) {
    const withoutValue = values.filter((item) => item !== value);
    return withoutValue.length === 0 ? [...allValues] : withoutValue;
  }
  return [...values, value];
}

export default function App() {
  const [graphData, setGraphData] = useState<ArchiveGraph>(EMPTY_GRAPH);
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
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
    setViewMode('graph');
    setSelectedNodeId(null);
    setPendingSceneSeed(null);
    setSceneResetToken((n) => n + 1);
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
        {viewMode === 'graph' && (
          <SceneExplorer
            onSelectEntity={onSelectNode}
            selectedId={selectedNodeId}
            breakpoint={breakpoint}
            pendingSeedId={pendingSceneSeed}
            onPendingSeedConsumed={() => setPendingSceneSeed(null)}
            resetToHubToken={sceneResetToken}
          />
        )}
        {viewMode === 'map' && (
          <MapView
            nodes={filteredGraph.nodes}
            onSelect={onSelectNode}
            breakpoint={breakpoint}
          />
        )}
        {viewMode === 'timeline' && (
          <TimelineView
            nodes={filteredGraph.nodes}
            edges={filteredGraph.edges}
            selectedId={selectedNodeId}
            onSelect={onSelectNode}
            breakpoint={breakpoint}
          />
        )}
        {viewMode === 'network' && <NetworkView breakpoint={breakpoint} />}
        {viewMode === 'sources' && <SourcesView breakpoint={breakpoint} />}
      </div>

      {selectedNode && (
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
        screen={viewMode.toUpperCase()}
        nodesLoaded={statusNodesVisible}
        nodesTotal={statusNodesTotal}
        selectedId={selectedNodeId}
      />
    </div>
  );
}
