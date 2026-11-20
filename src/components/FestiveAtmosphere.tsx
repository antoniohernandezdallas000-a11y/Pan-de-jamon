import React, { useMemo } from 'react';

interface FestiveAtmosphereProps {
  isDark: boolean;
}

// Generador determinista simple para evitar saltos de hidratación
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const FestiveAtmosphere: React.FC<FestiveAtmosphereProps> = ({ isDark }) => {
  // Pre-generar copos de nieve para modo Día / Atardecer (28 copos con sutil deriva)
  const snowflakes = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const left = pseudoRandom(i * 17 + 1) * 100;
      const size = 11 + pseudoRandom(i * 23 + 2) * 18; // 11px a 29px
      const duration = 6 + pseudoRandom(i * 31 + 3) * 7; // 6s a 13s
      const delay = pseudoRandom(i * 43 + 4) * 8; // 0s a 8s
      const drift = -35 + pseudoRandom(i * 59 + 5) * 70; // deriva horizontal
      const opacity = 0.5 + pseudoRandom(i * 71 + 6) * 0.45;
      const char = ['❄', '❅', '✻', '•'][Math.floor(pseudoRandom(i * 83 + 7) * 4)];
      return { id: i, left, size, duration, delay, drift, opacity, char };
    });
  }, []);

  // Pre-generar estrellas para modo Noche (45 estrellas parpadeantes)
  const stars = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => {
      const top = pseudoRandom(i * 13 + 1) * 95;
      const left = pseudoRandom(i * 29 + 2) * 98;
      const size = 1.5 + pseudoRandom(i * 37 + 3) * 2.5; // 1.5px a 4px
      const duration = 1.8 + pseudoRandom(i * 47 + 4) * 3; // 1.8s a 4.8s
      const delay = pseudoRandom(i * 53 + 5) * 4;
      const isGold = i % 5 === 0;
      return { id: i, top, left, size, duration, delay, isGold };
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {/* ============================================================ */}
      {/* 🌅 MODO ATARDECER: Cielo Dorado/Coral Cálido + Nieve           */}
      {/* ============================================================ */}
      {!isDark && (
        <>
          {/* Capa de Cielo de Atardecer Gradual (Naranja Coral, Rosado y Ámbar Papelón) */}
          <div className="absolute top-0 inset-x-0 h-[480px] bg-gradient-to-b from-[#FF7A59]/25 via-[#FFA07A]/18 via-[#FDBA74]/15 to-transparent pointer-events-none" />

          {/* Sol del Atardecer Dorado Radiante (Orbe de luz en horizonte superior derecho) */}
          <div className="absolute -top-20 right-8 sm:right-24 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-br from-[#FFA238]/45 via-[#FF6B4A]/30 to-[#F43F5E]/15 blur-3xl pointer-events-none animate-pulse duration-[7000ms]" />

          {/* Haz de resplandor crepuscular horizontal */}
          <div className="absolute top-12 left-0 right-0 h-44 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.20)_0%,transparent_75%)] blur-2xl pointer-events-none" />

          {/* Copos de Nieve con reflejo cálido dorado del atardecer */}
          {snowflakes.map((flake) => (
            <span
              key={`flake-${flake.id}`}
              className="absolute text-orange-950/45 select-none drop-shadow-[0_2px_6px_rgba(251,146,60,0.55)]"
              style={{
                top: '-5%',
                left: `${flake.left}%`,
                fontSize: `${flake.size}px`,
                opacity: flake.opacity,
                animation: `snowfallAnim ${flake.duration}s linear infinite`,
                animationDelay: `${flake.delay}s`,
                '--drift-x': `${flake.drift}px`,
              } as React.CSSProperties}
            >
              {flake.char}
            </span>
          ))}
        </>
      )}

      {/* ============================================================ */}
      {/* 🌙 MODO NOCHE: Cielo Estrellado                              */}
      {/* ============================================================ */}
      {isDark && (
        <>
          {/* Estrellas Titilantes en el Cielo Nocturno */}
          {stars.map((star) => (
            <span
              key={`star-${star.id}`}
              className={`absolute rounded-full transition-opacity ${
                star.isGold
                  ? 'bg-[#EFA632] shadow-[0_0_6px_#EFA632]'
                  : 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]'
              }`}
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animation: `starTwinkle ${star.duration}s ease-in-out infinite alternate`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

// Tira de luces navideñas colgando para usar encima de tarjetas (cuadros)
// Dimensiones fijas para que los bombillos NUNCA se deformen ni se estiren
export const CardChristmasLightsGarland: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const bulbs = [
    { left: '12%', top: '9px', color: 'red' as const, delay: 0.1 },
    { left: '25%', top: '2px', color: 'green' as const, delay: 0.7 },
    { left: '38%', top: '9px', color: 'red' as const, delay: 1.3 },
    { left: '50%', top: '2px', color: 'gold' as const, delay: 0.4 },
    { left: '63%', top: '9px', color: 'green' as const, delay: 1.0 },
    { left: '76%', top: '2px', color: 'red' as const, delay: 0.2 },
    { left: '89%', top: '9px', color: 'green' as const, delay: 0.8 },
  ];

  return (
    <div
      className={`absolute -top-1.5 inset-x-0 h-6 overflow-visible pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    >
      {/* Cable ondulado verde oscuro */}
      <svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="w-full h-4 overflow-visible filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
      >
        <path
          d="M 0 3 Q 12 14, 25 3 Q 37 14, 50 3 Q 62 14, 75 3 Q 87 14, 100 3"
          fill="none"
          stroke="#164E24"
          strokeWidth="1.8"
        />
      </svg>

      {/* Bombillos individuales proporcionados (dimensiones fijas exactas) */}
      {bulbs.map((b, i) => {
        const isRed = b.color === 'red';
        const isGreen = b.color === 'green';
        const glowClass = isRed ? 'xmas-bulb-red' : isGreen ? 'xmas-bulb-green' : 'xmas-bulb-gold';
        const bgHex = isRed ? '#EB321D' : isGreen ? '#22C55E' : '#EFA632';

        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: b.left, top: b.top }}
          >
            {/* Casquillo del bombillo */}
            <div className="w-1.5 h-1.5 bg-[#2E2C29] rounded-xs" />
            {/* Bombillo ovalado perfectamente redondo y proporcional */}
            <div
              className={`w-2.5 h-3.5 rounded-full ${glowClass} relative shadow-xs`}
              style={{ backgroundColor: bgHex, animationDelay: `${b.delay}s` }}
            >
              {/* Reflejo de cristal */}
              <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/70 rounded-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
