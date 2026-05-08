import {
  SignageState,
  FORMAT_DIMS,
  BANNER_HEIGHT_PCT,
  ARROW_HEIGHT_PCT,
  ARROW_WIDTH_RATIO,
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
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000000';
      // Compute visual center using actual bounding box
      const cm = ctx.measureText(state.customArrowChar);
      const charVisualH = cm.actualBoundingBoxAscent + cm.actualBoundingBoxDescent;
      const charY = (canvasH - charVisualH) / 2 + cm.actualBoundingBoxAscent;
      if (!isRight) {
        ctx.translate(xCtr, charY);
        ctx.scale(-1, 1);
        ctx.fillText(state.customArrowChar, 0, 0);
      } else {
        ctx.fillText(state.customArrowChar, xCtr, charY);
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
      // ── Default chevron: U+3009 〉 / U+3008 〈 in bold ─────────────────────
      const char = isRight ? '\u3009' : '\u3008';
      ctx.save();
      // Binary-search for the largest font size that fits within chevronH
      let lo = 8;
      let hi = chevronH * 1.8;
      let bestSize = lo;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        ctx.font = `bold ${mid}px serif`;
        const m = ctx.measureText(char);
        const charH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        if (charH <= chevronH) { bestSize = mid; lo = mid; } else { hi = mid; }
      }
      ctx.font = `bold ${bestSize}px serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText(char);
      const charVisualH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const charY = (canvasH - charVisualH) / 2 + m.actualBoundingBoxAscent;
      ctx.fillText(char, xCtr, charY);
      ctx.restore();
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
    ctx.textBaseline = 'alphabetic';
    // Center on actual visual bounds (not em-box which skews text high)
    const m = ctx.measureText(state.text);
    const visualH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const textY = (canvasH - visualH) / 2 + m.actualBoundingBoxAscent;
    ctx.fillText(state.text, canvasW / 2, textY);
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
