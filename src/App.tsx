import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Flame,
  LogIn,
  Moon,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Sun,
  Ticket,
  Trophy,
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
import { AuthModal, AppUser } from './components/AuthModal';
import { ToastContainer, ToastData } from './components/Toast';

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
  const [currentUser, setCurrentUser] = useState<AppUser | null>({
    uid: 'admin_restrepo_01',
    email: 'restreposolution@gmail.com',
    displayName: 'Restrepo Solution (Admin)',
    isSimulated: true,
  });
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isSimulated: false,
        });
        if (user?.email === 'restreposolution@gmail.com') {
          setUserRole('admin');
        }
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

  const currentUserUid = currentUser?.uid || 'catador-bolivar-local';
  const currentUserDisplayName =
    currentUser?.displayName || 'Jurado / Catador Ciudad Bolívar';

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
      const user = await signInWithGooglePopup();
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isSimulated: false,
      });
      showToast(`¡Sesión iniciada con Google: ${user.email}!`);
      setIsAuthModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('auth/unauthorized-domain') ||
        msg.includes('localhost') ||
        msg.includes('popup-closed-by-user')
      ) {
        setAuthBannerError(
          'En localhost, Google OAuth requiere configuración de dominios en Firebase Cloud. Puedes elegir un perfil simulado a continuación para probar todas las funciones.'
        );
      } else {
        setAuthBannerError(`Aviso Google Auth: ${msg}`);
      }
      setIsAuthModalOpen(true);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutUser();
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    setUserRole('voter');
    showToast('Sesión cerrada correctamente.', 'info');
    setIsAuthModalOpen(false);
  };

  const handleSelectSimulatedProfile = (profile: AppUser, nextRole: UserRole) => {
    setCurrentUser(profile);
    setUserRole(nextRole);
    handleSwitchRoleSimulation(nextRole);
    showToast(`Sesión activa como ${profile.displayName} (${nextRole.toUpperCase()})`);
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
    showToast(
      transition.isNew
        ? `Panadería "${finalBakery.name}" registrada con éxito.`
        : `Panadería "${finalBakery.name}" actualizada.`
    );

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
    showToast(`¡Voto atómico registrado para ${transition.updatedBakery.name}!`);

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
    showToast(`Token QR "${newToken.code}" emitido para ${newToken.bakeryName}.`);

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
    showToast(`Token ${target.code} actualizado a estado: ${updates.status.toUpperCase()}`);

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

    if (currentUser?.isSimulated) {
      const presets: Record<UserRole, { name: string; email: string; uid: string }> = {
        admin: {
          name: 'Restrepo Solution (Admin)',
          email: 'restreposolution@gmail.com',
          uid: 'admin_restrepo_01',
        },
        judge: {
          name: 'Chef María Bolívar (Jurado)',
          email: 'jurado.bolivar@gastronomia.ve',
          uid: 'judge_angostura_01',
        },
        voter: {
          name: 'Carlos Mendoza (Catador)',
          email: 'catador.orinoco@gmail.com',
          uid: 'voter_orinoco_01',
        },
        bakery_manager: {
          name: 'Don Celestino (Horno Orinoco)',
          email: 'horno.orinoco@panaderias.ve',
          uid: 'manager_paseo_01',
        },
      };
      const p = presets[nextRole];
      setCurrentUser({
        uid: p.uid,
        email: p.email,
        displayName: p.name,
        isSimulated: true,
      });
    }

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
    showToast(`Rol activo cambiado a: ${nextRole.toUpperCase()}`);
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
      <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 lg:px-8 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80">
        {/* Zone 1: Wordmark + Live Pulse Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('portals');
            }}
            className="font-display text-lg sm:text-2xl font-extrabold tracking-wide text-white whitespace-nowrap truncate min-w-0 flex items-center gap-2"
          >
            <span>El Fucking Mejor Pan de Jamón</span>
          </a>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>EN VIVO</span>
          </span>
        </div>

        {/* Zone 2: Modern Pill Navigation Bar */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold"
        >
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'portals'
                ? 'bg-[#F52D18] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Portales</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'results'
                ? 'bg-[#F52D18] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Podio & Ranking</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'tokens'
                ? 'bg-[#F52D18] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Tokens QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'audit'
                ? 'bg-[#F52D18] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditoría</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action + Quick Profile Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:border-amber-500/60 transition-colors cursor-pointer"
            title="Cambiar perfil o rol de usuario"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-mono uppercase text-[11px] text-amber-400 font-bold">{userRole}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-md glow-red flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Escanear QR</span>
            <span className="sm:hidden">Votar</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Container (max-w-7xl on desktop, mobile-first touch layout) */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">
        {/* Modern Organic Culinary Hero (No more rigid square boxes) */}
        <section className="relative rounded-[36px] bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 overflow-hidden shadow-2xl p-6 sm:p-10 lg:p-12">
          {/* Ambient Warm Glow */}
          <div
            aria-hidden="true"
            className="absolute -top-32 right-0 w-[500px] h-[400px] bg-gradient-to-b from-amber-500/15 via-[#F52D18]/10 to-transparent blur-3xl pointer-events-none rounded-full"
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left Content Column */}
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>TEMPORADA GASTRONÓMICA 2026</span>
                </span>
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300">
                  Ciudad Bolívar · Venezuela
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]">
                EL CONCURSO DEFINITIVO DEL{' '}
                <span className="text-gold-shimmer">MEJOR PAN DE JAMÓN</span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Desde las panaderías del Paseo Orinoco hasta Vista Hermosa. Escanea tu token QR en mesa con la cámara, califica la masa brioche, el relleno ahumado y la receta tradicional en vivo.
              </p>

              {/* Modern Action Buttons with Fluid Pill Silhouettes */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialBakeryId(null);
                    setModalInitialTokenCode(null);
                    setIsQrModalOpen(true);
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F52D18] via-rose-600 to-amber-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xl glow-red active:scale-98 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Abrir Cámara QR y Votar</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateBakeryModal}
                  data-testid="hero-add-bakery-btn"
                  className="min-h-[48px] px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Inscribir Panadería (Admin)</span>
                </button>

                <PWAInstallButton />

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`min-h-[48px] px-5 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md ${
                    currentUser
                      ? 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border-white/10 hover:border-amber-500/40'
                      : 'bg-[#F52D18] hover:bg-[#d92310] text-white border-transparent shadow-md'
                  }`}
                  title="Gestionar perfil, rol o conectar Google"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>
                    {currentUser
                      ? `${currentUser.displayName?.split(' ')[0]} (${userRole.toUpperCase()})`
                      : 'Identidad / Iniciar Sesión'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDark((prev) => {
                      const next = !prev;
                      showToast(next ? 'Modo Noche activado' : 'Modo Día activado', 'info');
                      return next;
                    });
                  }}
                  className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
                  <span>{authBannerError}</span>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold cursor-pointer shrink-0"
                  >
                    Usar Perfil Simulado
                  </button>
                </div>
              )}
            </div>

            {/* Right Visual Emblem */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative w-48 sm:w-56 aspect-square rounded-full bg-gradient-to-tr from-amber-500/20 via-black to-[#F52D18]/20 p-2 shadow-2xl flex items-center justify-center border-2 border-white/10 animate-pulse-glow">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Logo Oficial El Fucking Mejor Pan de Jamón"
                  referrerPolicy="no-referrer"
                  className="w-4/5 h-4/5 object-contain"
                />
              </div>
              <span className="mt-3 text-xs font-mono text-zinc-400 tracking-wider">
                SELLO OFICIAL CIUDAD BOLÍVAR
              </span>
            </div>
          </div>

          {/* Fluid Floating KPI Capsules (Replaces old rigid divide-x boxes) */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-between gap-3.5 tabular-nums">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="font-mono text-base font-black text-white" data-testid="kpi-total-bakeries">
                {bakeries.length}
              </span>
              <span className="text-xs text-zinc-400">Panaderías Oficiales</span>
            </div>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F52D18]" />
              <span className="font-mono text-base font-black text-[#F52D18]" data-testid="kpi-total-votes">
                {totalVotesCount}
              </span>
              <span className="text-xs text-zinc-400">Votos Verificados</span>
            </div>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-mono text-base font-black text-amber-400">
                {overallCompetitionAverage} ★
              </span>
              <span className="text-xs text-zinc-400">Promedio Global</span>
            </div>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-sm">
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-base font-black text-emerald-400" data-testid="kpi-active-tokens">
                {activeTokensCount}
              </span>
              <span className="text-xs text-zinc-400">Mesas Activas</span>
            </div>
          </div>
        </section>

        {/* Active View Switcher Content */}
        {activeSection === 'portals' && (
          <section className="space-y-8" aria-label="Portales de Panaderías de Ciudad Bolívar">
            {/* Filter, Search & Admin Bakery Registration Bar with Organic Shapes */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-wide">
                  Panaderías en Competencia
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Explora las casas panaderas artesanales de Ciudad Bolívar y vota por tu favorita
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input (Pill rounded) */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar panadería, sector..."
                    aria-label="Buscar panadería en Ciudad Bolívar"
                    className="w-full min-h-[46px] pl-11 pr-4 py-2.5 rounded-full bg-zinc-900/90 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                {/* Admin Button */}
                <button
                  type="button"
                  onClick={handleOpenCreateBakeryModal}
                  data-testid="open-admin-bakery-modal-btn"
                  className="min-h-[46px] px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                >
                  <Building2 className="w-4 h-4 text-[#F52D18]" />
                  <span>+ Agregar Panadería</span>
                </button>
              </div>
            </div>

            {/* Interactive Sector Filter Capsule Bar (No rigid box) */}
            <div
              className="flex items-center gap-2 p-1 overflow-x-auto no-scrollbar"
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
                    className={`min-h-[40px] px-5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#F52D18] to-amber-600 text-white shadow-md shadow-red-500/20 font-bold'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {sec === 'ALL' ? 'Todos los Sectores' : sec}
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
            currentUserEmail={currentUser?.email || null}
            currentUserDisplayName={currentUserDisplayName}
            currentUserRole={userRole}
            isGoogleAuthenticated={!!currentUser}
            firestoreConnected={firestoreConnected}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onSwitchRoleSimulation={handleSwitchRoleSimulation}
            onSyncSeedToFirestore={async () => {
              try {
                await seedInitialDataToFirestore(bakeries, tokens, currentUserUid, userRole);
                showToast('Padrón de panaderías sincronizado en Firestore.');
              } catch {
                showToast('Padrón guardado en memoria local.');
              }
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

      {/* Mobile-Only Floating Luxury Dock (UX/UI Pro Max) */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 shadow-2xl px-2 py-1.5 flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => setActiveSection('portals')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            activeSection === 'portals'
              ? 'text-white bg-zinc-800/90 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Store className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] tracking-tight mt-0.5">Portales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('results')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            activeSection === 'results'
              ? 'text-white bg-zinc-800/90 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-[10px] tracking-tight mt-0.5">Podio</span>
        </button>

        {/* Central Floating QR Scan Action Button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="w-12 h-12 -mt-7 rounded-2xl bg-gradient-to-tr from-[#F52D18] via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-xl glow-red active:scale-95 transition-transform cursor-pointer border-2 border-zinc-900"
            aria-label="Escanear QR y Votar"
          >
            <QrCode className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('tokens')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            activeSection === 'tokens'
              ? 'text-white bg-zinc-800/90 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Ticket className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] tracking-tight mt-0.5">Tokens</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('audit')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            activeSection === 'audit'
              ? 'text-white bg-zinc-800/90 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] tracking-tight mt-0.5">Auditoría</span>
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

      {/* Identity & Role Management Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        currentUserRole={userRole}
        onSelectSimulatedProfile={handleSelectSimulatedProfile}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        authBannerError={authBannerError}
      />

      {/* Global Interactive Notification Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
