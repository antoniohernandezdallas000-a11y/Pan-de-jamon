import {
  AuditLog,
  Bakery,
  BakeryComputedMetrics,
  BLUEPRINT_CONSTRAINTS,
  QrToken,
  QrTokenStatus,
  StorageValidationResult,
  UserRole,
  Vote,
} from '../types/competition';

/**
 * Generates a deterministic hexadecimal integrity hash (FNV-1a 64-bit style)
 * for atomic transactions and immutable audit log entries.
 */
export function generateDeterministicHash(payload: string): string {
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `tx_${hex1}${hex2}`;
}

/**
 * Calculates per-question and composite star ratings for a bakery.
 */
export function calculateBakeryMetrics(bakery: Bakery): BakeryComputedMetrics {
  const votes = Math.max(0, bakery.totalVotes);
  if (votes === 0) {
    return {
      bakeryId: bakery.id,
      totalVotes: 0,
      avgDough: 0,
      avgFilling: 0,
      avgOverall: 0,
      compositeAverage: 0,
      weightedScore: 0,
    };
  }

  const avgDough = Number((bakery.sumDoughScore / votes).toFixed(2));
  const avgFilling = Number((bakery.sumFillingScore / votes).toFixed(2));
  const avgOverall = Number((bakery.sumOverallScore / votes).toFixed(2));
  const compositeAverage = Number(
    ((bakery.sumDoughScore + bakery.sumFillingScore + bakery.sumOverallScore) / (votes * 3)).toFixed(2)
  );

  // Confidence-adjusted score that rewards both high average stars and verified vote volume
  const priorWeight = 3;
  const priorMean = 4.2;
  const weightedScore = Number(
    (((votes * compositeAverage + priorWeight * priorMean) / (votes + priorWeight))).toFixed(3)
  );

  return {
    bakeryId: bakery.id,
    totalVotes: votes,
    avgDough,
    avgFilling,
    avgOverall,
    compositeAverage,
    weightedScore,
  };
}

/**
 * Ranks bakeries deterministically by composite average and total verified votes.
 */
export function rankBakeries(bakeries: Bakery[]): Array<Bakery & { metrics: BakeryComputedMetrics; rank: number }> {
  const enriched = bakeries.map((b) => ({
    ...b,
    metrics: calculateBakeryMetrics(b),
    rank: 0,
  }));

  enriched.sort((a, b) => {
    if (b.metrics.compositeAverage !== a.metrics.compositeAverage) {
      return b.metrics.compositeAverage - a.metrics.compositeAverage;
    }
    if (b.totalVotes !== a.totalVotes) {
      return b.totalVotes - a.totalVotes;
    }
    return a.name.localeCompare(b.name, 'es');
  });

  return enriched.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Encodes a QR token into a structured JSON payload for QR generation.
 */
export function encodeQrTokenPayload(token: Pick<QrToken, 'code' | 'bakeryId' | 'batchLabel'>): string {
  return JSON.stringify({
    protocol: 'EFMPJ_CB_2026',
    code: token.code,
    bakeryId: token.bakeryId,
    batch: token.batchLabel,
  });
}

export interface QrValidationOutcome {
  ok: boolean;
  extractedCode: string;
  token?: QrToken;
  error?: string;
}

/**
 * Parses a raw scanned string (JSON QR payload, URL parameter, or plain token code)
 * and validates whether the matching QR token can be redeemed for an atomic vote.
 */
export function parseAndValidateQrPayload(rawInput: string, tokens: QrToken[]): QrValidationOutcome {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      extractedCode: '',
      error: 'El código QR está vacío. Escanea o selecciona un token válido.',
    };
  }

  let extractedCode = trimmed.toUpperCase();

  // Check if JSON payload from camera scan
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { code?: string; token?: string };
      if (typeof parsed.code === 'string' && parsed.code.trim()) {
        extractedCode = parsed.code.trim().toUpperCase();
      } else if (typeof parsed.token === 'string' && parsed.token.trim()) {
        extractedCode = parsed.token.trim().toUpperCase();
      }
    } catch {
      // Fallback to raw string
    }
  } else if (trimmed.includes('token=')) {
    try {
      const url = new URL(trimmed, 'https://pandejamon.ciudadbolivar.app');
      const param = url.searchParams.get('token');
      if (param) {
        extractedCode = param.trim().toUpperCase();
      }
    } catch {
      // Fallback to raw string
    }
  }

  const matched = tokens.find(
    (t) => t.code.toUpperCase() === extractedCode || t.id.toUpperCase() === extractedCode
  );

  if (!matched) {
    return {
      ok: false,
      extractedCode,
      error: `Token QR "${extractedCode}" no registrado en el padrón de Ciudad Bolívar.`,
    };
  }

  if (matched.status === 'paused') {
    return {
      ok: false,
      extractedCode: matched.code,
      token: matched,
      error: `El token ${matched.code} está temporalmente PAUSADO por control de mesa.`,
    };
  }

  if (matched.status === 'revoked') {
    return {
      ok: false,
      extractedCode: matched.code,
      token: matched,
      error: `El token ${matched.code} fue REVOCADO por auditoría y no admite votos.`,
    };
  }

  if (matched.status === 'consumed' || matched.usedCount >= matched.maxUses) {
    return {
      ok: false,
      extractedCode: matched.code,
      token: matched,
      error: `El token ${matched.code} ya alcanzó su límite de usos (${matched.usedCount}/${matched.maxUses}).`,
    };
  }

  return {
    ok: true,
    extractedCode: matched.code,
    token: matched,
  };
}

export interface AtomicVoteInput {
  tokenCode: string;
  voterUid: string;
  voterAlias: string;
  voterRole: UserRole;
  q1DoughScore: number;
  q2FillingScore: number;
  q3OverallScore: number;
  comment: string;
  evidenceStoragePath?: string;
  timestampIso?: string;
}

export interface CompetitionStateSnapshot {
  bakeries: Bakery[];
  tokens: QrToken[];
  votes: Vote[];
  auditLogs: AuditLog[];
}

/**
 * Pure atomic state transition function mirroring the Firestore runTransaction
 * invariants in firestore.rules. Used for deterministic unit tests and optimistic/local state sync.
 */
export function executeAtomicVoteStateTransition(
  state: CompetitionStateSnapshot,
  input: AtomicVoteInput
): {
  nextState: CompetitionStateSnapshot;
  createdVote: Vote;
  createdAuditLog: AuditLog;
  updatedBakery: Bakery;
  updatedToken: QrToken;
} {
  // 1. Validate QR Token
  const tokenCheck = parseAndValidateQrPayload(input.tokenCode, state.tokens);
  if (!tokenCheck.ok || !tokenCheck.token) {
    throw new Error(tokenCheck.error || 'Token QR inválido.');
  }
  const token = tokenCheck.token;

  // 2. Validate Star Scores (1..5 integer)
  const scores = [input.q1DoughScore, input.q2FillingScore, input.q3OverallScore];
  for (const s of scores) {
    if (!Number.isInteger(s) || s < BLUEPRINT_CONSTRAINTS.STAR_MIN || s > BLUEPRINT_CONSTRAINTS.STAR_MAX) {
      throw new Error('Las tres preguntas de la encuesta requieren una calificación entera entre 1 y 5 estrellas.');
    }
  }

  // 3. Validate Comment Length
  const cleanComment = input.comment.trim();
  if (
    cleanComment.length < BLUEPRINT_CONSTRAINTS.COMMENT_MIN ||
    cleanComment.length > BLUEPRINT_CONSTRAINTS.COMMENT_MAX
  ) {
    throw new Error(
      `El comentario debe tener entre ${BLUEPRINT_CONSTRAINTS.COMMENT_MIN} y ${BLUEPRINT_CONSTRAINTS.COMMENT_MAX} caracteres.`
    );
  }

  // 4. Find Target Bakery
  const bakery = state.bakeries.find((b) => b.id === token.bakeryId);
  if (!bakery) {
    throw new Error(`Panadería destino (${token.bakeryId}) no encontrada.`);
  }

  const nowIso = input.timestampIso || new Date().toISOString();
  const nextUsedCount = token.usedCount + 1;
  const nextTokenStatus: QrTokenStatus = nextUsedCount >= token.maxUses ? 'consumed' : 'active';

  const updatedToken: QrToken = {
    ...token,
    usedCount: nextUsedCount,
    status: nextTokenStatus,
    consumedByUid: input.voterUid,
    updatedAt: nowIso,
  };

  const updatedBakery: Bakery = {
    ...bakery,
    totalVotes: bakery.totalVotes + 1,
    sumDoughScore: bakery.sumDoughScore + input.q1DoughScore,
    sumFillingScore: bakery.sumFillingScore + input.q2FillingScore,
    sumOverallScore: bakery.sumOverallScore + input.q3OverallScore,
    updatedAt: nowIso,
  };

  const txSignatureInput = `${token.id}:${bakery.id}:${input.voterUid}:${input.q1DoughScore}:${input.q2FillingScore}:${input.q3OverallScore}:${nowIso}`;
  const txHash = generateDeterministicHash(txSignatureInput);
  const voteId = `vote_${token.code.replace(/[^A-Z0-9]/g, '')}_${ nextUsedCount }_${txHash.slice(-6)}`;

  const createdVote: Vote = {
    id: voteId,
    tokenId: token.id,
    tokenCode: token.code,
    bakeryId: bakery.id,
    bakeryName: bakery.name,
    voterUid: input.voterUid,
    voterAlias: input.voterAlias.trim() || 'Catador Verificado',
    q1DoughScore: input.q1DoughScore,
    q2FillingScore: input.q2FillingScore,
    q3OverallScore: input.q3OverallScore,
    comment: cleanComment,
    ...(input.evidenceStoragePath ? { evidenceStoragePath: input.evidenceStoragePath } : {}),
    txHash,
    createdAt: nowIso,
  };

  const avgVoteStars = ((input.q1DoughScore + input.q2FillingScore + input.q3OverallScore) / 3).toFixed(1);
  const auditSummary = `Voto atómico registrado en ${bakery.name} con token ${token.code} (${avgVoteStars}★ promedio).`;
  const createdAuditLog: AuditLog = {
    id: `log_${txHash.slice(3)}`,
    action: 'VOTE_CAST_ATOMIC',
    actorUid: input.voterUid,
    actorRole: input.voterRole,
    targetId: createdVote.id,
    summary: auditSummary.slice(0, 300),
    integrityHash: generateDeterministicHash(`AUDIT:${txHash}`),
    createdAt: nowIso,
  };

  return {
    nextState: {
      bakeries: state.bakeries.map((b) => (b.id === updatedBakery.id ? updatedBakery : b)),
      tokens: state.tokens.map((t) => (t.id === updatedToken.id ? updatedToken : t)),
      votes: [createdVote, ...state.votes],
      auditLogs: [createdAuditLog, ...state.auditLogs],
    },
    createdVote,
    createdAuditLog,
    updatedBakery,
    updatedToken,
  };
}

/**
 * Validates a file upload against the Firebase Storage rules defined in storage.rules.
 */
export function validateStorageUpload(
  fileMeta: { name: string; sizeBytes: number; mimeType: string },
  voterUid: string,
  bakeryId: string,
  targetScope: 'vote_evidence' | 'bakery_portal' = 'vote_evidence'
): StorageValidationResult {
  const sanitizedFile = fileMeta.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'evidencia.jpg';
  const storagePath =
    targetScope === 'vote_evidence'
      ? `votes/${bakeryId}/${voterUid}/${Date.now()}_${sanitizedFile}`
      : `bakeries/${bakeryId}/portal/${Date.now()}_${sanitizedFile}`;

  if (!voterUid || voterUid.trim().length === 0) {
    return {
      valid: false,
      storagePath,
      reason: 'Rechazado por storage.rules: Usuario no autenticado (request.auth == null).',
      ruleMatched: 'match /votes/{bakeryId}/{voterUid}/{fileName}',
    };
  }

  if (
    !BLUEPRINT_CONSTRAINTS.STORAGE_ALLOWED_MIMES.includes(
      fileMeta.mimeType as (typeof BLUEPRINT_CONSTRAINTS.STORAGE_ALLOWED_MIMES)[number]
    )
  ) {
    return {
      valid: false,
      storagePath,
      reason: `Rechazado por storage.rules: Tipo MIME "${fileMeta.mimeType}" no permitido. Solo image/jpeg, image/png o image/webp.`,
      ruleMatched: 'isValidImageUpload() -> contentType.matches("image/(jpeg|png|webp)")',
    };
  }

  if (fileMeta.sizeBytes <= 0 || fileMeta.sizeBytes > BLUEPRINT_CONSTRAINTS.STORAGE_MAX_BYTES) {
    const sizeMb = (fileMeta.sizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      storagePath,
      reason: `Rechazado por storage.rules: Tamaño (${sizeMb} MB) excede el límite máximo de 5.00 MB.`,
      ruleMatched: 'isValidImageUpload() -> request.resource.size <= 5 * 1024 * 1024',
    };
  }

  return {
    valid: true,
    storagePath,
    reason: 'Cumple todas las invariantes de seguridad de Firebase Storage (MIME, < 5MB, UID path isolation).',
    ruleMatched:
      targetScope === 'vote_evidence'
        ? 'allow create: request.auth.uid == voterUid && isValidImageUpload()'
        : 'allow write: isSignedIn() && isValidImageUpload()',
  };
}

export interface AdminBakeryInput {
  existingBakeryId?: string;
  name: string;
  sector: string;
  address: string;
  masterBaker: string;
  signatureRecipe: string;
  crustStyle: string;
  portalCode?: string;
  accentHex: string;
  photoUrl: string;
  actorUid: string;
  actorRole: UserRole;
  timestampIso?: string;
}

/**
 * Pure function that enforces Admin-only RBAC permission and schema invariants
 * when creating a new bakery or updating an existing bakery's information/logo/facade.
 */
export function createOrUpdateBakeryByAdmin(
  existingBakeries: Bakery[],
  input: AdminBakeryInput
): {
  bakery: Bakery;
  initialToken: QrToken | null;
  auditLog: AuditLog;
  isNew: boolean;
} {
  if (input.actorRole !== 'admin') {
    throw new Error(
      'Acceso denegado (RBAC): Solo el rol Administrador (admin) puede registrar o editar panaderías.'
    );
  }

  const name = input.name.trim();
  const sector = input.sector.trim();
  const address = input.address.trim();
  const masterBaker = input.masterBaker.trim();
  const signatureRecipe = input.signatureRecipe.trim();
  const crustStyle = input.crustStyle.trim();
  const photoUrl = input.photoUrl.trim();

  if (name.length < 2 || name.length > 120) {
    throw new Error('El nombre de la panadería debe tener entre 2 y 120 caracteres.');
  }
  if (sector.length < 2 || sector.length > 80) {
    throw new Error('El sector de Ciudad Bolívar debe tener entre 2 y 80 caracteres.');
  }
  if (address.length < 4 || address.length > 200) {
    throw new Error('La dirección del local debe tener entre 4 y 200 caracteres.');
  }
  if (masterBaker.length < 2 || masterBaker.length > 100) {
    throw new Error('El nombre del maestro panadero debe tener entre 2 y 100 caracteres.');
  }
  if (signatureRecipe.length < 5 || signatureRecipe.length > 280) {
    throw new Error('La descripción de la receta debe tener entre 5 y 280 caracteres.');
  }
  if (crustStyle.length < 2 || crustStyle.length > 80) {
    throw new Error('El estilo de masa/corteza debe tener entre 2 y 80 caracteres.');
  }
  if (photoUrl.length < 1 || photoUrl.length > 150000) {
    throw new Error('La imagen de logo o fachada del local es obligatoria y debe ser <= 150 KB.');
  }

  const nowIso = input.timestampIso || new Date().toISOString();
  const existing = input.existingBakeryId
    ? existingBakeries.find((b) => b.id === input.existingBakeryId)
    : undefined;

  if (existing) {
    const updatedBakery: Bakery = {
      ...existing,
      name,
      sector,
      address,
      masterBaker,
      signatureRecipe,
      crustStyle,
      accentHex: input.accentHex || existing.accentHex,
      photoUrl,
      updatedAt: nowIso,
    };

    const txHash = generateDeterministicHash(`EDIT_BAKERY:${existing.id}:${nowIso}`);
    const auditLog: AuditLog = {
      id: `log_edit_${txHash.slice(3, 13)}`,
      action: 'BAKERY_SEEDED',
      actorUid: input.actorUid,
      actorRole: 'admin',
      targetId: existing.id,
      summary: `Panadería "${updatedBakery.name}" (${updatedBakery.sector}) actualizada por Admin con logo/fachada del local.`,
      integrityHash: txHash,
      createdAt: nowIso,
    };

    return {
      bakery: updatedBakery,
      initialToken: null,
      auditLog,
      isNew: false,
    };
  }

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  const bakeryId = `bakery-${slug || 'cb'}-${existingBakeries.length + 1}`;
  const cleanSectorCode = sector
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  const seqNum = String(existingBakeries.length + 1).padStart(2, '0');
  const portalCode =
    input.portalCode && /^[A-Z0-9\-]{3,32}$/.test(input.portalCode.trim().toUpperCase())
      ? input.portalCode.trim().toUpperCase()
      : `CB-${cleanSectorCode || 'LOCAL'}-${seqNum}`;

  const createdBakery: Bakery = {
    id: bakeryId,
    name,
    sector,
    address,
    masterBaker,
    signatureRecipe,
    crustStyle,
    portalCode,
    accentHex: input.accentHex || '#F52D18',
    photoUrl,
    totalVotes: 0,
    sumDoughScore: 0,
    sumFillingScore: 0,
    sumOverallScore: 0,
    updatedAt: nowIso,
  };

  const tokenCode = `${portalCode}-101`;
  const initialToken: QrToken = {
    id: `tok-${bakeryId}-101`,
    code: tokenCode,
    bakeryId: createdBakery.id,
    bakeryName: createdBakery.name,
    batchLabel: `Mesa Inaugural #01 · ${createdBakery.sector}`,
    status: 'active',
    maxUses: 5,
    usedCount: 0,
    createdByUid: input.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const txHash = generateDeterministicHash(`NEW_BAKERY:${createdBakery.id}:${nowIso}`);
  const auditLog: AuditLog = {
    id: `log_new_${txHash.slice(3, 13)}`,
    action: 'BAKERY_SEEDED',
    actorUid: input.actorUid,
    actorRole: 'admin',
    targetId: createdBakery.id,
    summary: `Nueva panadería "${createdBakery.name}" (${createdBakery.sector}) registrada por Admin con token QR inicial ${tokenCode}.`,
    integrityHash: txHash,
    createdAt: nowIso,
  };

  return {
    bakery: createdBakery,
    initialToken,
    auditLog,
    isNew: true,
  };
}

