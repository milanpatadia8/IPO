# IPO Insiders Firestore Security Specification

## 1. Data Invariants
1. **Public IPO Catalog Read, Protected Mutations**: Published IPO records (`/ipos/{ipoId}` where `visibility == 'members'`) and public staleness/seed metadata (`/app_settings/global`) are publicly readable so visitors can view all IPO details without logging in. All private collections (`/users`, `/admins`, `/authorized_admins`, `/clients`, `/ipo_applications`, `/audit_logs`, `/feed_runs`) and all write operations remain strictly authenticated.
2. **Verified Identity**: All admin operations and verified role checks require `request.auth.token.email_verified == true`.
3. **End-User IPO Applications (`/ipo_applications/{applicationId}`)**: Authenticated end users can submit IPO applications strictly for themselves (`userId == request.auth.uid`, `userEmail == request.auth.token.email`, `status == 'submitted'`, `createdAt == request.time`), read only their own applications, and cancel their own submitted application (`status: 'submitted' -> 'cancelled'`). PAN and UPI ID are strictly PII-isolated to the owner and admins.
4. **Role Integrity & Pre-Authorized Admin Emails**: End users may only self-register in `/users/{uid}` with `role == 'user'` unless they are the verified bootstrap admin (`milanpatadia8@gmail.com`) or pre-authorized in `/authorized_admins/{emailKey}`. Non-admins can never escalate their own role or write to `/admins/{uid}` or `/authorized_admins/{emailKey}`.
5. **Client Ledger PII Isolation (`/clients/{clientId}`)**: Private client data (PAN, demat ID, email, phone, agreed fees, and payment receipts) is strictly readable and writable ONLY by verified admins (`isAdmin()`). Unauthenticated users and regular investors receive `PERMISSION_DENIED` on all operations.
6. **Admin-Only Catalog & Policy Mutations**: Creating, updating, or deleting `/ipos/{ipoId}` or `/site_policies/{policyId}`, logging `/feed_runs/{runId}`, managing `/authorized_admins/{emailKey}`, or modifying `/app_settings/{settingId}` is strictly restricted to verified admins. Published `/site_policies` documents (`visibility == 'public'`) are publicly readable so visitors can read Terms, Privacy, and SEBI Disclaimers without logging in.
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
8. **End User Writing IPO Catalog or Site Policies**: Verified regular user (`uid-1`) attempts `UPDATE /ipos/ipo-1` or `UPDATE /site_policies/sebi-disclaimer` -> DENIED.
9. **End User Forging Admin Marker or Authorized Email**: Verified regular user (`uid-1`) attempts `CREATE /admins/uid-1` or `CREATE /authorized_admins/investor_example_com` -> DENIED.
10. **Non-Admin Reading or Modifying Client Fee Ledger**: Verified regular user (`uid-1`) attempts `GET` or `LIST` on `/clients/cli-1` -> DENIED.
11. **Audit Log Tampering / Deletion**: Even an admin attempts `UPDATE` or `DELETE` on `/audit_logs/log-1` -> DENIED.
12. **Client-Forged Timestamp / Value Poisoning**: Admin attempts `UPDATE /app_settings/global` with `updatedAt: "2020-01-01"` or `gmpStalenessHours: "invalid"` -> DENIED.
