import React, { useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Database,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AuditLog, Bakery, StorageValidationResult, UserRole } from '../types/competition';
import { validateStorageUpload } from '../utils/competitionLogic';

interface AuditAndSecurityViewProps {
  auditLogs: AuditLog[];
  bakeries: Bakery[];
  currentUserUid: string;
  currentUserEmail: string | null;
  currentUserDisplayName: string;
  currentUserRole: UserRole;
  isGoogleAuthenticated: boolean;
  firestoreConnected: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onSwitchRoleSimulation: (nextRole: UserRole) => void;
  onSyncSeedToFirestore: () => Promise<void>;
  onRecordStorageValidationAudit: (checkResult: StorageValidationResult, bakeryId: string) => void;
}

export const AuditAndSecurityView: React.FC<AuditAndSecurityViewProps> = ({
  auditLogs,
  bakeries,
  currentUserUid,
  currentUserEmail,
  currentUserDisplayName,
  currentUserRole,
  isGoogleAuthenticated,
  firestoreConnected,
  onGoogleSignIn,
  onGoogleSignOut,
  onSwitchRoleSimulation,
  onSyncSeedToFirestore,
  onRecordStorageValidationAudit,
}) => {
  const [testFileName, setTestFileName] = useState('corte_pan_jamon_orinoco.jpg');
  const [testMimeType, setTestMimeType] = useState('image/jpeg');
  const [testSizeMb, setTestSizeMb] = useState(1.8);
  const [testBakeryId, setTestBakeryId] = useState(bakeries[0]?.id || 'bakery-paseo-orinoco');
  const [lastStorageCheck, setLastStorageCheck] = useState<StorageValidationResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleRunStoragePolicySimulator = (e: React.FormEvent) => {
    e.preventDefault();
    const sizeBytes = Math.round(testSizeMb * 1024 * 1024);
    const result = validateStorageUpload(
      { name: testFileName, sizeBytes, mimeType: testMimeType },
      currentUserUid,
      testBakeryId,
      'vote_evidence'
    );
    setLastStorageCheck(result);
    onRecordStorageValidationAudit(result, testBakeryId);
  };

  const roles: Array<{ role: UserRole; label: string; permissions: string }> = [
    {
      role: 'voter',
      label: 'Votante Verificado',
      permissions:
        'Escanea tokens QR activos con cámara, responde encuesta de 3 preguntas y adjunta evidencia en Storage (<5MB).',
    },
    {
      role: 'judge',
      label: 'Jurado Gastronómico',
      permissions:
        'Vota con tokens QR de mesa de jurado, emite lotes de tokens de cata y audita métricas en tiempo real.',
    },
    {
      role: 'bakery_manager',
      label: 'Gestor de Panadería',
      permissions:
        'Administra el portal de su panadería en Ciudad Bolívar, genera lotes QR y pausa/activa tokens propios.',
    },
    {
      role: 'admin',
      label: 'Administrador General',
      permissions:
        'Control total RBAC, sincronización de padrón en Firestore, revocación de tokens y auditoría Zero-Trust.',
    },
  ];

  return (
    <div className="space-y-8" data-testid="audit-security-view">
      {/* Section 1: Google Auth & RBAC Role Access Control */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#F52D18] uppercase tracking-wider">
              Autenticación Google & Control de Acceso Basado en Roles (RBAC)
            </div>
            <h2 className="font-display text-3xl font-extrabold text-zinc-900 dark:text-white">
              Identidad, Permisos y Sincronización Cloud
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Estado de conexión Firestore:{' '}
              <strong className="text-emerald-500">
                {firestoreConnected ? 'CONECTADO (ai-studio-firestore)' : 'MODO LOCAL'}
              </strong>{' '}
              · Usuario activo: <strong className="font-mono">{currentUserDisplayName}</strong> (
              {currentUserEmail || currentUserUid})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!isGoogleAuthenticated ? (
              <button
                type="button"
                onClick={() => void onGoogleSignIn()}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Autenticar con Google (Popup Oficial)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onSyncSeedToFirestore();
                    setSyncMessage('Padrón de Ciudad Bolívar sincronizado en Firestore Cloud.');
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Sincronizar Padrón en Firestore</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onGoogleSignOut()}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </>
            )}
          </div>
        </div>

        {syncMessage && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            {syncMessage}
          </div>
        )}

        {/* Role Selector Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#F52D18]" />
              <span>Selector de Perfil RBAC (Prueba de Permisos por Rol)</span>
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              Reglas verificadas en firestore.rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {roles.map((r) => {
              const active = currentUserRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => onSwitchRoleSimulation(r.role)}
                  className={`text-left rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    active
                      ? 'bg-zinc-950 text-white border-[#F52D18] shadow-lg'
                      : 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-[#F52D18] font-bold">
                        {r.role}
                      </span>
                      {active && <UserCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="font-display text-xl font-bold">{r.label}</div>
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      active ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {r.permissions}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: Firebase Storage Security Validator & Policy Inspector */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#F52D18]" />
              <span>Seguridad en Firebase Storage (Validador de Políticas storage.rules)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Verifica aislamiento por UID (/votes/&#123;bakeryId&#125;/&#123;voterUid&#125;/&#123;fileName&#125;), límite de 5 MB y filtro estricto de MIME (JPEG, PNG, WebP)
            </p>
          </div>
        </div>

        <form
          onSubmit={handleRunStoragePolicySimulator}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label
              htmlFor="storage-test-filename"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Nombre de Archivo
            </label>
            <input
              id="storage-test-filename"
              type="text"
              value={testFileName}
              onChange={(e) => setTestFileName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="storage-test-mime"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Tipo MIME
            </label>
            <select
              id="storage-test-mime"
              value={testMimeType}
              onChange={(e) => setTestMimeType(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="image/jpeg">image/jpeg (Permitido)</option>
              <option value="image/png">image/png (Permitido)</option>
              <option value="image/webp">image/webp (Permitido)</option>
              <option value="application/pdf">application/pdf (Bloqueado)</option>
              <option value="application/x-sh">application/x-sh (Bloqueado)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="storage-test-size"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Tamaño del Archivo (MB)
            </label>
            <input
              id="storage-test-size"
              type="number"
              step="0.1"
              min="0.1"
              max="20"
              value={testSizeMb}
              onChange={(e) => setTestSizeMb(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Auditar Regla Storage</span>
          </button>
        </form>

        {lastStorageCheck && (
          <div
            data-testid="storage-audit-outcome"
            className={`rounded-xl p-4 border font-mono text-xs space-y-1 ${
              lastStorageCheck.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="font-bold">
              Resultado: {lastStorageCheck.valid ? 'UPLOAD AUTORIZADO' : 'UPLOAD RECHAZADO POR REGLA'}
            </div>
            <div>Ruta destino: {lastStorageCheck.storagePath}</div>
            <div>Regla evaluada: {lastStorageCheck.ruleMatched}</div>
            <div>Detalle: {lastStorageCheck.reason}</div>
          </div>
        )}
      </section>

      {/* Section 3: Immutable Audit Logs Stream */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Logs de Auditoría Inmutables (/auditLogs · {auditLogs.length} eventos)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cada voto atómico, creación/manipulación de QR y validación de Storage genera una firma de integridad verificable
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              data-testid={`audit-log-entry-${log.id}`}
              className="rounded-xl bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                  <span className="font-bold text-[#F52D18]">{log.action}</span>
                  <span aria-hidden="true">·</span>
                  <span>Actor: {log.actorUid}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">Rol: {log.actorRole}</span>
                  <span aria-hidden="true">·</span>
                  <span>Target: {log.targetId}</span>
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{log.summary}</p>
              </div>

              <div className="text-left md:text-right font-mono text-xs text-zinc-500 shrink-0 tabular-nums">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {log.integrityHash}
                </div>
                <div>{new Date(log.createdAt).toLocaleTimeString('es-VE')}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
