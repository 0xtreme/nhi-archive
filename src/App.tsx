import { useEffect, useMemo, useState } from 'react';
import type MiniSearch from 'minisearch';
import {
  buildDefaultFilters,
  filterGraph,
  getYear,
  normalizeGraphData,
  NODE_TYPE_ORDER,
} from './lib/archive';
import { loadChunkedGraph, searchNodeIds } from './lib/chunkedGraph';
import { CommandPalette } from './components-new/CommandPalette';
import { EntityDetail } from './components-new/EntityDetail';
import { MapView } from './components-new/MapView';
import { SourcesView } from './components-new/SourcesView';
import { StatusBar } from './components-new/StatusBar';
import { TimelineView } from './components-new/TimelineView';
import { Topbar } from './components-new/Topbar';
import { GraphView } from './components-new/graph/GraphView';
import type {
  ArchiveGraph,
  ArchiveNode,
  Confidence,
  FilterState,
  NodeType,
  ViewMode,
} from './types';

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1280) return 'tablet';
    return 'desktop';
  });

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

  const availablePipelineSources = useMemo(() => {
    const sources = new Set<string>();
    for (const node of graphData.nodes) {
      const ps = (node as ArchiveNode & { pipeline_source?: string }).pipeline_source;
      if (typeof ps === 'string' && ps.length > 0) sources.add(ps);
    }
    return Array.from(sources).sort((l, r) => l.localeCompare(r));
  }, [graphData.nodes]);

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

  const onToggleNodeType = (nodeType: NodeType) => {
    setFilters((previous) => ({
      ...previous,
      nodeTypes: toggle(previous.nodeTypes, nodeType, NODE_TYPE_ORDER),
    }));
  };

  const onToggleConfidence = (confidence: Confidence) => {
    setFilters((previous) => ({
      ...previous,
      confidences: toggle(previous.confidences, confidence, [
        'high',
        'medium',
        'low',
        'disputed',
      ]),
    }));
  };

  const onTogglePipelineSource = (src: string) => {
    setFilters((previous) => ({
      ...previous,
      pipelineSources: previous.pipelineSources.includes(src)
        ? previous.pipelineSources.filter((item) => item !== src)
        : [...previous.pipelineSources, src],
    }));
  };

  const onGraphNodeCapChange = (graphNodeCap: number) => {
    setFilters((previous) => ({ ...previous, graphNodeCap }));
  };

  // Suppress unused-var warnings for values we may surface again in a later pass
  void minYear;
  void maxYear;
  void setQuery;

  const statusNodesVisible =
    viewMode === 'graph' ? filteredGraph.nodes.length : filteredGraph.nodes.length;
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
        onViewChange={(v) => {
          setViewMode(v);
          setFiltersOpen(false);
        }}
        searchIndex={searchIndex}
        nodeLookup={nodeLookup}
        onSelectNode={onSelectNode}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        breakpoint={breakpoint}
        openFilters={
          breakpoint === 'mobile' && viewMode === 'graph'
            ? () => setFiltersOpen(true)
            : undefined
        }
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(n) => onSelectNode(n.id)}
        searchIndex={searchIndex}
        nodeLookup={nodeLookup}
        totalNodes={graphData.nodes.length}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'graph' && (
          <GraphView
            nodes={filteredGraph.nodes}
            edges={filteredGraph.edges}
            selectedId={selectedNodeId}
            onSelect={onSelectNode}
            filters={filters}
            totalNodes={graphData.nodes.length}
            availablePipelineSources={availablePipelineSources}
            onToggleNodeType={onToggleNodeType}
            onToggleConfidence={onToggleConfidence}
            onTogglePipelineSource={onTogglePipelineSource}
            onGraphNodeCapChange={onGraphNodeCapChange}
            breakpoint={breakpoint}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
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
