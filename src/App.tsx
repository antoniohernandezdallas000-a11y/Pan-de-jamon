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
import { PanIcon } from './components/BreadRating';
import { FestiveAtmosphere, CardChristmasLightsGarland } from './components/FestiveAtmosphere';

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
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#121110] text-[#1E293B] dark:text-[#F1F5F9] pb-28 md:pb-16 transition-colors overflow-x-hidden">
      <FestiveAtmosphere isDark={isDark} />
      <OfflineIndicator />

      {/* Navigation Bar Oficial The Fucking Mejor Pan de Jamón */}
      <header className="sticky top-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top))] bg-[#0C0B0A]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Fila Superior: Marca + Botón QR */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full md:w-auto">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('portals');
              }}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-95 transition-transform active:scale-95"
            >
              <img
                src="/assets/logo-04-hd.png"
                alt="Logo The Fucking Mejor Pan de Jamón"
                className="h-10 sm:h-14 md:h-16 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <span className="font-display text-xl sm:text-2xl md:text-3xl text-white tracking-wider leading-none block truncate">
                  THE <span className="text-[#EB321D]">FUCKING</span> MEJOR
                </span>
                <span className="text-[9px] sm:text-xs text-[#EFA632] font-black uppercase tracking-[0.16em] block mt-0.5 truncate">
                  PAN DE JAMÓN • 2026
                </span>
              </div>
            </a>

            {/* Botón QR en Header para Móvil y Desktop */}
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
              className="bg-[#64C236] hover:bg-[#53ab2b] text-black font-display text-xs sm:text-base md:text-lg py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl shadow-md transition-all active:scale-90 flex items-center gap-1.5 cursor-pointer font-black shrink-0 min-h-[40px] sm:min-h-[44px]"
              title="Simular escaneo de QR"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="whitespace-nowrap">QR ESCANEADO</span>
            </button>
          </div>

          {/* Fila Inferior en Móvil / Derecha en Desktop: Tabs de Navegación */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveSection('portals')}
              className={`flex-1 md:flex-initial min-h-[42px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-display text-sm sm:text-base tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                activeSection === 'portals'
                  ? 'bg-[#EB321D] text-white shadow-md shadow-[#EB321D]/30'
                  : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <PanIcon active={activeSection === 'portals'} size={18} />
              <span>PANADERÍAS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('results')}
              className={`flex-1 md:flex-initial min-h-[42px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-display text-sm sm:text-base tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                activeSection === 'results'
                  ? 'bg-[#EFA632] text-black font-black shadow-md shadow-[#EFA632]/30'
                  : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>EL PODIO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('tokens')}
              className={`hidden sm:flex min-h-[42px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-display text-sm sm:text-base tracking-wider transition-all items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                activeSection === 'tokens'
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>MESAS QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('audit')}
              className={`min-h-[42px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-display text-sm sm:text-base tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                activeSection === 'audit'
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Panel de Auditoría"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">AUDITORÍA</span>
            </button>

            {/* Perfil / Auth */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[42px] px-2.5 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Perfil de Usuario o Jurado"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#EFA632]" />
              <span className="hidden lg:inline capitalize">{currentUser?.displayName?.split(' ')[0] || userRole}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Hero Section The Fucking Mejor Pan de Jamón */}
        <section className="relative rounded-3xl bg-gradient-to-br from-[#EB321D]/10 via-[#EFA632]/15 to-amber-50/90 dark:from-[#EB321D]/20 dark:via-[#EFA632]/10 dark:to-[#141311] border border-amber-200/80 dark:border-white/10 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl transition-colors">

          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#EFA632]/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content Column */}
            <div className="flex-1 space-y-4 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EB321D]/15 dark:bg-[#EFA632]/20 text-[#EB321D] dark:text-[#EFA632] text-xs font-black uppercase tracking-widest shadow-xs">
                <span>🎄 EDICIÓN DICIEMBRE 2026 · AUDITORÍA EN TIEMPO REAL</span>
              </span>

              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl text-zinc-900 dark:text-white tracking-wide leading-[1.05]">
                THE <span className="text-[#EB321D]">FUCKING</span> MEJOR <br className="hidden sm:inline" />
                <span className="text-[#EFA632]">
                  PAN DE JAMÓN 2026
                </span>
              </h1>

              <p className="text-sm sm:text-base font-medium text-zinc-700 dark:text-neutral-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Los maestros panaderos se baten en duelo en sus mostradores. Degusta en tu mesa, escanea el código QR, evalúa con la escala de pancitos dorados y suelta tu veredicto sin filtro.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialBakeryId(null);
                    setModalInitialTokenCode(null);
                    setIsQrModalOpen(true);
                  }}
                  className="bg-[#EB321D] hover:bg-[#d62815] text-white font-display text-xl sm:text-2xl px-6 py-2.5 rounded-xl shadow-xl shadow-[#EB321D]/30 border-2 border-white/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <PanIcon active={true} size={24} />
                  <span>CATAR & VOTAR CON QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalogo-panaderias');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-zinc-900/10 hover:bg-zinc-900/15 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white font-display text-xl px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-white/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Store className="w-5 h-5 text-[#EFA632]" />
                  <span>VER PANADERÍAS</span>
                </button>

                <PWAInstallButton />

                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateBakeryModal}
                    data-testid="hero-add-bakery-btn"
                    className="btn-secondary min-h-[46px] px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
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
                      showToast(
                        next
                          ? '🌙 Noche Estrellada activada: ¡Luces Navideñas encendidas!'
                          : '☀️ Día Soleado activado: ¡Copos de Nieve cayendo!',
                        'info'
                      );
                      return next;
                    });
                  }}
                  className="btn-secondary min-h-[46px] min-w-[46px] px-3.5 py-2 text-xs font-semibold shadow-md hover:scale-105 active:scale-95 transition-all"
                  aria-label={isDark ? 'Cambiar a Día Soleado con Nieve' : 'Cambiar a Noche Estrellada con Luces'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  )}
                  <span className="hidden sm:inline font-bold">{isDark ? '☀️ Día y Nieve' : '🌙 Noche y Luces'}</span>
                </button>
              </div>
            </div>

            {/* Right Emblem - Floating Clean Logo with No Ugly Frame */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div className="w-44 sm:w-56 md:w-64 max-w-full flex items-center justify-center transition-transform hover:scale-105 duration-300">
                <img
                  src={COMPETITION_LOGO_PATH}
                  alt="Sello del Concurso The Fucking Mejor Pan de Jamón Ciudad Bolívar"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-52 sm:max-h-64 object-contain filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
                />
              </div>
              <span className="mt-2 text-xs font-bold uppercase tracking-widest text-[#EFA632]">
                ★ Edición Oficial 2026 ★
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-8 pt-6 border-t border-amber-200/60 dark:border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/80 dark:bg-[#141311] p-4 rounded-2xl border border-amber-200/60 dark:border-white/10 text-center shadow-xs">
              <span className="text-xs font-semibold text-zinc-500 dark:text-neutral-400 block">
                Panaderías
              </span>
              <strong className="text-2xl sm:text-3xl font-display text-zinc-900 dark:text-white tracking-wider" data-testid="kpi-total-bakeries">
                {bakeries.length}
              </strong>
            </div>

            <div className="bg-white/80 dark:bg-[#141311] p-4 rounded-2xl border border-amber-200/60 dark:border-white/10 text-center shadow-xs">
              <span className="text-xs font-semibold text-zinc-500 dark:text-neutral-400 block">
                Votos Totales Auditados
              </span>
              <strong className="text-2xl sm:text-3xl font-display text-zinc-900 dark:text-white tracking-wider" data-testid="kpi-total-votes">
                {totalVotesCount}
              </strong>
            </div>

            <div className="bg-white/80 dark:bg-[#141311] p-4 rounded-2xl border border-amber-200/60 dark:border-white/10 text-center shadow-xs">
              <span className="text-xs font-semibold text-zinc-500 dark:text-neutral-400 block">
                Nota Promedio de Ciudad
              </span>
              <div className="text-2xl sm:text-3xl font-display text-[#EFA632] flex items-center justify-center gap-1.5 tracking-wider">
                <PanIcon active={true} size={22} />
                <span>{overallCompetitionAverage}</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-[#141311] p-4 rounded-2xl border border-amber-200/60 dark:border-white/10 text-center shadow-xs">
              <span className="text-xs font-semibold text-zinc-500 dark:text-neutral-400 block">
                Mesas QR Activas
              </span>
              <strong className="text-2xl sm:text-3xl font-display text-[#64C236] tracking-wider" data-testid="kpi-active-tokens">
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

      {/* Global Interactive Notification Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
