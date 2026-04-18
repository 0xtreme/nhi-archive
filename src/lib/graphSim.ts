/**
 * Force-directed graph simulation — pure physics, no React, no DOM.
 * Adapted from mockup/graph-sim.jsx. Runs O(n²) repulsion with a far-field
 * cutoff; fine for the density-capped visible subset (≤~400 nodes).
 *
 * Call once per "layout commit" (e.g. when the visible node set changes);
 * the nodes passed in are mutated with x/y/vx/vy in place.
 */

export interface SimNode {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  core?: boolean;
  degree?: number;
  [key: string]: unknown;
}

export interface SimEdge {
  source: string;
  target: string;
  rel?: string;
}

export interface SimOptions {
  iterations?: number;
  width?: number;
  height?: number;
  chargeBase?: number;
  linkDist?: number;
  linkStr?: number;
  center?: number;
}

export interface SimResult {
  neighbors: Map<string, Set<string>>;
}

export function runSimulation(
  nodes: SimNode[],
  edges: SimEdge[],
  options: SimOptions = {},
): SimResult {
  const {
    iterations = 180,
    width = 1000,
    height = 700,
    chargeBase = -80,
    linkDist = 60,
    linkStr = 0.04,
    center = 0.006,
  } = options;

  const n = nodes.length;
  const GA = Math.PI * (3 - Math.sqrt(5));

  // Initial placement — golden-spiral for any node without x/y set.
  for (let i = 0; i < n; i += 1) {
    const nd = nodes[i];
    if (nd.x != null && nd.y != null) continue;
    const r = 20 + Math.sqrt(i) * 14;
    const a = i * GA;
    nd.x = width / 2 + Math.cos(a) * r;
    nd.y = height / 2 + Math.sin(a) * r;
    nd.vx = 0;
    nd.vy = 0;
  }

  const byId = new Map<string, SimNode>(nodes.map((x) => [x.id, x]));

  interface Link {
    a: SimNode;
    b: SimNode;
    rel?: string;
  }
  const linkList: Link[] = [];
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (a && b) linkList.push({ a, b, rel: e.rel });
  }

  const neighbors = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
    if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
    neighbors.get(e.source)!.add(e.target);
    neighbors.get(e.target)!.add(e.source);
  }

  for (let it = 0; it < iterations; it += 1) {
    const alpha = 1 - it / iterations;

    // Repulsion — O(n²) with far-field cut.
    for (let i = 0; i < n; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j += 1) {
        const b = nodes[j];
        let dx = (b.x as number) - (a.x as number);
        let dy = (b.y as number) - (a.y as number);
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = dx * dx + dy * dy;
        }
        if (d2 > 28000) continue;
        const d = Math.sqrt(d2);
        const charge =
          chargeBase * (a.core ? 2.2 : 1) * (b.core ? 2.2 : 1);
        const f = (charge / d2) * alpha;
        const ux = dx / d;
        const uy = dy / d;
        (a.vx as number) -= ux * f;
        (a.vy as number) -= uy * f;
        (b.vx as number) += ux * f;
        (b.vy as number) += uy * f;
      }
    }

    // Links — spring-like attraction toward linkDist.
    for (const { a, b } of linkList) {
      const dx = (b.x as number) - (a.x as number);
      const dy = (b.y as number) - (a.y as number);
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const diff = (d - linkDist) * linkStr * alpha;
      const fx = (dx / d) * diff;
      const fy = (dy / d) * diff;
      (a.vx as number) += fx;
      (a.vy as number) += fy;
      (b.vx as number) -= fx;
      (b.vy as number) -= fy;
    }

    // Gentle centering + damping + integration.
    for (const nd of nodes) {
      (nd.vx as number) += (width / 2 - (nd.x as number)) * center * alpha;
      (nd.vy as number) += (height / 2 - (nd.y as number)) * center * alpha;
      (nd.vx as number) *= 0.86;
      (nd.vy as number) *= 0.86;
      (nd.x as number) += nd.vx as number;
      (nd.y as number) += nd.vy as number;
    }
  }

  // Normalize bounding box into a nominal 1000x700 display area.
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const nd of nodes) {
    xmin = Math.min(xmin, nd.x as number);
    xmax = Math.max(xmax, nd.x as number);
    ymin = Math.min(ymin, nd.y as number);
    ymax = Math.max(ymax, nd.y as number);
  }
  const sx = 900 / ((xmax - xmin) || 1);
  const sy = 620 / ((ymax - ymin) || 1);
  const s = Math.min(sx, sy);
  for (const nd of nodes) {
    nd.x = ((nd.x as number) - xmin) * s + 50 + (900 - (xmax - xmin) * s) / 2;
    nd.y = ((nd.y as number) - ymin) * s + 40 + (620 - (ymax - ymin) * s) / 2;
  }

  return { neighbors };
}
