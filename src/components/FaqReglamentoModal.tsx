import React, { useState } from 'react';
import { X, HelpCircle, FileText, CheckCircle2, ShieldCheck, Sparkles, Scale, QrCode } from 'lucide-react';

interface FaqReglamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'faq' | 'rules';
}

export const FaqReglamentoModal: React.FC<FaqReglamentoModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'faq',
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'rules'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#141311] border-2 border-[#EFA632]/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#EFA632]/15 text-[#EFA632] border border-[#EFA632]/30">
              {activeTab === 'faq' ? <HelpCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EFA632]">
                Guía Oficial del Torneo
              </span>
              <h2 className="text-xl sm:text-2xl font-display text-white tracking-wide">
                {activeTab === 'faq' ? 'PREGUNTAS FRECUENTES' : 'REGLAMENTO OFICIAL 2026'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 bg-black/30 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-2 px-4 font-display text-sm tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'faq'
                ? 'border-[#EFA632] text-[#EFA632]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>PREGUNTAS (FAQ)</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-4 font-display text-sm tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-[#EB321D] text-[#EB321D]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>REGLAMENTO Y CRITERIOS</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm leading-relaxed flex-1">
          {activeTab === 'faq' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <QrCode className="w-4 h-4 text-[#EFA632]" />
                  ¿Cómo voto por mi panadería favorita?
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  Cada panadería participante o mesa de degustación cuenta con un código QR único. Al escanearlo con la cámara de tu teléfono, se abre directamente la cabina de votación donde podrás calificar los 3 criterios oficiales.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <Scale className="w-4 h-4 text-[#64C236]" />
                  ¿Cuáles son los 3 criterios de evaluación?
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  1. <strong>Masa y Esponjosidad:</strong> Textura suave, dorada, mantequillosa y toque dulzón de papelón.<br />
                  2. <strong>Relleno y Abundancia:</strong> Generosidad de jamón ahumado, tocineta crujiente y pasas.<br />
                  3. <strong>Equilibrio Criollo:</strong> Armonía exacta entre el dulce de las pasas/papelón y lo salado del jamón y aceitunas.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <ShieldCheck className="w-4 h-4 text-[#EB321D]" />
                  ¿Puedo votar varias veces?
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  No. Cada token QR es auditado en tiempo real en Firestore con control de reintentos y geolocalización, garantizando 1 voto genuino por experiencia de cata.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#EB321D]/10 border border-[#EB321D]/30 space-y-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-[#EFA632]" />
                  1. Elegibilidad de las Panaderías
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  Participan todas las panaderías artesanales e industriales formalmente inscritas. Deben mantener la misma receta y calidad en vitrina que en la muestra sometida a evaluación del jurado y público.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-4 h-4 text-[#64C236]" />
                  2. Veredicto y Ponderación del Podio
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm">
                  El puntaje final se calcula promediando las 3 notas (escala de 1 a 5 pancitos dorados). El podio se actualiza en vivo y el cierre oficial de votaciones es el <strong>31 de Diciembre de 2026</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#EFA632] hover:bg-[#d99225] text-black font-display text-sm tracking-wider font-black cursor-pointer transition-transform active:scale-95"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
};
