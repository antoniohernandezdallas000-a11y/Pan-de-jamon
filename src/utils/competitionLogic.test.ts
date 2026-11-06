import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBakeryMetrics,
  createOrUpdateBakeryByAdmin,
  encodeQrTokenPayload,
  executeAtomicVoteStateTransition,
  generateDeterministicHash,
  parseAndValidateQrPayload,
  rankBakeries,
  validateStorageUpload,
} from './competitionLogic';
import { Bakery, QrToken } from '../types/competition';

const mockBakery: Bakery = {
  id: 'bakery-orinoco',
  name: 'Horno Artesanal Paseo Orinoco',
  sector: 'Paseo Orinoco',
  address: 'Av. Táchira con Paseo Orinoco, Ciudad Bolívar',
  masterBaker: 'Don Celestino Bolívar',
  signatureRecipe: 'Masa brioche de 24h con melado de papelón y jamón ahumado.',
  crustStyle: 'Brioche Dorado al Papelón',
  portalCode: 'CB-ORINOCO-01',
  accentHex: '#F52D18',
  photoUrl: '/assets/aistudio/photo_2025-11-05_15-29-37_5d211805.jpg',
  totalVotes: 10,
  sumDoughScore: 48,
  sumFillingScore: 49,
  sumOverallScore: 50,
  updatedAt: '2026-11-04T20:00:00.000Z',
};

const mockTokens: QrToken[] = [
  {
    id: 'tok-101',
    code: 'CB-ORINOCO-101',
    bakeryId: 'bakery-orinoco',
    bakeryName: 'Horno Artesanal Paseo Orinoco',
    batchLabel: 'Mesa 01 · Lote Nocturno',
    status: 'active',
    maxUses: 1,
    usedCount: 0,
    createdByUid: 'admin-1',
    createdAt: '2026-11-04T19:00:00.000Z',
    updatedAt: '2026-11-04T19:00:00.000Z',
  },
  {
    id: 'tok-102',
    code: 'CB-ORINOCO-102',
    bakeryId: 'bakery-orinoco',
    bakeryName: 'Horno Artesanal Paseo Orinoco',
    batchLabel: 'Mesa 02 · Lote Nocturno',
    status: 'paused',
    maxUses: 2,
    usedCount: 0,
    createdByUid: 'admin-1',
    createdAt: '2026-11-04T19:00:00.000Z',
    updatedAt: '2026-11-04T19:00:00.000Z',
  },
];

test('calculateBakeryMetrics computes accurate 3-question averages and composite score', () => {
  const metrics = calculateBakeryMetrics(mockBakery);
  assert.equal(metrics.totalVotes, 10);
  assert.equal(metrics.avgDough, 4.8);
  assert.equal(metrics.avgFilling, 4.9);
  assert.equal(metrics.avgOverall, 5.0);
  assert.equal(metrics.compositeAverage, 4.9);
});

test('parseAndValidateQrPayload supports raw codes and JSON camera payloads, and blocks paused tokens', () => {
  const jsonPayload = encodeQrTokenPayload(mockTokens[0]);
  const resValid = parseAndValidateQrPayload(jsonPayload, mockTokens);
  assert.equal(resValid.ok, true);
  assert.equal(resValid.extractedCode, 'CB-ORINOCO-101');

  const resPaused = parseAndValidateQrPayload('CB-ORINOCO-102', mockTokens);
  assert.equal(resPaused.ok, false);
  assert.match(resPaused.error || '', /PAUSADO/);
});

test('executeAtomicVoteStateTransition atomically updates bakery totals, consumes single-use QR token, and creates audit log', () => {
  const initialState = {
    bakeries: [mockBakery],
    tokens: mockTokens,
    votes: [],
    auditLogs: [],
  };

  const result = executeAtomicVoteStateTransition(initialState, {
    tokenCode: 'CB-ORINOCO-101',
    voterUid: 'voter-cb-01',
    voterAlias: 'Carlos Guayana',
    voterRole: 'voter',
    q1DoughScore: 5,
    q2FillingScore: 4,
    q3OverallScore: 5,
    comment: 'Excelente proporción de jamón ahumado y el toque de papelón en la corteza.',
    timestampIso: '2026-11-04T22:00:00.000Z',
  });

  assert.equal(result.updatedBakery.totalVotes, 11);
  assert.equal(result.updatedBakery.sumDoughScore, 53);
  assert.equal(result.updatedBakery.sumFillingScore, 53);
  assert.equal(result.updatedBakery.sumOverallScore, 55);
  assert.equal(result.updatedToken.usedCount, 1);
  assert.equal(result.updatedToken.status, 'consumed');
  assert.equal(result.nextState.votes.length, 1);
  assert.equal(result.nextState.auditLogs.length, 1);
  assert.equal(result.createdAuditLog.action, 'VOTE_CAST_ATOMIC');

  // Re-using the consumed token must throw an atomic rejection
  assert.throws(() => {
    executeAtomicVoteStateTransition(result.nextState, {
      tokenCode: 'CB-ORINOCO-101',
      voterUid: 'voter-cb-02',
      voterAlias: 'Maria Angostura',
      voterRole: 'voter',
      q1DoughScore: 5,
      q2FillingScore: 5,
      q3OverallScore: 5,
      comment: 'Intento de doble voto con el mismo QR.',
    });
  }, /límite de usos/);
});

test('rankBakeries orders bakeries by composite average and vote volume', () => {
  const secondBakery: Bakery = {
    ...mockBakery,
    id: 'bakery-redoma',
    name: 'Panadería La Redoma',
    totalVotes: 5,
    sumDoughScore: 25,
    sumFillingScore: 25,
    sumOverallScore: 25,
  };
  const ranked = rankBakeries([mockBakery, secondBakery]);
  assert.equal(ranked[0].id, 'bakery-redoma');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].id, 'bakery-orinoco');
  assert.equal(ranked[1].rank, 2);
});

test('validateStorageUpload enforces MIME allowlist and 5MB cap', () => {
  const okRes = validateStorageUpload(
    { name: 'pan_jamon_corte.jpg', sizeBytes: 1_200_000, mimeType: 'image/jpeg' },
    'user-123',
    'bakery-orinoco'
  );
  assert.equal(okRes.valid, true);

  const badMime = validateStorageUpload(
    { name: 'script.exe', sizeBytes: 1024, mimeType: 'application/x-msdownload' },
    'user-123',
    'bakery-orinoco'
  );
  assert.equal(badMime.valid, false);

  const tooLarge = validateStorageUpload(
    { name: 'huge.png', sizeBytes: 7 * 1024 * 1024, mimeType: 'image/png' },
    'user-123',
    'bakery-orinoco'
  );
  assert.equal(tooLarge.valid, false);

  const hashA = generateDeterministicHash('test-payload-1');
  const hashB = generateDeterministicHash('test-payload-1');
  assert.equal(hashA, hashB);
});

test('createOrUpdateBakeryByAdmin allows admin to register a bakery with logo/facade and rejects non-admin roles', () => {
  const created = createOrUpdateBakeryByAdmin([mockBakery], {
    name: 'Panadería Artesanal La Sabanita',
    sector: 'La Sabanita',
    address: 'Av. España frente a la Plaza La Sabanita, Ciudad Bolívar',
    masterBaker: 'Maestro José Gregorio Lira',
    signatureRecipe: 'Pan de jamón en horno de ladrillo con melado de caña y tocineta ahumada.',
    crustStyle: 'Corteza Dorada al Melado',
    accentHex: '#F59E0B',
    photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    actorUid: 'admin-cb-01',
    actorRole: 'admin',
    timestampIso: '2026-11-04T23:30:00.000Z',
  });

  assert.equal(created.isNew, true);
  assert.equal(created.bakery.name, 'Panadería Artesanal La Sabanita');
  assert.equal(created.bakery.sector, 'La Sabanita');
  assert.ok(created.initialToken);
  assert.equal(created.initialToken?.bakeryId, created.bakery.id);
  assert.equal(created.auditLog.action, 'BAKERY_SEEDED');

  assert.throws(() => {
    createOrUpdateBakeryByAdmin([mockBakery], {
      name: 'Panadería Intrusa',
      sector: 'Centro',
      address: 'Calle 1, Ciudad Bolívar',
      masterBaker: 'Intruso',
      signatureRecipe: 'Receta de prueba no autorizada.',
      crustStyle: 'Tradicional',
      accentHex: '#F52D18',
      photoUrl: '/assets/logo.jpg',
      actorUid: 'voter-1',
      actorRole: 'voter',
    });
  }, /Solo el rol Administrador/);
});

