import React from 'react';
import { Award, MessageSquare, QrCode, Star, TrendingUp } from 'lucide-react';
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
  const leader = rankedBakeries[0];

  return (
    <div className="space-y-8" data-testid="live-results-view">
      {/* Leader Podium Spotlight */}
      {leader && (
        <section className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 88% 20%, ${leader.accentHex}, transparent 60%)`,
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-24 h-28 rounded-2xl bg-black p-2 border-2 border-[#F52D18] shrink-0 flex items-center justify-center shadow-2xl">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Emblema oficial del líder del concurso"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 tabular-nums">
                  <Award className="w-4 h-4" />
                  <span>LÍDER EN TIEMPO REAL · PUESTO #1 EN CIUDAD BOLÍVAR</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-wide">
                  {leader.name}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Sector {leader.sector} · Maestro Panadero: {leader.masterBaker} ·{' '}
                  {leader.crustStyle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center tabular-nums shrink-0">
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3.5">
                <div className="text-xs text-zinc-400">Promedio</div>
                <div className="font-mono text-2xl font-bold text-amber-400">
                  {leader.metrics.compositeAverage.toFixed(2)}★
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3.5">
                <div className="text-xs text-zinc-400">Votos QR</div>
                <div className="font-mono text-2xl font-bold text-white">{leader.totalVotes}</div>
              </div>
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3.5">
                <div className="text-xs text-zinc-400">Cuota Total</div>
                <div className="font-mono text-2xl font-bold text-[#F52D18]">
                  {totalCompetitionVotes > 0
                    ? `${Math.round((leader.totalVotes / totalCompetitionVotes) * 100)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comparative Leaderboard Table across the 3 Questions */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
              Tabla General de Posiciones · Ciudad Bolívar ({totalCompetitionVotes} Votos Atómicos)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Puntuaciones consolidadas de las 3 preguntas de la encuesta oficial post-degustación
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 tabular-nums">
            <TrendingUp className="w-4 h-4 text-[#F52D18]" />
            <span>Actualización instantánea vía Firestore</span>
          </div>
        </div>

        <div className="space-y-4">
          {rankedBakeries.map((b) => {
            const voteSharePct =
              totalCompetitionVotes > 0
                ? Math.round((b.totalVotes / totalCompetitionVotes) * 100)
                : 0;

            return (
              <div
                key={b.id}
                data-testid={`leaderboard-row-${b.id}`}
                className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span className="text-sm font-bold text-[#F52D18]">#{b.rank}</span>
                      <span aria-hidden="true">·</span>
                      <span>{b.portalCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{b.sector}</span>
                      <span aria-hidden="true">·</span>
                      <span>{b.masterBaker}</span>
                    </div>
                    <h4 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                      {b.name}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 tabular-nums">
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Promedio 3 Preguntas</div>
                      <div className="font-mono text-xl font-bold text-amber-500 flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{b.metrics.compositeAverage.toFixed(2)} / 5.00</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Votos Verificados</div>
                      <div className="font-mono text-xl font-bold text-zinc-900 dark:text-white">
                        {b.totalVotes} ({voteSharePct}%)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPortal(b.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold cursor-pointer"
                      >
                        Portal
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickVote(b.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Votar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3-Question Comparative Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80 tabular-nums">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const score =
                      idx === 0
                        ? b.metrics.avgDough
                        : idx === 1
                        ? b.metrics.avgFilling
                        : b.metrics.avgOverall;
                    const widthPct = Math.min(100, Math.round((score / 5) * 100));
                    return (
                      <div key={q.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-600 dark:text-zinc-400 truncate">
                            {q.number}. {q.title}
                          </span>
                          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {score.toFixed(2)}★
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-[#F52D18]"
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

      {/* Live Stream of Verified Survey Comments */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#F52D18]" />
            <span>Bitácora de Comentarios y Encuestas Verificadas ({votes.length})</span>
          </h3>
          <span className="text-xs font-mono text-zinc-500">Orden cronológico inverso</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {votes.map((v) => {
            const avg = ((v.q1DoughScore + v.q2FillingScore + v.q3OverallScore) / 3).toFixed(2);
            return (
              <div
                key={v.id}
                className="rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span className="font-bold text-zinc-900 dark:text-white">{v.voterAlias}</span>
                  <span className="font-mono text-amber-500 font-semibold">{avg} ★</span>
                </div>
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {v.bakeryName} · Token {v.tokenCode} · P1:{v.q1DoughScore}★ P2:{v.q2FillingScore}★ P3:
                  {v.q3OverallScore}★
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  “{v.comment}”
                </p>
                <div className="pt-1 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>Hash Atómico: {v.txHash}</span>
                  {v.evidenceStoragePath && <span>Evidencia Storage Verificada</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
