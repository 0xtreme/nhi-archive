import { useEffect, useMemo, useState } from 'react';
import { DetailPanel } from './components/DetailPanel';
import { FilterPanel } from './components/FilterPanel';
import { GraphView } from './components/GraphView';
import { MapView } from './components/MapView';
import { TimelineView } from './components/TimelineView';
import { TopBar } from './components/TopBar';
import { fallbackGraph } from './data/fallbackGraph';
import {
  buildDefaultFilters,
  filterGraph,
  getYear,
  normalizeGraphData,
  NODE_TYPE_ORDER,
  summarizeLoadedNodes,
} from './lib/archive';
import type { ArchiveGraph, ArchiveNode, Confidence, FilterState, NodeType, ViewMode } from './types';

const GRAPH_SKELETON_SIZE = 350;
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

    const loadGraph = async () => {
      try {
        const response = await fetch('./data/graph.seed.json', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Dataset load failed: ${response.status}`);
        }

        const totalBytes = Number(response.headers.get('content-length') ?? '0');
        let payload: ArchiveGraph;

        if (response.body && totalBytes > 0) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            if (value) {
              chunks.push(value);
              receivedBytes += value.byteLength;
              if (isMounted) {
                const progress = Math.max(1, Math.min(98, Math.round((receivedBytes / totalBytes) * 100)));
                setLoadingProgress(progress);
              }
            }
          }

          const merged = new Uint8Array(receivedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }

          payload = JSON.parse(new TextDecoder().decode(merged)) as ArchiveGraph;
        } else {
          payload = (await response.json()) as ArchiveGraph;
          if (isMounted) {
            setLoadingProgress(95);
          }
        }

        if (!isMounted) {
          return;
        }

        const normalized = normalizeGraphData(payload);
        setGraphData(normalized);
        setFilters(buildDefaultFilters(normalized.nodes));
        setLoadingProgress(100);
      } catch {
        // Falls back to bundled seed data when external data file is unavailable.
      } finally {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              setIsLoadingDataset(false);
            }
          }, 220);
        }
      }
    };

    loadGraph();

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

  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();

  const filteredGraph = useMemo(
    () => filterGraph(graphData.nodes, graphData.edges, filters, query),
    [filters, graphData.edges, graphData.nodes, query],
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

  const graphSkeletonIds = useMemo(() => {
    const initial = new Set(degreeOrderedNodeIds.slice(0, GRAPH_SKELETON_SIZE));

    if (!selectedNodeId) {
      return initial;
    }

    initial.add(selectedNodeId);
    for (const edge of filteredGraph.edges) {
      if (edge.from_node_id === selectedNodeId) {
        initial.add(edge.to_node_id);
      }
      if (edge.to_node_id === selectedNodeId) {
        initial.add(edge.from_node_id);
      }
    }

    return initial;
  }, [degreeOrderedNodeIds, filteredGraph.edges, selectedNodeId]);

  const graphNodes = useMemo(
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

  const selectedNode = selectedNodeId ? nodeLookup.get(selectedNodeId) ?? null : null;

  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return graphData.nodes.filter((node) => textMatch(node, query)).slice(0, 8);
  }, [graphData.nodes, query]);

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
          onToggleNodeType={onToggleNodeType}
          onToggleConfidence={onToggleConfidence}
          onToggleClassification={onToggleClassification}
          onToggleTag={onToggleTag}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
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
