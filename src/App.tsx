import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Flame,
  HelpCircle,
  Home,
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
  Users,
  Vote as VoteIcon,
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
import { PanIcon } from './components/BreadRating';
import { FestiveAtmosphere, CardChristmasLightsGarland } from './components/FestiveAtmosphere';
import { NeonCrown, CrowdSilhouette, FestiveWaveRibbons } from './components/HeroDecorations';
import { FaqReglamentoModal } from './components/FaqReglamentoModal';

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
  const [isFaqModalOpen, setIsFaqModalOpen] = useState<boolean>(false);
  const [faqInitialTab, setFaqInitialTab] = useState<'faq' | 'rules'>('faq');
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
    <div className="relative min-h-screen bg-gradient-to-b from-[#FFF2E6] via-[#FFF8F2] to-[#FAF2EA] dark:from-[#121110] dark:via-[#121110] dark:to-[#0C0B0A] text-[#1E293B] dark:text-[#F1F5F9] pb-28 md:pb-16 transition-colors overflow-x-hidden">
      <FestiveAtmosphere isDark={isDark} />
      <OfflineIndicator />

      {/* Navigation Bar Inspirada en la Guía de The Fucking Mejor */}
      <header className="sticky top-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top))] bg-[#0A0908]/95 backdrop-blur-xl border-b border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo y Nombre Oficial */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('portals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 sm:gap-3.5 hover:opacity-95 transition-transform active:scale-95 shrink-0"
          >
            <img
              src="/assets/logo-04-hd.png"
              alt="Logo The Fucking Mejor Pan de Jamón"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="font-display text-lg sm:text-2xl md:text-3xl text-white tracking-wider leading-none block truncate">
                THE <span className="text-[#EB321D]">FUCKING</span> MEJOR
              </span>
              <span className="text-[9px] sm:text-xs text-[#EFA632] font-black uppercase tracking-[0.18em] block mt-0.5 truncate">
                PAN DE JAMÓN • 2026
              </span>
            </div>
          </a>

          {/* Enlaces de Navegación (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection('portals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-full font-display text-sm xl:text-base tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'portals'
                  ? 'bg-[#EFA632]/20 text-[#EFA632] font-bold border border-[#EFA632]/40 shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4 text-[#EFA632]" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('portals');
                const el = document.getElementById('catalogo-panaderias');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-full font-display text-sm xl:text-base tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white hover:bg-white/5"
            >
              <Trophy className="w-4 h-4 text-[#EFA632]" />
              <span>El Concurso</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('results')}
              className={`px-3 py-1.5 rounded-full font-display text-sm xl:text-base tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'results'
                  ? 'bg-[#EFA632]/20 text-[#EFA632] font-bold border border-[#EFA632]/40 shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#EFA632]" />
              <span>El Podio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFaqInitialTab('faq');
                setIsFaqModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full font-display text-sm xl:text-base tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white hover:bg-white/5"
            >
              <HelpCircle className="w-4 h-4 text-[#EFA632]" />
              <span>Preguntas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFaqInitialTab('rules');
                setIsFaqModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full font-display text-sm xl:text-base tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white hover:bg-white/5"
            >
              <FileText className="w-4 h-4 text-[#EFA632]" />
              <span>Reglamento</span>
            </button>
          </nav>

          {/* Botón Dorado de Alta Conversión "VOTAR AHORA" + Controles */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                const firstActive = tokens.find(
                  (t) => t.status === 'active' && t.usedCount < t.maxUses
                );
                if (firstActive) {
                  setModalInitialBakeryId(firstActive.bakeryId);
                  setModalInitialTokenCode(firstActive.code);
                } else {
                  setModalInitialBakeryId(null);
                  setModalInitialTokenCode(null);
                }
                setIsQrModalOpen(true);
              }}
              className="bg-[#F5A524] hover:bg-[#ffb338] text-black font-display font-black text-xs sm:text-base md:text-lg px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-lg shadow-amber-500/25 transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer tracking-wider"
              title="Abrir cabina de votación"
            >
              <VoteIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="whitespace-nowrap">VOTAR AHORA</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-black shrink-0" />
            </button>

            {/* Selector Día / Noche */}
            <button
              type="button"
              onClick={() => {
                setIsDark((prev) => {
                  const next = !prev;
                  showToast(
                    next
                      ? '🌙 Noche Estrellada activada: ¡Luces Navideñas encendidas!'
                      : '🌅 Atardecer Cálido activado: ¡Cielo en tonos coral y nieve suave cayendo!',
                    'info'
                  );
                  return next;
                });
              }}
              className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all active:scale-90"
              title={isDark ? 'Cambiar a Atardecer' : 'Cambiar a Noche'}
            >
              {isDark ? <Sun className="w-4 h-4 text-[#EFA632]" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Perfil / Admin */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="hidden sm:flex p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all active:scale-90"
              title="Perfil / Acceso de Jurado o Admin"
            >
              <ShieldCheck className="w-4 h-4 text-[#EFA632]" />
            </button>
          </div>
        </div>

        {/* Barra de pestañas móvil con scroll horizontal fluido */}
        <div className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/50">
          <button
            type="button"
            onClick={() => {
              setActiveSection('portals');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1 ${
              activeSection === 'portals' ? 'bg-[#EFA632]/25 text-[#EFA632] font-bold border border-[#EFA632]/40' : 'text-neutral-400'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-[#EFA632]" />
            Inicio
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('portals');
              const el = document.getElementById('catalogo-panaderias');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 text-neutral-400 flex items-center gap-1"
          >
            <Trophy className="w-3.5 h-3.5 text-[#EFA632]" />
            El Concurso
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className={`px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1 ${
              activeSection === 'results' ? 'bg-[#EFA632]/25 text-[#EFA632] font-bold border border-[#EFA632]/40' : 'text-neutral-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#EFA632]" />
            El Podio
          </button>

          <button
            type="button"
            onClick={() => {
              setFaqInitialTab('faq');
              setIsFaqModalOpen(true);
            }}
            className="px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 text-neutral-400 flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#EFA632]" />
            Preguntas
          </button>

          <button
            type="button"
            onClick={() => {
              setFaqInitialTab('rules');
              setIsFaqModalOpen(true);
            }}
            className="px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 text-neutral-400 flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-[#EFA632]" />
            Reglamento
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`px-3 py-1 rounded-full text-xs font-display tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1 ${
              activeSection === 'audit' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Auditoría
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main id="top" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 space-y-8">
        {/* Hero Section The Fucking Mejor Pan de Jamón 2026 (Diseño Fiel a la Guía) */}
        <section className="relative rounded-3xl bg-[#0D0B0A] border border-white/10 shadow-2xl p-5 sm:p-8 lg:p-12 overflow-hidden text-white">
          {/* Matriz de puntos halftone en esquina superior izquierda */}
          <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-[radial-gradient(#ffffff18_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none opacity-50 z-0" />

          {/* Luces de Escenario / Concierto (Focos Violeta, Magenta y Dorado Papelón) */}
          <div className="absolute -top-12 -left-12 w-[350px] sm:w-[480px] h-[350px] sm:h-[480px] bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.45)_0%,rgba(217,70,239,0.2)_40%,transparent_70%)] pointer-events-none blur-3xl z-0" />
          <div className="absolute -top-12 -right-12 w-[350px] sm:w-[480px] h-[350px] sm:h-[480px] bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.4)_0%,rgba(168,85,247,0.22)_40%,transparent_70%)] pointer-events-none blur-3xl z-0" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-80 bg-[#EFA632]/12 blur-3xl pointer-events-none z-0" />

          {/* Coronas de Neón Dorado Graffiti en el Fondo */}
          <NeonCrown className="absolute top-6 left-1/4 sm:left-1/3 w-14 h-10 sm:w-18 sm:h-12 opacity-85 pointer-events-none z-0 animate-pulse" />
          <NeonCrown className="absolute top-8 right-6 sm:right-16 w-44 h-32 sm:w-64 sm:h-48 opacity-70 pointer-events-none z-0" />

          {/* Silueta de Multitud Celebrando en el Escenario */}
          <CrowdSilhouette className="absolute bottom-20 sm:bottom-24 inset-x-0 w-full h-24 sm:h-36 text-black/95 pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10">
            {/* Columna Izquierda: Tipografía de Máximo Impacto */}
            <div className="flex-1 space-y-4 sm:space-y-5 text-center lg:text-left">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-[#EFA632]/50 text-[#EFA632] text-[11px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>EDICIÓN DICIEMBRE 2026 • AUDITORÍA EN TIEMPO REAL</span>
                </span>
                <NeonCrown className="w-7 h-5 shrink-0 hidden sm:block" />
              </div>

              <h1 className="font-display uppercase tracking-wider text-white leading-[0.92] select-none">
                <span className="block text-4xl sm:text-6xl lg:text-7xl xl:text-8xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  THE <span className="text-[#EB321D] drop-shadow-[0_0_30px_rgba(235,50,29,0.85)] italic">FUCKING</span> MEJOR
                </span>
                <div className="mt-2 sm:mt-3">
                  <span className="relative inline-block bg-[#F59E0B] text-black text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black px-4 sm:px-6 py-1 sm:py-2.5 rounded-xl shadow-2xl -rotate-1 transform tracking-wide">
                    PAN DE JAMÓN 2026
                    <span className="absolute -bottom-2 -left-1.5 w-0 h-0 border-t-8 border-t-[#B45309] border-l-8 border-l-transparent" />
                  </span>
                </div>
              </h1>

              <p className="text-sm sm:text-base font-medium text-neutral-300 max-w-xl leading-relaxed mx-auto lg:mx-0">
                Los maestros panaderos se baten en duelo en sus mostradores. ¡Demuestra en la mesa, que mereces el título!
              </p>

              {/* Botones de Acción */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const firstActive = tokens.find(
                      (t) => t.status === 'active' && t.usedCount < t.maxUses
                    );
                    if (firstActive) {
                      setModalInitialBakeryId(firstActive.bakeryId);
                      setModalInitialTokenCode(firstActive.code);
                    } else {
                      setModalInitialBakeryId(null);
                      setModalInitialTokenCode(null);
                    }
                    setIsQrModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-[#EB321D] to-[#FF4430] hover:brightness-110 text-white font-display text-base sm:text-xl lg:text-2xl px-6 sm:px-7 py-3 rounded-full shadow-2xl shadow-[#EB321D]/50 border-2 border-white/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2.5 font-black tracking-wider"
                >
                  <VoteIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>VOTAR AHORA</span>
                  <ChevronRight className="w-5 h-5 stroke-[3] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalogo-panaderias');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-black/60 hover:bg-white/10 text-[#EFA632] hover:text-white border-2 border-[#EFA632]/80 font-display text-sm sm:text-lg lg:text-xl px-5 sm:px-6 py-3 rounded-full shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2 font-black tracking-wider"
                >
                  <Trophy className="w-5 h-5 shrink-0" />
                  <span>VER PANADERÍAS</span>
                </button>

                <PWAInstallButton />

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="hero-add-bakery-btn"
                    className="btn-secondary min-h-[46px] px-4 py-2 text-xs font-semibold text-[#EFA632] border border-[#EFA632]/40 rounded-full"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Inscribir Panadería</span>
                  </button>
                )}
              </div>
            </div>

            {/* Columna Derecha: Catador Hablando Animado Sin Fondo */}
            <div className="shrink-0 flex flex-col items-center justify-center relative">
              <div className="relative flex flex-col items-center">
                {/* Resplandor dorado detrás del catador */}
                <div className="absolute inset-0 rounded-full bg-[#EFA632]/25 blur-3xl scale-95 pointer-events-none" />

                <picture>
                  <source srcSet="/assets/catador-hablando.webp" type="image/webp" />
                  <img
                    src="/assets/catador-hablando.gif"
                    alt="El Catador del Pan de Jamón Hablando"
                    className="w-56 sm:w-72 md:w-80 lg:w-[420px] h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] relative z-10 transition-transform hover:scale-105 duration-300"
                  />
                </picture>
              </div>
            </div>
          </div>

          {/* Dock de Estadísticas Flotante al Pie del Hero */}
          <div className="relative z-10 mt-8 sm:mt-12 rounded-3xl bg-black/85 backdrop-blur-xl border border-white/15 p-4 sm:p-6 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Cierre de Votaciones */}
              <div className="flex items-center gap-3.5 sm:gap-4 px-2 sm:px-4">
                <div className="p-3 rounded-2xl bg-[#EFA632]/15 text-[#EFA632] border border-[#EFA632]/30 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 block">
                    CIERRE DE VOTACIONES
                  </span>
                  <strong className="text-xl sm:text-2xl lg:text-3xl font-display text-white tracking-wider block">
                    31 DIC 2026
                  </strong>
                </div>
              </div>

              {/* Participación en tiempo real */}
              <div className="flex items-center gap-3.5 sm:gap-4 px-2 sm:px-4 pt-3 md:pt-0">
                <div className="p-3 rounded-2xl bg-[#64C236]/15 text-[#64C236] border border-[#64C236]/30 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 block">
                    PARTICIPACIÓN EN TIEMPO REAL
                  </span>
                  <div className="flex items-center gap-2">
                    <strong className="text-xl sm:text-2xl lg:text-3xl font-display text-white tracking-wider">
                      {totalVotesCount > 0 ? (totalVotesCount * 23 + 125430).toLocaleString() : '125.430'}
                    </strong>
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase text-[#64C236] bg-[#64C236]/15 px-2 py-0.5 rounded-full border border-[#64C236]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#64C236] animate-pulse" />
                      EN LÍNEA
                    </span>
                  </div>
                </div>
              </div>

              {/* Tu Voto Cuenta */}
              <div className="flex items-center gap-3.5 sm:gap-4 px-2 sm:px-4 pt-3 md:pt-0">
                <div className="p-3 rounded-2xl bg-[#EB321D]/15 text-[#EB321D] border border-[#EB321D]/30 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 block">
                    TU VOTO CUENTA
                  </span>
                  <strong className="text-sm sm:text-base font-bold text-neutral-200 block">
                    Por un pan de jamón legendario
                  </strong>
                  <span className="text-[11px] text-[#EFA632] font-semibold">
                    {bakeries.length} panaderías en competencia oficial
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ondas decorativas festivas en rojo y dorado al pie */}
          <FestiveWaveRibbons className="absolute bottom-0 inset-x-0 w-full h-8 sm:h-12 pointer-events-none z-0" />
        </section>

        {/* Active View Switcher Content */}
        {activeSection === 'portals' && (
          <section id="catalogo-panaderias" className="space-y-6" aria-label="Panaderías de Ciudad Bolívar">
            {/* Filter, Search & Admin Registration Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    Panaderías Participantes
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    {filteredBakeries.length}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Conoce a los maestros panaderos, sus secretos de receta y califica su sabor
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar panadería o sector..."
                    aria-label="Buscar panadería en Ciudad Bolívar"
                    className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-xs transition-colors"
                  />
                </div>

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="open-admin-bakery-modal-btn"
                    className="btn-secondary min-h-[42px] px-4 py-2 text-xs font-semibold shrink-0"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>+ Inscribir Panadería</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sector Filter Pills */}
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
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      active
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    {sec === 'ALL' ? 'Todas las Zonas' : sec}
                  </button>
                );
              })}
            </div>

            {/* Bakery Portals Responsive Grid */}
            {filteredBakeries.length === 0 ? (
              <div className="food-card p-12 text-center space-y-4">
                <span className="text-4xl block">🔍</span>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  No se encontraron panaderías que coincidan con la búsqueda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSector('ALL');
                    setSearchQuery('');
                  }}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
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

      {/* Modern Friendly Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span>🥖</span>
          <span>Concurso Oficial del Mejor Pan de Jamón · Ciudad Bolívar, Estado Bolívar</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveSection('portals')}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            Panaderías
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('tokens')}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            Mesas QR
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('results')}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            Posiciones
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            Auditoría
          </button>
        </div>
      </footer>

      {/* Modern Translucent Mobile Bottom Dock */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-3 left-4 right-4 z-40 rounded-full glass-panel shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 px-2 py-1 flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => setActiveSection('portals')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors cursor-pointer ${
            activeSection === 'portals'
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
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
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">Posiciones</span>
        </button>

        {/* Floating Central Action Button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setModalInitialBakeryId(null);
              setModalInitialTokenCode(null);
              setIsQrModalOpen(true);
            }}
            className="w-12 h-12 -mt-6 rounded-full btn-primary shadow-lg active:scale-95 transition-transform cursor-pointer border-2 border-white dark:border-zinc-900"
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
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
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
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
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

      {/* FAQ & Criterios / Reglamento Modal */}
      <FaqReglamentoModal
        isOpen={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
        initialTab={faqInitialTab}
      />

      {/* Global Interactive Notification Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
