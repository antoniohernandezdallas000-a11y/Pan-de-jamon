import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            void install();
          } else {
            setShowModal(true);
          }
        }}
        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800/90 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Instalar aplicación móvil PWA"
      >
        <Download className="w-4 h-4 text-[#F52D18]" />
        <span>Instalar App</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F52D18]/15 border border-[#F52D18]/30 flex items-center justify-center text-[#F52D18]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="pwa-install-title"
                    className="font-display text-xl font-bold tracking-wide text-zinc-900 dark:text-zinc-100"
                  >
                    Instalar PWA en tu Móvil
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    El Fucking Mejor Pan de Jamón · Ciudad Bolívar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                aria-label="Cerrar guía de instalación PWA"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              {isIOS ? (
                <div className="rounded-xl bg-zinc-100 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Pasos en iPhone / iPad (Safari):
                  </p>
                  <p>1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</p>
                  <p>2. Desliza y selecciona <strong>Agregar a pantalla de inicio</strong>.</p>
                  <p>3. Abre el ícono <strong>PanDeJamón</strong> para escanear códigos QR a pantalla completa.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-zinc-100 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Acceso directo y modo sin conexión:
                  </p>
                  <p>
                    1. En Chrome o Edge móvil, abre el menú del navegador (<strong>⋮</strong>) y selecciona{' '}
                    <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
                  </p>
                  <p>
                    2. La PWA almacena en caché los portales de las panaderías de Ciudad Bolívar y habilita el visor de cámara QR nativo.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-16 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo sin conexión — Consultando caché local de panaderías de Ciudad Bolívar.</span>
    </div>
  );
};
