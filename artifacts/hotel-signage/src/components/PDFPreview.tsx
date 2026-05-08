import { useLayoutEffect, useRef, useState } from 'react';
import {
  SignageState,
  BANNER_HEIGHT_PCT,
  ARROW_HEIGHT_PCT,
  ARROW_WIDTH_RATIO,
  ARROW_MARGIN_PCT,
} from '@/lib/pdf-generator';

interface PDFPreviewProps {
  state: SignageState;
  allLogos: Record<string, string>;
}

export function PDFPreview({ state, allLogos }: PDFPreviewProps) {
  const aspectRatio = 297 / 210; // A4/A3 Landscape

  const { format, arrow, text, selectedLogos } = state;
  const arrowScale = state.arrowScale ?? 1;
  const count = selectedLogos.length;

  // Reserved horizontal space (per side) on banner so text never overlaps the arrow.
  // Arrow visual width as % of banner WIDTH = arrow_h_pct * scale * banner_h_pct * arrow_w_ratio / aspectRatio.
  const arrowReservedPct =
    (ARROW_MARGIN_PCT +
      (ARROW_HEIGHT_PCT * arrowScale * BANNER_HEIGHT_PCT * ARROW_WIDTH_RATIO) / aspectRatio) *
    100;
  const SAFE_GAP_PCT = 2;
  const sidePadPct = arrow !== 'none' ? arrowReservedPct + SAFE_GAP_PCT : 5;

  const getGridClasses = () => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count === 3) return "grid-cols-3 grid-rows-1";
    if (count === 4) return "grid-cols-2 grid-rows-2";
    if (count === 6) return "grid-cols-3 grid-rows-2";
    if (count === 8) return "grid-cols-4 grid-rows-2";
    return ""; // handled custom for 5, 7
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
              backgroundColor: state.customBannerDataUrl ? undefined : '#EDE8D4',
            }}
          >
            {/* Custom banner background image */}
            {state.customBannerDataUrl && (
              <img
                src={state.customBannerDataUrl}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
            )}

            {arrow === 'left' && (
              <div
                className="absolute flex items-center justify-start"
                style={{
                  left: `${ARROW_MARGIN_PCT * 100}%`,
                  height: `${ARROW_HEIGHT_PCT * arrowScale * 100}%`,
                  aspectRatio: `${ARROW_WIDTH_RATIO}`,
                  zIndex: 1,
                }}
              >
                {state.customArrowChar ? (
                  <AutoFitChar char={state.customArrowChar} flip />
                ) : state.customArrowDataUrl ? (
                  <img
                    src={state.customArrowDataUrl}
                    className="w-full h-full object-contain"
                    style={{ transform: 'scaleX(-1)' }}
                    alt=""
                  />
                ) : (
                  <AutoFitChar char={'\u3008'} bold />
                )}
              </div>
            )}

            {arrow === 'right' && (
              <div
                className="absolute flex items-center justify-end"
                style={{
                  right: `${ARROW_MARGIN_PCT * 100}%`,
                  height: `${ARROW_HEIGHT_PCT * arrowScale * 100}%`,
                  aspectRatio: `${ARROW_WIDTH_RATIO}`,
                  zIndex: 1,
                }}
              >
                {state.customArrowChar ? (
                  <AutoFitChar char={state.customArrowChar} />
                ) : state.customArrowDataUrl ? (
                  <img
                    src={state.customArrowDataUrl}
                    className="w-full h-full object-contain"
                    alt=""
                  />
                ) : (
                  <AutoFitChar char={'\u3009'} bold />
                )}
              </div>
            )}

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                paddingLeft: `${sidePadPct}%`,
                paddingRight: `${sidePadPct}%`,
                zIndex: 1,
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

function AutoFitChar({ char, flip, bold }: { char: string; flip?: boolean; bold?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(16);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const fit = () => {
      const ch = container.clientHeight;
      if (ch > 0) setFontSize(ch * 0.88);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <span
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: bold ? 'bold' : 'normal',
          lineHeight: 1,
          display: 'inline-block',
          transform: flip ? 'scaleX(-1)' : undefined,
          userSelect: 'none',
        }}
      >
        {char}
      </span>
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

