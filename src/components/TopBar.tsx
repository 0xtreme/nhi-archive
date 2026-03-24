import { useMemo } from 'react';
import type { ArchiveNode, ViewMode } from '../types';

interface TopBarProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: ArchiveNode[];
  onSuggestionSelect: (node: ArchiveNode) => void;
  activeFilterCount: number;
  loadedCounter: string;
  isLoading: boolean;
  loadingProgress: number;
}

const VIEW_OPTIONS: Array<{ id: ViewMode; label: string }> = [
  { id: 'graph', label: 'Graph' },
  { id: 'map', label: 'Map' },
  { id: 'timeline', label: 'Timeline' },
];

export function TopBar({
  viewMode,
  onViewChange,
  query,
  onQueryChange,
  suggestions,
  onSuggestionSelect,
  activeFilterCount,
  loadedCounter,
  isLoading,
  loadingProgress,
}: TopBarProps) {
  const subtitle = useMemo(() => {
    if (activeFilterCount === 0) {
      return loadedCounter;
    }

    return `${loadedCounter} • ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`;
  }, [activeFilterCount, loadedCounter]);

  return (
    <header className="topbar">
      <div className="brand">
        <p className="eyebrow">NHI Archive</p>
        <h1>NHI Archive Explorer</h1>
        <p className="subtitle">{subtitle}</p>
      </div>

      {isLoading && (
        <div className="loading-progress" role="status" aria-live="polite">
          <div className="loading-progress-track">
            <div
              className="loading-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, loadingProgress))}%` }}
            />
          </div>
          <small>Loading archive data... {Math.max(0, Math.min(100, loadingProgress))}%</small>
        </div>
      )}

      <div className="toolbar">
        <div className="view-toggle" role="tablist" aria-label="View mode">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              role="tab"
              aria-selected={viewMode === option.id}
              className={viewMode === option.id ? 'active' : ''}
              onClick={() => onViewChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          <div className="search-wrapper">
            <input
              aria-label="Search nodes"
              placeholder="Search label, summary, tags, location, sources..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />

            {query.trim().length > 0 && (
              <div className="search-results" role="listbox" aria-label="Search results">
                {suggestions.length === 0 && <p className="search-empty">No matching nodes</p>}
                {suggestions.map((node) => (
                  <button
                    key={node.id}
                    className="search-result-item"
                    onClick={() => onSuggestionSelect(node)}
                  >
                    <span>{node.label}</span>
                    <small>{node.node_type}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
