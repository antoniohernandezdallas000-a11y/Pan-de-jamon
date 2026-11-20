import React, { useState } from 'react';

export interface PanImgProps {
  index: number;
  active: boolean;
  hovered: boolean;
}

/**
 * Componente que renderiza el pan recortado sin fondo con tamaño fluido y adaptable
 */
export const PanImg: React.FC<PanImgProps> = ({ index, active, hovered }) => {
  const isSelected = active || hovered;

  return (
    <div
      className={`relative w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center transition-transform duration-200 select-none ${
        isSelected
          ? 'scale-110 drop-shadow-[0_8px_16px_rgba(239,166,50,0.65)] z-10'
          : 'opacity-30 grayscale contrast-75 hover:opacity-75 hover:scale-105'
      }`}
      aria-hidden="true"
    >
      <img
        src={`/assets/panes/pan-${index}.png`}
        alt=""
        loading="eager"
        decoding="async"
        className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)] pointer-events-none"
      />
      {isSelected && index === 5 && (
        <span
          className="absolute -top-2 -right-1 xs:-top-2.5 xs:-right-1.5 text-xs xs:text-sm sm:text-base md:text-xl animate-bounce"
          aria-hidden="true"
        >
          👑
        </span>
      )}
    </div>
  );
};

export interface PanIconProps {
  active?: boolean;
  size?: number;
  className?: string;
}

/**
 * Ícono para badges y promedios en tarjetas
 */
export const PanIcon: React.FC<PanIconProps> = ({ active = true, size = 32, className = '' }) => {
  return (
    <img
      src="/assets/panes/pan-5.png"
      alt="Pancito Dorado"
      style={{ width: size, height: size }}
      className={`inline-block object-contain transition-all shrink-0 ${
        active ? 'drop-shadow-[0_2px_8px_rgba(239,166,50,0.7)]' : 'opacity-40 grayscale'
      } ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
};

export interface BreadRatingProps {
  value: number;
  onChange: (val: number) => void;
  number: string | number;
  title: string;
  question: string;
  criolloTip: string;
  hasError?: boolean;
}

export const CRIOLLO_SCALE: Record<number, { badge: string; detail: string }> = {
  1: { badge: 'Pichirre total 👎', detail: 'Pálido y con poco relleno, le faltó cariño' },
  2: { badge: 'Pasa raspando 🤏', detail: 'Mata el antojo pero le falta nivel y sazón' },
  3: { badge: 'Resuelve fino 👍', detail: 'Buen pan tradicional, cumple con la faena' },
  4: { badge: '¡Ta\' criminal! 🔥', detail: 'Doradito sabroso, bien cargao de tocineta y jamón' },
  5: { badge: 'THE FUCKING GLORIA 👑', detail: '¡Na\'guará de pan! Barniz perfecto y rebosante' }
};

export default function BreadRating({
  value,
  onChange,
  number,
  title,
  question,
  criolloTip,
  hasError = false
}: BreadRatingProps) {
  const [hovered, setHovered] = useState<number>(0);

  const currentIdx = hovered || value;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(5, index + 1);
      onChange(next);
      triggerHaptic();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(1, index - 1);
      onChange(prev);
      triggerHaptic();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(5);
    }
  };

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }
  };

  const handleSelect = (idx: number) => {
    triggerHaptic();
    onChange(idx);
  };

  return (
    <div
      className={`bg-[#141311] border rounded-2xl p-3.5 xs:p-4 sm:p-5 md:p-6 transition-all duration-300 shadow-xl relative ${
        hasError
          ? 'border-[#EB321D] shadow-[0_0_20px_rgba(235,50,29,0.25)] animate-pulse'
          : value > 0
          ? 'border-[#EFA632]/50'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Cabecera del Criterio Adaptable */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#EFA632] block mb-0.5">
            CRITERIO {number} DE 3
          </span>
          <h3 className="font-display text-lg xs:text-xl sm:text-2xl md:text-3xl text-white tracking-wide leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-snug">{question}</p>
        </div>

        {/* Badge del Veredicto */}
        <div className="shrink-0 mt-1 sm:mt-0" aria-live="polite">
          <span
            className={`text-[10px] xs:text-[11px] sm:text-xs font-bold px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border transition-all inline-block ${
              currentIdx > 0
                ? 'bg-[#EFA632]/15 text-[#EFA632] border-[#EFA632]/40 shadow-sm'
                : 'bg-white/5 text-neutral-500 border-white/10'
            }`}
          >
            {currentIdx > 0 ? `${currentIdx}/5 • ${CRIOLLO_SCALE[currentIdx]?.badge || ''}` : 'Toca un pancito'}
          </span>
        </div>
      </div>

      {/* Tip Criollo Didáctico con la Mascota Oficial de la Web */}
      <div className="flex items-start gap-2.5 sm:gap-3.5 my-3 sm:my-4 p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-[#EFA632]/30 shadow-md">
        <div className="relative shrink-0">
          <img
            src="/assets/mascota-badge.png"
            alt="Mascota Catador Oficial"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-[#EFA632] shadow-lg shadow-[#EFA632]/20"
          />
          <span className="absolute -bottom-1 -right-1 text-[11px] bg-black/85 px-1 rounded-full border border-[#EFA632]">
            🥖
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#EFA632]">
              Consejo de la Mascota Catadora:
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed italic">
            “{criolloTip}”
          </p>
        </div>
      </div>

      {/* Escala Adaptable a Cualquier Pantalla */}
      <div
        role="radiogroup"
        aria-label={`${title}: Calificación de 1 a 5 pancitos`}
        className="flex items-center justify-between py-2 sm:py-4 px-1 xs:px-2 sm:px-4 md:px-6 bg-black/80 rounded-xl sm:rounded-2xl border border-white/10"
      >
        {[1, 2, 3, 4, 5].map((idx) => {
          const isCurrentChoice = value === idx;

          return (
            <button
              key={idx}
              type="button"
              role="radio"
              aria-checked={isCurrentChoice}
              aria-label={`${idx} ${idx === 1 ? 'Pancito' : 'Pancitos'}: ${CRIOLLO_SCALE[idx]?.badge || ''}`}
              tabIndex={isCurrentChoice || (value === 0 && idx === 1) ? 0 : -1}
              onClick={() => handleSelect(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(0)}
              className="flex-1 min-w-0 flex flex-col items-center gap-1 sm:gap-2 cursor-pointer p-0.5 xs:p-1 transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFA632] rounded-xl touch-manipulation"
            >
              <PanImg
                index={idx}
                active={idx <= value}
                hovered={idx <= hovered}
              />
              <span
                className={`font-display text-[10px] xs:text-xs sm:text-sm md:text-base tracking-wider truncate ${
                  idx <= (hovered || value) ? 'text-[#EFA632] font-black' : 'text-neutral-500'
                }`}
              >
                {idx} <span className="hidden sm:inline">{idx === 1 ? 'PAN' : 'PANES'}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Explicación en vivo del estado */}
      <div className="min-h-5 sm:min-h-6 mt-2 sm:mt-3 text-center">
        {currentIdx > 0 ? (
          <p className="text-[11px] sm:text-xs md:text-sm text-[#EFA632] font-bold italic animate-in fade-in duration-150 truncate">
            "{CRIOLLO_SCALE[currentIdx]?.detail}"
          </p>
        ) : (
          <p className="text-[10px] sm:text-xs text-neutral-500">¿Qué tal estuvo este punto? Dale sus pancitos.</p>
        )}
      </div>
    </div>
  );
}
