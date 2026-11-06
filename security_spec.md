# Security Specification — El Fucking Mejor Pan de Jamón (Ciudad Bolívar)

## 1. Data Invariants

1. **Global Default-Deny & Path Hardening**: Every single-document path variable (`{bakeryId}`, `{tokenId}`, `{voteId}`, `{logId}`, `{userId}`, `{adminId}`) MUST match `^[a-zA-Z0-9_\-]+$` and be `<= 128` characters.
2. **Verified Identity Mandate**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Atomic Vote & QR Token Sync (Pillar 7 — Atomicity Guarantee)**:
   - Creating a `/votes/{voteId}` document MUST occur atomically (`getAfter`) with updating `/qrTokens/{tokenId}` (incrementing `usedCount` by 1) and updating `/bakeries/{bakeryId}` (incrementing `totalVotes` by 1 and adding `q1DoughScore`, `q2FillingScore`, `q3OverallScore` to cumulative totals).
   - A vote's `voterUid` MUST equal `request.auth.uid`, and each star rating (`q1DoughScore`, `q2FillingScore`, `q3OverallScore`) MUST be an integer in `[1..5]`.
4. **Privilege Escalation Prevention**:
   - Users creating `/users/{userId}` where `userId == request.auth.uid` can ONLY assign `role == 'voter'` unless they are the bootstrapped admin (`restreposolution@gmail.com` with `email_verified == true`) or exist in `/admins/$(request.auth.uid)`.
   - Only admins can modify `role` on `/users/{userId}` or create/modify `/admins/{adminId}`.
5. **PII Isolation (Pillar 6)**:
   - `/users/{userId}` contains `email` (PII). Reads (`get`, `list`) are strictly restricted to `isOwner(userId) || isAdmin()`. Blanket `isSignedIn()` reads on `/users` are forbidden.
6. **Immutable Votes & Audit Logs**:
   - Documents in `/votes/{voteId}` and `/auditLogs/{logId}` are append-only: `allow update, delete: if false;`.
7. **Temporal Integrity**:
   - Every `create` requires `incoming().createdAt == request.time`.
   - Every `update` requires `incoming().updatedAt == request.time` and preserves `incoming().createdAt == existing().createdAt`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on Vote)**: Includes `"isWinner": true` in `/votes/{voteId}`. Rejected by `hasOnly()`.
2. **Payload 2 (Identity Spoofing on Vote)**: `voterUid: "other-user-123"` when `request.auth.uid == "attacker-999"`. Rejected by `data.voterUid == request.auth.uid`.
3. **Payload 3 (Self-Assigned Admin Role)**: Creating `/users/attacker-999` with `role: "admin"`. Rejected by self-registration role gate (`data.role == 'voter' || isAdmin()`).
4. **Payload 4 (Unverified Admin Email Spoof)**: `request.auth.token.email == "restreposolution@gmail.com"` with `email_verified == false`. Rejected by `request.auth.token.email_verified == true`.
5. **Payload 5 (Orphaned Vote Without Token Redemption)**: Creating `/votes/vote_1` without updating `/qrTokens/tok_1` in the same transaction. Rejected by `getAfter()` atomic token check.
6. **Payload 6 (Star Rating Out-of-Bounds)**: `q1DoughScore: 999` or `q2FillingScore: 0`. Rejected by `score >= 1 && score <= 5`.
7. **Payload 7 (Denial-of-Wallet 1MB Comment)**: `comment` of 50,000 characters. Rejected by `data.comment.size() <= 500`.
8. **Payload 8 (ID Poisoning Attack)**: Document ID with spaces/slashes or 500 chars. Rejected by `isValidId(id)`.
9. **Payload 9 (PII Scraping on `/users`)**: Authenticated user performs `get` or `list` on `/users/victim-uid`. Rejected by `isOwner(userId) || isAdmin()`.
10. **Payload 10 (Terminal Token Re-use)**: Attempting to redeem a QR token whose `status == 'revoked'` or `status == 'consumed'` or `usedCount >= maxUses`. Rejected by terminal state lock.
11. **Payload 11 (Retroactive Vote Tampering)**: Updating `/votes/vote_1` to change `q3OverallScore` from 2 to 5. Rejected by `allow update: if false;`.
12. **Payload 12 (Client Timestamp Forgery)**: Creating an audit log with `createdAt` set to a past timestamp (`2020-01-01`). Rejected by `incoming().createdAt == request.time`.
