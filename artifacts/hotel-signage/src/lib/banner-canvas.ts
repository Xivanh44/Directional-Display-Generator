import {
  SignageState,
  FORMAT_DIMS,
  BANNER_HEIGHT_PCT,
  ARROW_HEIGHT_PCT,
  ARROW_WIDTH_RATIO,
  ARROW_STROKE_RATIO,
  ARROW_MARGIN_PCT,
} from './pdf-generator';

const SCALE = 10;
const BEIGE = '#EDE8D4';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderBannerToCanvas(state: SignageState): Promise<HTMLCanvasElement> {
  const { w: pageW, h: pageH } = FORMAT_DIMS[state.format];
  const canvasW = pageW * SCALE;
  const canvasH = pageH * BANNER_HEIGHT_PCT * SCALE;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────────
  if (state.customBannerDataUrl) {
    const img = await loadImage(state.customBannerDataUrl);
    ctx.drawImage(img, 0, 0, canvasW, canvasH);
  } else {
    ctx.fillStyle = BEIGE;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Arrow ───────────────────────────────────────────────────────────────────
  const scale = state.arrowScale ?? 1;
  const chevronH = canvasH * ARROW_HEIGHT_PCT * scale;
  const chevronW = chevronH * ARROW_WIDTH_RATIO;
  const margin = canvasW * ARROW_MARGIN_PCT;
  const yTop = (canvasH - chevronH) / 2;
  const yCtr = yTop + chevronH / 2;

  if (state.arrow !== 'none') {
    const isRight = state.arrow === 'right';
    // Center X of the arrow zone
    const xCtr = isRight
      ? canvasW - margin - chevronW / 2
      : margin + chevronW / 2;

    if (state.customArrowChar) {
      // ── Character arrow ────────────────────────────────────────────────────
      ctx.save();
      const fontSize = chevronH * 0.9;
      ctx.font = `normal ${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      if (!isRight) {
        // Flip horizontally around the character center
        ctx.translate(xCtr, yCtr);
        ctx.scale(-1, 1);
        ctx.fillText(state.customArrowChar, 0, 0);
      } else {
        ctx.fillText(state.customArrowChar, xCtr, yCtr);
      }
      ctx.restore();
    } else if (state.customArrowDataUrl) {
      // ── Image arrow ────────────────────────────────────────────────────────
      const img = await loadImage(state.customArrowDataUrl);
      ctx.save();
      if (!isRight) {
        ctx.translate(xCtr, yCtr);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -chevronW / 2, -chevronH / 2, chevronW, chevronH);
      } else {
        ctx.drawImage(img, canvasW - margin - chevronW, yTop, chevronW, chevronH);
      }
      ctx.restore();
    } else {
      // ── Default chevron ────────────────────────────────────────────────────
      const strokeW = chevronH * ARROW_STROKE_RATIO;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 10;
      ctx.beginPath();
      if (isRight) {
        const xLeft = canvasW - margin - chevronW;
        ctx.moveTo(xLeft, yTop);
        ctx.lineTo(xLeft + chevronW, yCtr);
        ctx.lineTo(xLeft, yTop + chevronH);
      } else {
        const xRight = margin + chevronW;
        ctx.moveTo(xRight, yTop);
        ctx.lineTo(xRight - chevronW, yCtr);
        ctx.lineTo(xRight, yTop + chevronH);
      }
      ctx.stroke();
    }
  }

  // ── Text ────────────────────────────────────────────────────────────────────
  if (state.text.trim()) {
    const fontFamily = state.font || 'Arial';
    const arrowSpace = chevronH * ARROW_WIDTH_RATIO + margin;
    const safetyPad = canvasW * 0.02;
    const maxTextW = state.arrow === 'none' ? canvasW * 0.9 : canvasW - 2 * arrowSpace - 2 * safetyPad;
    const maxTextH = canvasH * 0.70;

    try {
      await document.fonts.load(`normal 100px "${fontFamily}"`);
    } catch {
      /* fall back to default */
    }

    let lo = 8;
    let hi = maxTextH * 1.2;
    let best = lo;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      ctx.font = `normal ${mid}px "${fontFamily}"`;
      const tw = ctx.measureText(state.text).width;
      if (tw <= maxTextW && mid <= maxTextH) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    ctx.font = `normal ${best}px "${fontFamily}"`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.text, canvasW / 2, canvasH / 2);
  }

  return canvas;
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
