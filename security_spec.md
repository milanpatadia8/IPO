# IPO Insiders Firestore Security Specification

## 1. Data Invariants
1. **Public IPO Catalog Read, Protected Mutations**: Published IPO records (`/ipos/{ipoId}` where `visibility == 'members'`) and public staleness/seed metadata (`/app_settings/global`) are publicly readable so visitors can view all IPO details without logging in. All private collections (`/users`, `/admins`, `/ipo_applications`, `/audit_logs`, `/feed_runs`) and all write operations remain strictly authenticated.
2. **Verified Identity**: All writes, IPO applications, and admin operations require `request.auth.token.email_verified == true`.
3. **End-User IPO Applications (`/ipo_applications/{applicationId}`)**: Authenticated end users can submit IPO applications strictly for themselves (`userId == request.auth.uid`, `userEmail == request.auth.token.email`, `status == 'submitted'`, `createdAt == request.time`), read only their own applications, and cancel their own submitted application (`status: 'submitted' -> 'cancelled'`). PAN and UPI ID are strictly PII-isolated to the owner and admins.
4. **Role Integrity**: End users may only self-register in `/users/{uid}` with `role == 'user'`. They can never escalate their own role or write to `/admins/{uid}`. Only verified admins (bootstrapped `milanpatadia8@gmail.com` or existing `/admins/{uid}`) can grant or revoke admin access.
5. **PII Isolation**: User profiles in `/users/{uid}` and IPO applications in `/ipo_applications/{applicationId}` are readable strictly by the record owner or a verified admin (`isAdmin()`).
6. **Admin-Only Catalog Mutations**: Creating, updating, or deleting `/ipos/{ipoId}`, logging `/feed_runs/{runId}`, or modifying `/app_settings/{settingId}` is strictly restricted to verified admins.
7. **Immutable Audit Trail**: `/audit_logs/{logId}` documents are append-only by verified admins (`actor_id == request.auth.uid`, `createdAt == request.time`). Updates and deletes are permanently denied (`allow update, delete: if false`).
8. **Strict Schema & Volumetric Bounds**: Every string field enforces `.size()`, PAN enforces `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`, UPI enforces `^[^\s@]+@[^\s@]+$`, every document ID enforces `isValidId()`, every array enforces bounded `.size()`, and `hasAll` / `hasOnly` reject ghost/shadow fields.

## 2. Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated IPO Application**: Anonymous client attempts `CREATE /ipo_applications/app-1` -> DENIED.
2. **Cross-User Application PII Leak**: Regular user (`uid-1`) attempts `GET /ipo_applications/app-of-uid-2` -> DENIED.
3. **Self-Admin Escalation on Create**: Regular user (`uid-1`) attempts `CREATE /users/uid-1` with `{ role: "admin" }` -> DENIED.
4. **Role Tampering on Update**: Regular user (`uid-1`) attempts `UPDATE /users/uid-1` changing `role` from `"user"` to `"admin"` -> DENIED.
5. **Cross-User Profile PII Leak**: Regular user (`uid-1`) attempts `GET /users/uid-2` -> DENIED.
6. **Ghost/Shadow Field Injection**: Regular user (`uid-1`) attempts `UPDATE /users/uid-1` adding `{ isVerified: true }` -> DENIED.
7. **Unverified Admin Email Spoof**: User with `{ email: "milanpatadia8@gmail.com", email_verified: false }` attempts `CREATE /ipos/ipo-fake` -> DENIED.
8. **End User Writing IPO Catalog**: Verified regular user (`uid-1`) attempts `UPDATE /ipos/ipo-waaree` changing `status` -> DENIED.
9. **End User Forging Admin Marker**: Verified regular user (`uid-1`) attempts `CREATE /admins/uid-1` -> DENIED.
10. **Audit Log Tampering / Deletion**: Even an admin attempts `UPDATE` or `DELETE` on `/audit_logs/log-1` -> DENIED.
11. **Application Forgery (Another User's UID / Invalid PAN)**: User (`uid-1`) attempts `CREATE /ipo_applications/app-2` with `userId: "uid-2"` or malformed PAN -> DENIED.
12. **Client-Forged Timestamp / Value Poisoning**: Admin attempts `UPDATE /app_settings/global` with `updatedAt: "2020-01-01"` or `gmpStalenessHours: "invalid"` -> DENIED.
