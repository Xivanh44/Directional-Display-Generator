import { useLayoutEffect, useRef, useState } from 'react';
import {
  SignageState,
  BANNER_HEIGHT_PCT,
  ARROW_HEIGHT_PCT,
  ARROW_WIDTH_RATIO,
  ARROW_STROKE_RATIO,
  ARROW_MARGIN_PCT,
} from '@/lib/pdf-generator';

interface PDFPreviewProps {
  state: SignageState;
  allLogos: Record<string, string>;
}

export function PDFPreview({ state, allLogos }: PDFPreviewProps) {
  const aspectRatio = 297 / 210; // A4/A3 Landscape

  const { format, arrow, text, selectedLogos } = state;
  const count = selectedLogos.length;

  // Reserved horizontal space (per side) on banner so text never overlaps the arrow.
  // Arrow visual width as % of banner WIDTH = arrow_h_pct * banner_h_pct * arrow_w_ratio / aspectRatio.
  const arrowReservedPct =
    (ARROW_MARGIN_PCT +
      (ARROW_HEIGHT_PCT * BANNER_HEIGHT_PCT * ARROW_WIDTH_RATIO) / aspectRatio) *
    100;
  const SAFE_GAP_PCT = 2;
  const sidePadPct = arrow !== 'none' ? arrowReservedPct + SAFE_GAP_PCT : 5;

  const getGridClasses = () => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count === 4) return "grid-cols-2 grid-rows-2";
    if (count === 6) return "grid-cols-3 grid-rows-2";
    if (count === 8) return "grid-cols-4 grid-rows-2";
    return ""; // handled custom for 3, 5, 7
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-muted/30">
      <div 
        className="relative bg-white shadow-xl shadow-black/5 ring-1 ring-border/50"
        style={{
          width: '100%',
          maxWidth: '100%',
          aspectRatio: `${aspectRatio}`,
          maxHeight: '100%'
        }}
      >
        <div className="absolute inset-0 flex flex-col">
          {/* Banner */}
          <div 
            className="w-full relative flex items-center justify-center overflow-hidden"
            style={{ 
              height: `${BANNER_HEIGHT_PCT * 100}%`,
              backgroundColor: '#EAE3D2'
            }}
          >
            {arrow === 'left' && (
              <div
                className="absolute flex items-center justify-start"
                style={{
                  left: `${ARROW_MARGIN_PCT * 100}%`,
                  height: `${ARROW_HEIGHT_PCT * 100}%`,
                  aspectRatio: `${ARROW_WIDTH_RATIO}`,
                }}
              >
                {state.customArrowDataUrl ? (
                  <img
                    src={state.customArrowDataUrl}
                    className="w-full h-full object-contain"
                    style={{ transform: 'scaleX(-1)' }}
                    alt=""
                  />
                ) : (
                  <ChevronSvg direction="left" />
                )}
              </div>
            )}

            {arrow === 'right' && (
              <div
                className="absolute flex items-center justify-end"
                style={{
                  right: `${ARROW_MARGIN_PCT * 100}%`,
                  height: `${ARROW_HEIGHT_PCT * 100}%`,
                  aspectRatio: `${ARROW_WIDTH_RATIO}`,
                }}
              >
                {state.customArrowDataUrl ? (
                  <img
                    src={state.customArrowDataUrl}
                    className="w-full h-full object-contain"
                    alt=""
                  />
                ) : (
                  <ChevronSvg direction="right" />
                )}
              </div>
            )}

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                paddingLeft: `${sidePadPct}%`,
                paddingRight: `${sidePadPct}%`,
              }}
            >
              <AutoFitText text={text} font={state.font} />
            </div>
          </div>

          {/* White Area */}
          <div className="flex-1 bg-white relative p-[5%] overflow-hidden min-h-0">
            {count === 0 ? (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                <span className="text-gray-400 font-medium">Sélectionnez 1 à 8 logos</span>
              </div>
            ) : count === 3 ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
                  {selectedLogos.slice(0, 2).map((id) => (
                    <LogoCell key={id} src={allLogos[id]} />
                  ))}
                </div>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <div className="w-1/2 h-full">
                    <LogoCell src={allLogos[selectedLogos[2]]} />
                  </div>
                </div>
              </div>
            ) : count === 5 ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {selectedLogos.slice(0,3).map(id => (
                    <LogoCell key={id} src={allLogos[id]} />
                  ))}
                </div>
                <div className="flex-1 min-h-0 flex items-stretch justify-center gap-4">
                  {selectedLogos.slice(3, 5).map((id) => (
                    <div key={id} className="flex-1 min-w-0 max-w-[33.33%]">
                      <LogoCell src={allLogos[id]} />
                    </div>
                  ))}
                </div>
              </div>
            ) : count === 7 ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 min-h-0 grid grid-cols-4 gap-4">
                  {selectedLogos.slice(0, 4).map((id) => (
                    <LogoCell key={id} src={allLogos[id]} />
                  ))}
                </div>
                <div className="flex-1 min-h-0 flex items-stretch justify-center gap-4">
                  {selectedLogos.slice(4, 7).map((id) => (
                    <div key={id} className="flex-1 min-w-0 max-w-[25%]">
                      <LogoCell src={allLogos[id]} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`w-full h-full grid gap-4 ${getGridClasses()}`}>
                {selectedLogos.map(id => (
                  <LogoCell key={id} src={allLogos[id]} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutoFitText({ text, font }: { text: string; font?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(16);
  const fontFamily = font || 'Arial, sans-serif';

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const fit = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw <= 0 || ch <= 0 || !text) return;

      let lo = 4;
      let hi = ch * 1.2;
      let best = lo;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        measure.style.fontSize = `${mid}px`;
        const tw = measure.scrollWidth;
        const th = measure.scrollHeight;
        if (tw <= cw && th <= ch) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      setFontSize(best);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, fontFamily]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <span
        ref={measureRef}
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: 'nowrap',
          fontFamily,
          fontWeight: 'normal',
          color: '#000',
          lineHeight: 1.25,
          display: 'inline-block',
        }}
      >
        {text}
      </span>
    </div>
  );
}

function LogoCell({ src }: { src: string }) {
  if (!src) return null;
  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <img src={src} className="w-full h-full object-contain" alt="" />
    </div>
  );
}

function ChevronSvg({ direction }: { direction: 'left' | 'right' }) {
  // Chevron in the style of Unicode U+276F (❯): two thick diagonal strokes
  // meeting at a sharp mitered vertex, square ends, no tail.
  const W = 100 * ARROW_WIDTH_RATIO;
  const H = 100;
  const stroke = H * ARROW_STROKE_RATIO;
  // Inset by half the stroke so the visible shape stays inside the viewBox.
  const inset = stroke / 2;
  const path =
    direction === 'right'
      ? `M ${inset},${inset} L ${W - inset},${H / 2} L ${inset},${H - inset}`
      : `M ${W - inset},${inset} L ${inset},${H / 2} L ${W - inset},${H - inset}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={path}
        fill="none"
        stroke="#000000"
        strokeWidth={stroke}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit={10}
      />
    </svg>
  );
}
