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
  // Pre-generar copos de nieve para modo Día (28 copos con sutil deriva)
  const snowflakes = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const left = pseudoRandom(i * 17 + 1) * 100;
      const size = 10 + pseudoRandom(i * 23 + 2) * 16; // 10px a 26px
      const duration = 6 + pseudoRandom(i * 31 + 3) * 7; // 6s a 13s
      const delay = pseudoRandom(i * 43 + 4) * 8; // 0s a 8s
      const drift = -30 + pseudoRandom(i * 59 + 5) * 60; // deriva horizontal
      const opacity = 0.4 + pseudoRandom(i * 71 + 6) * 0.5;
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
      {/* ☀️ MODO DÍA: Ambiente Soleado Radiante + Copos de Nieve       */}
      {/* ============================================================ */}
      {!isDark && (
        <>
          {/* Resplandor del Sol Dorado en la esquina superior derecha */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-amber-300/35 via-orange-300/20 to-transparent blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
          <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18)_0%,transparent_75%)] blur-2xl pointer-events-none" />

          {/* Copos de Nieve cayendo suavemente */}
          {snowflakes.map((flake) => (
            <span
              key={`flake-${flake.id}`}
              className="absolute text-sky-700/60 dark:text-white select-none drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]"
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
      {/* 🌙 MODO NOCHE: Cielo Estrellado + Luces de Navidad           */}
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

// Componente individual de bombillo navideño con brillo alternante
export const ChristmasBulb: React.FC<{
  cx: number;
  cy: number;
  color: 'red' | 'green' | 'gold';
  delay: number;
  size?: number;
}> = ({ cx, cy, color, delay, size = 1 }) => {
  const isRed = color === 'red';
  const isGreen = color === 'green';
  const fillColor = isRed ? '#EB321D' : isGreen ? '#22C55E' : '#EFA632';
  const glowClass = isRed
    ? 'xmas-bulb-red'
    : isGreen
    ? 'xmas-bulb-green'
    : 'xmas-bulb-gold';

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${size})`}>
      {/* Base metálica / enchufe del bombillo */}
      <rect x="-2" y="-5" width="4" height="5" fill="#2E2C29" rx="0.5" />
      {/* Cuerpo del bombillo ovalado con destello */}
      <ellipse
        cx="0"
        cy="4"
        rx="4.5"
        ry="6.5"
        fill={fillColor}
        className={glowClass}
        style={{ animationDelay: `${delay}s` }}
      />
      {/* Reflejo blanco brillante de cristal */}
      <ellipse cx="-1.5" cy="2" rx="1.2" ry="2.5" fill="rgba(255,255,255,0.7)" />
    </g>
  );
};

// Tira de luces navideñas colgando para usar encima de tarjetas (cuadros) o banners
export const CardChristmasLightsGarland: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`absolute top-0 inset-x-0 h-6 overflow-visible pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 28"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        {/* Cable festivo ondulado */}
        <path
          d="M 0 4 Q 40 18, 80 4 Q 120 18, 160 4 Q 200 18, 240 4 Q 280 18, 320 4"
          fill="none"
          stroke="#164E24"
          strokeWidth="1.6"
        />
        {/* Serie de 8 bombillos alternando verde y rojo */}
        <ChristmasBulb cx={40} cy={14} color="red" delay={0.1} size={0.9} />
        <ChristmasBulb cx={80} cy={4} color="green" delay={0.7} size={0.8} />
        <ChristmasBulb cx={120} cy={14} color="red" delay={1.3} size={0.9} />
        <ChristmasBulb cx={160} cy={4} color="gold" delay={0.4} size={0.8} />
        <ChristmasBulb cx={200} cy={14} color="green" delay={1.0} size={0.9} />
        <ChristmasBulb cx={240} cy={4} color="red" delay={0.2} size={0.8} />
        <ChristmasBulb cx={280} cy={14} color="green" delay={0.8} size={0.9} />
      </svg>
    </div>
  );
};
