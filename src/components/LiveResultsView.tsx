import React from 'react';
import { Award, Heart, MessageSquare, QrCode, Star, TrendingUp, Trophy } from 'lucide-react';
import {
  Bakery,
  BakeryComputedMetrics,
  COMPETITION_LOGO_PATH,
  SURVEY_QUESTIONS,
  Vote,
} from '../types/competition';
import { PanIcon } from './BreadRating';
import { CardChristmasLightsGarland } from './FestiveAtmosphere';

interface LiveResultsViewProps {
  rankedBakeries: Array<Bakery & { metrics: BakeryComputedMetrics; rank: number }>;
  votes: Vote[];
  onOpenPortal: (bakeryId: string) => void;
  onQuickVote: (bakeryId: string) => void;
}

export const LiveResultsView: React.FC<LiveResultsViewProps> = ({
  rankedBakeries,
  votes,
  onOpenPortal,
  onQuickVote,
}) => {
  const totalCompetitionVotes = rankedBakeries.reduce((acc, b) => acc + b.totalVotes, 0);
  const first = rankedBakeries[0];
  const second = rankedBakeries[1];
  const third = rankedBakeries[2];

  return (
    <div className="space-y-10" data-testid="live-results-view">
      {/* Human Festival Podium */}
      <section className="relative bg-white/90 dark:bg-[#141311] border border-amber-200/70 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl transition-colors overflow-visible">
        {/* Guirnalda de luces navideñas colgando en modo noche */}
        <CardChristmasLightsGarland className="hidden dark:block -top-1" />

        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFA632]/10 border border-[#EFA632]/40 text-[#EFA632] text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-[#EFA632]" />
            <span>CLASIFICACIÓN GENERAL AUDITADA EN TIEMPO REAL</span>
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-zinc-900 dark:text-white tracking-wide">
            EL PODIO DE LA CIUDAD
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-neutral-400">
            Las panaderías que están mandando la parada con los votos de la gente en el mostrador.
          </p>
        </div>

        {/* 3 Top Bakeries Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto">
          {/* 🥈 Segundo Lugar */}
          {second && (
            <div className="order-2 md:order-1 flex flex-col items-center">
              <div className="w-full bg-zinc-50 dark:bg-[#141311] border border-zinc-200 dark:border-neutral-700 rounded-3xl p-5 flex flex-col items-center text-center relative pt-8 shadow-xl transition-colors">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-neutral-300 text-black font-display text-xl flex items-center justify-center font-bold border-2 border-white shadow-lg">
                  2
                </div>
                <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-neutral-400 tracking-wider mb-1">
                  Pisa los talones
                </span>
                <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white line-clamp-1">
                  {second.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{second.sector}</p>

                <div className="mt-3 flex items-center justify-center gap-2 text-[#EFA632] font-display text-4xl">
                  <PanIcon active={true} size={28} />
                  <span>{second.metrics.compositeAverage.toFixed(1)}</span>
                </div>
                <div className="mt-1 w-full text-center text-xs text-zinc-500 dark:text-neutral-500">
                  {second.totalVotes} votos registrados
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#EB321D] hover:bg-[#d62815] text-white font-display text-lg tracking-wider cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <PanIcon active={true} size={18} />
                    <span>VOTAR</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🥇 Primer Lugar (Líder) */}
          {first && (
            <div className="order-1 md:order-2 flex flex-col items-center">
              <div className="w-full bg-gradient-to-b from-[#EFA632]/20 via-amber-50 to-white dark:from-[#EFA632]/25 dark:to-[#141311] border-2 border-[#EFA632] rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center relative pt-10 -mt-2 sm:-mt-4 shadow-2xl glow-pan-dorado transition-colors">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#EFA632] text-black font-display text-3xl flex items-center justify-center font-black border-3 border-white shadow-2xl">
                  👑
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EFA632]/20 text-[#EFA632] text-[10px] font-black uppercase tracking-widest mb-1">
                  EL PAPÁ DE LOS HELADOS • PUESTO #1
                </span>

                <h3 className="font-display text-3xl sm:text-4xl font-black text-zinc-950 dark:text-white mt-1 line-clamp-1">
                  {first.name}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-neutral-300 mt-0.5 line-clamp-1">
                  {first.sector} · {first.masterBaker}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 text-[#EFA632] font-display text-5xl sm:text-6xl font-black">
                  <PanIcon active={true} size={40} />
                  <span>{first.metrics.compositeAverage.toFixed(1)}</span>
                </div>

                <div className="mt-1 text-center text-xs text-zinc-700 dark:text-neutral-300 font-bold">
                  <strong>{first.totalVotes} votos</strong> registrados en mostrador
                </div>

                <div className="mt-5 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(first.id)}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-white/90 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-amber-300 dark:border-white/20 text-zinc-900 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Ver Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(first.id)}
                    className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#EB321D] hover:bg-[#d62815] text-white font-display text-xl tracking-wider cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 border border-white/20"
                  >
                    <PanIcon active={true} size={22} />
                    <span>CATAR & VOTAR</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🥉 Tercer Lugar */}
          {third && (
            <div className="order-3 flex flex-col items-center">
              <div className="w-full bg-zinc-50 dark:bg-[#141311] border border-zinc-200 dark:border-neutral-800 rounded-3xl p-5 flex flex-col items-center text-center relative pt-8 shadow-xl transition-colors">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#B87333] text-white font-display text-xl flex items-center justify-center font-bold border-2 border-white shadow-lg">
                  3
                </div>
                <span className="text-[10px] font-black uppercase text-[#B87333] tracking-wider mb-1">
                  En la pelea
                </span>
                <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white line-clamp-1">
                  {third.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{third.sector}</p>

                <div className="mt-3 flex items-center justify-center gap-2 text-[#EFA632] font-display text-4xl">
                  <PanIcon active={true} size={28} />
                  <span>{third.metrics.compositeAverage.toFixed(1)}</span>
                </div>
                <div className="mt-1 w-full text-center text-xs text-zinc-500 dark:text-neutral-500">
                  {third.totalVotes} votos registrados
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#EB321D] hover:bg-[#d62815] text-white font-display text-lg tracking-wider cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <PanIcon active={true} size={18} />
                    <span>VOTAR</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* General Positions Table */}
      <section className="card-warm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2D241E] dark:text-[#FAF6F0]">
              Tabla de Calificaciones · Ciudad Bolívar
            </h3>
            <p className="text-xs sm:text-sm text-[#7A6B60] dark:text-[#A7988D]">
              Evaluación detallada de la masa, el relleno y el sabor tradicional ({totalCompetitionVotes} votos en total)
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {rankedBakeries.map((b) => (
            <div
              key={b.id}
              data-testid={`leaderboard-row-${b.id}`}
              className="p-5 rounded-2xl bg-[#FAF6F0] dark:bg-[#251F1C] border border-[#E8DEC8] dark:border-[#382E27] space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#7A6B60] dark:text-[#A7988D]">
                    <span className="font-bold text-[#C84B31]">Puesto #{b.rank}</span>
                    <span>·</span>
                    <span>{b.sector}</span>
                    <span>·</span>
                    <span>{b.masterBaker}</span>
                  </div>
                  <h4 className="font-display text-xl font-bold text-[#2D241E] dark:text-[#FAF6F0] mt-0.5">
                    {b.name}
                  </h4>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-[#7A6B60] dark:text-[#A7988D]">Promedio</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-lg flex items-center gap-1 justify-end">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>{b.metrics.compositeAverage.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-[#7A6B60] dark:text-[#A7988D]">Votos</div>
                    <div className="font-bold text-[#2D241E] dark:text-white text-base">
                      {b.totalVotes}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onQuickVote(b.id)}
                    className="min-h-[38px] px-4 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Votar
                  </button>
                </div>
              </div>

              {/* 3 Questions Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8DEC8] dark:border-[#382E27] text-xs text-[#57493E] dark:text-[#CBBDB2]">
                <div>Masa Brioche: <strong>{b.metrics.avgDough.toFixed(1)} ★</strong></div>
                <div>Relleno de Jamón: <strong>{b.metrics.avgFilling.toFixed(1)} ★</strong></div>
                <div>Sabor Tradicional: <strong>{b.metrics.avgOverall.toFixed(1)} ★</strong></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Reviews from Diners */}
      <section className="card-warm rounded-3xl p-6 sm:p-8 space-y-5">
        <div>
          <h3 className="font-display text-2xl font-extrabold text-[#2D241E] dark:text-[#FAF6F0] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#C84B31]" />
            <span>Opiniones de los Comensales ({votes.length})</span>
          </h3>
          <p className="text-xs text-[#7A6B60] dark:text-[#A7988D]">
            Comentarios reales dejados por quienes han degustado el pan en las mesas participantes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {votes.map((v) => {
            const avg = ((v.q1DoughScore + v.q2FillingScore + v.q3OverallScore) / 3).toFixed(1);
            return (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-[#FAF6F0] dark:bg-[#251F1C] border border-[#E8DEC8] dark:border-[#382E27] space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#EADBCA] text-[#7A3E20] flex items-center justify-center font-bold text-xs">
                      {v.voterAlias.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-[#2D241E] dark:text-white">{v.voterAlias}</span>
                  </div>
                  <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full text-xs">
                    {avg} ★
                  </span>
                </div>
                <div className="text-xs text-[#7A6B60] dark:text-[#A7988D]">
                  Degustado en: <strong className="text-[#2D241E] dark:text-[#FAF6F0]">{v.bakeryName}</strong>
                </div>
                <p className="text-sm text-[#4E4137] dark:text-[#D5C8BD] leading-relaxed italic">
                  “{v.comment}”
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};