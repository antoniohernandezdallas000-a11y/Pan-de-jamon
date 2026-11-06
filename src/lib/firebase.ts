import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuditLog, Bakery, QrToken, QrTokenStatus, UserRole, Vote } from '../types/competition';
import { AtomicVoteInput, generateDeterministicHash } from '../utils/competitionLogic';

// Initialize Firebase SDK from firebase-applet-config.json
const app = initializeApp(firebaseConfig);
export const db = getFirestoreInstance();
export const auth = getAuth(app);
export const storage = getStorage(app);

import { getFirestore } from 'firebase/firestore';
function getFirestoreInstance() {
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

// Mandatory Firestore Error Handler per firebase-integration-rpc/SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'bakeries', 'connection_probe'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Permission error or non-existent doc means the server responded and is online
    return true;
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };

/**
 * Executes an atomic Firestore transaction (runTransaction) that:
 * 1. Reads the QR Token document and verifies it is 'active' and has remaining uses.
 * 2. Reads the target Bakery document.
 * 3. Updates the QR Token's usedCount (+1) and sets status to 'consumed' if maxUses reached.
 * 4. Updates the Bakery's totalVotes (+1) and cumulative 3-question star sums.
 * 5. Creates the immutable Vote document in /votes/{voteId}.
 * 6. Creates the immutable AuditLog document in /auditLogs/{logId}.
 */
export async function commitAtomicVoteToFirestore(
  input: AtomicVoteInput,
  tokenDocId: string,
  bakeryDocId: string
): Promise<{ voteId: string; txHash: string }> {
  const tokenRef = doc(db, 'qrTokens', tokenDocId);
  const bakeryRef = doc(db, 'bakeries', bakeryDocId);

  const nowIso = new Date().toISOString();
  const txSignatureInput = `${tokenDocId}:${bakeryDocId}:${input.voterUid}:${input.q1DoughScore}:${input.q2FillingScore}:${input.q3OverallScore}:${nowIso}`;
  const txHash = generateDeterministicHash(txSignatureInput);
  const cleanCode = input.tokenCode.replace(/[^A-Z0-9]/g, '');
  const voteId = `vote_${cleanCode}_${txHash.slice(-8)}`;
  const logId = `log_${txHash.slice(3)}`;

  const voteRef = doc(db, 'votes', voteId);
  const logRef = doc(db, 'auditLogs', logId);

  try {
    await runTransaction(db, async (transaction) => {
      const tokenSnap = await transaction.get(tokenRef);
      if (!tokenSnap.exists()) {
        throw new Error(`El token QR (${input.tokenCode}) no existe en Firestore.`);
      }
      const tokenData = tokenSnap.data() as QrToken;
      if (tokenData.status !== 'active' || tokenData.usedCount >= tokenData.maxUses) {
        throw new Error(`El token QR (${input.tokenCode}) no está activo o agotó sus usos.`);
      }

      const bakerySnap = await transaction.get(bakeryRef);
      if (!bakerySnap.exists()) {
        throw new Error(`La panadería (${bakeryDocId}) no existe en Firestore.`);
      }
      const bakeryData = bakerySnap.data() as Bakery;

      const nextUsedCount = tokenData.usedCount + 1;
      const nextStatus: QrTokenStatus = nextUsedCount >= tokenData.maxUses ? 'consumed' : 'active';

      transaction.update(tokenRef, {
        usedCount: nextUsedCount,
        status: nextStatus,
        consumedByUid: input.voterUid,
        updatedAt: serverTimestamp(),
      });

      transaction.update(bakeryRef, {
        totalVotes: bakeryData.totalVotes + 1,
        sumDoughScore: bakeryData.sumDoughScore + input.q1DoughScore,
        sumFillingScore: bakeryData.sumFillingScore + input.q2FillingScore,
        sumOverallScore: bakeryData.sumOverallScore + input.q3OverallScore,
        updatedAt: serverTimestamp(),
      });

      transaction.set(voteRef, {
        id: voteId,
        tokenId: tokenDocId,
        tokenCode: input.tokenCode,
        bakeryId: bakeryDocId,
        bakeryName: bakeryData.name,
        voterUid: input.voterUid,
        voterAlias: input.voterAlias.trim().slice(0, 80),
        q1DoughScore: input.q1DoughScore,
        q2FillingScore: input.q2FillingScore,
        q3OverallScore: input.q3OverallScore,
        comment: input.comment.trim().slice(0, 500),
        ...(input.evidenceStoragePath ? { evidenceStoragePath: input.evidenceStoragePath } : {}),
        txHash,
        createdAt: serverTimestamp(),
      });

      const avgStars = (
        (input.q1DoughScore + input.q2FillingScore + input.q3OverallScore) /
        3
      ).toFixed(1);
      transaction.set(logRef, {
        id: logId,
        action: 'VOTE_CAST_ATOMIC',
        actorUid: input.voterUid,
        actorRole: input.voterRole,
        targetId: voteId,
        summary: `Voto atómico en ${bakeryData.name} con token ${input.tokenCode} (${avgStars}★).`.slice(
          0,
          300
        ),
        integrityHash: generateDeterministicHash(`AUDIT:${txHash}`),
        createdAt: serverTimestamp(),
      });
    });

    return { voteId, txHash };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `votes/${voteId}`);
  }
}

/**
 * Syncs a new manipulable QR Token to Firestore if authenticated with appropriate permissions.
 */
export async function createQrTokenInFirestore(token: QrToken): Promise<void> {
  const path = `qrTokens/${token.id}`;
  try {
    await setDoc(doc(db, 'qrTokens', token.id), {
      id: token.id,
      code: token.code,
      bakeryId: token.bakeryId,
      bakeryName: token.bakeryName,
      batchLabel: token.batchLabel,
      status: token.status,
      maxUses: token.maxUses,
      usedCount: 0,
      createdByUid: token.createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Updates a QR Token status/parameters in Firestore.
 */
export async function updateQrTokenInFirestore(
  tokenId: string,
  updates: { status: QrTokenStatus; batchLabel: string; maxUses: number }
): Promise<void> {
  const path = `qrTokens/${tokenId}`;
  try {
    await updateDoc(doc(db, 'qrTokens', tokenId), {
      status: updates.status,
      batchLabel: updates.batchLabel,
      maxUses: updates.maxUses,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Uploads verified photo evidence to Firebase Storage under /votes/{bakeryId}/{voterUid}/{fileName}.
 */
export async function uploadVoteEvidenceToStorage(
  file: File,
  bakeryId: string,
  voterUid: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const storagePath = `votes/${bakeryId}/${voterUid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Subscribes to live Firestore collections when the user is signed in.
 */
export function subscribeToLiveCompetition(callbacks: {
  onBakeries: (bakeries: Bakery[]) => void;
  onTokens: (tokens: QrToken[]) => void;
  onVotes: (votes: Vote[]) => void;
  onAuditLogs: (logs: AuditLog[]) => void;
  onEmptyBakeries?: () => void;
}): () => void {
  if (!auth.currentUser) {
    return () => {};
  }

  const unsubBakeries = onSnapshot(
    query(collection(db, 'bakeries'), where('totalVotes', '>=', 0)),
    (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            updatedAt:
              data.updatedAt?.toDate?.()?.toISOString?.() ||
              (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
          } as Bakery;
        });
        callbacks.onBakeries(items);
      } else {
        callbacks.onEmptyBakeries?.();
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'bakeries');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  const unsubTokens = onSnapshot(
    query(collection(db, 'qrTokens'), where('maxUses', '>=', 1)),
    (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString?.() ||
              (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt:
              data.updatedAt?.toDate?.()?.toISOString?.() ||
              (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
          } as QrToken;
        });
        callbacks.onTokens(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'qrTokens');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  const unsubVotes = onSnapshot(
    query(collection(db, 'votes'), where('q1DoughScore', '>=', 1)),
    (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString?.() ||
              (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          } as Vote;
        });
        callbacks.onVotes(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'votes');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  const unsubLogs = onSnapshot(
    query(collection(db, 'auditLogs'), where('actorUid', '==', auth.currentUser.uid)),
    (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString?.() ||
              (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          } as AuditLog;
        });
        callbacks.onAuditLogs(items);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );

  return () => {
    unsubBakeries();
    unsubTokens();
    unsubVotes();
    unsubLogs();
  };
}

/**
 * Seeds initial Ciudad Bolívar bakeries and QR tokens to Firestore if the user is an authenticated admin.
 */
export async function seedInitialDataToFirestore(
  bakeries: Bakery[],
  tokens: QrToken[],
  adminUid: string,
  role: UserRole
): Promise<void> {
  for (const b of bakeries) {
    try {
      await setDoc(doc(db, 'bakeries', b.id), {
        ...b,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bakeries/${b.id}`);
    }
  }
  for (const t of tokens) {
    if (t.status === 'active') {
      try {
        await setDoc(doc(db, 'qrTokens', t.id), {
          ...t,
          createdByUid: adminUid,
          usedCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `qrTokens/${t.id}`);
      }
    }
  }

  const logId = `log_seed_${Date.now()}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      action: 'BAKERY_SEEDED',
      actorUid: adminUid,
      actorRole: role,
      targetId: bakeries[0]?.id || 'ciudad-bolivar',
      summary: 'Padrón de panaderías y tokens QR sincronizados en Firestore.',
      integrityHash: generateDeterministicHash(`SEED:${adminUid}:${Date.now()}`),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }
}

/**
 * Uploads a bakery logo or facade image to Firebase Storage under /bakeries/{bakeryId}/portal/{fileName}.
 */
export async function uploadBakeryPortalImageToStorage(
  file: File,
  bakeryId: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const storagePath = `bakeries/${bakeryId}/portal/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Persists a new or updated Bakery document (and optional initial QR token + audit log) in Firestore (Admin only).
 */
export async function saveBakeryToFirestore(
  bakery: Bakery,
  initialToken: QrToken | null,
  auditLog: AuditLog
): Promise<void> {
  const bakeryPath = `bakeries/${bakery.id}`;
  try {
    await setDoc(doc(db, 'bakeries', bakery.id), {
      ...bakery,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, bakeryPath);
  }

  if (initialToken) {
    try {
      await setDoc(doc(db, 'qrTokens', initialToken.id), {
        ...initialToken,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `qrTokens/${initialToken.id}`);
    }
  }

  try {
    await setDoc(doc(db, 'auditLogs', auditLog.id), {
      ...auditLog,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${auditLog.id}`);
  }
}

