import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Download,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  Bakery,
  COMPETITION_LOGO_PATH,
  QrToken,
  QrTokenStatus,
  UserRole,
} from '../types/competition';
import { encodeQrTokenPayload } from '../utils/competitionLogic';

interface QrTokenLabViewProps {
  bakeries: Bakery[];
  tokens: QrToken[];
  currentUserRole: UserRole;
  onCreateToken: (params: {
    code: string;
    bakeryId: string;
    batchLabel: string;
    maxUses: number;
  }) => Promise<QrToken>;
  onManipulateToken: (
    tokenId: string,
    updates: { status: QrTokenStatus; maxUses: number; batchLabel: string }
  ) => Promise<void>;
  onTriggerVoteWithToken: (tokenCode: string, bakeryId: string) => void;
}

export const QrTokenLabView: React.FC<QrTokenLabViewProps> = ({
  bakeries,
  tokens,
  currentUserRole,
  onCreateToken,
  onManipulateToken,
  onTriggerVoteWithToken,
}) => {
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || '');
  const [newBakeryId, setNewBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [newCodeSuffix, setNewCodeSuffix] = useState<string>('707');
  const [newBatchLabel, setNewBatchLabel] = useState<string>('Mesa Degustación #07 · Turno Tarde');
  const [newMaxUses, setNewMaxUses] = useState<number>(3);
  const [qrColorMode, setQrColorMode] = useState<'obsidian' | 'jamon' | 'amber'>('obsidian');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedToken = tokens.find((t) => t.id === selectedTokenId) || tokens[0];

  useEffect(() => {
    if (!selectedToken || !qrCanvasRef.current) return;

    const canvas = qrCanvasRef.current;
    const payload = encodeQrTokenPayload(selectedToken);

    const darkHex =
      qrColorMode === 'jamon' ? '#B91C1C' : qrColorMode === 'amber' ? '#78350F' : '#09090B';

    void QRCode.toCanvas(
      canvas,
      payload,
      {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: darkHex,
          light: '#FAF8F5',
        },
      },
      () => {
        // Draw official competition emblem badge in the center of the high-ECC QR code
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const boxSize = 54;
          const cx = (canvas.width - boxSize) / 2;
          const cy = (canvas.height - boxSize) / 2;
          ctx.fillStyle = '#09090B';
          ctx.fillRect(cx - 3, cy - 3, boxSize + 6, boxSize + 6);
          ctx.strokeStyle = '#F52D18';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - 3, cy - 3, boxSize + 6, boxSize + 6);
          ctx.drawImage(img, cx, cy, boxSize, boxSize);
        };
        img.src = COMPETITION_LOGO_PATH;
      }
    );
  }, [selectedToken, qrColorMode]);

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBakery = bakeries.find((b) => b.id === newBakeryId) || bakeries[0];
    if (!targetBakery) return;

    const prefix = targetBakery.portalCode.split('-').slice(0, 2).join('-');
    const cleanSuffix = newCodeSuffix.replace(/[^A-Z0-9]/gi, '').toUpperCase() || '901';
    const generatedCode = `${prefix}-${cleanSuffix}`;

    const created = await onCreateToken({
      code: generatedCode,
      bakeryId: targetBakery.id,
      batchLabel: newBatchLabel.trim() || 'Lote Especial Ciudad Bolívar',
      maxUses: Math.max(1, Math.min(500, Number(newMaxUses) || 1)),
    });

    setSelectedTokenId(created.id);
    setNewCodeSuffix(String(Math.floor(100 + Math.random() * 899)));
    setFeedbackBanner(
      `Token QR "${created.code}" emitido para ${created.bakeryName} (${created.maxUses} usos).`
    );
  };

  const handleDownloadQrPng = () => {
    if (!qrCanvasRef.current || !selectedToken) return;
    const dataUrl = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${selectedToken.code}.png`;
    link.click();
  };

  return (
    <div className="space-y-8" data-testid="qr-token-lab-view">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#F52D18] uppercase tracking-wider">
            Sistema Criptográfico de Tokens QR · Ciudad Bolívar
          </div>
          <h2 className="font-display text-3xl font-extrabold text-zinc-900 dark:text-white tracking-wide">
            Laboratorio de Tokens QR Manipulables y Escaneables
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Genera nuevos códigos QR con el emblema oficial de la competencia, ajusta sus cupos de uso atómico, pausa o revoca tokens en tiempo real y pruébalos directamente en la cabina de cámara.
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
          Rol activo: <strong className="uppercase text-zinc-900 dark:text-white">{currentUserRole}</strong> ·{' '}
          {tokens.filter((t) => t.status === 'active').length} activos / {tokens.length} totales
        </div>
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs font-mono text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Top Split: Token Generator Form + Live Interactive QR Card Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Create New Manipulable QR Token */}
        <form
          onSubmit={handleGenerateToken}
          className="lg:col-span-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                01. Emitir Nuevo Token QR para Panadería
              </h3>
              <span className="text-xs font-mono text-zinc-500">Protocolo EFMPJ_CB_2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="token-bakery-select"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Panadería Destino (Ciudad Bolívar)
                </label>
                <select
                  id="token-bakery-select"
                  value={newBakeryId}
                  onChange={(e) => setNewBakeryId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                >
                  {bakeries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.sector})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="token-suffix-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Sufijo Identificador del Token
                </label>
                <input
                  id="token-suffix-input"
                  type="text"
                  value={newCodeSuffix}
                  onChange={(e) => setNewCodeSuffix(e.target.value.toUpperCase())}
                  maxLength={16}
                  placeholder="Ej. 707"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="token-batch-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Etiqueta de Lote / Mesa / Caja
                </label>
                <input
                  id="token-batch-input"
                  type="text"
                  value={newBatchLabel}
                  onChange={(e) => setNewBatchLabel(e.target.value)}
                  maxLength={80}
                  required
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                />
              </div>

              <div>
                <label
                  htmlFor="token-max-uses-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Cupo Máximo de Votos
                </label>
                <input
                  id="token-max-uses-input"
                  type="number"
                  min={1}
                  max={500}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Sliders className="w-4 h-4 text-[#F52D18]" />
              <span>Paleta del lienzo QR:</span>
              {(['obsidian', 'jamon', 'amber'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setQrColorMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                    qrColorMode === mode
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Generar Token QR Manipulable</span>
            </button>
          </div>
        </form>

        {/* Right 5 cols: Live Printable & Scannable QR Preview Card */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col items-center justify-between text-center space-y-4">
          {selectedToken ? (
            <>
              <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>VISTA PREVIA ESCANEABLE</span>
                <span className="text-[#F52D18] font-bold">{selectedToken.code}</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border-2 border-[#F52D18] shadow-xl">
                <canvas
                  ref={qrCanvasRef}
                  data-testid="live-qr-token-canvas"
                  className="w-[210px] h-[210px] block"
                />
              </div>

              <div className="space-y-1">
                <div className="font-display text-xl font-bold text-white">
                  {selectedToken.bakeryName}
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  {selectedToken.batchLabel} · Usos: {selectedToken.usedCount}/{selectedToken.maxUses} ·{' '}
                  <span className="uppercase text-amber-400">{selectedToken.status}</span>
                </div>
              </div>

              <div className="w-full flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onTriggerVoteWithToken(selectedToken.code, selectedToken.bakeryId)
                  }
                  className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Votar con este QR</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Bottom Table: Interactive Manipulation of All Issued QR Tokens */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
            02. Panel de Manipulación de Estado y Cupos de Tokens QR ({tokens.length})
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Haz clic en cualquier token para previsualizar su QR o alterar su estado operativo
          </span>
        </div>

        <div className="space-y-3">
          {tokens.map((t) => {
            const isSelected = selectedToken?.id === t.id;
            return (
              <div
                key={t.id}
                data-testid={`qr-token-row-${t.code}`}
                className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'bg-zinc-50 dark:bg-zinc-950 border-[#F52D18]'
                    : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                    <button
                      type="button"
                      onClick={() => setSelectedTokenId(t.id)}
                      className="text-sm font-bold text-zinc-900 dark:text-white hover:text-[#F52D18] cursor-pointer"
                    >
                      {t.code}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span className="text-zinc-600 dark:text-zinc-300 font-sans font-medium">
                      {t.bakeryName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase font-semibold text-[#F52D18]">{t.status}</span>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {t.batchLabel} · Redenciones atómicas: <strong>{t.usedCount}</strong> de{' '}
                    <strong>{t.maxUses}</strong>
                  </div>
                </div>

                {/* Manipulation Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId(t.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer"
                  >
                    Ver QR
                  </button>

                  {t.status !== 'consumed' && (
                    <>
                      {t.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => {
                            void onManipulateToken(t.id, {
                              status: 'active',
                              maxUses: t.maxUses,
                              batchLabel: t.batchLabel,
                            });
                            setFeedbackBanner(`Token ${t.code} reactivado a estado ACTIVO.`);
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Activar</span>
                        </button>
                      )}

                      {t.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => {
                            void onManipulateToken(t.id, {
                              status: 'paused',
                              maxUses: t.maxUses,
                              batchLabel: t.batchLabel,
                            });
                            setFeedbackBanner(`Token ${t.code} cambiado a estado PAUSADO.`);
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pausar</span>
                        </button>
                      )}

                      {t.status !== 'revoked' && (
                        <button
                          type="button"
                          onClick={() => {
                            void onManipulateToken(t.id, {
                              status: 'revoked',
                              maxUses: t.maxUses,
                              batchLabel: t.batchLabel,
                            });
                            setFeedbackBanner(`Token ${t.code} REVOCADO permanentemente.`);
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Revocar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void onManipulateToken(t.id, {
                            status: t.status,
                            maxUses: t.maxUses + 2,
                            batchLabel: t.batchLabel,
                          });
                          setFeedbackBanner(`Cupo de ${t.code} incrementado a ${t.maxUses + 2} usos.`);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-semibold cursor-pointer"
                      >
                        +2 Usos
                      </button>
                    </>
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
