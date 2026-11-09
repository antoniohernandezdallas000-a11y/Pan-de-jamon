import React from 'react';
import {
  ChevronRight,
  MapPin,
  Pencil,
  QrCode,
  Star,
  Utensils,
  X,
} from 'lucide-react';
import {
  Bakery,
  BakeryComputedMetrics,
  COMPETITION_LOGO_PATH,
  QrToken,
  SURVEY_QUESTIONS,
  Vote,
} from '../types/competition';

interface BakeryPortalCardProps {
  bakery: Bakery & { metrics: BakeryComputedMetrics; rank: number };
  activeTokenCount: number;
  isAdmin?: boolean;
  onOpenPortal: (bakeryId: string) => void;
  onQuickVoteWithQr: (bakeryId: string) => void;
  onEditBakeryByAdmin?: (bakery: Bakery) => void;
}

export const BakeryPortalCard: React.FC<BakeryPortalCardProps> = ({
  bakery,
  activeTokenCount,
  isAdmin = false,
  onOpenPortal,
  onQuickVoteWithQr,
  onEditBakeryByAdmin,
}) => {
  const hasCustomLocalImage =
    Boolean(bakery.photoUrl) && bakery.photoUrl !== COMPETITION_LOGO_PATH;

  return (
    <article
      className="group relative rounded-[32px] bg-zinc-900/80 border border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/15 hover:border-amber-500/30 flex flex-col justify-between backdrop-blur-md"
      data-testid={`bakery-portal-card-${bakery.id}`}
    >
      {/* Top Visual Imagery Showcase */}
      <div className="relative h-60 w-full overflow-hidden bg-zinc-950">
        <img
          src={bakery.photoUrl || COMPETITION_LOGO_PATH}
          alt={`Fachada o logo de ${bakery.name}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Soft Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

        {/* Floating Capsule Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-black shadow-lg backdrop-blur-md ${
                bakery.rank === 1
                  ? 'bg-amber-400 text-zinc-950 border border-yellow-200'
                  : bakery.rank === 2
                  ? 'bg-slate-200 text-zinc-950 border border-white'
                  : bakery.rank === 3
                  ? 'bg-amber-700 text-white border border-amber-500'
                  : 'bg-black/70 text-zinc-300 border border-white/10'
              }`}
            >
              #{bakery.rank} · {bakery.portalCode}
            </span>

            <span className="inline-flex items-center px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-zinc-300 border border-white/10">
              {bakery.sector}
            </span>
          </div>

          {/* Sello Competencia Official */}
          <div className="w-10 h-10 rounded-full bg-black/80 backdrop-blur-md p-1 border border-white/20 shadow-xl flex items-center justify-center">
            <img
              src={COMPETITION_LOGO_PATH}
              alt="Sello oficial"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom Banner Identity */}
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-display text-2xl sm:text-3xl font-black text-white drop-shadow-md leading-tight group-hover:text-amber-200 transition-colors">
              {bakery.name}
            </h3>
            <p className="text-xs text-amber-200/90 font-medium flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{bakery.masterBaker} · {bakery.crustStyle}</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-amber-500/30 text-amber-400 font-mono font-bold text-sm shadow-lg shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{bakery.metrics.compositeAverage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#F52D18] shrink-0" />
            <span className="truncate">{bakery.address}</span>
          </p>

          <p className="text-sm text-zinc-300 leading-relaxed italic line-clamp-2">
            “{bakery.signatureRecipe}”
          </p>

          {/* Fluid Modern Score Badges (no rigid boxes) */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-white/5 text-xs">
              <span className="text-zinc-400">Masa:</span>
              <span className="font-mono font-bold text-amber-300">{bakery.metrics.avgDough.toFixed(1)} ★</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-white/5 text-xs">
              <span className="text-zinc-400">Relleno:</span>
              <span className="font-mono font-bold text-amber-300">{bakery.metrics.avgFilling.toFixed(1)} ★</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-white/5 text-xs">
              <span className="text-zinc-400">Tradición:</span>
              <span className="font-mono font-bold text-amber-300">{bakery.metrics.avgOverall.toFixed(1)} ★</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 ml-auto">{bakery.totalVotes} votos</span>
          </div>
        </div>

        {/* Footer Actions with Pill Curves */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenPortal(bakery.id)}
            className="flex-1 min-h-[46px] px-4 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10 hover:border-white/20 active:scale-98"
          >
            <span>Ver Historia</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => onQuickVoteWithQr(bakery.id)}
            className="flex-1 min-h-[46px] px-4 rounded-full bg-gradient-to-r from-[#F52D18] via-rose-600 to-amber-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg glow-red active:scale-98"
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Votar QR ({activeTokenCount})</span>
          </button>
        </div>
      </div>
    </article>
  );
};

interface BakeryPortalModalProps {
  bakery: (Bakery & { metrics: BakeryComputedMetrics; rank: number }) | null;
  tokens: QrToken[];
  votes: Vote[];
  isAdmin?: boolean;
  onClose: () => void;
  onSelectTokenToVote: (tokenCode: string, bakeryId: string) => void;
  onOpenQrScannerForBakery: (bakeryId: string) => void;
  onEditBakeryByAdmin?: (bakery: Bakery) => void;
}

export const BakeryPortalModal: React.FC<BakeryPortalModalProps> = ({
  bakery,
  tokens,
  votes,
  isAdmin = false,
  onClose,
  onSelectTokenToVote,
  onOpenQrScannerForBakery,
  onEditBakeryByAdmin,
}) => {
  if (!bakery) return null;

  const bakeryTokens = tokens.filter((t) => t.bakeryId === bakery.id);
  const bakeryVotes = votes.filter((v) => v.bakeryId === bakery.id);
  const hasCustomLocalImage =
    Boolean(bakery.photoUrl) && bakery.photoUrl !== COMPETITION_LOGO_PATH;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bakery-portal-modal-title"
    >
      <div className="w-full max-w-3xl rounded-t-[36px] md:rounded-[36px] bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Portal Hero Header with Local Logo/Facade + Official Competition Logo */}
        <div className="relative bg-zinc-950 p-6 md:p-8 border-b border-white/10 shrink-0">
          <div
            className="absolute inset-0 opacity-35 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 85% 20%, ${bakery.accentHex}, transparent 65%)`,
            }}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-black p-1.5 border-2 shadow-2xl shrink-0 flex items-center justify-center overflow-hidden"
                style={{ borderColor: bakery.accentHex }}
              >
                <img
                  src={bakery.photoUrl || COMPETITION_LOGO_PATH}
                  alt={`Logo o fachada de ${bakery.name}`}
                  referrerPolicy="no-referrer"
                  className={
                    hasCustomLocalImage
                      ? 'w-full h-full object-cover rounded-xl'
                      : 'w-full h-full object-contain'
                  }
                />
                {hasCustomLocalImage && (
                  <div className="absolute bottom-1.5 right-1.5 w-8 h-9 rounded-lg bg-black/90 p-0.5 border border-zinc-700 shadow-lg">
                    <img
                      src={COMPETITION_LOGO_PATH}
                      alt="Sello oficial competencia"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-300 tabular-nums">
                  <span className="text-[#F52D18] font-bold">PUESTO #{bakery.rank}</span>
                  <span aria-hidden="true">·</span>
                  <span>PORTAL {bakery.portalCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{bakery.sector}, Ciudad Bolívar</span>
                </div>

                <h2
                  id="bakery-portal-modal-title"
                  className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-wide"
                >
                  {bakery.name}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#F52D18] shrink-0" />
                  <span>
                    Maestro Panadero: <strong className="text-white">{bakery.masterBaker}</strong> ·{' '}
                    {bakery.crustStyle}
                  </span>
                </p>

                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{bakery.address}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && onEditBakeryByAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditBakeryByAdmin(bakery);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar Local</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Cerrar portal de panadería"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Portal Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Recipe & Culinary Manifesto */}
          <section className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Ficha Gastronómica de Competencia
            </h3>
            <p className="text-sm md:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed">
              {bakery.signatureRecipe}
            </p>
          </section>

          {/* 3-Question Real-Time Star Matrix */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Desglose en Vivo · Encuesta de 3 Preguntas
              </h3>
              <span className="text-sm font-mono font-bold text-amber-500 tabular-nums">
                Promedio General: {bakery.metrics.compositeAverage.toFixed(2)} / 5.00 ★ (
                {bakery.totalVotes} votos)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
              {SURVEY_QUESTIONS.map((q, idx) => {
                const val =
                  idx === 0
                    ? bakery.metrics.avgDough
                    : idx === 1
                    ? bakery.metrics.avgFilling
                    : bakery.metrics.avgOverall;
                const pct = Math.min(100, Math.round((val / 5) * 100));
                return (
                  <div
                    key={q.key}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Pregunta {q.number}</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {val.toFixed(2)} ★
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {q.title}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-[#F52D18] transition-all duration-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Available QR Tokens for this Bakery Portal */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tokens QR Emitidos para esta Panadería ({bakeryTokens.length})
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecciona un token activo o abre la cámara
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bakeryTokens.map((t) => {
                const isAvailable = t.status === 'active' && t.usedCount < t.maxUses;
                return (
                  <div
                    key={t.id}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {t.code}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {t.batchLabel} · Usos: {t.usedCount}/{t.maxUses} · Estado:{' '}
                        <strong className="uppercase">{t.status}</strong>
                      </div>
                    </div>

                    {isAvailable ? (
                      <button
                        type="button"
                        onClick={() => onSelectTokenToVote(t.code, bakery.id)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        Usar QR
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                        No disponible
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Verified Voter Reviews */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Catas Verificadas Recientes ({bakeryVotes.length})
            </h3>
            {bakeryVotes.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aún no hay reseñas registradas en esta sesión. ¡Escanea un token QR para inaugurar el marcador!
              </p>
            ) : (
              <div className="space-y-2.5">
                {bakeryVotes.slice(0, 4).map((v) => {
                  const avg = ((v.q1DoughScore + v.q2FillingScore + v.q3OverallScore) / 3).toFixed(1);
                  return (
                    <div
                      key={v.id}
                      className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {v.voterAlias}
                        </span>
                        <span className="font-mono">
                          Token {v.tokenCode} · {avg}★ · {v.txHash.slice(0, 11)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{v.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sticky Portal Bottom Action Bar */}
        <div className="p-4 md:px-8 bg-zinc-950 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-5 py-2.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Volver al Catálogo
          </button>

          <button
            type="button"
            onClick={() => onOpenQrScannerForBakery(bakery.id)}
            className="min-h-[46px] px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F52D18] to-amber-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg glow-red cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Calificar con Token QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
