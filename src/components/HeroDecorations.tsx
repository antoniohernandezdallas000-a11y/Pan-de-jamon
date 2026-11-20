import React from 'react';

/**
 * Corona de Neón Dorado Graffiti inspirada en la identidad de The Fucking Mejor Pan de Jamón
 */
export const NeonCrown: React.FC<{
  className?: string;
  glow?: boolean;
}> = ({ className = '', glow = true }) => (
  <svg
    viewBox="0 0 100 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} ${glow ? 'filter drop-shadow-[0_0_16px_rgba(239,166,50,0.85)]' : ''}`}
    aria-hidden="true"
  >
    <path
      d="M12 56 L18 24 L38 40 L50 14 L62 40 L82 24 L88 56 Z"
      stroke="#EFA632"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(239, 166, 50, 0.08)"
    />
    <circle cx="18" cy="22" r="3.5" fill="#EFA632" />
    <circle cx="50" cy="12" r="4" fill="#EFA632" />
    <circle cx="82" cy="22" r="3.5" fill="#EFA632" />
    <path
      d="M16 62 H84"
      stroke="#EFA632"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Silueta de multitud celebrando en el concierto/evento
 */
export const CrowdSilhouette: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 1200 160"
    fill="currentColor"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Cabezas de la multitud */}
    <path d="M0,160 L1200,160 L1200,105 Q1185,90 1170,104 Q1150,75 1130,92 Q1115,68 1095,88 Q1075,102 1055,90 Q1035,65 1015,85 Q990,108 970,92 Q955,72 935,88 Q920,58 895,76 Q875,98 855,86 Q835,66 815,82 Q795,48 770,70 Q750,92 730,78 Q710,62 690,80 Q670,52 645,72 Q625,92 605,80 Q585,58 560,76 Q540,98 520,84 Q500,66 480,82 Q460,48 435,70 Q415,92 395,78 Q375,62 355,80 Q335,52 310,72 Q290,92 270,80 Q250,58 225,76 Q205,98 185,84 Q165,66 145,82 Q125,48 100,70 Q80,92 60,78 Q40,62 20,80 Q10,68 0,88 Z" />
    {/* Brazos alzados */}
    <path d="M120,82 Q125,35 135,38 Q140,42 136,84 Z M280,80 Q270,32 285,34 Q290,42 288,82 Z M440,70 Q450,25 460,28 Q465,38 452,72 Z M600,80 Q595,28 610,30 Q618,40 612,82 Z M760,70 Q770,22 780,25 Q785,35 775,74 Z M920,76 Q915,28 930,30 Q938,40 932,80 Z M1080,88 Q1090,35 1100,38 Q1105,48 1092,90 Z" />
  </svg>
);

/**
 * Ondas festivas en rojo jamón y dorado papelón que decoran el pie de la tarjeta
 */
export const FestiveWaveRibbons: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 1200 60"
    fill="none"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Onda Amarilla / Dorada Papelón */}
    <path
      d="M0,60 C220,60 320,5 600,35 C880,65 980,10 1200,45 L1200,60 L0,60 Z"
      fill="#EFA632"
      opacity="0.95"
    />
    {/* Onda Roja Jamón */}
    <path
      d="M0,60 C260,40 360,55 600,18 C840,-8 940,40 1200,22 L1200,60 L0,60 Z"
      fill="#EB321D"
      opacity="0.98"
    />
  </svg>
);
