import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  LogIn,
  Moon,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Store,
  Sun,
} from 'lucide-react';
import {
  AuditLog,
  Bakery,
  COMPETITION_LOGO_PATH,
  QrToken,
  QrTokenStatus,
  StorageValidationResult,
  UserRole,
  Vote,
} from './types/competition';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_BAKERIES_CIUDAD_BOLIVAR,
  INITIAL_QR_TOKENS,
  INITIAL_VOTES,
} from './data/ciudadBolivarSeed';
import {
  AdminBakeryInput,
  AtomicVoteInput,
  createOrUpdateBakeryByAdmin,
  executeAtomicVoteStateTransition,
  generateDeterministicHash,
  rankBakeries,
} from './utils/competitionLogic';
import {
  User,
  auth,
  commitAtomicVoteToFirestore,
  createQrTokenInFirestore,
  onAuthStateChanged,
  saveBakeryToFirestore,
  seedInitialDataToFirestore,
  signInWithGooglePopup,
  signOutUser,
  subscribeToLiveCompetition,
  testFirestoreConnection,
  updateQrTokenInFirestore,
  uploadBakeryPortalImageToStorage,
  uploadVoteEvidenceToStorage,
} from './lib/firebase';
import { BakeryPortalCard, BakeryPortalModal } from './components/BakeryPortalCard';
import { AdminBakeryModal } from './components/AdminBakeryModal';
import { QrVotingModal } from './components/QrVotingModal';
import { QrTokenLabView } from './components/QrTokenLabView';
import { LiveResultsView } from './components/LiveResultsView';
import { AuditAndSecurityView } from './components/AuditAndSecurityView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallBanner';

type ActiveSection = 'portals' | 'tokens' | 'results' | 'audit';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('portals');
  const [isDark, setIsDark] = useState<boolean>(true);

  // Core Competition State (Seeded with Ciudad Bolívar data + synced with Firestore)
  const [bakeries, setBakeries] = useState<Bakery[]>(INITIAL_BAKERIES_CIUDAD_BOLIVAR);
  const [tokens, setTokens] = useState<QrToken[]>(INITIAL_QR_TOKENS);
  const [votes, setVotes] = useState<Vote[]>(INITIAL_VOTES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Auth & Role State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);

  // Filters & Modals
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedBakeryId, setInspectedBakeryId] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [modalInitialBakeryId, setModalInitialBakeryId] = useState<string | null>(null);
  const [modalInitialTokenCode, setModalInitialTokenCode] = useState<string | null>(null);

  // Admin Bakery Creation / Editing Modal State
  const [isAdminBakeryModalOpen, setIsAdminBakeryModalOpen] = useState<boolean>(false);
  const [editingBakery, setEditingBakery] = useState<Bakery | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Boot connection check & Auth listener
  useEffect(() => {
    void testFirestoreConnection().then((ok) => setFirestoreConnected(ok));

    let unsubSnapshots = () => {};
    let autoSeeded = false;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user?.email === 'restreposolution@gmail.com') {
        setUserRole('admin');
      }
      unsubSnapshots();
      if (user) {
        unsubSnapshots = subscribeToLiveCompetition({
          onBakeries: (cloudBakeries) => {
            if (cloudBakeries.length > 0) setBakeries(cloudBakeries);
          },
          onTokens: (cloudTokens) => {
            if (cloudTokens.length > 0) setTokens(cloudTokens);
          },
          onVotes: (cloudVotes) => {
            if (cloudVotes.length > 0) setVotes(cloudVotes);
          },
          onAuditLogs: (cloudLogs) => {
            if (cloudLogs.length > 0) setAuditLogs(cloudLogs);
          },
          onEmptyBakeries: () => {
            if (!autoSeeded && user.email === 'restreposolution@gmail.com') {
              autoSeeded = true;
              void seedInitialDataToFirestore(
                INITIAL_BAKERIES_CIUDAD_BOLIVAR,
                INITIAL_QR_TOKENS,
                user.uid,
                'admin'
              ).catch(() => {
                // Handled gracefully
              });
            }
          },
        });
      }
    });

    return () => {
      unsubAuth();
      unsubSnapshots();
    };
  }, []);

  const currentUserUid = firebaseUser?.uid || 'catador-bolivar-local';
  const currentUserDisplayName =
    firebaseUser?.displayName || 'Jurado / Catador Ciudad Bolívar';

  const rankedBakeries = useMemo(() => rankBakeries(bakeries), [bakeries]);

  const sectors = useMemo(() => {
    const unique = Array.from(new Set(bakeries.map((b) => b.sector)));
    return ['ALL', ...unique];
  }, [bakeries]);

  const filteredBakeries = useMemo(() => {
    return rankedBakeries.filter((b) => {
      const matchesSector = selectedSector === 'ALL' || b.sector === selectedSector;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.sector.toLowerCase().includes(q) ||
        b.masterBaker.toLowerCase().includes(q) ||
        b.crustStyle.toLowerCase().includes(q);
      return matchesSector && matchesSearch;
    });
  }, [rankedBakeries, selectedSector, searchQuery]);

  const totalVotesCount = useMemo(
    () => bakeries.reduce((sum, b) => sum + b.totalVotes, 0),
    [bakeries]
  );

  const activeTokensCount = useMemo(
    () => tokens.filter((t) => t.status === 'active' && t.usedCount < t.maxUses).length,
    [tokens]
  );

  const overallCompetitionAverage = useMemo(() => {
    if (totalVotesCount === 0) return '0.00';
    const totalStars = bakeries.reduce(
      (sum, b) => sum + b.sumDoughScore + b.sumFillingScore + b.sumOverallScore,
      0
    );
    return (totalStars / (totalVotesCount * 3)).toFixed(2);
  }, [bakeries, totalVotesCount]);

  const inspectedBakery = useMemo(
    () => rankedBakeries.find((b) => b.id === inspectedBakeryId) || null,
    [rankedBakeries, inspectedBakeryId]
  );

  // Handlers
  const handleGoogleSignIn = async () => {
    setAuthBannerError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      setAuthBannerError(
        err instanceof Error
          ? `Aviso de ventana emergente Google Auth: ${err.message}`
          : 'No se pudo completar el inicio de sesión con Google.'
      );
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutUser();
  };

  const handleOpenVotingForBakery = (bakeryId: string, tokenCode?: string) => {
    setInspectedBakeryId(null);
    setModalInitialBakeryId(bakeryId);
    setModalInitialTokenCode(tokenCode || null);
    setIsQrModalOpen(true);
  };

  const handleOpenCreateBakeryModal = () => {
    setEditingBakery(null);
    setIsAdminBakeryModalOpen(true);
  };

  const handleOpenEditBakeryModal = (bakery: Bakery) => {
    setEditingBakery(bakery);
    setIsAdminBakeryModalOpen(true);
  };

  const handleSaveBakeryByAdmin = async (
    input: AdminBakeryInput,
    rawImageFile: File | null
  ): Promise<{ bakery: Bakery; syncedToCloud: boolean }> => {
    // 1. Validate & build bakery + initial QR token + audit log via pure RBAC logic
    const transition = createOrUpdateBakeryByAdmin(bakeries, input);
    let finalBakery = transition.bakery;

    // 2. If a raw image file was uploaded and the user is authenticated with Firebase,
    // attempt to upload to Firebase Storage under /portals/{bakeryId}/...
    if (rawImageFile && firebaseUser) {
      try {
        const uploaded = await uploadBakeryPortalImageToStorage(rawImageFile, finalBakery.id);
        finalBakery = {
          ...finalBakery,
          photoUrl: uploaded.downloadUrl,
        };
      } catch {
        // Fallback to the compressed canvas Data URL already in finalBakery.photoUrl
      }
    }

    setBakeries((prev) =>
      transition.isNew
        ? [finalBakery, ...prev]
        : prev.map((b) => (b.id === finalBakery.id ? finalBakery : b))
    );
    if (transition.initialToken) {
      setTokens((prev) => [transition.initialToken!, ...prev]);
    }
    setAuditLogs((prev) => [transition.auditLog, ...prev]);

    // 3. Persist to Firestore if authenticated
    let syncedToCloud = false;
    if (firebaseUser) {
      try {
        await saveBakeryToFirestore(
          finalBakery,
          transition.initialToken,
          transition.auditLog
        );
        syncedToCloud = true;
      } catch {
        // Synced locally
      }
    }

    return { bakery: finalBakery, syncedToCloud };
  };

  const handleSubmitAtomicVote = async (
    input: AtomicVoteInput,
    selectedFile: File | null
  ): Promise<{ voteId: string; txHash: string; syncedToCloud: boolean }> => {
    let evidencePath = input.evidenceStoragePath;

    // 1. Optional Firebase Storage upload if a photo file was provided and user is signed in
    if (selectedFile) {
      const targetTok = tokens.find((t) => t.code === input.tokenCode);
      const bId = targetTok?.bakeryId || 'bakery-paseo-orinoco';
      if (firebaseUser) {
        try {
          const uploaded = await uploadVoteEvidenceToStorage(selectedFile, bId, currentUserUid);
          evidencePath = uploaded.storagePath;
        } catch {
          evidencePath = `votes/${bId}/${currentUserUid}/${selectedFile.name}`;
        }
      } else {
        evidencePath = `votes/${bId}/${currentUserUid}/${selectedFile.name}`;
      }
    }

    // 2. Execute pure atomic state transition (validates invariants, updates bakery, token, vote, and audit log)
    const transition = executeAtomicVoteStateTransition(
      { bakeries, tokens, votes, auditLogs },
      { ...input, evidenceStoragePath: evidencePath }
    );

    setBakeries(transition.nextState.bakeries);
    setTokens(transition.nextState.tokens);
    setVotes(transition.nextState.votes);
    setAuditLogs(transition.nextState.auditLogs);

    // 3. Also execute real Firestore runTransaction when authenticated with Firebase
    let syncedToCloud = false;
    if (firebaseUser) {
      try {
        await commitAtomicVoteToFirestore(
          { ...input, evidenceStoragePath: evidencePath },
          transition.updatedToken.id,
          transition.updatedBakery.id
        );
        syncedToCloud = true;
      } catch {
        // Local transactional state already committed
      }
    }

    return {
      voteId: transition.createdVote.id,
      txHash: transition.createdVote.txHash,
      syncedToCloud,
    };
  };

  const handleCreateQrToken = async (params: {
    code: string;
    bakeryId: string;
    batchLabel: string;
    maxUses: number;
  }): Promise<QrToken> => {
    const targetBakery = bakeries.find((b) => b.id === params.bakeryId) || bakeries[0];
    const nowIso = new Date().toISOString();
    const id = `tok-${params.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newToken: QrToken = {
      id,
      code: params.code,
      bakeryId: targetBakery.id,
      bakeryName: targetBakery.name,
      batchLabel: params.batchLabel,
      status: 'active',
      maxUses: params.maxUses,
      usedCount: 0,
      createdByUid: currentUserUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newLog: AuditLog = {
      id: `log_tok_${Date.now()}`,
      action: 'TOKEN_CREATED',
      actorUid: currentUserUid,
      actorRole: userRole,
      targetId: newToken.id,
      summary: `Token QR manipulable ${newToken.code} creado para ${newToken.bakeryName} (${newToken.maxUses} usos).`,
      integrityHash: generateDeterministicHash(`CREATE_TOK:${newToken.id}:${nowIso}`),
      createdAt: nowIso,
    };

    setTokens((prev) => [newToken, ...prev]);
    setAuditLogs((prev) => [newLog, ...prev]);

    if (firebaseUser) {
      try {
        await createQrTokenInFirestore(newToken);
      } catch {
        // Synced locally
      }
    }

    return newToken;
  };

  const handleManipulateQrToken = async (
    tokenId: string,
    updates: { status: QrTokenStatus; maxUses: number; batchLabel: string }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const target = tokens.find((t) => t.id === tokenId);
    if (!target) return;

    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? {
              ...t,
              status: updates.status,
              maxUses: updates.maxUses,
              batchLabel: updates.batchLabel,
              updatedAt: nowIso,
            }
          : t
      )
    );

    const newLog: AuditLog = {
      id: `log_mod_${Date.now()}`,
      action: 'TOKEN_STATUS_UPDATED',
      actorUid: currentUserUid,
      actorRole: userRole,
      targetId: tokenId,
      summary: `Token QR ${target.code} manipulado → estado: ${updates.status.toUpperCase()}, cupo: ${updates.maxUses}.`,
      integrityHash: generateDeterministicHash(`MOD_TOK:${tokenId}:${updates.status}:${nowIso}`),
      createdAt: nowIso,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (firebaseUser) {
      try {
        await updateQrTokenInFirestore(tokenId, updates);
      } catch {
        // Synced locally
      }
    }
  };

  const handleSwitchRoleSimulation = (nextRole: UserRole) => {
    const nowIso = new Date().toISOString();
    setUserRole(nextRole);
    const logEntry: AuditLog = {
      id: `log_role_${Date.now()}`,
      action: 'ROLE_CHANGED',
      actorUid: currentUserUid,
      actorRole: nextRole,
      targetId: currentUserUid,
      summary: `Rol RBAC activo cambiado a ${nextRole.toUpperCase()} para validación de permisos.`,
      integrityHash: generateDeterministicHash(`ROLE:${currentUserUid}:${nextRole}:${nowIso}`),
      createdAt: nowIso,
    };
    setAuditLogs((prev) => [logEntry, ...prev]);
  };

  const handleRecordStorageValidationAudit = (
    checkResult: StorageValidationResult,
    bakeryId: string
  ) => {
    const nowIso = new Date().toISOString();
    const logEntry: AuditLog = {
      id: `log_stg_${Date.now()}`,
      action: 'STORAGE_EVIDENCE_VALIDATED',
      actorUid: currentUserUid,
      actorRole: userRole,
      targetId: bakeryId,
      summary: `${checkResult.valid ? 'APROBADO' : 'BLOQUEADO'}: ${checkResult.reason}`.slice(
        0,
        300
      ),
      integrityHash: generateDeterministicHash(`STG:${checkResult.storagePath}:${nowIso}`),
      createdAt: nowIso,
    };
    setAuditLogs((prev) => [logEntry, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24 md:pb-16 transition-colors">
      <OfflineIndicator />

      {/* Strict 3-Zone Top Bar Contract (frontend-design/SKILL.md §2) */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 lg:px-8 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('portals');
          }}
          className="font-display text-lg sm:text-2xl font-extrabold tracking-wide text-zinc-900 dark:text-white whitespace-nowrap truncate min-w-0"
        >
          El Fucking Mejor Pan de Jamón
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300"
        >
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className={`hover:text-[#F52D18] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'portals'
                ? 'text-[#F52D18] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Portales
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className={`hover:text-[#F52D18] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'tokens'
                ? 'text-[#F52D18] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Tokens QR
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className={`hover:text-[#F52D18] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'results'
                ? 'text-[#F52D18] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Resultados
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`hover:text-[#F52D18] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'audit'
                ? 'text-[#F52D18] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Auditoría
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="min-h-[40px] px-3 sm:px-4 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            Escanear QR
          </button>
        </div>
      </header>

      {/* Main Responsive Container (max-w-7xl on desktop, mobile-first touch layout) */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Hero Section with Official Competition Logo & Workspace Utility Bar */}
        <section className="rounded-3xl bg-zinc-950 border border-zinc-800/90 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left 7 Columns: Editorial Headline, Regional Context & Primary Controls */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
                  <span className="text-[#F52D18] font-bold">EDICIÓN OFICIAL CIUDAD BOLÍVAR</span>
                  <span aria-hidden="true">·</span>
                  <span>ESTADO BOLÍVAR, VENEZUELA</span>
                  <span aria-hidden="true">·</span>
                  <span>VOTACIÓN ATÓMICA FIRESTORE</span>
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.03]">
                  EL CONCURSO DEFINITIVO DEL{' '}
                  <span className="text-[#F52D18]">MEJOR PAN DE JAMÓN</span> EN CIUDAD BOLÍVAR
                </h1>

                <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                  Explora los portales estéticos de las panaderías participantes desde el Paseo Orinoco hasta Vista Hermosa. Escanea tu token QR en mesa con la cámara, evalúa masa, relleno y tradición en la encuesta de 3 preguntas, y audita cada voto en tiempo real.
                </p>
              </div>

              {/* Workspace Toolbar (PWA Install, Google Auth, Admin Add Bakery & Theme Switch) */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialBakeryId(null);
                    setModalInitialTokenCode(null);
                    setIsQrModalOpen(true);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Abrir Cámara QR y Votar</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateBakeryModal}
                  data-testid="hero-add-bakery-btn"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Panadería (Admin)</span>
                </button>

                <PWAInstallButton />

                {!firebaseUser ? (
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn()}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>Conectar Google</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveSection('audit')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{firebaseUser.displayName || firebaseUser.email}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDark((prev) => !prev)}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-300" />
                  )}
                  <span className="hidden sm:inline">{isDark ? 'Día' : 'Noche'}</span>
                </button>
              </div>

              {authBannerError && (
                <p className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  {authBannerError}
                </p>
              )}
            </div>

            {/* Right 5 Columns: Official Competition Logo Showcase */}
            <div className="lg:col-span-5 bg-black border-t lg:border-t-0 lg:border-l border-zinc-800/80 p-6 sm:p-8 flex flex-col items-center justify-center relative">
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, #F52D18, transparent 70%)',
                }}
              />
              <div className="relative z-10 w-56 sm:w-64 md:w-72 aspect-[3/4] rounded-2xl bg-black p-3 border border-zinc-800 shadow-2xl flex items-center justify-center">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Logo Oficial The Fucking Mejor Pan de Jamón Ciudad Bolívar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="relative z-10 mt-3 text-center text-xs font-mono text-zinc-400">
                IDENTIDAD OFICIAL · TEMPORADA GASTRONÓMICA CIUDAD BOLÍVAR
              </div>
            </div>
          </div>

          {/* Full-width 4-Column KPI Strip below the Hero Split */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-zinc-800/90 bg-zinc-900/60 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/90 tabular-nums">
            <div className="p-4 sm:p-5">
              <div className="text-xs text-zinc-400">Panaderías Oficiales</div>
              <div
                className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-white"
                data-testid="kpi-total-bakeries"
              >
                {bakeries.length} Portales
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Paseo Orinoco · Vista Hermosa · Casco Histórico
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="text-xs text-zinc-400">Votos Atómicos Registrados</div>
              <div
                className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-[#F52D18]"
                data-testid="kpi-total-votes"
              >
                {totalVotesCount}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Verificados vía runTransaction en Firestore
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="text-xs text-zinc-400">Promedio Global (3 Preguntas)</div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-amber-400">
                {overallCompetitionAverage} ★
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Masa · Proporción de Relleno · Tradición
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="text-xs text-zinc-400">Tokens QR Activos en Mesa</div>
              <div
                className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-emerald-400"
                data-testid="kpi-active-tokens"
              >
                {activeTokensCount} disponibles
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Rol actual: <strong className="uppercase text-zinc-200">{userRole}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Active View Switcher Content */}
        {activeSection === 'portals' && (
          <section className="space-y-6" aria-label="Portales de Panaderías de Ciudad Bolívar">
            {/* Filter, Search & Admin Bakery Registration Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-extrabold text-zinc-900 dark:text-white tracking-wide">
                  01. Portales Oficiales de Panaderías en Ciudad Bolívar
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Cada panadería cuenta con su portal personalizado con foto de su logo o fachada, sello de la competencia y tokens QR
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar panadería, sector o maestro..."
                    aria-label="Buscar panadería en Ciudad Bolívar"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                  />
                </div>

                {/* Admin Button to Register a New Bakery with Logo/Facade */}
                <button
                  type="button"
                  onClick={handleOpenCreateBakeryModal}
                  data-testid="open-admin-bakery-modal-btn"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Building2 className="w-4 h-4 text-[#F52D18]" />
                  <span>+ Agregar Panadería (Solo Admin)</span>
                </button>
              </div>
            </div>

            {/* Interactive Sector Filter Controls (Functional Buttons) */}
            <div
              className="flex items-center gap-1.5 p-1.5 bg-zinc-200/70 dark:bg-zinc-900 rounded-2xl overflow-x-auto"
              role="tablist"
              aria-label="Filtrar panaderías por sector de Ciudad Bolívar"
            >
              {sectors.map((sec) => {
                const active = selectedSector === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedSector(sec)}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#F52D18] text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {sec === 'ALL' ? 'Todos los Sectores CB' : sec}
                  </button>
                );
              })}
            </div>

            {/* Bakery Portals Responsive Grid */}
            {filteredBakeries.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-3">
                <p className="text-sm text-zinc-500">
                  No se encontraron panaderías que coincidan con el filtro seleccionado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSector('ALL');
                    setSearchQuery('');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F52D18] text-white text-xs font-semibold cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBakeries.map((b) => {
                  const bakeryActiveTokens = tokens.filter(
                    (t) =>
                      t.bakeryId === b.id && t.status === 'active' && t.usedCount < t.maxUses
                  ).length;

                  return (
                    <BakeryPortalCard
                      key={b.id}
                      bakery={b}
                      activeTokenCount={bakeryActiveTokens}
                      isAdmin={userRole === 'admin'}
                      onOpenPortal={(id) => setInspectedBakeryId(id)}
                      onQuickVoteWithQr={(id) => handleOpenVotingForBakery(id)}
                      onEditBakeryByAdmin={handleOpenEditBakeryModal}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeSection === 'tokens' && (
          <QrTokenLabView
            bakeries={bakeries}
            tokens={tokens}
            currentUserRole={userRole}
            onCreateToken={handleCreateQrToken}
            onManipulateToken={handleManipulateQrToken}
            onTriggerVoteWithToken={(tokenCode, bakeryId) =>
              handleOpenVotingForBakery(bakeryId, tokenCode)
            }
          />
        )}

        {activeSection === 'results' && (
          <LiveResultsView
            rankedBakeries={rankedBakeries}
            votes={votes}
            onOpenPortal={(id) => setInspectedBakeryId(id)}
            onQuickVote={(id) => handleOpenVotingForBakery(id)}
          />
        )}

        {activeSection === 'audit' && (
          <AuditAndSecurityView
            auditLogs={auditLogs}
            bakeries={bakeries}
            currentUserUid={currentUserUid}
            currentUserEmail={firebaseUser?.email || null}
            currentUserDisplayName={currentUserDisplayName}
            currentUserRole={userRole}
            isGoogleAuthenticated={!!firebaseUser}
            firestoreConnected={firestoreConnected}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onSwitchRoleSimulation={handleSwitchRoleSimulation}
            onSyncSeedToFirestore={async () => {
              await seedInitialDataToFirestore(bakeries, tokens, currentUserUid, userRole);
            }}
            onRecordStorageValidationAudit={handleRecordStorageValidationAudit}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          El Fucking Mejor Pan de Jamón · Ciudad Bolívar, Estado Bolívar · PWA Oficial
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className="hover:text-[#F52D18] cursor-pointer"
          >
            Portales
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className="hover:text-[#F52D18] cursor-pointer"
          >
            Laboratorio QR
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className="hover:text-[#F52D18] cursor-pointer"
          >
            Resultados en Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className="hover:text-[#F52D18] cursor-pointer"
          >
            Auditoría & Storage
          </button>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Tab Bar (references/10_mobile_touch_apps.md §3 Pattern 1) */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveSection('portals')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'portals'
              ? 'text-[#F52D18]'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Portales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('tokens')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'tokens'
              ? 'text-[#F52D18]'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Tokens QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('results')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'results'
              ? 'text-[#F52D18]'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Resultados</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('audit')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'audit'
              ? 'text-[#F52D18]'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Auditoría</span>
        </button>
      </nav>

      {/* Dedicated Bakery Aesthetic Portal Modal */}
      <BakeryPortalModal
        bakery={inspectedBakery}
        tokens={tokens}
        votes={votes}
        isAdmin={userRole === 'admin'}
        onClose={() => setInspectedBakeryId(null)}
        onSelectTokenToVote={(tokenCode, bakeryId) =>
          handleOpenVotingForBakery(bakeryId, tokenCode)
        }
        onOpenQrScannerForBakery={(bakeryId) => handleOpenVotingForBakery(bakeryId)}
        onEditBakeryByAdmin={handleOpenEditBakeryModal}
      />

      {/* Admin-Only Bakery Registration & Editing Modal (with Logo/Facade Upload) */}
      <AdminBakeryModal
        isOpen={isAdminBakeryModalOpen}
        editingBakery={editingBakery}
        existingBakeriesCount={bakeries.length}
        currentUserUid={currentUserUid}
        currentUserRole={userRole}
        onClose={() => setIsAdminBakeryModalOpen(false)}
        onSwitchToAdminRole={() => handleSwitchRoleSimulation('admin')}
        onSaveBakery={handleSaveBakeryByAdmin}
      />

      {/* QR Scanner + 3-Question Star Survey + Atomic Vote Modal */}
      <QrVotingModal
        isOpen={isQrModalOpen}
        initialBakeryId={modalInitialBakeryId}
        initialTokenCode={modalInitialTokenCode}
        bakeries={bakeries}
        tokens={tokens}
        currentUserUid={currentUserUid}
        currentUserAlias={currentUserDisplayName}
        currentUserRole={userRole}
        onClose={() => setIsQrModalOpen(false)}
        onSubmitAtomicVote={handleSubmitAtomicVote}
      />
    </div>
  );
}
