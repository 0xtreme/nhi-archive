import { CONFIDENCE_ORDER, NODE_TYPE_ORDER } from '../lib/archive';
import type { Confidence, FilterState, NodeType } from '../types';

interface FilterPanelProps {
  filters: FilterState;
  minYear: number;
  maxYear: number;
  availableTags: string[];
  availableClassifications: string[];
  onToggleNodeType: (nodeType: NodeType) => void;
  onToggleConfidence: (confidence: Confidence) => void;
  onToggleClassification: (classification: string) => void;
  onToggleTag: (tag: string) => void;
  onDateFromChange: (year: number) => void;
  onDateToChange: (year: number) => void;
  onReset: () => void;
}

export function FilterPanel({
  filters,
  minYear,
  maxYear,
  availableTags,
  availableClassifications,
  onToggleNodeType,
  onToggleConfidence,
  onToggleClassification,
  onToggleTag,
  onDateFromChange,
  onDateToChange,
  onReset,
}: FilterPanelProps) {
  return (
    <aside className="filters" aria-label="Filter panel">
      <div className="panel-header">
        <h2>Filters</h2>
        <button className="ghost" onClick={onReset}>
          Reset
        </button>
      </div>

      <section>
        <h3>Node Type</h3>
        <div className="chip-grid">
          {NODE_TYPE_ORDER.map((nodeType) => (
            <button
              key={nodeType}
              className={filters.nodeTypes.includes(nodeType) ? 'chip active' : 'chip'}
              onClick={() => onToggleNodeType(nodeType)}
            >
              {nodeType}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Confidence</h3>
        <div className="chip-grid">
          {CONFIDENCE_ORDER.map((confidence) => (
            <button
              key={confidence}
              className={filters.confidences.includes(confidence) ? 'chip active' : 'chip'}
              onClick={() => onToggleConfidence(confidence)}
            >
              {confidence}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Date Window</h3>
        <div className="range-group">
          <label>
            <span>From: {filters.dateFrom}</span>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={filters.dateFrom}
              onChange={(event) => onDateFromChange(Number(event.target.value))}
            />
          </label>

          <label>
            <span>To: {filters.dateTo}</span>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={filters.dateTo}
              onChange={(event) => onDateToChange(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      {availableClassifications.length > 0 && (
        <section>
          <h3>Classification</h3>
          <div className="chip-grid">
            {availableClassifications.map((classification) => (
              <button
                key={classification}
                className={
                  filters.classifications.includes(classification) ? 'chip active' : 'chip'
                }
                onClick={() => onToggleClassification(classification)}
              >
                {classification}
              </button>
            ))}
          </div>
        </section>
      )}

      {availableTags.length > 0 && (
        <section>
          <h3>Tags</h3>
          <div className="chip-grid scroll">
            {availableTags.slice(0, 40).map((tag) => (
              <button
                key={tag}
                className={filters.tags.includes(tag) ? 'chip active' : 'chip'}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
