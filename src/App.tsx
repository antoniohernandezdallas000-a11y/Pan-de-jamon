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
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-[#141210] text-[#181513] dark:text-[#F5EFE6] pb-28 md:pb-16 transition-colors">
      <OfflineIndicator />

      {/* Retro Neo-Brutalist Header */}
      <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 lg:px-8 bg-[#FFFDF8]/95 dark:bg-[#1C1815]/95 backdrop-blur-md border-b-2 border-[#181513] dark:border-[#38312B]">
        {/* Brand & Sticker */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('portals');
            }}
            className="font-display text-xl sm:text-2xl font-black text-[#181513] dark:text-[#FFFDF8] tracking-tight whitespace-nowrap truncate min-w-0 flex items-center gap-2 hover:opacity-85 transition-opacity"
          >
            <span>🥖 Pan de Jamón CB</span>
          </a>
          <span className="hidden sm:inline-block sticker-badge bg-[#FFD60A] text-[#181513] text-[10px] font-black uppercase tracking-wider shrink-0">
            Edición 2026
          </span>
        </div>

        {/* Neo-Brutalist Tactile Navigation */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-wider"
        >
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className={`neo-btn px-4 py-1.5 transition-all cursor-pointer ${
              activeSection === 'portals'
                ? 'bg-[#FFD60A] text-[#181513] shadow-[2px_2px_0px_#181513]'
                : 'bg-white dark:bg-[#25201C] text-[#554D47] dark:text-[#D5CCC3]'
            }`}
          >
            🥖 Panaderías
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className={`neo-btn px-4 py-1.5 transition-all cursor-pointer ${
              activeSection === 'results'
                ? 'bg-[#FFD60A] text-[#181513] shadow-[2px_2px_0px_#181513]'
                : 'bg-white dark:bg-[#25201C] text-[#554D47] dark:text-[#D5CCC3]'
            }`}
          >
            🏆 Posiciones
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className={`neo-btn px-4 py-1.5 transition-all cursor-pointer ${
              activeSection === 'tokens'
                ? 'bg-[#FFD60A] text-[#181513] shadow-[2px_2px_0px_#181513]'
                : 'bg-white dark:bg-[#25201C] text-[#554D47] dark:text-[#D5CCC3]'
            }`}
          >
            🎟️ Mesas
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`neo-btn px-4 py-1.5 transition-all cursor-pointer ${
              activeSection === 'audit'
                ? 'bg-[#FFD60A] text-[#181513] shadow-[2px_2px_0px_#181513]'
                : 'bg-white dark:bg-[#25201C] text-[#554D47] dark:text-[#D5CCC3]'
            }`}
          >
            🔍 Auditoría
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="neo-btn bg-white dark:bg-[#25201C] min-h-[38px] px-3 py-1 text-xs font-black text-[#181513] dark:text-[#F5EFE6] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#181513]"
            title="Cambiar perfil o usuario"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#E11D48]" />
            <span className="capitalize">{currentUser?.displayName?.split(' ')[0] || userRole}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="neo-btn bg-[#E11D48] hover:bg-[#D01640] text-white min-h-[38px] px-4 py-1 text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer shadow-[2px_2px_0px_#181513] flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Votar</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Playful Neo-Brutalist Hero Card */}
        <section className="neo-box bg-[#FFFDF8] dark:bg-[#1E1B18] p-6 sm:p-10 relative overflow-hidden">
          {/* Window Title Bar */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-[#181513] dark:border-[#3A342E]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] border border-[#181513]" />
              <span className="w-3 h-3 rounded-full bg-[#FFD60A] border border-[#181513]" />
              <span className="w-3 h-3 rounded-full bg-[#10B981] border border-[#181513]" />
              <span className="ml-2 font-mono text-xs font-bold text-[#8A7D73] uppercase tracking-wider hidden sm:inline">
                concurso-pan-de-jamon-2026.app
              </span>
            </div>
            <span className="sticker-badge bg-[#FFD60A] text-[#181513] text-[10px] font-black uppercase">
              🔴 EN VIVO · GUAYANA
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content Column */}
            <div className="flex-1 space-y-4 text-center lg:text-left">
              <div>
                <span className="inline-block sticker-badge bg-[#FEF08A] text-[#181513] font-black text-xs uppercase mb-2 rotate-[-1deg]">
                  🎄 Tradición Navideña Guayanesa · Diciembre 2026
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-[#181513] dark:text-[#FFFDF8] leading-[1.08] tracking-tight">
                El Mejor Pan de Jamón <br className="hidden sm:inline" />
                <span className="inline-block bg-[#FFD60A] text-[#181513] px-3 py-1 rounded border-2 border-[#181513] shadow-[3px_3px_0px_#181513] rotate-[1deg] mt-1">
                  de Ciudad Bolívar
                </span>
              </h1>

              <p className="text-sm sm:text-base font-medium text-[#5A5048] dark:text-[#C5BAAF] max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Los maestros panaderos del Paseo Orinoco, Vista Hermosa y el Casco Histórico compiten por la receta de oro. Degusta, califica y apoya a tu panadería favorita con tu voto real en mesa.
              </p>

              {/* Neo-Brutalist Tactile Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialBakeryId(null);
                    setModalInitialTokenCode(null);
                    setIsQrModalOpen(true);
                  }}
                  className="neo-btn bg-[#E11D48] text-white min-h-[46px] px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-[4px_4px_0px_#181513] cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Votar con Código de Mesa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalogo-panaderias');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="neo-btn bg-white dark:bg-[#25201C] text-[#181513] dark:text-[#FFFDF8] min-h-[46px] px-5 py-2.5 text-xs sm:text-sm font-black flex items-center gap-2 shadow-[4px_4px_0px_#181513] cursor-pointer"
                >
                  <Store className="w-4 h-4 text-[#E11D48]" />
                  <span>Ver Panaderías</span>
                </button>

                <PWAInstallButton />

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="hero-add-bakery-btn"
                    className="neo-btn bg-[#FFD60A] text-[#181513] min-h-[46px] px-4 py-2.5 text-xs font-black uppercase flex items-center gap-1.5 shadow-[4px_4px_0px_#181513] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Inscribir Panadería</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsDark((prev) => {
                      const next = !prev;
                      showToast(next ? 'Modo Noche activado' : 'Modo Día activado', 'info');
                      return next;
                    });
                  }}
                  className="neo-btn bg-white dark:bg-[#25201C] text-[#181513] dark:text-[#FFFDF8] min-h-[46px] min-w-[46px] px-3.5 py-2 text-xs font-black flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_#181513] cursor-pointer"
                  aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#181513]" />
                  )}
                  <span className="hidden sm:inline">{isDark ? 'Día' : 'Noche'}</span>
                </button>
              </div>
            </div>

            {/* Right Emblem Card */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="neo-box bg-white dark:bg-[#25201C] p-4 w-40 sm:w-48 aspect-square flex items-center justify-center rotate-[2deg] hover:rotate-0 transition-transform">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Sello del Concurso de Pan de Jamón Ciudad Bolívar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="mt-3 sticker-badge bg-[#E2E8F0] dark:bg-[#2A2420] text-[#181513] dark:text-[#E2D6CB] text-[10px] font-black uppercase">
                Edición Oficial 2026
              </span>
            </div>
          </div>

          {/* Chunky Neo-Brutalist Stats Strip */}
          <div className="mt-8 pt-6 border-t-2 border-[#181513] dark:border-[#3A342E] grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="neo-box bg-[#FEF3C7] dark:bg-[#2D241E] p-3 text-center">
              <span className="text-[11px] font-black text-[#7A6B5F] dark:text-[#B5A599] uppercase tracking-wider block">
                Panaderías
              </span>
              <strong className="font-display text-2xl sm:text-3xl font-black text-[#181513] dark:text-[#FFFDF8]" data-testid="kpi-total-bakeries">
                {bakeries.length}
              </strong>
            </div>

            <div className="neo-box bg-[#FCE7F3] dark:bg-[#2D241E] p-3 text-center">
              <span className="text-[11px] font-black text-[#7A6B5F] dark:text-[#B5A599] uppercase tracking-wider block">
                Votos de la Comunidad
              </span>
              <strong className="font-display text-2xl sm:text-3xl font-black text-[#181513] dark:text-[#FFFDF8]" data-testid="kpi-total-votes">
                {totalVotesCount}
              </strong>
            </div>

            <div className="neo-box bg-[#FEF08A] dark:bg-[#2D241E] p-3 text-center">
              <span className="text-[11px] font-black text-[#7A6B5F] dark:text-[#B5A599] uppercase tracking-wider block">
                Promedio General
              </span>
              <strong className="font-display text-2xl sm:text-3xl font-black text-[#181513] dark:text-[#FFFDF8]">
                {overallCompetitionAverage} ★
              </strong>
            </div>

            <div className="neo-box bg-[#D1FAE5] dark:bg-[#2D241E] p-3 text-center">
              <span className="text-[11px] font-black text-[#7A6B5F] dark:text-[#B5A599] uppercase tracking-wider block">
                Mesas Activas
              </span>
              <strong className="font-display text-2xl sm:text-3xl font-black text-[#181513] dark:text-[#FFFDF8]" data-testid="kpi-active-tokens">
                {activeTokensCount}
              </strong>
            </div>
          </div>
        </section>

        {/* Active View Switcher Content */}
        {activeSection === 'portals' && (
          <section id="catalogo-panaderias" className="space-y-6" aria-label="Panaderías de Ciudad Bolívar">
            {/* Filter, Search & Admin Registration Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-[#181513] dark:text-[#FFFDF8] tracking-tight">
                    Panaderías Participantes
                  </h2>
                  <span className="sticker-badge bg-[#FFD60A] text-[#181513] text-xs font-black">
                    {filteredBakeries.length}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#6B5E54] dark:text-[#B8A99D]">
                  Conoce a los maestros panaderos, sus secretos de receta y califica su sabor
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input in Neo Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#181513] dark:text-[#FAF6EE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar panadería o sector..."
                    aria-label="Buscar panadería en Ciudad Bolívar"
                    className="w-full min-h-[42px] pl-10 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#25201C] border-2 border-[#181513] dark:border-[#3A342E] text-xs font-bold text-[#181513] dark:text-[#F7F2EC] placeholder:text-[#8A7D73] focus:outline-none focus:bg-[#FFFDF8] shadow-[2px_2px_0px_#181513] transition-all"
                  />
                </div>

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="open-admin-bakery-modal-btn"
                    className="neo-btn bg-[#FFD60A] text-[#181513] min-h-[42px] px-4 py-1.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#181513] cursor-pointer shrink-0"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>+ Inscribir Panadería</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sector Filter Neo Pills */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-2"
              role="tablist"
              aria-label="Filtrar por sector de Ciudad Bolívar"
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
                    className={`neo-btn px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#181513] text-white dark:bg-[#FFD60A] dark:text-[#181513] shadow-[2px_2px_0px_#181513]'
                        : 'bg-white dark:bg-[#25201C] text-[#554D47] dark:text-[#D5CCC3] shadow-[2px_2px_0px_#181513]'
                    }`}
                  >
                    {sec === 'ALL' ? '🗺️ Todas las Zonas' : `📍 ${sec}`}
                  </button>
                );
              })}
            </div>

            {/* Bakery Portals Responsive Grid */}
            {filteredBakeries.length === 0 ? (
              <div className="neo-box bg-white dark:bg-[#25201C] p-10 text-center space-y-4">
                <span className="text-4xl block">🔍</span>
                <p className="text-sm font-bold text-[#554D47] dark:text-[#D5CCC3]">
                  No se encontraron panaderías que coincidan con la búsqueda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSector('ALL');
                    setSearchQuery('');
                  }}
                  className="neo-btn bg-[#FFD60A] text-[#181513] px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#181513] cursor-pointer"
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

      {/* Neo-Brutalist Friendly Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 pt-6 border-t-2 border-[#181513] dark:border-[#38312B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#655950] dark:text-[#B5A79C]">
        <div className="flex items-center gap-2">
          <span>🥖</span>
          <span>Concurso Oficial del Mejor Pan de Jamón · Ciudad Bolívar, Estado Bolívar</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className="hover:text-[#E11D48] cursor-pointer"
          >
            Panaderías
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className="hover:text-[#E11D48] cursor-pointer"
          >
            Mesas QR
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className="hover:text-[#E11D48] cursor-pointer"
          >
            Posiciones
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className="hover:text-[#E11D48] cursor-pointer"
          >
            Auditoría
          </button>
        </div>
      </footer>

      {/* Mobile-Only Neo-Brutalist Bottom Dock */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-2xl bg-[#FFFDF8] dark:bg-[#1E1B18] border-2 border-[#181513] dark:border-[#38312B] shadow-[4px_4px_0px_#181513] px-2 py-1.5 flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => setActiveSection('portals')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'portals'
              ? 'text-[#181513] dark:text-[#FFFDF8] font-black'
              : 'text-[#8A7D73] dark:text-[#8E8278] hover:text-[#181513]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Panaderías</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('results')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'results'
              ? 'text-[#181513] dark:text-[#FFFDF8] font-black'
              : 'text-[#8A7D73] dark:text-[#8E8278] hover:text-[#181513]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Posiciones</span>
        </button>

        {/* Central Action Button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="w-12 h-12 -mt-6 rounded-xl bg-[#E11D48] text-white flex items-center justify-center border-2 border-[#181513] shadow-[3px_3px_0px_#181513] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            aria-label="Votar con código de mesa"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('tokens')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'tokens'
              ? 'text-[#181513] dark:text-[#FFFDF8] font-black'
              : 'text-[#8A7D73] dark:text-[#8E8278] hover:text-[#181513]'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Mesas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('audit')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'audit'
              ? 'text-[#181513] dark:text-[#FFFDF8] font-black'
              : 'text-[#8A7D73] dark:text-[#8E8278] hover:text-[#181513]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Detalles</span>
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
