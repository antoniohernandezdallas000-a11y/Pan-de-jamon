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
  const isLit = active || hovered;

  return (
    <div
      className={`relative w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-22 lg:h-22 flex items-center justify-center transition-all duration-200 select-none ${
        isLit
          ? 'scale-115 sm:scale-120 -translate-y-1.5 drop-shadow-[0_0_16px_rgba(239,166,50,0.95)] drop-shadow-[0_0_32px_rgba(239,166,50,0.5)] z-20'
          : 'opacity-35 grayscale contrast-125 brightness-50 drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)] group-hover:opacity-60 group-hover:brightness-75 transition-all'
      }`}
      aria-hidden="true"
    >
      <img
        src={`/assets/panes/pan-${index}.png`}
        alt=""
        loading="eager"
        decoding="async"
        className={`w-full h-full object-contain pointer-events-none transition-all duration-200 ${
          isLit
            ? 'filter brightness-115 saturate-130'
            : 'filter brightness-50 saturate-40'
        }`}
      />
      {isLit && index === 5 && (
        <span
          className="absolute -top-3 -right-1 xs:-top-3.5 xs:-right-1.5 text-xs xs:text-sm sm:text-base md:text-xl animate-bounce filter drop-shadow-[0_0_8px_#EFA632]"
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

      {/* Tip Criollo Didáctico con Catador Hablando Animado */}
      <div className="flex items-center gap-3 my-3 sm:my-4 p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-[#EFA632]/30 shadow-md">
        <div className="relative shrink-0">
          <picture>
            <source srcSet="/assets/catador-avatar-hablando.webp" type="image/webp" />
            <img
              src="/assets/catador-avatar-hablando.gif"
              alt="Catador Hablando"
              className="w-13 h-13 sm:w-16 sm:h-16 object-contain drop-shadow-[0_4px_12px_rgba(239,166,50,0.35)]"
            />
          </picture>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed italic">
            “{criolloTip}”
          </p>
        </div>
      </div>

      {/* Escala Adaptable a Cualquier Pantalla con Iluminación Progresiva */}
      <div
        role="radiogroup"
        aria-label={`${title}: Calificación de 1 a 5 pancitos`}
        onMouseLeave={() => setHovered(0)}
        className="flex items-center justify-between py-2 sm:py-4 px-1 xs:px-2 sm:px-4 md:px-6 bg-black/85 rounded-xl sm:rounded-2xl border border-white/10 gap-1 sm:gap-2 shadow-inner"
      >
        {[1, 2, 3, 4, 5].map((idx) => {
          const isCurrentChoice = value === idx;
          const isLit = idx <= (hovered || value);

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
              onTouchStart={() => setHovered(idx)}
              className={`group flex-1 min-w-0 flex flex-col items-center gap-1 sm:gap-2 cursor-pointer py-1.5 sm:py-2.5 px-0.5 xs:px-1 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EFA632] touch-manipulation ${
                isLit ? 'bg-[#EFA632]/12 sm:bg-[#EFA632]/15 shadow-sm' : 'hover:bg-white/5'
              }`}
            >
              <PanImg
                index={idx}
                active={idx <= value}
                hovered={idx <= hovered}
              />
              <span
                className={`font-display text-[10px] xs:text-xs sm:text-sm md:text-base tracking-wider truncate transition-colors duration-150 ${
                  isLit ? 'text-[#EFA632] font-black drop-shadow-[0_0_8px_rgba(239,166,50,0.6)]' : 'text-neutral-500'
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
