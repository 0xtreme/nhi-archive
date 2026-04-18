import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { NetworkEdgeType } from './types';

interface Style {
  stroke: string;
  dash: string;
  width: number;
}

const STYLES: Record<NetworkEdgeType, Style> = {
  testified_together: { stroke: '#e24b4a', dash: '0',    width: 2 },
  same_program:       { stroke: '#185fa5', dash: '0',    width: 2 },
  advised_advocated:  { stroke: '#ba7517', dash: '6 4',  width: 1.8 },
  contradicted:       { stroke: '#6b7280', dash: '0',    width: 1.5 },
  succeeded_in_role:  { stroke: '#34d399', dash: '2 5',  width: 1.5 },
};

export const EDGE_META: Record<NetworkEdgeType, { label: string; style: Style }> = {
  testified_together: { label: 'Testified together', style: STYLES.testified_together },
  same_program:       { label: 'Same program',       style: STYLES.same_program },
  advised_advocated:  { label: 'Advised / advocated', style: STYLES.advised_advocated },
  contradicted:       { label: 'Contradicted',       style: STYLES.contradicted },
  succeeded_in_role:  { label: 'Succeeded in role',   style: STYLES.succeeded_in_role },
};

interface TypedEdgeData extends Record<string, unknown> {
  type: NetworkEdgeType;
  dim?: boolean;
}

/**
 * Single generic edge component that branches on data.type. Keeps the
 * React Flow edgeTypes map small (one registration) and the styling
 * legend-driven: every visual rule lives in STYLES above.
 */
export function TypedEdge(props: EdgeProps) {
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  const data = (props.data ?? {}) as TypedEdgeData;
  const style = STYLES[data.type] ?? STYLES.same_program;
  const dim = data.dim === true;
  return (
    <BaseEdge
      id={props.id}
      path={path}
      style={{
        stroke: style.stroke,
        strokeWidth: style.width,
        strokeDasharray: style.dash,
        opacity: dim ? 0.2 : 0.85,
        transition: 'opacity 150ms var(--nhi-ease)',
      }}
    />
  );
}
