import React from 'react';
import { Award, Crown, Flame, Medal, MessageSquare, QrCode, Sparkles, Star, TrendingUp, Trophy } from 'lucide-react';
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
      {/* SECTION 1: UX PRO MAX GASTRONOMIC PODIUM */}
      <section className="relative rounded-3xl overflow-hidden border border-zinc-800/90 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-8 lg:p-10 shadow-2xl">
        {/* Ambient atmospheric glow */}
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-amber-500/20 via-[#F52D18]/15 to-transparent blur-3xl pointer-events-none rounded-full"
        />

        <div className="relative z-10 text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>Podio Oficial en Tiempo Real · Ciudad Bolívar</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide">
            El Podio del <span className="text-gold-shimmer">Mejor Pan de Jamón</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Computado en vivo con ponderación oficial de las 3 preguntas: Masa Brioche, Proporción de Relleno y Tradición.
          </p>
        </div>

        {/* 3-Column Visual Olympic Podium */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto">
          {/* 🥈 SECOND PLACE (Plata) */}
          {second && (
            <div className="order-2 md:order-1 flex flex-col items-center">
              <div className="relative w-full rounded-2xl bg-zinc-900/90 border border-zinc-700/80 p-5 shadow-xl transition-all duration-300 hover:border-zinc-500 flex flex-col items-center text-center">
                {/* Silver Medal Badge */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-100 text-zinc-950 flex items-center justify-center font-display font-black text-xl shadow-lg -mt-10 mb-3 border-2 border-slate-300">
                  2°
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 font-semibold mb-1">
                  <Medal className="w-3.5 h-3.5 text-slate-300" />
                  <span>SUBCAMPEÓN</span>
                </div>
                <h3 className="font-display text-xl font-bold text-white line-clamp-1">
                  {second.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{second.sector}</p>

                <div className="mt-4 w-full py-2 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-zinc-400">Puntaje:</span>
                  <span className="font-bold text-slate-200">{second.metrics.compositeAverage.toFixed(2)} ★</span>
                </div>
                <div className="mt-1.5 w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                  <span>{second.totalVotes} votos</span>
                  <span>
                    {totalCompetitionVotes > 0
                      ? `${Math.round((second.totalVotes / totalCompetitionVotes) * 100)}% cuota`
                      : '0%'}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(second.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-200 hover:bg-white text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Votar
                  </button>
                </div>
              </div>
              {/* Podium Base #2 */}
              <div className="hidden md:flex w-full h-16 bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-x border-b border-zinc-700/60 rounded-b-xl items-center justify-center font-display text-3xl font-black text-slate-500/40">
                2
              </div>
            </div>
          )}

          {/* 🥇 FIRST PLACE (Oro - Líder Supremo) */}
          {first && (
            <div className="order-1 md:order-2 flex flex-col items-center">
              <div className="relative w-full rounded-2xl bg-gradient-to-b from-amber-950/40 via-zinc-900/90 to-zinc-950 border-2 border-amber-500/80 p-6 shadow-2xl shadow-amber-500/20 transition-all duration-300 hover:border-amber-400 flex flex-col items-center text-center">
                {/* Crown Icon */}
                <div className="absolute -top-7 text-amber-400 animate-pulse-glow">
                  <Crown className="w-8 h-8 fill-amber-400 drop-shadow-[0_0_12px_#F59E0B]" />
                </div>

                {/* Gold Medal Badge */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 text-zinc-950 flex items-center justify-center font-display font-black text-2xl shadow-xl -mt-10 mb-3 border-2 border-yellow-200">
                  1°
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>LÍDER DEL CONCURSO</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-black text-white mt-1 line-clamp-1">
                  {first.name}
                </h3>
                <p className="text-xs text-amber-200/80 mt-1 line-clamp-1">
                  Sector {first.sector} · {first.masterBaker}
                </p>

                <div className="mt-5 w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between text-sm font-mono tabular-nums">
                  <span className="text-zinc-400 text-xs">Puntaje Global:</span>
                  <span className="font-black text-amber-400 text-lg flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {first.metrics.compositeAverage.toFixed(2)} ★
                  </span>
                </div>

                <div className="mt-2 w-full flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                  <span className="text-white font-semibold">{first.totalVotes} votos atómicos</span>
                  <span className="text-amber-400 font-semibold">
                    {totalCompetitionVotes > 0
                      ? `${Math.round((first.totalVotes / totalCompetitionVotes) * 100)}% de los votos`
                      : '0%'}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(first.id)}
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Ver Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(first.id)}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold transition-all shadow-lg glow-red cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Votar Líder</span>
                  </button>
                </div>
              </div>
              {/* Podium Base #1 */}
              <div className="hidden md:flex w-full h-24 bg-gradient-to-b from-amber-950/60 via-zinc-900 to-zinc-950 border-x border-b border-amber-500/40 rounded-b-xl items-center justify-center font-display text-4xl font-black text-amber-400/40">
                1
              </div>
            </div>
          )}

          {/* 🥉 THIRD PLACE (Bronce) */}
          {third && (
            <div className="order-3 flex flex-col items-center">
              <div className="relative w-full rounded-2xl bg-zinc-900/90 border border-amber-900/60 p-5 shadow-xl transition-all duration-300 hover:border-amber-700/80 flex flex-col items-center text-center">
                {/* Bronze Medal Badge */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-800 via-amber-700 to-amber-900 text-amber-100 flex items-center justify-center font-display font-black text-xl shadow-lg -mt-10 mb-3 border-2 border-amber-600/80">
                  3°
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-500 font-semibold mb-1">
                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                  <span>TERCER PUESTO</span>
                </div>
                <h3 className="font-display text-xl font-bold text-white line-clamp-1">
                  {third.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{third.sector}</p>

                <div className="mt-4 w-full py-2 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-zinc-400">Puntaje:</span>
                  <span className="font-bold text-amber-500">{third.metrics.compositeAverage.toFixed(2)} ★</span>
                </div>
                <div className="mt-1.5 w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                  <span>{third.totalVotes} votos</span>
                  <span>
                    {totalCompetitionVotes > 0
                      ? `${Math.round((third.totalVotes / totalCompetitionVotes) * 100)}% cuota`
                      : '0%'}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickVote(third.id)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Votar
                  </button>
                </div>
              </div>
              {/* Podium Base #3 */}
              <div className="hidden md:flex w-full h-12 bg-gradient-to-b from-zinc-800/60 to-zinc-900 border-x border-b border-amber-900/40 rounded-b-xl items-center justify-center font-display text-2xl font-black text-amber-700/40">
                3
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: COMPARATIVE LEADERBOARD TABLE ACROSS THE 3 QUESTIONS */}
      <section className="rounded-3xl bg-zinc-900/80 border border-zinc-800/90 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              Tabla General de Calificaciones · Ciudad Bolívar
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Desglose transparente por Masa Brioche, Proporción de Relleno y Tradición ({totalCompetitionVotes} votos certificados)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl tabular-nums">
            <TrendingUp className="w-4 h-4 text-[#F52D18]" />
            <span>Sincronización en Vivo</span>
          </div>
        </div>

        <div className="space-y-4">
          {rankedBakeries.map((b) => {
            const voteSharePct =
              totalCompetitionVotes > 0
                ? Math.round((b.totalVotes / totalCompetitionVotes) * 100)
                : 0;

            const isTop3 = b.rank <= 3;

            return (
              <div
                key={b.id}
                data-testid={`leaderboard-row-${b.id}`}
                className={`rounded-2xl transition-all duration-200 border p-5 sm:p-6 space-y-4 ${
                  b.rank === 1
                    ? 'bg-gradient-to-r from-amber-950/20 via-zinc-900/90 to-zinc-900/90 border-amber-500/40 shadow-lg'
                    : isTop3
                    ? 'bg-zinc-900/90 border-zinc-700/70'
                    : 'bg-zinc-950/60 border-zinc-800/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                          b.rank === 1
                            ? 'bg-amber-500 text-zinc-950'
                            : b.rank === 2
                            ? 'bg-slate-300 text-zinc-950'
                            : b.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        Puesto #{b.rank}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{b.portalCode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-300 font-medium">{b.sector}</span>
                    </div>
                    <h4 className="font-display text-2xl font-bold text-white tracking-wide">
                      {b.name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Maestro Panadero: <strong className="text-zinc-200">{b.masterBaker}</strong> · {b.crustStyle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 tabular-nums">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-mono text-zinc-400 uppercase">Promedio Oficial</div>
                      <div className="font-mono text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1.5">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span>{b.metrics.compositeAverage.toFixed(2)}</span>
                        <span className="text-xs text-zinc-500">/ 5.0</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-mono text-zinc-400 uppercase">Votos Verificados</div>
                      <div className="font-mono text-xl font-bold text-white">
                        {b.totalVotes} <span className="text-xs text-zinc-400">({voteSharePct}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPortal(b.id)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Portal
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickVote(b.id)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md glow-red"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Votar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3-Question Comparative Bars with Rich Warm Gradients */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-zinc-800/90 tabular-nums">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const score =
                      idx === 0
                        ? b.metrics.avgDough
                        : idx === 1
                        ? b.metrics.avgFilling
                        : b.metrics.avgOverall;
                    const widthPct = Math.min(100, Math.round((score / 5) * 100));
                    return (
                      <div key={q.key} className="space-y-1.5 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 truncate">
                            {q.number}. {q.title}
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            {score.toFixed(2)} ★
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-[#F52D18] rounded-full transition-all duration-500"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: LIVE STREAM OF VERIFIED SURVEY REVIEWS */}
      <section className="rounded-3xl bg-zinc-900/80 border border-zinc-800/90 p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-[#F52D18]" />
            <span>Bitácora de Catadores y Críticas ({votes.length})</span>
          </h3>
          <span className="text-xs font-mono text-zinc-400">Verificadas con Hash Criptográfico</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {votes.map((v) => {
            const avg = ((v.q1DoughScore + v.q2FillingScore + v.q3OverallScore) / 3).toFixed(2);
            return (
              <div
                key={v.id}
                className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-5 space-y-3 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#F52D18]/20 border border-[#F52D18]/40 text-[#F52D18] flex items-center justify-center font-bold text-xs">
                      {v.voterAlias.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-white text-sm">{v.voterAlias}</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                    {avg} ★
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-400 tabular-nums">
                  <span className="text-zinc-200 font-semibold">{v.bakeryName}</span> · Token {v.tokenCode}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  “{v.comment}”
                </p>
                <div className="pt-2 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-900">
                  <span className="truncate max-w-[200px]">Hash: {v.txHash}</span>
                  {v.evidenceStoragePath && (
                    <span className="text-emerald-400">Foto Adjunta ✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};