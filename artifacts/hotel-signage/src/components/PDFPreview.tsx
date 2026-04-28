import React, { useMemo } from 'react';
import { SignageState, BANNER_HEIGHT_PCT, ARROW_HEIGHT_PCT, ARROW_MARGIN_PCT } from '@/lib/pdf-generator';

interface PDFPreviewProps {
  state: SignageState;
  allLogos: Record<string, string>;
}

export function PDFPreview({ state, allLogos }: PDFPreviewProps) {
  const aspectRatio = 297 / 210; // A4/A3 Landscape
  
  const { format, arrow, text, selectedLogos } = state;
  const count = selectedLogos.length;

  const getGridClasses = () => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count === 3) return "grid-cols-3 grid-rows-1";
    if (count === 4) return "grid-cols-2 grid-rows-2";
    if (count === 6) return "grid-cols-3 grid-rows-2";
    return ""; // handled custom for 5
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
                  aspectRatio: '1.5',
                }}
              >
                <ArrowSvg direction="left" />
              </div>
            )}
            
            {arrow === 'right' && (
              <div 
                className="absolute flex items-center justify-end"
                style={{
                  right: `${ARROW_MARGIN_PCT * 100}%`,
                  height: `${ARROW_HEIGHT_PCT * 100}%`,
                  aspectRatio: '1.5',
                }}
              >
                <ArrowSvg direction="right" />
              </div>
            )}

            <div className="font-bold text-black font-sans w-[80%] text-center leading-none" style={{
              fontSize: 'min(12cqw, 18cqh)'
            }}>
              {text}
            </div>
          </div>

          {/* White Area */}
          <div className="flex-1 bg-white relative p-[5%]">
            {count === 0 ? (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                <span className="text-gray-400 font-medium">Sélectionnez 1 à 6 logos</span>
              </div>
            ) : count === 5 ? (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {selectedLogos.slice(0,3).map(id => (
                    <LogoCell key={id} src={allLogos[id]} />
                  ))}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div />
                  <div className="col-span-2 grid grid-cols-2 gap-4 -ml-[50%] mr-[50%] w-[150%]">
                     {selectedLogos.slice(3,5).map(id => (
                      <LogoCell key={id} src={allLogos[id]} />
                    ))}
                  </div>
                  <div />
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

function LogoCell({ src }: { src: string }) {
  if (!src) return null;
  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <img src={src} className="w-full h-full object-contain" alt="" />
    </div>
  );
}

function ArrowSvg({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 150 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {direction === 'left' ? (
        <path d="M60,0 L60,30 L150,30 L150,70 L60,70 L60,100 L0,50 Z" fill="#000000" />
      ) : (
        <path d="M90,0 L90,30 L0,30 L0,70 L90,70 L90,100 L150,50 Z" fill="#000000" />
      )}
    </svg>
  );
}
