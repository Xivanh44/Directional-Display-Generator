import React, { useState, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';

export type PaperFormat = 'A4' | 'A3';
export type ArrowType = 'left' | 'right' | 'none';

export interface SignageState {
  format: PaperFormat;
  arrow: ArrowType;
  text: string;
  selectedLogos: string[];
}

const PAGE_ASPECT_RATIO = 297 / 210; // A4 and A3 landscape aspect ratio (sqrt(2))

const FORMAT_DIMS = {
  A4: { w: 297, h: 210 },
  A3: { w: 420, h: 297 }
};

export const BANNER_HEIGHT_PCT = 0.22;
export const ARROW_HEIGHT_PCT = 0.55; // relative to banner
export const ARROW_WIDTH_RATIO = 0.7; // chevron width / chevron height
export const ARROW_STROKE_RATIO = 0.22; // stroke width / chevron height
export const ARROW_MARGIN_PCT = 0.045; // relative to page width

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
  beige: '#EAE3D2',
  beigeRGB: [234, 227, 210],
  black: '#000000',
  white: '#FFFFFF'
};

export async function generatePDF(state: SignageState, allLogos: Record<string, string>) {
  const { format, arrow, text, selectedLogos } = state;
  const { w, h } = FORMAT_DIMS[format];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: format.toLowerCase()
  });

  const bannerH = h * BANNER_HEIGHT_PCT;

  // Banner Background
  doc.setFillColor(THEME.beigeRGB[0], THEME.beigeRGB[1], THEME.beigeRGB[2]);
  doc.rect(0, 0, w, bannerH, 'F');

  // Arrow (chevron stroke)
  if (arrow !== 'none') {
    const chevronH = bannerH * ARROW_HEIGHT_PCT;
    const chevronW = chevronH * ARROW_WIDTH_RATIO;
    const stroke = chevronH * ARROW_STROKE_RATIO;
    const margin = w * ARROW_MARGIN_PCT;
    const yTop = (bannerH - chevronH) / 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(stroke);
    doc.setLineCap('round');
    doc.setLineJoin('round');

    if (arrow === 'left') {
      const xRight = margin + chevronW;
      // From top-right -> point (left-middle) -> bottom-right
      doc.lines(
        [[-chevronW, chevronH / 2], [chevronW, chevronH / 2]],
        xRight,
        yTop,
        [1, 1],
        'S'
      );
    } else {
      const xLeft = w - margin - chevronW;
      // From top-left -> point (right-middle) -> bottom-left
      doc.lines(
        [[chevronW, chevronH / 2], [-chevronW, chevronH / 2]],
        xLeft,
        yTop,
        [1, 1],
        'S'
      );
    }
  }

  // Text
  if (text.trim()) {
    doc.setFont('helvetica', 'bold');
    
    // Calculate max available width for text
    const arrowSpace = (bannerH * ARROW_HEIGHT_PCT * ARROW_WIDTH_RATIO) + (w * ARROW_MARGIN_PCT);
    let maxTextW = w * 0.9;
    if (arrow === 'left' || arrow === 'right') {
       maxTextW = w - (arrowSpace * 2) - (w * 0.04); // keep symmetric with breathing room
    }

    let fontSize = format === 'A3' ? 90 : 65;
    doc.setFontSize(fontSize);
    
    while (doc.getTextWidth(text) > maxTextW && fontSize > 10) {
      fontSize -= 2;
      doc.setFontSize(fontSize);
    }
    
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
    else if (count === 3) { cols = 3; rows = 1; }
    else if (count === 4) { cols = 2; rows = 2; }
    else if (count === 5) { cols = 3; rows = 2; }
    else if (count === 6) { cols = 3; rows = 2; }

    const spacing = 10; // mm
    const cellW = (workAreaW - (spacing * (cols - 1))) / cols;
    const cellH = (workAreaH - (spacing * (rows - 1))) / rows;

    for (let i = 0; i < count; i++) {
      const logoId = selectedLogos[i];
      const dataUrl = allLogos[logoId];
      if (!dataUrl) continue;

      let r = Math.floor(i / cols);
      let c = i % cols;

      // Centering logic for 5 items (row 1 has 3, row 2 has 2 centered)
      let actualColsInRow = cols;
      if (count === 5 && r === 1) {
        actualColsInRow = 2;
      }
      
      const rowWidth = (actualColsInRow * cellW) + ((actualColsInRow - 1) * spacing);
      const startX = workAreaX + (workAreaW - rowWidth) / 2;
      
      let currentC = c;
      if (count === 5 && r === 1) currentC = i - 3;

      const cellX = startX + currentC * (cellW + spacing);
      const cellY = workAreaY + r * (cellH + spacing);

      // Load image to get dims
      const imgProps = await getImageProperties(dataUrl);
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

        const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, format, drawX, drawY, drawW, drawH);
      }
    }
  }

  const slug = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'affiche';
  doc.save(`affichage-${format.toLowerCase()}-${arrow}-${slug}.pdf`);
}

function getImageProperties(dataUrl: string): Promise<{width: number, height: number} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
