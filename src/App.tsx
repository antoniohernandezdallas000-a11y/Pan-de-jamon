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

      {/* Human, Warm Navigation Bar */}
      <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 lg:px-8 bg-[#FAF6F0]/90 dark:bg-[#191614]/90 backdrop-blur-md border-b border-[#E8DEC8] dark:border-[#332A24]">
        {/* Brand & Region */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('portals');
            }}
            className="font-display text-xl sm:text-2xl font-black text-[#2D241E] dark:text-[#F7F2EC] whitespace-nowrap truncate min-w-0 flex items-center gap-2"
          >
            <span>El Mejor Pan de Jamón</span>
          </a>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFE4D2] dark:bg-[#2A231E] text-[#8C4A28] dark:text-[#E29D74] text-[11px] font-medium shrink-0">
            Ciudad Bolívar
          </span>
        </div>

        {/* Human Navigation Links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-1 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className={`px-4 py-2 rounded-full transition-colors cursor-pointer ${
              activeSection === 'portals'
                ? 'bg-[#C84B31] text-white font-semibold shadow-sm'
                : 'text-[#6E5D53] dark:text-[#BFAF9F] hover:text-[#2D241E] dark:hover:text-white'
            }`}
          >
            Panaderías
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className={`px-4 py-2 rounded-full transition-colors cursor-pointer ${
              activeSection === 'results'
                ? 'bg-[#C84B31] text-white font-semibold shadow-sm'
                : 'text-[#6E5D53] dark:text-[#BFAF9F] hover:text-[#2D241E] dark:hover:text-white'
            }`}
          >
            Posiciones en Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className={`px-4 py-2 rounded-full transition-colors cursor-pointer ${
              activeSection === 'tokens'
                ? 'bg-[#C84B31] text-white font-semibold shadow-sm'
                : 'text-[#6E5D53] dark:text-[#BFAF9F] hover:text-[#2D241E] dark:hover:text-white'
            }`}
          >
            Códigos de Mesa
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`px-4 py-2 rounded-full transition-colors cursor-pointer ${
              activeSection === 'audit'
                ? 'bg-[#C84B31] text-white font-semibold shadow-sm'
                : 'text-[#6E5D53] dark:text-[#BFAF9F] hover:text-[#2D241E] dark:hover:text-white'
            }`}
          >
            Transparencia
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-white dark:bg-[#251F1C] border border-[#DDD0BC] dark:border-[#3D332C] text-xs font-semibold text-[#4A3D34] dark:text-[#E2D6CB] hover:border-[#C84B31] transition-colors cursor-pointer shadow-xs"
            title="Cambiar perfil o usuario"
          >
            <ShieldCheck className="w-4 h-4 text-[#C84B31]" />
            <span className="capitalize">{currentUser?.displayName?.split(' ')[0] || userRole}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="min-h-[40px] px-4 py-2 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Votar</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">
        {/* Authentic, Warm Gastronomy Hero */}
        <section className="relative rounded-3xl bg-[#F4ECE1] dark:bg-[#231E1B] border border-[#E5DAC6] dark:border-[#38312B] overflow-hidden p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content Column */}
            <div className="flex-1 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EADBCA] dark:bg-[#2F2723] text-[#7A3E20] dark:text-[#E8A57E] text-xs font-semibold">
                <span>Tradición Navideña Guayanesa · Diciembre 2026</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-[#2D241E] dark:text-[#FAF6F0] leading-tight">
                El Concurso del Mejor Pan de Jamón en Ciudad Bolívar
              </h1>

              <p className="text-sm sm:text-base text-[#57493E] dark:text-[#CBBDB2] max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Un homenaje a los maestros panaderos que llenan nuestras mesas de sabor decembrino. Recorre las panaderías del Paseo Orinoco, Vista Hermosa y el Casco Histórico, prueba cada receta y vota por tu favorita.
              </p>

              {/* Natural Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialBakeryId(null);
                    setModalInitialTokenCode(null);
                    setIsQrModalOpen(true);
                  }}
                  className="min-h-[46px] px-6 py-2.5 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
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
                  className="min-h-[46px] px-5 py-2.5 rounded-full bg-white dark:bg-[#2E2723] hover:bg-[#FAF6F0] dark:hover:bg-[#38302B] text-[#3D322B] dark:text-[#EAE0D6] border border-[#D5C7B2] dark:border-[#423831] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Store className="w-4 h-4 text-[#C84B31]" />
                  <span>Ver Panaderías</span>
                </button>

                <PWAInstallButton />

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="hero-add-bakery-btn"
                    className="min-h-[46px] px-4 py-2.5 rounded-full bg-white dark:bg-[#2E2723] text-[#7A3E20] dark:text-[#E8A57E] border border-[#D5C7B2] dark:border-[#423831] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  className="min-h-[46px] min-w-[46px] px-3.5 py-2 rounded-full bg-white dark:bg-[#2E2723] text-[#4A3D34] dark:text-[#CBBDB2] border border-[#D5C7B2] dark:border-[#423831] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-600" />
                  )}
                  <span className="hidden sm:inline">{isDark ? 'Día' : 'Noche'}</span>
                </button>
              </div>
            </div>

            {/* Right Emblem Card */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-40 sm:w-48 aspect-square rounded-3xl bg-white dark:bg-[#28221E] p-3 shadow-md flex items-center justify-center border border-[#E2D5BF] dark:border-[#3D332C]">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Sello del Concurso de Pan de Jamón Ciudad Bolívar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="mt-2 text-xs text-[#7A6B5F] dark:text-[#AFA195] font-medium">
                Concurso Oficial · Edición 2026
              </span>
            </div>
          </div>

          {/* Simple, Human Stats Strip */}
          <div className="mt-8 pt-6 border-t border-[#E5DAC6] dark:border-[#38312B] flex flex-wrap items-center justify-center lg:justify-between gap-4 text-sm text-[#4E4137] dark:text-[#D5C8BD] tabular-nums">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C84B31]" />
              <strong className="text-base text-[#2D241E] dark:text-white" data-testid="kpi-total-bakeries">
                {bakeries.length}
              </strong>{' '}
              panaderías artesanales
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <strong className="text-base text-[#2D241E] dark:text-white" data-testid="kpi-total-votes">
                {totalVotesCount}
              </strong>{' '}
              votos de la comunidad
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <strong className="text-base text-[#2D241E] dark:text-white">
                {overallCompetitionAverage} ★
              </strong>{' '}
              calificación promedio
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <strong className="text-base text-[#2D241E] dark:text-white" data-testid="kpi-active-tokens">
                {activeTokensCount}
              </strong>{' '}
              mesas de degustación
            </div>
          </div>
        </section>

        {/* Active View Switcher Content */}
        {activeSection === 'portals' && (
          <section id="catalogo-panaderias" className="space-y-6" aria-label="Panaderías de Ciudad Bolívar">
            {/* Filter, Search & Admin Registration Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-extrabold text-[#2D241E] dark:text-[#FAF6F0] tracking-wide">
                  Panaderías Participantes
                </h2>
                <p className="text-xs sm:text-sm text-[#66564B] dark:text-[#B8A99D]">
                  Conoce a los maestros panaderos, sus secretos de receta y apóyalos con tu voto
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Clean Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar panadería o sector..."
                    aria-label="Buscar panadería en Ciudad Bolívar"
                    className="w-full min-h-[44px] pl-11 pr-4 py-2 rounded-full bg-white dark:bg-[#251F1C] border border-[#DDD0BC] dark:border-[#3D332C] text-sm text-[#2D241E] dark:text-[#F7F2EC] placeholder:text-zinc-400 focus:outline-none focus:border-[#C84B31] transition-colors shadow-xs"
                  />
                </div>

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="open-admin-bakery-modal-btn"
                    className="min-h-[44px] px-4 py-2 rounded-full bg-[#2D241E] dark:bg-white text-white dark:text-[#2D241E] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>+ Inscribir Panadería</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clean Sector Filter Pills */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1"
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
                    className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#C84B31] text-white font-semibold shadow-xs'
                        : 'bg-white dark:bg-[#251F1C] border border-[#DDD0BC] dark:border-[#3D332C] text-[#5A4B40] dark:text-[#C5B8AC] hover:text-[#2D241E]'
                    }`}
                  >
                    {sec === 'ALL' ? 'Todas las Zonas' : sec}
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

      {/* Mobile-Only Warm Artisanal Bottom Dock */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full bg-[#FAF6F0]/95 dark:bg-[#1C1816]/95 backdrop-blur-xl border border-[#DDD2C0] dark:border-[#382F2A] shadow-lg px-2 py-1 flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => setActiveSection('portals')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors cursor-pointer ${
            activeSection === 'portals'
              ? 'text-[#C84B31] font-bold'
              : 'text-[#7A6B60] dark:text-[#A7988D] hover:text-[#2D241E]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">Panaderías</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('results')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors cursor-pointer ${
            activeSection === 'results'
              ? 'text-[#C84B31] font-bold'
              : 'text-[#7A6B60] dark:text-[#A7988D] hover:text-[#2D241E]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">Posiciones</span>
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
            className="w-12 h-12 -mt-6 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer border-2 border-white dark:border-[#1C1816]"
            aria-label="Votar con código de mesa"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('tokens')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors cursor-pointer ${
            activeSection === 'tokens'
              ? 'text-[#C84B31] font-bold'
              : 'text-[#7A6B60] dark:text-[#A7988D] hover:text-[#2D241E]'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">Mesas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('audit')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors cursor-pointer ${
            activeSection === 'audit'
              ? 'text-[#C84B31] font-bold'
              : 'text-[#7A6B60] dark:text-[#A7988D] hover:text-[#2D241E]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">Detalles</span>
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
