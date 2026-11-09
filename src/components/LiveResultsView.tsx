import React from 'react';
import { Award, Heart, MessageSquare, QrCode, Star, TrendingUp, Trophy } from 'lucide-react';
import {
  Bakery,
  BakeryComputedMetrics,
  COMPETITION_LOGO_PATH,
  SURVEY_QUESTIONS,
  Vote,
} from '../types/competition';

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
      <section className="card-warm rounded-3xl p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EADBCA] dark:bg-[#2A231E] text-[#7A3E20] dark:text-[#E8A57E] text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-[#C84B31]" />
            <span>Votación Popular en Vivo · Ciudad Bolívar</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-[#2D241E] dark:text-[#FAF6F0]">
            Las Panaderías Favoritas del Público
          </h2>
          <p className="text-xs sm:text-sm text-[#66564B] dark:text-[#B8A99D]">
            Posiciones actualizadas al instante con las calificaciones de quienes han probado el pan de jamón en cada mesa.
          </p>
        </div>

        {/* 3 Top Bakeries Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
          {/* 🥈 Segundo Lugar */}
          {second && (
            <div className="order-2 md:order-1 flex flex-col items-center">
              <div className="w-full card-warm rounded-2xl p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center font-display font-black text-lg -mt-10 mb-3 shadow-xs">
                  2°
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Segundo Lugar
                </span>
                <h3 className="font-display text-xl font-bold text-[#2D241E] dark:text-[#F7F2EC] line-clamp-1">
                  {second.name}
                </h3>
                <p className="text-xs text-[#7A6B60] dark:text-[#A7988D] mt-0.5 line-clamp-1">{second.sector}</p>

                <div className="mt-3 w-full py-2 px-3 rounded-xl bg-[#FAF6F0] dark:bg-[#1E1917] flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[#7A6B60] dark:text-[#A7988D]">Promedio:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{second.metrics.compositeAverage.toFixed(2)} ★</span>
                </div>
                <div className="mt-1 w-full text-center text-[11px] text-[#8A796E]">
                  {second.totalVotes} votos de la comunidad
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-full bg-white dark:bg-[#2F2925] border border-[#D5C7B2] dark:border-[#423831] text-[#2D241E] dark:text-[#F5EFEB] text-xs font-semibold cursor-pointer"
                  >
                    Ver Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Votar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🥇 Primer Lugar (Líder) */}
          {first && (
            <div className="order-1 md:order-2 flex flex-col items-center">
              <div className="w-full card-warm rounded-2xl p-6 flex flex-col items-center text-center border-2 border-amber-400/80 shadow-md">
                <div className="w-14 h-14 rounded-full bg-amber-400 text-amber-950 border-2 border-amber-300 flex items-center justify-center font-display font-black text-2xl -mt-12 mb-3 shadow-md">
                  1°
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-1">
                  Favorito del Público
                </span>

                <h3 className="font-display text-2xl font-black text-[#2D241E] dark:text-[#F7F2EC] mt-1 line-clamp-1">
                  {first.name}
                </h3>
                <p className="text-xs text-[#7A6B60] dark:text-[#A7988D] mt-0.5 line-clamp-1">
                  {first.sector} · {first.masterBaker}
                </p>

                <div className="mt-4 w-full py-2 px-3.5 rounded-xl bg-amber-50 dark:bg-[#2A231C] border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-sm tabular-nums">
                  <span className="text-[#7A6B60] dark:text-[#A7988D] text-xs">Puntuación:</span>
                  <span className="font-black text-amber-700 dark:text-amber-400 text-base flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {first.metrics.compositeAverage.toFixed(2)} ★
                  </span>
                </div>

                <div className="mt-1 text-center text-xs text-[#8A796E]">
                  <strong>{first.totalVotes} votos</strong> registrados
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(first.id)}
                    className="flex-1 min-h-[42px] px-3 rounded-full bg-white dark:bg-[#2F2925] border border-[#D5C7B2] dark:border-[#423831] text-[#2D241E] dark:text-[#F5EFEB] text-xs font-semibold cursor-pointer"
                  >
                    Ver Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(first.id)}
                    className="flex-1 min-h-[42px] px-4 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Votar por este pan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🥉 Tercer Lugar */}
          {third && (
            <div className="order-3 flex flex-col items-center">
              <div className="w-full card-warm rounded-2xl p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center justify-center font-display font-black text-lg -mt-10 mb-3 shadow-xs">
                  3°
                </div>
                <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-1">
                  Tercer Lugar
                </span>
                <h3 className="font-display text-xl font-bold text-[#2D241E] dark:text-[#F7F2EC] line-clamp-1">
                  {third.name}
                </h3>
                <p className="text-xs text-[#7A6B60] dark:text-[#A7988D] mt-0.5 line-clamp-1">{third.sector}</p>

                <div className="mt-3 w-full py-2 px-3 rounded-xl bg-[#FAF6F0] dark:bg-[#1E1917] flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[#7A6B60] dark:text-[#A7988D]">Promedio:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{third.metrics.compositeAverage.toFixed(2)} ★</span>
                </div>
                <div className="mt-1 w-full text-center text-[11px] text-[#8A796E]">
                  {third.totalVotes} votos de la comunidad
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-full bg-white dark:bg-[#2F2925] border border-[#D5C7B2] dark:border-[#423831] text-[#2D241E] dark:text-[#F5EFEB] text-xs font-semibold cursor-pointer"
                  >
                    Ver Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Votar
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