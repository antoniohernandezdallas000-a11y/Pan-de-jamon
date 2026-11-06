export type UserRole = 'voter' | 'judge' | 'bakery_manager' | 'admin';

export type QrTokenStatus = 'active' | 'paused' | 'consumed' | 'revoked';

export type AuditActionType =
  | 'VOTE_CAST_ATOMIC'
  | 'TOKEN_CREATED'
  | 'TOKEN_STATUS_UPDATED'
  | 'ROLE_CHANGED'
  | 'STORAGE_EVIDENCE_VALIDATED'
  | 'BAKERY_SEEDED';

export interface Bakery {
  id: string;
  name: string;
  sector: string;
  address: string;
  masterBaker: string;
  signatureRecipe: string;
  crustStyle: string;
  portalCode: string;
  accentHex: string;
  photoUrl: string;
  totalVotes: number;
  sumDoughScore: number;
  sumFillingScore: number;
  sumOverallScore: number;
  updatedAt: string;
}

export interface QrToken {
  id: string;
  code: string;
  bakeryId: string;
  bakeryName: string;
  batchLabel: string;
  status: QrTokenStatus;
  maxUses: number;
  usedCount: number;
  createdByUid: string;
  consumedByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  tokenId: string;
  tokenCode: string;
  bakeryId: string;
  bakeryName: string;
  voterUid: string;
  voterAlias: string;
  q1DoughScore: number;
  q2FillingScore: number;
  q3OverallScore: number;
  comment: string;
  evidenceStoragePath?: string;
  txHash: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditActionType;
  actorUid: string;
  actorRole: UserRole;
  targetId: string;
  summary: string;
  integrityHash: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedBakeryId?: string;
  votesCastCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BakeryComputedMetrics {
  bakeryId: string;
  totalVotes: number;
  avgDough: number;
  avgFilling: number;
  avgOverall: number;
  compositeAverage: number;
  weightedScore: number;
}

export interface StorageValidationResult {
  valid: boolean;
  storagePath: string;
  reason: string;
  ruleMatched: string;
}

// Validation constants synced verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_CONSTRAINTS = {
  ID_MAX_LENGTH: 128,
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  TOKEN_CODE_MIN: 6,
  TOKEN_CODE_MAX: 64,
  TOKEN_CODE_REGEX: /^[A-Z0-9\-]+$/,
  COMMENT_MIN: 3,
  COMMENT_MAX: 500,
  BATCH_LABEL_MIN: 2,
  BATCH_LABEL_MAX: 80,
  STAR_MIN: 1,
  STAR_MAX: 5,
  STORAGE_MAX_BYTES: 5 * 1024 * 1024,
  STORAGE_ALLOWED_MIMES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const COMPETITION_LOGO_PATH = '/assets/aistudio/photo_2025-11-05_15-29-37_5d211805.jpg';

export const SURVEY_QUESTIONS = [
  {
    key: 'q1DoughScore' as const,
    number: '01',
    title: 'Equilibrio de Masa y Dorado',
    subtitle: 'Suavidad de la miga, punto de mantequilla, horneado uniforme y brillo del melado.',
  },
  {
    key: 'q2FillingScore' as const,
    number: '02',
    title: 'Proporción y Calidad del Relleno',
    subtitle: 'Generosidad del jamón ahumado, tocineta crujiente, aceitunas y dulzor de las pasas.',
  },
  {
    key: 'q3OverallScore' as const,
    number: '03',
    title: 'Experiencia Global y Tradición Guayanesa',
    subtitle: 'Armonía de sabores en boca, aroma recién horneado e identidad de Ciudad Bolívar.',
  },
] as const;
