import React from 'react';
import {
  ChevronRight,
  MapPin,
  Pencil,
  QrCode,
  Sparkles,
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
      className="food-card flex flex-col justify-between group"
      data-testid={`bakery-portal-card-${bakery.id}`}
    >
      {/* Top Visual Showcase with Natural Aspect Ratio */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-amber-50/50 dark:bg-zinc-800/50">
        <img
          src={bakery.photoUrl || COMPETITION_LOGO_PATH}
          alt={`Foto de ${bakery.name}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Soft gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10">
            📍 {bakery.sector}
          </span>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-white text-white" />
            <span>{bakery.metrics.compositeAverage.toFixed(1)}</span>
            <span className="text-[10px] opacity-80">({bakery.totalVotes})</span>
          </span>
        </div>

        {/* Bottom Baker Tag on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-1.5 text-xs font-medium drop-shadow-sm truncate">
            <Utensils className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">{bakery.masterBaker}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-amber-200 shrink-0 border border-white/10">
            #{bakery.rank} Lugar
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {bakery.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{bakery.address}</span>
            </p>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2 bg-amber-50/50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-amber-100/70 dark:border-zinc-800">
            “{bakery.signatureRecipe}”
          </p>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-medium">Masa</span>
              <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {bakery.metrics.avgDough.toFixed(1)} ★
              </strong>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-medium">Relleno</span>
              <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {bakery.metrics.avgFilling.toFixed(1)} ★
              </strong>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-medium">Estilo</span>
              <strong className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                {bakery.crustStyle}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenPortal(bakery.id)}
            className="btn-secondary flex-1 py-2.5 px-3 text-xs font-semibold"
          >
            <span>Ver Ficha</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => onQuickVoteWithQr(bakery.id)}
            className="btn-primary flex-1 py-2.5 px-3 text-xs font-semibold"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span>Votar ({activeTokenCount})</span>
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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bakery-portal-modal-title"
    >
      <div className="w-full max-w-2xl rounded-t-3xl md:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="relative p-6 sm:p-7 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-zinc-900 dark:to-zinc-900 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-amber-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm">
                <img
                  src={bakery.photoUrl || COMPETITION_LOGO_PATH}
                  alt={bakery.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span>Puesto #{bakery.rank}</span>
                  <span>·</span>
                  <span>{bakery.sector}</span>
                </div>
                <h2
                  id="bakery-portal-modal-title"
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                >
                  {bakery.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  <span>Maestro {bakery.masterBaker} · {bakery.crustStyle}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && onEditBakeryByAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditBakeryByAdmin(bakery);
                  }}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                  title="Editar Panadería"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Recipe Note */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-zinc-800/40 border border-amber-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Secreto Artesanal de la Receta</span>
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {bakery.signatureRecipe}
            </p>
          </div>

          {/* Survey Scores Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Calificaciones de la Comunidad
              </h3>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {bakery.metrics.compositeAverage.toFixed(2)} ★ ({bakery.totalVotes} votos)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{q.title}</span>
                      <strong className="text-zinc-900 dark:text-white">{val.toFixed(1)}★</strong>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Tasting Tables */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Mesas de Degustación ({bakeryTokens.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {bakeryTokens.map((t) => {
                const isAvailable = t.status === 'active' && t.usedCount < t.maxUses;
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white block truncate">
                        {t.code}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {t.batchLabel} · {t.usedCount}/{t.maxUses} usos
                      </span>
                    </div>

                    {isAvailable ? (
                      <button
                        type="button"
                        onClick={() => onSelectTokenToVote(t.code, bakery.id)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Votar
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">Agotado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Community Reviews */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Opiniones Recientes ({bakeryVotes.length})
            </h3>
            {bakeryVotes.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Aún no hay opiniones registradas. ¡Sé el primero en calificar en mesa!
              </p>
            ) : (
              <div className="space-y-2">
                {bakeryVotes.slice(0, 3).map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-zinc-800 dark:text-zinc-200">{v.voterAlias}</strong>
                      <span className="text-amber-500 font-bold">
                        {((v.q1DoughScore + v.q2FillingScore + v.q3OverallScore) / 3).toFixed(1)} ★
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{v.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 px-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-5 py-2.5 text-xs font-semibold"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={() => onOpenQrScannerForBakery(bakery.id)}
            className="btn-primary px-6 py-2.5 text-xs font-semibold"
          >
            <QrCode className="w-4 h-4" />
            <span>Calificar con QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
