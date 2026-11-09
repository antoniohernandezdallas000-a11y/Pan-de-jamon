import React from 'react';
import {
  Award,
  CheckCircle2,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  X,
} from 'lucide-react';
import { COMPETITION_LOGO_PATH, UserRole } from '../types/competition';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isSimulated?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  currentUserRole: UserRole;
  onSelectSimulatedProfile: (profile: AppUser, role: UserRole) => void;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  authBannerError: string | null;
}

const SIMULATED_PROFILES: Array<{
  role: UserRole;
  name: string;
  email: string;
  uid: string;
  badge: string;
  description: string;
  icon: typeof ShieldCheck;
  color: string;
}> = [
  {
    role: 'admin',
    name: 'Restrepo Solution (Admin)',
    email: 'restreposolution@gmail.com',
    uid: 'admin_restrepo_01',
    badge: 'Administrador General',
    description: 'Control total: agregar/editar panaderías, emitir y revocar tokens QR, auditoría y seguridad.',
    icon: ShieldCheck,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  {
    role: 'judge',
    name: 'Chef María Bolívar (Jurado)',
    email: 'jurado.bolivar@gastronomia.ve',
    uid: 'judge_angostura_01',
    badge: 'Jurado Gastronómico',
    description: 'Votación oficial con tokens de mesa de cata, evaluación de las 3 preguntas y ranking en vivo.',
    icon: Award,
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  {
    role: 'voter',
    name: 'Carlos Mendoza (Catador)',
    email: 'catador.orinoco@gmail.com',
    uid: 'voter_orinoco_01',
    badge: 'Catador / Votante Verificado',
    description: 'Escanea códigos QR en mesa, evalúa masa, relleno y tradición, y adjunta evidencias.',
    icon: UserCheck,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  {
    role: 'bakery_manager',
    name: 'Don Celestino (Horno Orinoco)',
    email: 'horno.orinoco@panaderias.ve',
    uid: 'manager_paseo_01',
    badge: 'Gestor de Panadería',
    description: 'Administración del portal del local, generación de lotes QR y monitoreo de reseñas.',
    icon: Store,
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentUserRole,
  onSelectSimulatedProfile,
  onGoogleSignIn,
  onSignOut,
  authBannerError,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-2xl rounded-t-3xl md:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-5 md:px-7 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={COMPETITION_LOGO_PATH}
              alt="Logo oficial"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-contain bg-black border border-[#F52D18]/50 p-1 shrink-0"
            />
            <div>
              <h2
                id="auth-modal-title"
                className="font-display text-2xl font-extrabold tracking-wide text-white"
              >
                Identidad y Control de Acceso
              </h2>
              <p className="text-xs text-zinc-400">
                El Fucking Mejor Pan de Jamón · Ciudad Bolívar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar ventana de autenticación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-7 overflow-y-auto space-y-6 flex-1">
          {/* Active Session Card if Logged In */}
          {currentUser && (
            <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F52D18]/15 border border-[#F52D18]/40 flex items-center justify-center text-[#F52D18] font-bold text-lg">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {currentUser.displayName || 'Usuario Activo'}
                      </span>
                      {currentUser.isSimulated && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Dev Simulado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {currentUser.email || currentUser.uid}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-300 dark:border-zinc-700">
                    ROL: {currentUserRole}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Cerrar Sesión Activa</span>
                </button>
              </div>
            </div>
          )}

          {/* Official Google OAuth Option */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              01 · Autenticación Cloud Oficial (Google Popup)
            </h3>
            <button
              type="button"
              onClick={() => void onGoogleSignIn()}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-md"
            >
              <LogIn className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Conectar con Cuenta Google</span>
            </button>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              * Nota: En entornos de desarrollo local (`localhost:3000`), Google OAuth puede requerir autorización en la consola Firebase del proyecto. Si no tienes acceso a la consola, usa un perfil simulado a continuación.
            </p>
          </div>

          {authBannerError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs font-mono text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{authBannerError}</span>
            </div>
          )}

          {/* Fast Switcher / Simulated Profiles for Frontend Testing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                02 · Perfiles Simulados para Pruebas Frontend
              </h3>
              <span className="text-[11px] font-mono text-[#F52D18] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Clic para activar</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIMULATED_PROFILES.map((p) => {
                const isSelected =
                  currentUser?.email === p.email && currentUserRole === p.role;
                const IconComponent = p.icon;

                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => {
                      onSelectSimulatedProfile(
                        {
                          uid: p.uid,
                          email: p.email,
                          displayName: p.name,
                          isSimulated: true,
                        },
                        p.role
                      );
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-[#F52D18] bg-[#F52D18]/10 ring-2 ring-[#F52D18]/30 shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 hover:border-zinc-400 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${p.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {p.name}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {p.badge}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#F52D18] shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {p.description}
                    </p>

                    <div className="pt-1 text-[10px] font-mono text-zinc-500 truncate">
                      {p.email}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer"
          >
            Listo / Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

