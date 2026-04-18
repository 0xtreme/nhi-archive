import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArchiveMeta, Perspective, ScenePayload } from '../../lib/api';
import { api } from '../../lib/api';
import { RadialFocus } from '../graph/RadialFocus';
import { NodeGlyph } from '../NodeGlyph';
import type { ArchiveEdge, ArchiveNode, NodeType } from '../../types';
import { LandingHub } from './LandingHub';
import { SceneCanvas } from './SceneCanvas';

interface SceneExplorerProps {
  onSelectEntity: (id: string) => void;
  selectedId: string | null;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

type Mode = 'loading' | 'hub' | 'scene' | 'error';
type Layout = 'radial' | 'constellation';

interface SceneState {
  title: string;
  subtitle?: string;
  seedIds: string[];
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  breadcrumb: Array<{ id?: string; slug?: string; label: string }>;
}

/**
 * Top-level state machine for the new Graph view.
 *
 * Modes:
 *   loading — fetching /api/meta + /api/perspectives on mount
 *   hub     — landing: perspectives + stats + search
 *   scene   — an active subgraph; user expands / selects within it
 *   error   — API unreachable (likely the backend isn't running)
 *
 * Server calls:
 *   /api/meta, /api/perspectives (initial)
 *   /api/perspective/:slug       (on perspective pick)
 *   /api/ego/:id                 (on search-result pick)
 *   /api/expand/:id              (on double-click in scene)
 */
export function SceneExplorer({ onSelectEntity, selectedId, breakpoint }: SceneExplorerProps) {
  const [mode, setMode] = useState<Mode>('loading');
  const [meta, setMeta] = useState<ArchiveMeta | null>(null);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [scene, setScene] = useState<SceneState | null>(null);
  const [loadingScene, setLoadingScene] = useState(false);
  const [showCommunities, setShowCommunities] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('radial');
  const [focalId, setFocalId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [m, ps] = await Promise.all([
          api.meta(ctrl.signal),
          api.perspectives(ctrl.signal),
        ]);
        setMeta(m);
        setPerspectives(ps);
        setMode('hub');
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'API unavailable');
        setMode('error');
      }
    })();
    return () => ctrl.abort();
  }, []);

  const applyScenePayload = (
    title: string,
    subtitle: string | undefined,
    payload: ScenePayload,
    breadcrumb: SceneState['breadcrumb'],
  ) => {
    setScene({
      title,
      subtitle,
      seedIds: payload.seed_ids,
      nodes: payload.nodes,
      edges: payload.edges,
      breadcrumb,
    });
    setMode('scene');

    // Default focal = highest-degree seed when multiple, or the single seed
    const degree = new Map<string, number>();
    for (const e of payload.edges) {
      degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
      degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
    }
    const ranked = [...payload.seed_ids].sort(
      (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0),
    );
    setFocalId(ranked[0] ?? null);
  };

  const pickPerspective = useCallback(
    async (slug: string) => {
      const p = perspectives.find((x) => x.slug === slug);
      if (!p) return;
      setLoadingScene(true);
      try {
        const payload = await api.perspective(slug);
        applyScenePayload(payload.perspective.title, payload.perspective.description, payload, [
          { slug, label: p.title },
        ]);
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'failed to load perspective');
      } finally {
        setLoadingScene(false);
      }
    },
    [perspectives],
  );

  const pickEntity = useCallback(async (id: string) => {
    setLoadingScene(true);
    try {
      const [payload, entity] = await Promise.all([
        api.ego(id, { depth: 1, limit: 80 }),
        api.entity(id),
      ]);
      applyScenePayload(entity.label, `ego · depth 1 · ${payload.nodes.length} nodes`, payload, [
        { id, label: entity.label },
      ]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'failed to load entity');
    } finally {
      setLoadingScene(false);
    }
  }, []);

  const expandNode = useCallback(
    async (id: string) => {
      if (!scene) return;
      setLoadingScene(true);
      try {
        const payload = await api.expand(id, { limit: 30 });
        // Merge new nodes + edges into the current scene
        const byId = new Map(scene.nodes.map((n) => [n.id, n]));
        for (const n of payload.nodes) byId.set(n.id, n);
        const edgeKey = (e: ArchiveEdge) => e.id;
        const edgeById = new Map(scene.edges.map((e) => [edgeKey(e), e]));
        for (const e of payload.edges) edgeById.set(edgeKey(e), e);
        const nextNodes = [...byId.values()];
        const nextEdges = [...edgeById.values()];
        const expanded = scene.nodes.find((n) => n.id === id);
        const newBreadcrumb = [...scene.breadcrumb];
        if (expanded) newBreadcrumb.push({ id, label: 'expand ' + expanded.label });
        setScene({
          ...scene,
          nodes: nextNodes,
          edges: nextEdges,
          breadcrumb: newBreadcrumb,
        });
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'expand failed');
      } finally {
        setLoadingScene(false);
      }
    },
    [scene],
  );

  const rewindTo = useCallback(
    async (index: number) => {
      if (!scene) return;
      if (index < 0) {
        setScene(null);
        setMode('hub');
        return;
      }
      const target = scene.breadcrumb[index];
      if (target.slug) {
        await pickPerspective(target.slug);
      } else if (target.id) {
        await pickEntity(target.id);
      }
    },
    [scene, pickPerspective, pickEntity],
  );

  const goHome = () => {
    setScene(null);
    setMode('hub');
  };

  const communityCount = useMemo(() => {
    if (!scene) return 0;
    const cs = new Set<number>();
    for (const n of scene.nodes) {
      const c = n.community_id as number | null | undefined;
      if (c != null) cs.add(c);
    }
    return cs.size;
  }, [scene]);

  if (mode === 'loading') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          background: 'var(--nhi-ink)',
        }}
      >
        LOADING ARCHIVE <span className="nhi-blink">▍</span>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          background: 'var(--nhi-ink)',
        }}
      >
        <div
          className="nhi-display"
          style={{ fontSize: 18, color: 'var(--nhi-rose)', letterSpacing: '0.12em' }}
        >
          API UNREACHABLE
        </div>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            color: 'var(--nhi-fog)',
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          The Scene Explorer depends on the Fastify server (default port 8787).
          In development run `npm run server` in another terminal or use
          `npm run dev:full` to start both at once.
        </div>
        <div
          className="nhi-mono"
          style={{
            fontSize: 10,
            color: 'var(--nhi-fog-2)',
            maxWidth: 520,
            marginTop: 4,
          }}
        >
          {apiError}
        </div>
      </div>
    );
  }

  if (mode === 'hub') {
    return (
      <LandingHub
        meta={meta}
        perspectives={perspectives}
        onPickPerspective={pickPerspective}
        onPickEntity={pickEntity}
      />
    );
  }

  if (!scene) return null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid var(--nhi-hairline)',
          background: 'rgba(10,14,26,0.6)',
          backdropFilter: 'blur(4px)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={goHome}
          className="nhi-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog-2)',
            padding: '4px 8px',
            border: '1px solid var(--nhi-hairline-2)',
          }}
        >
          ← HUB
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {scene.breadcrumb.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && (
                <span
                  className="nhi-mono"
                  style={{ fontSize: 10, color: 'var(--nhi-fog)' }}
                >
                  →
                </span>
              )}
              <button
                onClick={() => rewindTo(i)}
                className="nhi-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color:
                    i === scene.breadcrumb.length - 1
                      ? 'var(--nhi-bone)'
                      : 'var(--nhi-fog-2)',
                  padding: '4px 6px',
                  background: i === scene.breadcrumb.length - 1 ? 'var(--nhi-ink-3)' : 'transparent',
                  border: '1px solid var(--nhi-hairline)',
                }}
              >
                {b.label}
              </button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div
          className="nhi-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog)',
          }}
        >
          {scene.nodes.length} NODES · {scene.edges.length} EDGES
          {communityCount > 0 ? ' · ' + communityCount + ' COMMUNITIES' : ''}
          {loadingScene ? ' · LOADING…' : ''}
        </div>

        <div style={{ display: 'flex', border: '1px solid var(--nhi-hairline-2)' }}>
          {(['radial', 'constellation'] as const).map((k, i) => (
            <button
              key={k}
              onClick={() => setLayout(k)}
              className="nhi-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                padding: '4px 10px',
                background: layout === k ? 'var(--nhi-ink-4)' : 'transparent',
                color: layout === k ? 'var(--nhi-sky)' : 'var(--nhi-fog-2)',
                borderRight: i === 0 ? '1px solid var(--nhi-hairline-2)' : 'none',
              }}
            >
              {k === 'radial' ? '◎ RADIAL' : '⎔ FORCE'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCommunities((v) => !v)}
          className="nhi-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            padding: '4px 8px',
            border: '1px solid ' + (showCommunities ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline-2)'),
            background: showCommunities ? 'rgba(196,181,253,0.12)' : 'transparent',
            color: showCommunities ? 'var(--nhi-violet)' : 'var(--nhi-fog-2)',
          }}
        >
          {showCommunities ? '◉' : '○'} COMMUNITY HALOS
        </button>
      </div>

      {scene.seedIds.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'rgba(10,14,26,0.4)',
            borderBottom: '1px solid var(--nhi-hairline)',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <span className="nhi-micro" style={{ marginRight: 4 }}>
            FOCAL
          </span>
          {scene.seedIds.map((sid) => {
            const n = scene.nodes.find((x) => x.id === sid);
            if (!n) return null;
            const active = focalId === sid;
            return (
              <button
                key={sid}
                onClick={() => setFocalId(sid)}
                className="nhi-mono"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  background: active ? 'rgba(125,211,252,0.12)' : 'transparent',
                  border: '1px solid ' + (active ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline)'),
                  color: active ? 'var(--nhi-bone)' : 'var(--nhi-fog-2)',
                }}
              >
                <span style={{ color: active ? 'var(--nhi-sky)' : 'var(--nhi-fog)' }}>
                  <NodeGlyph type={n.node_type as NodeType} size={10} />
                </span>
                {n.label.length > 24 ? n.label.slice(0, 22) + '…' : n.label}
              </button>
            );
          })}
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)', marginLeft: 6 }}>
            · click any neighbor to refocus, or use the chooser above
          </span>
        </div>
      )}

      {scene.subtitle && (
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--nhi-ink-1)',
            borderBottom: '1px solid var(--nhi-hairline)',
            fontFamily: 'var(--nhi-f-body)',
            fontSize: 13,
            color: 'var(--nhi-fog-2)',
            flexShrink: 0,
          }}
        >
          {scene.subtitle}
        </div>
      )}

      {layout === 'radial' ? (
        <RadialFocus
          nodes={scene.nodes}
          edges={scene.edges}
          focusId={focalId ?? scene.seedIds[0] ?? null}
          setFocusId={setFocalId}
          onSelect={onSelectEntity}
          breakpoint={breakpoint}
        />
      ) : (
        <SceneCanvas
          nodes={scene.nodes}
          edges={scene.edges}
          seedIds={scene.seedIds}
          selectedId={selectedId}
          onSelect={onSelectEntity}
          onExpand={expandNode}
          showCommunities={showCommunities}
        />
      )}
    </div>
  );
}
