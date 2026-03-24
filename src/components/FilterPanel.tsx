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
  onGraphNodeCapChange: (value: number) => void;
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
  onGraphNodeCapChange,
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

      <section>
        <h3>Graph Density</h3>
        <div className="range-group">
          <label>
            <span>Node cap: {filters.graphNodeCap}</span>
            <input
              type="range"
              min={80}
              max={900}
              step={20}
              value={filters.graphNodeCap}
              onChange={(event) => onGraphNodeCapChange(Number(event.target.value))}
            />
          </label>
          <small>Limits visible graph nodes to keep navigation responsive.</small>
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

      <section className="glossary">
        <h3>Legend / Glossary</h3>
        <p>
          <strong>CE1:</strong> distant visual encounter
        </p>
        <p>
          <strong>CE2:</strong> physical effects near sighting
        </p>
        <p>
          <strong>CE3:</strong> reported occupant entity encounter
        </p>
        <p>
          <strong>NL:</strong> nocturnal light report
        </p>
        <p>
          <strong>Tag cleanup:</strong> birth/death/year taxonomy tags are now suppressed from bulk imports.
        </p>
        <p>
          <strong>Tag matching:</strong> selecting multiple tags now matches any selected tag.
        </p>
      </section>
    </aside>
  );
}
