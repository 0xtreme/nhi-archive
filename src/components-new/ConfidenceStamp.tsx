import { CONFIDENCE_META } from '../lib/taxonomy';
import type { Confidence } from '../types';

interface ConfidenceStampProps {
  level: Confidence;
  showBars?: boolean;
}

export function ConfidenceStamp({ level, showBars = true }: ConfidenceStampProps) {
  const meta = CONFIDENCE_META[level];
  if (!meta) return null;
  return (
    <span className={`nhi-stamp ${meta.inkClass}`}>
      {showBars && (
        <span className="nhi-bars" style={{ color: meta.color }}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ opacity: i < meta.bars ? 1 : 0.18 }} />
          ))}
        </span>
      )}
      {meta.label}
    </span>
  );
}
