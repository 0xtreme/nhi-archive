import { useEffect, useMemo, useState } from 'react';
import type MiniSearch from 'minisearch';
import { DetailPanel } from './components/DetailPanel';
import { FilterPanel } from './components/FilterPanel';
import { GraphView } from './components/GraphView';
import { MapView } from './components/MapView';
import { TimelineView } from './components/TimelineView';
import { TopBar } from './components/TopBar';
import { fallbackGraph } from './data/fallbackGraph';
import {
  buildDefaultFilters,
  DEFAULT_GRAPH_NODE_CAP,
  filterGraph,
  getYear,
  normalizeGraphData,
  NODE_TYPE_ORDER,
  summarizeLoadedNodes,
} from './lib/archive';
import { loadChunkedGraph, searchNodeIds } from './lib/chunkedGraph';
import type { ArchiveGraph, ArchiveNode, Confidence, FilterState, NodeType, ViewMode } from './types';

const normalizedFallbackGraph = normalizeGraphData(fallbackGraph);

function toggle<T>(values: T[], value: T, allValues: T[]): T[] {
  if (values.includes(value)) {
    const withoutValue = values.filter((item) => item !== value);
    return withoutValue.length === 0 ? [...allValues] : withoutValue;
  }

  return [...values, value];
}

function textMatch(node: ArchiveNode, query: string): boolean {
  const loweredQuery = query.trim().toLowerCase();
  if (!loweredQuery) {
    return false;
  }

  const haystack = [node.label, node.summary, node.location_name, ...node.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(loweredQuery);
}

export default function App() {
  const [graphData, setGraphData] = useState<ArchiveGraph>(normalizedFallbackGraph);
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(() =>
    buildDefaultFilters(normalizedFallbackGraph.nodes),
  );
  const [isLoadingDataset, setIsLoadingDataset] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const applyGraph = (payload: ArchiveGraph, index: MiniSearch | null) => {
      if (!isMounted) return;
      const normalized = normalizeGraphData(payload);
      setGraphData(normalized);
      setSearchIndex(index);
      setFilters(buildDefaultFilters(normalized.nodes));
      setLoadingProgress(100);
    };

    const loadMonolithic = async () => {
      const response = await fetch('./data/graph.seed.json', {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`graph.seed -> ${response.status}`);
      const payload = (await response.json()) as ArchiveGraph;
      if (isMounted) setLoadingProgress(95);
      applyGraph(payload, null);
    };

    const load = async () => {
      try {
        const { graph, searchIndex: idx } = await loadChunkedGraph(controller.signal, {
          onProgress: (pct) => {
            if (isMounted) setLoadingProgress(pct);
          },
        });
        applyGraph(graph, idx);
      } catch {
        // Chunked artifacts unavailable (e.g. stale cache, partial deploy).
        // Fall back to the monolithic seed; if that also fails, the bundled
        // fallbackGraph already in state stays.
        try {
          await loadMonolithic();
        } catch {
          // intentionally silent — fallback graph remains in state.
        }
      } finally {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) setIsLoadingDataset(false);
          }, 220);
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
    for (const node of graphData.nodes) {
      lookup.set(node.id, node);
    }
    return lookup;
  }, [graphData.nodes]);

  const years = useMemo(
    () =>
      graphData.nodes
        .map((node) => getYear(node.date_start))
        .filter((year): year is number => year !== null),
    [graphData.nodes],
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const node of graphData.nodes) {
      if (node.node_type !== 'incident') {
        continue;
      }
      node.tags.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags).sort((left, right) => left.localeCompare(right));
  }, [graphData.nodes]);

  const availableClassifications = useMemo(() => {
    const classifications = new Set<string>();
    for (const node of graphData.nodes) {
      if (node.classification) {
        classifications.add(node.classification);
      }
    }
    return Array.from(classifications).sort((left, right) => left.localeCompare(right));
  }, [graphData.nodes]);

  const availablePipelineSources = useMemo(() => {
    const sources = new Set<string>();
    for (const node of graphData.nodes) {
      const ps = (node as ArchiveNode & { pipeline_source?: string }).pipeline_source;
      if (typeof ps === 'string' && ps.length > 0) sources.add(ps);
    }
    return Array.from(sources).sort((left, right) => left.localeCompare(right));
  }, [graphData.nodes]);

  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();

  const queryMatchedIds = useMemo(() => {
    if (!searchIndex) return undefined;
    return searchNodeIds(searchIndex, query);
  }, [searchIndex, query]);

  const filteredGraph = useMemo(
    () => filterGraph(graphData.nodes, graphData.edges, filters, query, queryMatchedIds),
    [filters, graphData.edges, graphData.nodes, query, queryMatchedIds],
  );

  const degreeOrderedNodeIds = useMemo(() => {
    const degree = new Map<string, number>();
    for (const edge of filteredGraph.edges) {
      degree.set(edge.from_node_id, (degree.get(edge.from_node_id) ?? 0) + 1);
      degree.set(edge.to_node_id, (degree.get(edge.to_node_id) ?? 0) + 1);
    }

    return filteredGraph.nodes
      .map((node) => ({ id: node.id, degree: degree.get(node.id) ?? 0 }))
      .sort((left, right) => right.degree - left.degree)
      .map((entry) => entry.id);
  }, [filteredGraph.edges, filteredGraph.nodes]);

  const baseGraphSkeletonIds = useMemo(
    () =>
      new Set(degreeOrderedNodeIds.slice(0, Math.max(80, Math.min(1000, filters.graphNodeCap)))),
    [degreeOrderedNodeIds, filters.graphNodeCap],
  );

  const graphSkeletonIds = useMemo(() => {
    if (!selectedNodeId || baseGraphSkeletonIds.has(selectedNodeId)) {
      return baseGraphSkeletonIds;
    }

    const focused = new Set(baseGraphSkeletonIds);
    focused.add(selectedNodeId);
    for (const edge of filteredGraph.edges) {
      if (edge.from_node_id === selectedNodeId) {
        focused.add(edge.to_node_id);
      }
      if (edge.to_node_id === selectedNodeId) {
        focused.add(edge.from_node_id);
      }
    }

    return focused;
  }, [baseGraphSkeletonIds, filteredGraph.edges, selectedNodeId]);

  const provisionalGraphNodes = useMemo(
    () => filteredGraph.nodes.filter((node) => graphSkeletonIds.has(node.id)),
    [filteredGraph.nodes, graphSkeletonIds],
  );

  const graphEdges = useMemo(
    () =>
      filteredGraph.edges.filter(
        (edge) => graphSkeletonIds.has(edge.from_node_id) && graphSkeletonIds.has(edge.to_node_id),
      ),
    [filteredGraph.edges, graphSkeletonIds],
  );

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of graphEdges) {
      ids.add(edge.from_node_id);
      ids.add(edge.to_node_id);
    }
    return ids;
  }, [graphEdges]);

  const forceIncludeNodeId = useMemo(() => {
    if (!selectedNodeId || !graphSkeletonIds.has(selectedNodeId)) {
      return null;
    }
    return connectedIds.has(selectedNodeId) ? null : selectedNodeId;
  }, [connectedIds, graphSkeletonIds, selectedNodeId]);

  const graphNodes = useMemo(() => {
    if (forceIncludeNodeId === null) {
      return provisionalGraphNodes.filter((node) => connectedIds.has(node.id));
    }

    return provisionalGraphNodes.filter(
      (node) => connectedIds.has(node.id) || node.id === forceIncludeNodeId,
    );
  }, [connectedIds, forceIncludeNodeId, provisionalGraphNodes]);

  const selectedNode = selectedNodeId ? nodeLookup.get(selectedNodeId) ?? null : null;

  const suggestions = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (searchIndex) {
      const hits = searchIndex.search(trimmed, { prefix: true }).slice(0, 8);
      const results: ArchiveNode[] = [];
      for (const hit of hits) {
        const node = nodeLookup.get(hit.id as string);
        if (node) results.push(node);
      }
      return results;
    }

    return graphData.nodes.filter((node) => textMatch(node, query)).slice(0, 8);
  }, [graphData.nodes, nodeLookup, query, searchIndex]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.nodeTypes.length !== NODE_TYPE_ORDER.length) {
      count += 1;
    }
    if (filters.confidences.length !== 4) {
      count += 1;
    }
    if (filters.classifications.length > 0) {
      count += 1;
    }
    if (filters.tags.length > 0) {
      count += 1;
    }
    if (filters.dateFrom !== minYear || filters.dateTo !== maxYear) {
      count += 1;
    }
    if (filters.graphNodeCap !== DEFAULT_GRAPH_NODE_CAP) {
      count += 1;
    }
    if (query.trim().length > 0) {
      count += 1;
    }

    return count;
  }, [filters, maxYear, minYear, query]);

  const loadedCounter =
    viewMode === 'graph'
      ? summarizeLoadedNodes(filteredGraph.nodes.length, graphNodes.length)
      : summarizeLoadedNodes(graphData.nodes.length, filteredGraph.nodes.length);

  const onToggleNodeType = (nodeType: NodeType) => {
    setFilters((previous) => ({
      ...previous,
      nodeTypes: toggle(previous.nodeTypes, nodeType, NODE_TYPE_ORDER),
    }));
  };

  const onToggleConfidence = (confidence: Confidence) => {
    setFilters((previous) => ({
      ...previous,
      confidences: toggle(previous.confidences, confidence, ['high', 'medium', 'low', 'disputed']),
    }));
  };

  const onToggleClassification = (classification: string) => {
    setFilters((previous) => ({
      ...previous,
      classifications: previous.classifications.includes(classification)
        ? previous.classifications.filter((item) => item !== classification)
        : [...previous.classifications, classification],
    }));
  };

  const onToggleTag = (tag: string) => {
    setFilters((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag)
        ? previous.tags.filter((item) => item !== tag)
        : [...previous.tags, tag],
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

  const onDateFromChange = (year: number) => {
    setFilters((previous) => ({
      ...previous,
      dateFrom: Math.min(year, previous.dateTo),
    }));
  };

  const onDateToChange = (year: number) => {
    setFilters((previous) => ({
      ...previous,
      dateTo: Math.max(year, previous.dateFrom),
    }));
  };

  const onResetFilters = () => {
    setFilters(buildDefaultFilters(graphData.nodes));
    setQuery('');
  };

  const onGraphNodeCapChange = (graphNodeCap: number) => {
    setFilters((previous) => ({
      ...previous,
      graphNodeCap,
    }));
  };

  const onSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const onSelectSearchSuggestion = (node: ArchiveNode) => {
    setSelectedNodeId(node.id);
    setQuery(node.label);

    if (node.node_type === 'incident' && typeof node.lat === 'number' && typeof node.lng === 'number') {
      setViewMode('map');
      return;
    }

    setViewMode('graph');
  };

  const renderView = () => {
    if (viewMode === 'map') {
      return (
        <MapView
          nodes={filteredGraph.nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      );
    }

    if (viewMode === 'timeline') {
      return (
        <TimelineView
          nodes={filteredGraph.nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      );
    }

    return (
      <GraphView
        nodes={graphNodes}
        edges={graphEdges}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
      />
    );
  };

  return (
    <div className="app-shell">
      <TopBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        query={query}
        onQueryChange={setQuery}
        suggestions={suggestions}
        onSuggestionSelect={onSelectSearchSuggestion}
        activeFilterCount={activeFilterCount}
        loadedCounter={loadedCounter}
        isLoading={isLoadingDataset}
        loadingProgress={loadingProgress}
      />

      <div className="active-chips" aria-live="polite">
        {filters.tags.map((tag) => (
          <button key={tag} onClick={() => onToggleTag(tag)}>
            tag:{tag}
          </button>
        ))}
        {filters.classifications.map((classification) => (
          <button key={classification} onClick={() => onToggleClassification(classification)}>
            class:{classification}
          </button>
        ))}
      </div>

      <main className="layout">
      <FilterPanel
        filters={filters}
        minYear={minYear}
        maxYear={maxYear}
        availableTags={availableTags}
        availableClassifications={availableClassifications}
        availablePipelineSources={availablePipelineSources}
        onToggleNodeType={onToggleNodeType}
        onToggleConfidence={onToggleConfidence}
        onToggleClassification={onToggleClassification}
        onToggleTag={onToggleTag}
        onTogglePipelineSource={onTogglePipelineSource}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onGraphNodeCapChange={onGraphNodeCapChange}
        onReset={onResetFilters}
      />

        {renderView()}

        <DetailPanel
          node={selectedNode}
          edges={filteredGraph.edges}
          nodeLookup={nodeLookup}
          onSelectNode={onSelectNode}
        />
      </main>
    </div>
  );
}
