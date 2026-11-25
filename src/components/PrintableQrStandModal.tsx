import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  X,
  Sparkles,
  QrCode,
  Store,
  CheckCircle2,
  Share2,
  FileText
} from 'lucide-react';
import { Bakery, QrToken } from '../types/competition';
import { encodeQrTokenPayload } from '../utils/competitionLogic';
import { NeonCrown } from './HeroDecorations';

interface PrintableQrStandModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakery: Bakery | null;
  token: QrToken | null;
}

export const PrintableQrStandModal: React.FC<PrintableQrStandModalProps> = ({
  isOpen,
  onClose,
  bakery,
  token,
}) => {
  const [printTheme, setPrintTheme] = useState<'gala' | 'eco'>('gala');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !token || !qrCanvasRef.current) return;

    const canvas = qrCanvasRef.current;
    const payload = encodeQrTokenPayload(token);

    void QRCode.toCanvas(
      canvas,
      payload,
      {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      () => {
        // Draw centered bread icon badge in the QR code
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const boxSize = 64;
          const cx = (canvas.width - boxSize) / 2;
          const cy = (canvas.height - boxSize) / 2;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cx - 4, cy - 4, boxSize + 8, boxSize + 8);
          ctx.strokeStyle = '#EFA632';
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - 4, cy - 4, boxSize + 8, boxSize + 8);
          ctx.drawImage(img, cx, cy, boxSize, boxSize);
        };
        img.src = '/assets/panes/pan-5.png';
      }
    );
  }, [isOpen, token]);

  if (!isOpen || !bakery || !token) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!qrCanvasRef.current) return;
    setIsExportingPng(true);

    try {
      // Offscreen canvas at 1200x1650 (300 DPI high-quality print resolution)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1200;
      exportCanvas.height = 1650;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      const isEco = printTheme === 'eco';

      // Background
      if (isEco) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1200, 1650);
        // Border
        ctx.strokeStyle = '#EFA632';
        ctx.lineWidth = 8;
        ctx.strokeRect(30, 30, 1140, 1590);
      } else {
        ctx.fillStyle = '#0D0B0A';
        ctx.fillRect(0, 0, 1200, 1650);
        // Gold gradient-like border
        ctx.strokeStyle = '#EFA632';
        ctx.lineWidth = 10;
        ctx.strokeRect(30, 30, 1140, 1590);
      }

      // Title header
      ctx.textAlign = 'center';
      ctx.fillStyle = isEco ? '#EB321D' : '#FFFFFF';
      ctx.font = 'bold 54px Impact, "Bebas Neue", sans-serif';
      ctx.fillText('THE FUCKING MEJOR PAN DE JAMÓN', 600, 120);

      ctx.fillStyle = '#EFA632';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('GRAN TORNEO GASTRONÓMICO · 2026', 600, 175);

      // Bakery Box
      ctx.fillStyle = isEco ? '#FFF5EB' : '#191715';
      ctx.fillRect(80, 230, 1040, 220);
      ctx.strokeStyle = '#EFA632';
      ctx.lineWidth = 4;
      ctx.strokeRect(80, 230, 1040, 220);

      ctx.fillStyle = isEco ? '#000000' : '#FFFFFF';
      ctx.font = 'bold 64px Impact, "Bebas Neue", sans-serif';
      ctx.fillText(bakery.name.toUpperCase(), 600, 330);

      ctx.fillStyle = '#EFA632';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`SECTOR: ${bakery.sector.toUpperCase()} · MAESTRO: ${bakery.masterBaker.toUpperCase()}`, 600, 390);

      // Call to action
      ctx.fillStyle = isEco ? '#1E293B' : '#FFFFFF';
      ctx.font = 'bold 44px Impact, "Bebas Neue", sans-serif';
      ctx.fillText('¡AQUÍ SE CATA Y SE VOTA!', 600, 520);

      // Draw QR Code centered (500x500)
      const qrSize = 520;
      const qrX = (1200 - qrSize) / 2;
      const qrY = 570;

      // QR white frame
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
      ctx.strokeStyle = '#EFA632';
      ctx.lineWidth = 6;
      ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

      ctx.drawImage(qrCanvasRef.current, qrX, qrY, qrSize, qrSize);

      // Instructions block
      const instY = 1170;
      ctx.fillStyle = isEco ? '#F8FAFC' : '#141311';
      ctx.fillRect(80, instY, 1040, 290);
      ctx.strokeStyle = isEco ? '#E2E8F0' : '#27272A';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, instY, 1040, 290);

      ctx.fillStyle = '#EFA632';
      ctx.font = 'bold 30px Impact, "Bebas Neue", sans-serif';
      ctx.fillText('¿CÓMO VOTAR EN 3 PASOS?', 600, instY + 55);

      ctx.textAlign = 'left';
      ctx.fillStyle = isEco ? '#334155' : '#E4E4E7';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('1. Apunta la cámara de tu teléfono al código QR.', 140, instY + 115);
      ctx.fillText('2. Califica Masa, Relleno y Equilibrio de 1 a 5 pancitos.', 140, instY + 175);
      ctx.fillText('3. ¡Tu voto suma en tiempo real a nuestro podio!', 140, instY + 235);

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = isEco ? '#64748B' : '#A1A1AA';
      ctx.font = '22px monospace';
      ctx.fillText(`TOKEN CERTIFICADO: ${token.code} · ${token.batchLabel}`, 600, 1530);
      ctx.fillText('Voto atómico auditado en Firestore · Cierre 31 de Diciembre 2026', 600, 1570);

      // Download
      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Cartel_Mostrador_${bakery.name.replace(/\s+/g, '_')}_QR.png`;
      link.click();
    } finally {
      setIsExportingPng(false);
    }
  };

  const isEco = printTheme === 'eco';

  return (
    <>
      {/* Modal Overlay & Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-modal-title"
      >
        <div className="relative w-full max-w-4xl bg-[#141311] border-2 border-[#EFA632]/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          {/* Header Controls */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#EFA632]/15 text-[#EFA632] border border-[#EFA632]/30">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#EFA632]">
                  Material Oficial para Panaderías
                </span>
                <h2 id="print-modal-title" className="text-lg sm:text-2xl font-display text-white tracking-wide">
                  Hablador / Cartel Imprimible de Mostrador
                </h2>
              </div>
            </div>

            {/* Actions: Theme toggle & Close */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintTheme('gala')}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    printTheme === 'gala'
                      ? 'bg-[#EFA632] text-black shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Estilo Gala
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTheme('eco')}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    printTheme === 'eco'
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Eco / Blanco
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Preview Area */}
          <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-neutral-900/50">
            {/* Visual Stand Preview Card */}
            <div
              ref={posterRef}
              className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border-3 shadow-2xl flex flex-col items-center text-center space-y-5 transition-colors ${
                isEco
                  ? 'bg-white text-neutral-900 border-[#EFA632]'
                  : 'bg-[#0D0B0A] text-white border-[#EFA632] shadow-orange-500/10'
              }`}
            >
              {/* Header Tournament Brand */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <NeonCrown className="w-7 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#EFA632]">
                    Gran Torneo Gastronómico 2026
                  </span>
                  <NeonCrown className="w-7 h-5" />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl tracking-wider leading-none">
                  THE <span className="text-[#EB321D]">FUCKING</span> MEJOR <br />
                  <span className="text-[#EFA632]">PAN DE JAMÓN</span>
                </h1>
              </div>

              {/* Bakery Name Badge */}
              <div
                className={`w-full py-3 px-4 rounded-2xl border-2 ${
                  isEco
                    ? 'bg-amber-50/70 border-[#EFA632]'
                    : 'bg-black/60 border-[#EFA632]/80 backdrop-blur-sm'
                }`}
              >
                <span className="text-[9px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block tracking-wider">
                  Muestra Oficial en Competencia
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-amber-500 tracking-wide mt-0.5">
                  {bakery.name}
                </h3>
                <p className="text-[11px] font-medium opacity-80 mt-0.5">
                  Sector: {bakery.sector} · Maestro {bakery.masterBaker}
                </p>
              </div>

              {/* Big High-Definition QR Code */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-[#EB321D] flex items-center gap-1.5 animate-pulse">
                  <QrCode className="w-4 h-4" />
                  <span>¡ESCANEA AQUÍ Y VOTA!</span>
                </span>
                <div className="p-3.5 rounded-3xl bg-white border-3 border-[#EFA632] shadow-2xl">
                  <canvas ref={qrCanvasRef} className="w-52 h-52 sm:w-60 sm:h-60 block" />
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  Token Oficial: <strong className="text-[#EFA632]">{token.code}</strong>
                </span>
              </div>

              {/* Mascot Dialogue Callout */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-amber-500/10 border border-[#EFA632]/30 max-w-sm">
                <img
                  src="/assets/catador-avatar-abierto.png"
                  alt="Catador"
                  className="w-12 h-12 object-contain shrink-0 drop-shadow-sm"
                />
                <p className="text-left text-xs italic opacity-90 leading-tight">
                  “¡Epa mi pana! Aquí se vota sin filtro. Escanea con tu cámara y dale sus pancitos.”
                </p>
              </div>

              {/* 3 Steps Guide */}
              <div
                className={`w-full p-3 rounded-2xl border text-left text-xs space-y-1.5 ${
                  isEco ? 'bg-neutral-50 border-neutral-200' : 'bg-black/50 border-white/10'
                }`}
              >
                <div className="font-bold text-[#EFA632] text-[11px] uppercase tracking-wider mb-1">
                  Instrucciones para el cliente:
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-[#EB321D]">1.</span>
                  <span>Apunta la cámara de tu teléfono al código QR.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-[#EB321D]">2.</span>
                  <span>Califica Masa, Relleno y Sabor con la escala de pancitos.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-[#EB321D]">3.</span>
                  <span>¡Tu voto suma en tiempo real para llevar a esta panadería al podio!</span>
                </div>
              </div>

              {/* Security Watermark */}
              <div className="text-[9px] opacity-60 uppercase font-mono tracking-wider">
                Certificado Auditado en Firestore · Ciudad Bolívar 2026
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/70 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">
              Formato estándar para colocar en cajas, mesas de cata o vitrinas.
            </span>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Download className="w-4 h-4 text-[#EFA632]" />
                <span>{isExportingPng ? 'Generando...' : 'Descargar Imagen HD (PNG)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial min-h-[44px] px-6 py-2 rounded-xl bg-[#EFA632] hover:bg-[#d99225] text-black font-display text-sm tracking-wider font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-95"
              >
                <Printer className="w-4 h-4 text-black" />
                <span>IMPRIMIR CARTEL (PDF / PAPEL)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🖨️ REGLAS EXCLUSIVAS DE IMPRESIÓN (window.print())            */}
      {/* ============================================================ */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans">
        <div className="w-full h-full border-4 border-amber-500 rounded-3xl p-8 flex flex-col justify-between items-center text-center">
          {/* Header */}
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-widest text-amber-600">
              Gran Torneo Gastronómico Oficial · Ciudad Bolívar 2026
            </div>
            <h1 className="font-display text-4xl tracking-wider text-black">
              THE <span className="text-red-600">FUCKING</span> MEJOR PAN DE JAMÓN
            </h1>
          </div>

          {/* Bakery Box */}
          <div className="w-full py-4 px-6 rounded-2xl border-2 border-amber-400 bg-amber-50/50">
            <span className="text-xs uppercase font-bold text-neutral-600 block">
              Panadería en Competencia
            </span>
            <h2 className="font-display text-4xl font-bold text-amber-700 mt-1">
              {bakery.name}
            </h2>
            <p className="text-sm text-neutral-700 mt-0.5 font-medium">
              Sector: {bakery.sector} · Maestro {bakery.masterBaker}
            </p>
          </div>

          {/* Big QR Area */}
          <div className="flex flex-col items-center space-y-3">
            <span className="text-base font-black uppercase tracking-widest text-red-600">
              ¡AQUÍ SE CATA Y SE VOTA!
            </span>
            <div className="p-4 rounded-3xl border-4 border-amber-500 bg-white shadow-md">
              {qrCanvasRef.current && (
                <img
                  src={qrCanvasRef.current.toDataURL()}
                  alt={`QR ${token.code}`}
                  className="w-72 h-72 block object-contain"
                />
              )}
            </div>
            <span className="text-sm font-mono text-neutral-700 font-bold">
              Token Oficial: {token.code} · {token.batchLabel}
            </span>
          </div>

          {/* Instructions */}
          <div className="w-full p-4 rounded-2xl border-2 border-neutral-300 bg-neutral-50 text-left text-sm space-y-1">
            <div className="font-bold text-amber-700 text-xs uppercase tracking-wider mb-1">
              ¿Cómo votar en 3 pasos con tu teléfono?
            </div>
            <div><strong>1.</strong> Abre la cámara de tu teléfono y enfoca este código QR.</div>
            <div><strong>2.</strong> Califica Masa, Relleno y Equilibrio de 1 a 5 pancitos dorados.</div>
            <div><strong>3.</strong> ¡Tu voto suma en tiempo real para coronar a esta panadería!</div>
          </div>

          {/* Footer */}
          <div className="text-xs text-neutral-500 uppercase font-mono tracking-wider pt-2">
            Veredicto Oficial Auditado en Tiempo Real en Firestore · Cierre 31 de Diciembre 2026
          </div>
        </div>
      </div>
    </>
  );
};
