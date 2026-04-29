import { jsPDF } from 'jspdf';

export type PaperFormat = 'A4' | 'A3';
export type ArrowType = 'left' | 'right' | 'none';

export interface SignageState {
  format: PaperFormat;
  arrow: ArrowType;
  text: string;
  selectedLogos: string[];
}

const FORMAT_DIMS = {
  A4: { w: 297, h: 210 },
  A3: { w: 420, h: 297 }
};

export const BANNER_HEIGHT_PCT = 0.22;
export const ARROW_HEIGHT_PCT = 0.55; // relative to banner
export const ARROW_WIDTH_RATIO = 0.7; // chevron width / chevron height
export const ARROW_STROKE_RATIO = 0.22; // legacy: kept for backward compat
export const ARROW_MARGIN_PCT = 0.045; // relative to page width
// Filled chevron geometry: inner notch points expressed as fractions of width.
// backInner = how far the back band extends from the back edge.
// tipInner  = position of the inner notch tip (back of the V).
export const CHEVRON_BACK_INNER = 0.42;
export const CHEVRON_TIP_INNER = 0.58;

export const TEXT_OPTIONS = [
  'Déjeuner',
  'Dîner',
  'Cocktail',
  'Apéritif',
  'Soirée Dansante',
  'Salon privatif',
] as const;
export type SignageText = typeof TEXT_OPTIONS[number];

const THEME = {
  beigeRGB: [234, 227, 210],
};

interface ImageMeta {
  width: number;
  height: number;
}

async function preloadImageMeta(dataUrls: string[]): Promise<Map<string, ImageMeta>> {
  const map = new Map<string, ImageMeta>();
  await Promise.all(
    dataUrls.map(async (url) => {
      const meta = await getImageProperties(url);
      if (meta) map.set(url, meta);
    })
  );
  return map;
}

function renderPage(
  doc: jsPDF,
  state: SignageState,
  allLogos: Record<string, string>,
  imageMeta: Map<string, ImageMeta>,
) {
  const { format, arrow, text, selectedLogos } = state;
  const { w, h } = FORMAT_DIMS[format];
  const bannerH = h * BANNER_HEIGHT_PCT;

  // Banner Background
  doc.setFillColor(THEME.beigeRGB[0], THEME.beigeRGB[1], THEME.beigeRGB[2]);
  doc.rect(0, 0, w, bannerH, 'F');

  // Arrow (filled chevron shape)
  if (arrow !== 'none') {
    const chevronH = bannerH * ARROW_HEIGHT_PCT;
    const chevronW = chevronH * ARROW_WIDTH_RATIO;
    const margin = w * ARROW_MARGIN_PCT;
    const yTop = (bannerH - chevronH) / 2;
    const backInner = chevronW * CHEVRON_BACK_INNER;
    const tipInner = chevronW * CHEVRON_TIP_INNER;

    doc.setFillColor(0, 0, 0);
    doc.setLineJoin('miter');

    if (arrow === 'right') {
      // Tip on the right side of the banner; back edge on the left.
      const xLeft = w - margin - chevronW;
      // Path starts at top-back-left corner (P0 = (0,0) inside chevron box).
      doc.lines(
        [
          [chevronW, chevronH / 2],          // → tip
          [-chevronW, chevronH / 2],         // → bottom-back-left
          [backInner, 0],                    // → bottom inner corner
          [tipInner - backInner, -chevronH / 2], // → inner notch tip
          [-(tipInner - backInner), -chevronH / 2], // → top inner corner
        ],
        xLeft,
        yTop,
        [1, 1],
        'F',
        true
      );
    } else {
      // Tip on the left side of the banner; back edge on the right.
      const xLeft = margin;
      // Path starts at top-back-right corner (P0 = (W,0) inside chevron box).
      doc.lines(
        [
          [-chevronW, chevronH / 2],         // → tip
          [chevronW, chevronH / 2],          // → bottom-back-right
          [-backInner, 0],                   // → bottom inner corner
          [-(tipInner - backInner), -chevronH / 2], // → inner notch tip
          [tipInner - backInner, -chevronH / 2],    // → top inner corner
        ],
        xLeft + chevronW,
        yTop,
        [1, 1],
        'F',
        true
      );
    }
  }

  // Text — Arial, normal weight, black (Helvetica is jsPDF's standard
  // PDF substitute for Arial; PDF readers map it to Arial on display).
  if (text.trim()) {
    doc.setFont('helvetica', 'normal');

    // Available width: bannerWidth minus reserved zones for the arrow on each
    // side (so centered text never collides with the chevron).
    const arrowSpace =
      bannerH * ARROW_HEIGHT_PCT * ARROW_WIDTH_RATIO + w * ARROW_MARGIN_PCT;
    const safetyPad = w * 0.02;
    const maxTextW =
      arrow === 'none'
        ? w * 0.9
        : w - 2 * arrowSpace - safetyPad * 2;
    // Available height: ~80% of banner so a single line breathes vertically.
    const maxTextH = bannerH * 0.8;

    // Binary search the largest font size (in pt) that fits both width & height.
    // jsPDF uses pt internally; 1pt = 0.3528 mm.
    let lo = 4;
    let hi = (maxTextH / 0.3528) * 1.05;
    let best = lo;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      doc.setFontSize(mid);
      const tw = doc.getTextWidth(text);
      const th = mid * 0.3528; // approximate cap height in mm
      if (tw <= maxTextW && th <= maxTextH) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    doc.setFontSize(best);
    doc.setTextColor(0, 0, 0);
    doc.text(text, w / 2, bannerH / 2, { align: 'center', baseline: 'middle' });
  }

  // Logos
  if (selectedLogos.length > 0) {
    const safeMargin = w * 0.05;
    const workAreaX = safeMargin;
    const workAreaY = bannerH + safeMargin;
    const workAreaW = w - (safeMargin * 2);
    const workAreaH = h - bannerH - (safeMargin * 2);

    let cols = 1;
    let rows = 1;
    const count = selectedLogos.length;

    if (count === 1) { cols = 1; rows = 1; }
    else if (count === 2) { cols = 2; rows = 1; }
    else if (count === 3) { cols = 2; rows = 2; }
    else if (count === 4) { cols = 2; rows = 2; }
    else if (count === 5) { cols = 3; rows = 2; }
    else if (count === 6) { cols = 3; rows = 2; }

    const spacing = 10;
    const cellW = (workAreaW - (spacing * (cols - 1))) / cols;
    const cellH = (workAreaH - (spacing * (rows - 1))) / rows;

    for (let i = 0; i < count; i++) {
      const logoId = selectedLogos[i];
      const dataUrl = allLogos[logoId];
      if (!dataUrl) continue;

      const r = Math.floor(i / cols);
      const c = i % cols;

      let actualColsInRow = cols;
      if (count === 5 && r === 1) {
        actualColsInRow = 2;
      } else if (count === 3 && r === 1) {
        actualColsInRow = 1;
      }

      const rowWidth = (actualColsInRow * cellW) + ((actualColsInRow - 1) * spacing);
      const startX = workAreaX + (workAreaW - rowWidth) / 2;

      let currentC = c;
      if (count === 5 && r === 1) currentC = i - 3;
      else if (count === 3 && r === 1) currentC = 0;

      const cellX = startX + currentC * (cellW + spacing);
      const cellY = workAreaY + r * (cellH + spacing);

      const imgProps = imageMeta.get(dataUrl);
      if (imgProps) {
        const imgRatio = imgProps.width / imgProps.height;
        const cellRatio = cellW / cellH;

        let drawW = cellW;
        let drawH = cellH;

        if (imgRatio > cellRatio) {
          drawH = cellW / imgRatio;
        } else {
          drawW = cellH * imgRatio;
        }

        const drawX = cellX + (cellW - drawW) / 2;
        const drawY = cellY + (cellH - drawH) / 2;

        const imgFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, imgFormat, drawX, drawY, drawW, drawH);
      }
    }
  }
}

function buildSlug(text: string): string {
  return text.trim()
    ? text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : 'affiche';
}

function makeDoc(format: PaperFormat): jsPDF {
  return new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: format.toLowerCase(),
  });
}

export async function generatePDF(state: SignageState, allLogos: Record<string, string>) {
  const dataUrls = state.selectedLogos
    .map((id) => allLogos[id])
    .filter((u): u is string => Boolean(u));
  const imageMeta = await preloadImageMeta(dataUrls);

  const doc = makeDoc(state.format);
  renderPage(doc, state, allLogos, imageMeta);

  const slug = buildSlug(state.text);
  doc.save(`affichage-${state.format.toLowerCase()}-${state.arrow}-${slug}.pdf`);
}

export async function generateAllVariantsPDF(
  state: SignageState,
  allLogos: Record<string, string>,
) {
  const dataUrls = state.selectedLogos
    .map((id) => allLogos[id])
    .filter((u): u is string => Boolean(u));
  const imageMeta = await preloadImageMeta(dataUrls);

  const variants: ArrowType[] = ['left', 'none', 'right'];
  const doc = makeDoc(state.format);

  variants.forEach((arrow, idx) => {
    if (idx > 0) {
      doc.addPage(state.format.toLowerCase(), 'landscape');
    }
    renderPage(doc, { ...state, arrow }, allLogos, imageMeta);
  });

  const slug = buildSlug(state.text);
  doc.save(`affichage-${state.format.toLowerCase()}-toutes-variantes-${slug}.pdf`);
}

export async function generateBulkPDF(
  items: SignageState[],
  format: PaperFormat,
  allLogos: Record<string, string>,
) {
  if (items.length === 0) return;

  const uniqueUrls = Array.from(
    new Set(
      items.flatMap((it) =>
        it.selectedLogos.map((id) => allLogos[id]).filter((u): u is string => Boolean(u))
      )
    )
  );
  const imageMeta = await preloadImageMeta(uniqueUrls);

  const doc = makeDoc(format);

  items.forEach((item, idx) => {
    if (idx > 0) {
      doc.addPage(format.toLowerCase(), 'landscape');
    }
    renderPage(doc, { ...item, format }, allLogos, imageMeta);
  });

  doc.save(`compilation-${format.toLowerCase()}-${items.length}-affichages.pdf`);
}

function getImageProperties(dataUrl: string): Promise<ImageMeta | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
