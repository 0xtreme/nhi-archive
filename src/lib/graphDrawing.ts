import type { NodeType } from '../types';

/**
 * Canvas 2D rendering of a node glyph — the filled/stroked variant for the
 * force-directed graph view. Matches the SVG NodeGlyph shapes but drawn
 * with ctx paths for GPU-friendly per-frame cost.
 *
 * Adopted from mockup/graph-sim.jsx.
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  type: NodeType,
  x: number,
  y: number,
  r: number,
  alpha: number,
  filled: boolean,
) {
  ctx.globalAlpha = alpha;
  const stroke = filled ? 2 : 1.4;
  ctx.lineWidth = stroke;

  const strokeOrFill = () => {
    if (filled) ctx.fill();
    ctx.stroke();
  };

  ctx.beginPath();
  switch (type) {
    case 'person':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      strokeOrFill();
      break;
    case 'incident':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.95, y + r * 0.75);
      ctx.lineTo(x - r * 0.95, y + r * 0.75);
      ctx.closePath();
      strokeOrFill();
      break;
    case 'claim':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      strokeOrFill();
      break;
    case 'video':
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      strokeOrFill();
      break;
    case 'program':
      for (let i = 0; i < 6; i += 1) {
        const a = Math.PI / 2 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      strokeOrFill();
      break;
    case 'document':
      ctx.rect(x - r * 0.75, y - r * 0.95, r * 1.5, r * 1.9);
      strokeOrFill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y - r * 0.25);
      ctx.lineTo(x + r * 0.45, y - r * 0.25);
      ctx.moveTo(x - r * 0.45, y + r * 0.1);
      ctx.lineTo(x + r * 0.45, y + r * 0.1);
      ctx.stroke();
      break;
    case 'organization':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
      strokeOrFill();
      break;
    case 'location':
      ctx.moveTo(x, y - r);
      ctx.bezierCurveTo(x - r * 1.1, y - r, x - r * 1.1, y + r * 0.4, x, y + r * 1.05);
      ctx.bezierCurveTo(x + r * 1.1, y + r * 0.4, x + r * 1.1, y - r, x, y - r);
      strokeOrFill();
      ctx.beginPath();
      ctx.arc(x, y - r * 0.25, r * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'event':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.moveTo(x - r * 0.7, y - r * 0.7);
      ctx.lineTo(x + r * 0.7, y + r * 0.7);
      ctx.moveTo(x + r * 0.7, y - r * 0.7);
      ctx.lineTo(x - r * 0.7, y + r * 0.7);
      ctx.stroke();
      break;
    case 'statement':
    case 'testimony':
      ctx.moveTo(x - r * 0.9, y - r * 0.6);
      ctx.lineTo(x + r * 0.9, y - r * 0.6);
      ctx.lineTo(x + r * 0.9, y + r * 0.3);
      ctx.lineTo(x - r * 0.2, y + r * 0.3);
      ctx.lineTo(x - r * 0.6, y + r);
      ctx.lineTo(x - r * 0.5, y + r * 0.3);
      ctx.lineTo(x - r * 0.9, y + r * 0.3);
      ctx.closePath();
      strokeOrFill();
      break;
    case 'artifact':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.stroke();
      break;
    case 'designation':
      ctx.moveTo(x - r * 0.5, y - r * 0.8);
      ctx.lineTo(x - r, y - r * 0.8);
      ctx.lineTo(x - r, y + r * 0.8);
      ctx.lineTo(x - r * 0.5, y + r * 0.8);
      ctx.moveTo(x + r * 0.5, y - r * 0.8);
      ctx.lineTo(x + r, y - r * 0.8);
      ctx.lineTo(x + r, y + r * 0.8);
      ctx.lineTo(x + r * 0.5, y + r * 0.8);
      ctx.stroke();
      break;
    case 'media':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25, y - r * 0.45);
      ctx.lineTo(x + r * 0.55, y);
      ctx.lineTo(x - r * 0.25, y + r * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    case 'concept':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'phenomenon':
      for (let a = 0; a < 4; a += 1) {
        const ang = (a * Math.PI) / 4;
        ctx.moveTo(x + Math.cos(ang) * r * 0.3, y + Math.sin(ang) * r * 0.3);
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'technology':
      ctx.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
      strokeOrFill();
      for (const yy of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * yy);
        ctx.lineTo(x - r * 0.7, y + r * yy);
        ctx.moveTo(x + r * 0.7, y + r * yy);
        ctx.lineTo(x + r, y + r * yy);
        ctx.stroke();
      }
      break;
    case 'role':
    case 'citation':
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
