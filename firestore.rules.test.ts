// =====================================================================
// Firestore Security Rules Verification Specification
// Verifies the "Dirty Dozen" adversarial payloads against firestore.rules
// =====================================================================

export interface SecurityTestCase {
  id: number;
  name: string;
  actor: { uid: string; email?: string; email_verified?: boolean; isAdmin?: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated IPO application creation blocked',
    actor: null,
    operation: 'create',
    path: '/ipo_applications/app-unauth',
    payload: {
      id: 'app-unauth',
      userId: 'anon',
      ipoId: 'ipo-1',
      pan: 'ABCDE1234F',
      upiId: 'test@upi',
      status: 'submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'End user self-assigned admin role on create blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'create',
    path: '/users/user-1',
    payload: {
      uid: 'user-1',
      email: 'investor@example.com',
      displayName: 'Investor',
      photoURL: '',
      role: 'admin',
      isActive: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'End user role tampering on update blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'update',
    path: '/users/user-1',
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-user PII read blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'get',
    path: '/users/user-2',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Ghost/shadow field injection blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'update',
    path: '/users/user-1',
    payload: { displayName: 'Investor', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unverified admin email spoof blocked',
    actor: { uid: 'spoof-1', email: 'milanpatadia8@gmail.com', email_verified: false, isAdmin: false },
    operation: 'create',
    path: '/ipos/ipo-spoof',
    payload: { id: 'ipo-spoof', slug: 'spoof-ipo', visibility: 'members' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'End user writing to IPO catalog blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'update',
    path: '/ipos/ipo-1',
    payload: { status: 'listed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'End user forging authorized admin email blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'create',
    path: '/authorized_admins/investor_example_com',
    payload: { id: 'investor_example_com', email: 'investor@example.com', added_by: 'user-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Non-admin reading private client fee ledger blocked',
    actor: { uid: 'user-1', email: 'investor@example.com', email_verified: true, isAdmin: false },
    operation: 'get',
    path: '/clients/cli-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit log deletion blocked even for admins',
    actor: { uid: 'admin-1', email: 'milanpatadia8@gmail.com', email_verified: true, isAdmin: true },
    operation: 'delete',
    path: '/audit_logs/log-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Document ID poisoning blocked',
    actor: { uid: 'admin-1', email: 'milanpatadia8@gmail.com', email_verified: true, isAdmin: true },
    operation: 'create',
    path: '/ipos/invalid$id..poison',
    payload: { id: 'invalid$id..poison' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value poisoning and forged timestamp on app_settings blocked',
    actor: { uid: 'admin-1', email: 'milanpatadia8@gmail.com', email_verified: true, isAdmin: true },
    operation: 'update',
    path: '/app_settings/global',
    payload: {
      gmpStalenessHours: 'not-a-number',
      subStalenessHours: 12,
      seeded: true,
      updatedBy: 'admin-1',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
];
