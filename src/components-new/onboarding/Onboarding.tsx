import { useEffect, useRef } from 'react';
import {
  ONBOARDING_CONTENT,
  type EvidenceTier,
  type HandoffDoorway,
  type TimelineBeat,
  type TrustedVoice,
  type WitnessCard as WitnessCardData,
} from '../../content/onboardingContent';
import type { NetworkTier } from '../network/types';

interface OnboardingProps {
  onGoToArchive: (hash: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const TIER_BORDER: Record<NetworkTier, string> = {
  witness: 'var(--nhi-sky)',
  official: 'var(--nhi-amber)',
  advocate: 'var(--nhi-lime)',
  institution: 'var(--nhi-fog)',
};

const EVIDENCE_ACCENT: Record<EvidenceTier['color'], string> = {
  sky: 'var(--nhi-sky)',
  amber: 'var(--nhi-amber)',
  fog: 'var(--nhi-fog)',
};

const DOORWAY_ACCENT: Record<HandoffDoorway['accent'], string> = {
  sky: 'var(--nhi-sky)',
  violet: 'var(--nhi-violet)',
  lime: 'var(--nhi-lime)',
};

function initials(name: string): string {
  const parts = name
    .replace(/\b(Sen\.|Rep\.|Dr\.|Cmdr\.|Lt\.|R\. Adm\.|Adm\.|Capt\.|Fmr\.)\b/gi, ' ')
    .trim()
    .split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Onboarding Layer (NHI-ARCH-ONB-001, Phase 1 MVP).
 *
 * Single long-scroll page rendered at #/onboarding. Five acts, in the
 * order a newcomer's brain actually asks the questions: Hook → Reframe
 * → Evidence → Cast → Handoff. Content is static JSON from
 * src/content/onboardingContent.ts so copy iteration and future i18n
 * stay cheap.
 *
 * Not wired in Phase 1: scroll-triggered motion, progress rail, real
 * portraits (monograms for now), ?tutorial overlay on the Archive
 * side. All deferred per §11 Phase 2/3 of the spec.
 */
export function Onboarding({ onGoToArchive, breakpoint }: OnboardingProps) {
  const isMobile = breakpoint === 'mobile';
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // Once the user has scrolled into the final section, mark the read
  // complete so the next visit defaults to the archive. No tutorial
  // progress rail — this is a story, not a checklist.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && (e.target as HTMLElement).dataset.step === '5') {
            try {
              window.localStorage.setItem('nhi_onboarding_complete', 'true');
            } catch {
              // storage blocked; ignore
            }
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4 },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const setStepRef = (i: number) => (el: HTMLElement | null) => {
    stepRefs.current[i] = el;
  };

  return (
    <div
      className="nhi-scroll nhi-root"
      style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--nhi-ink)',
        color: 'var(--nhi-bone)',
        position: 'relative',
      }}
    >
      <Act01Hook
        setRef={setStepRef(0)}
        onGoToArchive={onGoToArchive}
        isMobile={isMobile}
      />
      <Act02Reframe setRef={setStepRef(1)} isMobile={isMobile} />
      <Act03Evidence setRef={setStepRef(2)} isMobile={isMobile} />
      <Act04Cast
        setRef={setStepRef(3)}
        onGoToArchive={onGoToArchive}
        isMobile={isMobile}
      />
      <Act05Handoff
        setRef={setStepRef(4)}
        onGoToArchive={onGoToArchive}
        isMobile={isMobile}
      />
    </div>
  );
}

// ─── Act 01 · Hook ─────────────────────────────────────────────────

interface ActProps {
  setRef: (el: HTMLElement | null) => void;
  isMobile: boolean;
}
interface ActWithArchiveProps extends ActProps {
  onGoToArchive: (hash: string) => void;
}

function Act01Hook({ setRef, onGoToArchive, isMobile }: ActWithArchiveProps) {
  const c = ONBOARDING_CONTENT.hook;
  return (
    <section
      ref={setRef}
      data-step="1"
      style={{
        minHeight: isMobile ? 'auto' : '92vh',
        padding: isMobile ? '48px 20px 56px' : '96px 72px 80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderBottom: '1px solid var(--nhi-hairline)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--nhi-sky)',
            marginBottom: 18,
          }}
        >
          {c.eyebrow}
        </div>
        <h1
          className="nhi-display"
          style={{
            margin: 0,
            fontSize: isMobile ? 30 : 52,
            lineHeight: 1.12,
            letterSpacing: '0.01em',
            fontWeight: 600,
            maxWidth: 900,
          }}
        >
          {c.headline}
        </h1>
        <p
          style={{
            marginTop: 22,
            fontSize: isMobile ? 16 : 19,
            lineHeight: 1.55,
            maxWidth: 720,
            color: 'var(--nhi-fog-2)',
          }}
        >
          {c.body}
        </p>
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() =>
              onGoToArchive(`#/archive?view=network&focus=${c.deepLinkId}`)
            }
            className="nhi-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              padding: '10px 14px',
              border: '1px solid var(--nhi-hairline-hot)',
              background: 'rgba(125,211,252,0.10)',
              color: 'var(--nhi-sky)',
            }}
          >
            SEE GRUSCH IN THE ARCHIVE →
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Act 02 · Reframe ──────────────────────────────────────────────

function Act02Reframe({ setRef, isMobile }: ActProps) {
  const c = ONBOARDING_CONTENT.reframe;
  return (
    <section
      ref={setRef}
      data-step="2"
      style={{
        padding: isMobile ? '48px 20px' : '96px 72px',
        borderBottom: '1px solid var(--nhi-hairline)',
      }}
    >
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--nhi-violet)',
            marginBottom: 14,
          }}
        >
          {c.eyebrow}
        </div>
        <h2
          className="nhi-display"
          style={{
            margin: 0,
            fontSize: isMobile ? 26 : 36,
            lineHeight: 1.2,
            fontWeight: 600,
            maxWidth: 820,
          }}
        >
          {c.headline}
        </h2>
        <p
          style={{
            marginTop: 18,
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.6,
            maxWidth: 700,
            color: 'var(--nhi-fog-2)',
          }}
        >
          {c.body}
        </p>

        <div
          style={{
            marginTop: 42,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
            gap: 32,
          }}
        >
          <div>
            <div className="nhi-micro" style={{ marginBottom: 12 }}>
              1969 → 2026 · A 57-YEAR ARC
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {c.timeline.map((t: TimelineBeat) => (
                <div
                  key={t.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '80px 1fr' : '100px 1fr',
                    gap: 14,
                    paddingBottom: 12,
                    borderBottom: '1px dashed var(--nhi-hairline)',
                  }}
                >
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      color: 'var(--nhi-sky)',
                    }}
                  >
                    {t.year}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        color: 'var(--nhi-bone)',
                        fontWeight: 500,
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--nhi-fog-2)',
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {t.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="nhi-micro" style={{ marginBottom: 12 }}>
              VOICES WHO UPDATED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.trustedVoices.map((v: TrustedVoice) => (
                <div
                  key={v.name}
                  style={{
                    border: '1px solid var(--nhi-hairline)',
                    background: 'var(--nhi-panel-bg-soft)',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    className="nhi-display"
                    style={{
                      fontSize: 14,
                      color: 'var(--nhi-bone)',
                      fontWeight: 600,
                    }}
                  >
                    {v.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--nhi-fog-2)',
                      lineHeight: 1.5,
                      marginTop: 2,
                    }}
                  >
                    {v.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Act 03 · Evidence ─────────────────────────────────────────────

function Act03Evidence({ setRef, isMobile }: ActProps) {
  const c = ONBOARDING_CONTENT.evidence;
  return (
    <section
      ref={setRef}
      data-step="3"
      style={{
        padding: isMobile ? '48px 20px' : '96px 72px',
        borderBottom: '1px solid var(--nhi-hairline)',
      }}
    >
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--nhi-amber)',
            marginBottom: 14,
          }}
        >
          {c.eyebrow}
        </div>
        <h2
          className="nhi-display"
          style={{
            margin: 0,
            fontSize: isMobile ? 26 : 36,
            lineHeight: 1.2,
            fontWeight: 600,
          }}
        >
          {c.headline}
        </h2>
        <p
          style={{
            marginTop: 18,
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.6,
            maxWidth: 700,
            color: 'var(--nhi-fog-2)',
          }}
        >
          {c.body}
        </p>

        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {c.tiers.map((t: EvidenceTier) => {
            const accent = EVIDENCE_ACCENT[t.color];
            return (
              <div
                key={t.tier}
                style={{
                  borderLeft: `3px solid ${accent}`,
                  border: '1px solid var(--nhi-hairline)',
                  borderLeftWidth: 3,
                  background: 'var(--nhi-panel-bg-soft)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 220,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--nhi-fog)',
                    }}
                  >
                    TIER {t.tier}
                  </span>
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: accent,
                    }}
                  >
                    {t.label}
                  </span>
                </div>
                <div
                  className="nhi-display"
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--nhi-bone)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {t.sub}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--nhi-fog-2)',
                    lineHeight: 1.5,
                  }}
                >
                  {t.blurb}
                </div>
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {t.items.map((item) => (
                    <div
                      key={item.title}
                      style={{
                        paddingTop: 8,
                        borderTop: '1px dashed var(--nhi-hairline)',
                      }}
                    >
                      <div
                        className="nhi-mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          color: accent,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--nhi-fog-2)',
                          marginTop: 2,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Act 04 · Cast ─────────────────────────────────────────────────

function Act04Cast({ setRef, onGoToArchive, isMobile }: ActWithArchiveProps) {
  const c = ONBOARDING_CONTENT.cast;
  const cols = isMobile ? '1fr' : 'repeat(3, 1fr)';
  return (
    <section
      ref={setRef}
      data-step="4"
      style={{
        padding: isMobile ? '48px 20px' : '96px 72px',
        borderBottom: '1px solid var(--nhi-hairline)',
      }}
    >
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--nhi-lime)',
            marginBottom: 14,
          }}
        >
          {c.eyebrow}
        </div>
        <h2
          className="nhi-display"
          style={{
            margin: 0,
            fontSize: isMobile ? 26 : 36,
            lineHeight: 1.2,
            fontWeight: 600,
          }}
        >
          {c.headline}
        </h2>
        <p
          style={{
            marginTop: 18,
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.6,
            maxWidth: 700,
            color: 'var(--nhi-fog-2)',
          }}
        >
          {c.body}
        </p>

        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: cols,
            gap: 16,
          }}
        >
          {c.cards.map((w: WitnessCardData) => {
            const border = TIER_BORDER[w.tier];
            return (
              <button
                key={w.id}
                onClick={() =>
                  onGoToArchive(`#/archive?view=network&focus=${w.id}`)
                }
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '18px 18px 20px',
                  border: '1px solid var(--nhi-hairline)',
                  borderLeft: `3px solid ${border}`,
                  background: 'var(--nhi-panel-bg-soft)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'transform 150ms var(--nhi-ease), border-color 150ms var(--nhi-ease)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--nhi-hairline-hot)';
                  e.currentTarget.style.borderLeftColor = border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--nhi-hairline)';
                  e.currentTarget.style.borderLeftColor = border;
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      border: `1px solid ${border}`,
                      background: 'var(--nhi-panel-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--nhi-f-display)',
                      fontSize: 18,
                      color: border,
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {initials(w.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="nhi-display"
                      style={{
                        fontSize: 16,
                        color: 'var(--nhi-bone)',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {w.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--nhi-fog-2)',
                        marginTop: 2,
                      }}
                    >
                      {w.role}
                    </div>
                  </div>
                </div>
                <div
                  className="nhi-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--nhi-fog)',
                  }}
                >
                  {w.credential.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--nhi-fog-2)',
                    lineHeight: 1.5,
                  }}
                >
                  {w.note}
                </div>
                <div
                  className="nhi-mono"
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    color: 'var(--nhi-sky)',
                  }}
                >
                  OPEN IN ARCHIVE →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Act 05 · Handoff ──────────────────────────────────────────────

function Act05Handoff({ setRef, onGoToArchive, isMobile }: ActWithArchiveProps) {
  const c = ONBOARDING_CONTENT.handoff;
  return (
    <section
      ref={setRef}
      data-step="5"
      style={{
        padding: isMobile ? '56px 20px 80px' : '110px 72px 140px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 80% 100%, rgba(125,211,252,0.08), transparent 60%), radial-gradient(ellipse at 10% 0%, rgba(196,181,253,0.06), transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div
          className="nhi-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--nhi-sky)',
            marginBottom: 14,
          }}
        >
          {c.eyebrow}
        </div>
        <h2
          className="nhi-display"
          style={{
            margin: 0,
            fontSize: isMobile ? 26 : 38,
            lineHeight: 1.2,
            fontWeight: 600,
            maxWidth: 820,
          }}
        >
          {c.headline}
        </h2>
        <p
          style={{
            marginTop: 18,
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.6,
            maxWidth: 640,
            color: 'var(--nhi-fog-2)',
          }}
        >
          {c.body}
        </p>

        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {c.doorways.map((d: HandoffDoorway) => {
            const accent = DOORWAY_ACCENT[d.accent];
            return (
              <button
                key={d.title}
                onClick={() => onGoToArchive(d.href)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '20px 22px 22px',
                  border: `1px solid ${accent}`,
                  background: 'var(--nhi-panel-bg)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'transform 150ms var(--nhi-ease)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div
                  className="nhi-display"
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: 'var(--nhi-bone)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {d.title}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--nhi-fog-2)',
                    lineHeight: 1.55,
                  }}
                >
                  {d.pitch}
                </div>
                <div
                  className="nhi-mono"
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    color: accent,
                  }}
                >
                  OPEN →
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => onGoToArchive(c.exitHref)}
            className="nhi-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              padding: '8px 12px',
              color: 'var(--nhi-fog-2)',
              border: '1px solid var(--nhi-hairline-2)',
            }}
          >
            {c.exit}
          </button>
        </div>
      </div>
    </section>
  );
}

