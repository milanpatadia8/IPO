// =====================================================================
// Server-Side Authentication & Authorization Module: src/server-auth.ts
// Uses Node crypto.scrypt password hashing, HMAC-SHA256 Bearer tokens,
// automatic Admin recognition for primary & admin-authorized emails,
// and Google Firebase ID token verification.
// =====================================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import type { AuthorizedAdminEntry } from './types/ipo';

export const PRIMARY_ADMIN_EMAIL = 'milanpatadia8@gmail.com';
const MOBILE_AUTH_DOMAIN = 'mobile.ipoinsiders.app';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Ephemeral in-memory fallback secret when SESSION_SECRET env var is unset
const SESSION_SIGNING_KEY =
  (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) ||
  crypto.randomBytes(32).toString('hex');

export interface ServerUserRecord {
  id: string;
  email: string;
  phone?: string;
  displayContact: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  isActive: boolean;
  passwordHash?: string;
  authProvider: 'password' | 'google';
  createdAt: string;
}

export interface PublicUserDTO {
  uid: string;
  email: string;
  phone?: string;
  displayContact: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: ServerUserRecord;
  authJti?: string;
}

const usersById = new Map<string, ServerUserRecord>();
const usersByEmail = new Map<string, ServerUserRecord>();
const revokedJtis = new Set<string>();

// Admin-authorized email allowlist (lowercase email -> metadata)
const authorizedAdminEmails = new Map<
  string,
  { email: string; addedBy: string; addedAt: string }
>();

interface FirebaseAppletConfig {
  apiKey: string;
  projectId?: string;
  firestoreDatabaseId?: string;
}

function readFirebaseConfig(): FirebaseAppletConfig | null {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) return null;
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
      apiKey?: string;
      projectId?: string;
      firestoreDatabaseId?: string;
    };
    if (typeof raw.apiKey !== 'string' || !raw.apiKey.trim()) return null;
    return {
      apiKey: raw.apiKey.trim(),
      projectId: typeof raw.projectId === 'string' ? raw.projectId.trim() : undefined,
      firestoreDatabaseId:
        typeof raw.firestoreDatabaseId === 'string' ? raw.firestoreDatabaseId.trim() : undefined,
    };
  } catch {
    return null;
  }
}

function readFirebaseApiKey(): string | null {
  return readFirebaseConfig()?.apiKey ?? null;
}

function toAuthorizedAdminKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function normalizeEmailStrict(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('Please enter a valid email address.');
  }
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Please enter a valid email address.');
  }
  return email;
}

export function normalizeServerIdentifier(raw: unknown): {
  authEmail: string;
  phone?: string;
  displayContact: string;
  isMobile: boolean;
} {
  if (typeof raw !== 'string') {
    throw new Error('Please enter your email address or mobile number.');
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Please enter your email address or mobile number.');
  }

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error('Please enter a valid email address.');
    }
    return {
      authEmail: email,
      displayContact: email,
      isMobile: false,
    };
  }

  let digits = trimmed.replace(/[\s\-()+]/g, '');
  if (!/^\d+$/.test(digits)) {
    throw new Error('Please enter a valid email address or 10-digit mobile number.');
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Please enter a valid mobile number (10 to 15 digits).');
  }

  return {
    authEmail: `m${digits}@${MOBILE_AUTH_DOMAIN}`,
    phone: digits,
    displayContact: digits.length === 10 ? `+91 ${digits}` : `+${digits}`,
    isMobile: true,
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function verifyEnvAdminPassword(candidate: string): boolean {
  const envPass = process.env.ADMIN_PASSWORD;
  if (!envPass || !envPass.trim()) return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(envPass).digest();
  return crypto.timingSafeEqual(a, b);
}

export function isEnvAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
}

export function isAdminAccountClaimed(): boolean {
  if (isEnvAdminPasswordConfigured()) return true;
  const adminRec = usersByEmail.get(PRIMARY_ADMIN_EMAIL);
  return Boolean(adminRec && adminRec.passwordHash);
}

export function isAuthorizedAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === PRIMARY_ADMIN_EMAIL || authorizedAdminEmails.has(normalized);
}

export function listAuthorizedAdminEmails(): AuthorizedAdminEntry[] {
  const primaryUser = usersByEmail.get(PRIMARY_ADMIN_EMAIL);
  const entries: AuthorizedAdminEntry[] = [
    {
      email: PRIMARY_ADMIN_EMAIL,
      is_primary: true,
      added_by: 'System Owner',
      added_at: primaryUser?.createdAt || new Date().toISOString(),
      has_account: Boolean(primaryUser),
      user_name: primaryUser?.displayName,
    },
  ];

  Array.from(authorizedAdminEmails.values())
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .forEach((item) => {
      const existingUser = usersByEmail.get(item.email);
      entries.push({
        email: item.email,
        is_primary: false,
        added_by: item.addedBy,
        added_at: item.addedAt,
        has_account: Boolean(existingUser),
        user_name: existingUser?.displayName,
      });
    });

  return entries;
}

export function authorizeAdminEmail(
  rawEmail: unknown,
  actor: ServerUserRecord
): AuthorizedAdminEntry {
  const email = normalizeEmailStrict(rawEmail);
  if (email === PRIMARY_ADMIN_EMAIL) {
    throw new Error('This email already has Primary Admin access.');
  }

  const now = new Date().toISOString();
  if (!authorizedAdminEmails.has(email)) {
    authorizedAdminEmails.set(email, {
      email,
      addedBy: actor.displayContact || actor.email,
      addedAt: now,
    });
  }

  // Immediately upgrade existing account if this user already registered
  const existingUser = usersByEmail.get(email);
  if (existingUser) {
    existingUser.role = 'admin';
  }

  const saved = authorizedAdminEmails.get(email)!;
  return {
    email: saved.email,
    is_primary: false,
    added_by: saved.addedBy,
    added_at: saved.addedAt,
    has_account: Boolean(existingUser),
    user_name: existingUser?.displayName,
  };
}

export function revokeAdminEmail(rawEmail: unknown, actor: ServerUserRecord): void {
  const email = normalizeEmailStrict(rawEmail);
  if (email === PRIMARY_ADMIN_EMAIL) {
    throw new Error('Primary Admin access cannot be revoked.');
  }
  if (email === actor.email.toLowerCase()) {
    throw new Error('You cannot revoke your own Admin access.');
  }

  authorizedAdminEmails.delete(email);

  const existingUser = usersByEmail.get(email);
  if (existingUser && existingUser.role === 'admin') {
    existingUser.role = 'user';
  }
}

export function toPublicUserDTO(user: ServerUserRecord): PublicUserDTO {
  return {
    uid: user.id,
    email: user.email,
    phone: user.phone,
    displayContact: user.displayContact,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function createSessionToken(user: ServerUserRecord): string {
  const payload = {
    sub: user.id,
    jti: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(
  token: string
): { user: ServerUserRecord; jti: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payloadB64)
    .digest('base64url');
  const sigBuf = Buffer.from(sigB64);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      sub?: string;
      jti?: string;
      exp?: number;
    };
    if (!decoded.sub || !decoded.jti || !decoded.exp) return null;
    if (decoded.exp < Date.now()) return null;
    if (revokedJtis.has(decoded.jti)) return null;

    const user = usersById.get(decoded.sub);
    if (!user || !user.isActive) return null;
    return { user, jti: decoded.jti };
  } catch {
    return null;
  }
}

export function revokeSessionJti(jti: string): void {
  revokedJtis.add(jti);
}

export function signupWithPassword(input: {
  name: unknown;
  identifier: unknown;
  password: unknown;
}): { user: ServerUserRecord; token: string } {
  const cleanName = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (cleanName.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }
  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length < 6 || password.length > 128) {
    throw new Error('Password must be between 6 and 128 characters.');
  }

  const normalized = normalizeServerIdentifier(input.identifier);
  const existing = usersByEmail.get(normalized.authEmail);
  const grantedAdmin = isAuthorizedAdminEmail(normalized.authEmail);

  // Primary Admin first-run claiming rules
  if (normalized.authEmail === PRIMARY_ADMIN_EMAIL) {
    if (isEnvAdminPasswordConfigured()) {
      throw new Error('An account with this email already exists. Please use Login.');
    }
    if (existing && existing.passwordHash) {
      throw new Error('An account with this email already exists. Please switch to Login.');
    }
    if (existing) {
      existing.passwordHash = hashPassword(password);
      existing.displayName = cleanName;
      existing.role = 'admin';
      const token = createSessionToken(existing);
      return { user: existing, token };
    }

    const adminRecord: ServerUserRecord = {
      id: `usr-${crypto.randomBytes(10).toString('hex')}`,
      email: PRIMARY_ADMIN_EMAIL,
      displayContact: PRIMARY_ADMIN_EMAIL,
      displayName: cleanName,
      photoURL: '',
      role: 'admin',
      isActive: true,
      passwordHash: hashPassword(password),
      authProvider: 'password',
      createdAt: new Date().toISOString(),
    };
    usersById.set(adminRecord.id, adminRecord);
    usersByEmail.set(adminRecord.email, adminRecord);
    return { user: adminRecord, token: createSessionToken(adminRecord) };
  }

  if (existing) {
    throw new Error(
      'An account with this email or mobile number already exists. Please switch to Login.'
    );
  }

  const userRecord: ServerUserRecord = {
    id: `usr-${crypto.randomBytes(10).toString('hex')}`,
    email: normalized.authEmail,
    phone: normalized.phone,
    displayContact: normalized.displayContact,
    displayName: cleanName,
    photoURL: '',
    role: grantedAdmin ? 'admin' : 'user',
    isActive: true,
    passwordHash: hashPassword(password),
    authProvider: 'password',
    createdAt: new Date().toISOString(),
  };

  usersById.set(userRecord.id, userRecord);
  usersByEmail.set(userRecord.email, userRecord);
  return { user: userRecord, token: createSessionToken(userRecord) };
}

export function loginWithPassword(input: {
  identifier: unknown;
  password: unknown;
}): { user: ServerUserRecord; token: string } {
  const password = typeof input.password === 'string' ? input.password : '';
  if (!password) {
    throw new Error('Please enter your password.');
  }

  const normalized = normalizeServerIdentifier(input.identifier);

  // Primary Admin automatic recognition on Login
  if (normalized.authEmail === PRIMARY_ADMIN_EMAIL) {
    // 1. If ADMIN_PASSWORD env var is set, it always overrides any claimed fallback hash
    if (isEnvAdminPasswordConfigured()) {
      if (!verifyEnvAdminPassword(password)) {
        throw new Error('Invalid email/mobile number or password.');
      }
      let adminRec = usersByEmail.get(PRIMARY_ADMIN_EMAIL);
      if (!adminRec) {
        adminRec = {
          id: `usr-${crypto.randomBytes(10).toString('hex')}`,
          email: PRIMARY_ADMIN_EMAIL,
          displayContact: PRIMARY_ADMIN_EMAIL,
          displayName: 'Admin',
          photoURL: '',
          role: 'admin',
          isActive: true,
          authProvider: 'password',
          createdAt: new Date().toISOString(),
        };
        usersById.set(adminRec.id, adminRec);
        usersByEmail.set(adminRec.email, adminRec);
      } else {
        adminRec.role = 'admin';
      }
      return { user: adminRec, token: createSessionToken(adminRec) };
    }

    // 2. First-run automatic Admin claim on Login when no password has been set yet
    const existingAdmin = usersByEmail.get(PRIMARY_ADMIN_EMAIL);
    if (!existingAdmin || !existingAdmin.passwordHash) {
      if (password.length < 6 || password.length > 128) {
        throw new Error('Password must be between 6 and 128 characters.');
      }
      if (existingAdmin) {
        existingAdmin.passwordHash = hashPassword(password);
        existingAdmin.role = 'admin';
        return { user: existingAdmin, token: createSessionToken(existingAdmin) };
      }
      const claimedAdmin: ServerUserRecord = {
        id: `usr-${crypto.randomBytes(10).toString('hex')}`,
        email: PRIMARY_ADMIN_EMAIL,
        displayContact: PRIMARY_ADMIN_EMAIL,
        displayName: 'Admin',
        photoURL: '',
        role: 'admin',
        isActive: true,
        passwordHash: hashPassword(password),
        authProvider: 'password',
        createdAt: new Date().toISOString(),
      };
      usersById.set(claimedAdmin.id, claimedAdmin);
      usersByEmail.set(claimedAdmin.email, claimedAdmin);
      return { user: claimedAdmin, token: createSessionToken(claimedAdmin) };
    }
  }

  const user = usersByEmail.get(normalized.authEmail);
  if (!user) {
    throw new Error('Invalid email/mobile number or password. Please check your details or Sign Up.');
  }

  if (!user.passwordHash) {
    throw new Error('This account uses Google login. Please click "Continue with Google".');
  }

  if (!verifyPasswordHash(password, user.passwordHash)) {
    throw new Error('Invalid email/mobile number or password.');
  }

  if (!user.isActive) {
    throw new Error('This account has been deactivated.');
  }

  // Sync role automatically if this email is authorized for Admin access
  if (isAuthorizedAdminEmail(user.email)) {
    user.role = 'admin';
  }

  return { user, token: createSessionToken(user) };
}

export async function loginWithGoogleIdToken(
  idToken: unknown
): Promise<{ user: ServerUserRecord; token: string }> {
  if (typeof idToken !== 'string' || idToken.trim().length < 20) {
    throw new Error('Missing or invalid Google sign-in token.');
  }
  const apiKey = readFirebaseApiKey();
  if (!apiKey) {
    throw new Error('Firebase configuration is unavailable on the server.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: idToken.trim() }),
    }
  );

  if (!response.ok) {
    throw new Error('Could not verify Google login token. Please try again.');
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      displayName?: string;
      photoUrl?: string;
    }>;
  };
  const googleUser = data.users?.[0];
  if (!googleUser?.email || !googleUser?.localId) {
    throw new Error('Invalid Google account details returned.');
  }

  const email = googleUser.email.trim().toLowerCase();
  const hasAdminAccess = googleUser.emailVerified === true && isAuthorizedAdminEmail(email);
  const displayName = (googleUser.displayName || email.split('@')[0] || 'IPO Investor').slice(0, 120);
  const photoURL = (googleUser.photoUrl || '').slice(0, 500);

  let record = usersByEmail.get(email);
  if (!record) {
    record = {
      id: googleUser.localId,
      email,
      displayContact: email,
      displayName,
      photoURL,
      role: hasAdminAccess ? 'admin' : 'user',
      isActive: true,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
    };
    usersById.set(record.id, record);
    usersByEmail.set(email, record);
  } else {
    record.displayName = displayName;
    if (photoURL) record.photoURL = photoURL;
    if (hasAdminAccess) record.role = 'admin';
  }

  return { user: record, token: createSessionToken(record) };
}

export function listAllServerUsers(): ServerUserRecord[] {
  return Array.from(usersById.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function setServerUserRole(
  targetUid: string,
  newRole: 'admin' | 'user',
  actor: ServerUserRecord
): ServerUserRecord {
  const target = usersById.get(targetUid);
  if (!target) {
    throw new Error('User not found.');
  }
  if (target.email === PRIMARY_ADMIN_EMAIL) {
    throw new Error('The primary Admin account cannot be modified.');
  }
  if (target.id === actor.id) {
    throw new Error('You cannot change your own Admin role.');
  }

  target.role = newRole;
  const emailLower = target.email.toLowerCase();
  if (!emailLower.endsWith(`@${MOBILE_AUTH_DOMAIN}`)) {
    if (newRole === 'admin') {
      if (!authorizedAdminEmails.has(emailLower)) {
        authorizedAdminEmails.set(emailLower, {
          email: emailLower,
          addedBy: actor.displayContact || actor.email,
          addedAt: new Date().toISOString(),
        });
      }
    } else {
      authorizedAdminEmails.delete(emailLower);
    }
  }

  return target;
}

export function updateServerUserProfile(
  userId: string,
  input: { displayName?: unknown; phone?: unknown; photoURL?: unknown }
): ServerUserRecord {
  const target = usersById.get(userId);
  if (!target) {
    throw new Error('User account not found.');
  }

  const cleanName =
    typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 120) : '';
  if (cleanName.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }

  let cleanPhone: string | undefined = target.phone;
  if (input.phone !== undefined) {
    const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
    if (!rawPhone) {
      cleanPhone = undefined;
    } else {
      const digits = rawPhone.replace(/[\s\-()+]/g, '');
      if (!/^\d{10,15}$/.test(digits)) {
        throw new Error('Please enter a valid mobile number (10 to 15 digits).');
      }
      cleanPhone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    }
  }

  let cleanPhotoUrl = target.photoURL;
  if (input.photoURL !== undefined) {
    const rawPhoto = typeof input.photoURL === 'string' ? input.photoURL.trim().slice(0, 500) : '';
    if (!rawPhoto) {
      cleanPhotoUrl = '';
    } else {
      try {
        const parsed = new URL(rawPhoto);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error('Invalid protocol');
        }
        cleanPhotoUrl = parsed.toString();
      } catch {
        throw new Error('Profile photo URL must be a valid http(s) link.');
      }
    }
  }

  target.displayName = cleanName;
  target.phone = cleanPhone;
  target.photoURL = cleanPhotoUrl;
  if (cleanPhone && target.email.endsWith(`@${MOBILE_AUTH_DOMAIN}`)) {
    target.displayContact = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`;
  } else if (cleanPhone && !target.email.includes('@')) {
    target.displayContact = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`;
  }

  return target;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ success: false, error: 'Please login to continue.' });
    return;
  }

  const verified = verifySessionToken(match[1].trim());
  if (!verified) {
    res.status(401).json({ success: false, error: 'Your login session has expired. Please login again.' });
    return;
  }

  req.authUser = verified.user;
  req.authJti = verified.jti;
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin authorization required. Only authorized administrators can perform this action.',
      });
      return;
    }
    next();
  });
}

async function verifyFirebaseAdminIdToken(idToken: string): Promise<ServerUserRecord | null> {
  const fbCfg = readFirebaseConfig();
  if (!fbCfg?.apiKey) return null;

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbCfg.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!lookupRes.ok) return null;

  const data = (await lookupRes.json().catch(() => null)) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      displayName?: string;
      photoUrl?: string;
    }>;
  } | null;

  const fbUser = data?.users?.[0];
  if (!fbUser?.localId || !fbUser?.email || fbUser.emailVerified !== true) {
    return null;
  }

  const email = fbUser.email.trim().toLowerCase();
  let isAllowedAdmin = isAuthorizedAdminEmail(email);

  // Also verify Firestore /admins/{uid} and /authorized_admins/{emailKey} using the caller's verified token
  if (!isAllowedAdmin && fbCfg.projectId) {
    const dbId = fbCfg.firestoreDatabaseId || '(default)';
    const baseDocs = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      fbCfg.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents`;

    const checkDocExists = async (docPath: string): Promise<boolean> => {
      try {
        const resp = await fetch(`${baseDocs}/${docPath}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        return resp.ok;
      } catch {
        return false;
      }
    };

    const emailKey = toAuthorizedAdminKey(email);
    const [hasAdminDoc, hasAuthEmailDoc] = await Promise.all([
      checkDocExists(`admins/${encodeURIComponent(fbUser.localId)}`),
      checkDocExists(`authorized_admins/${encodeURIComponent(emailKey)}`),
    ]);
    isAllowedAdmin = hasAdminDoc || hasAuthEmailDoc;
  }

  if (!isAllowedAdmin) return null;

  return {
    id: fbUser.localId,
    email,
    displayContact: email,
    displayName: (fbUser.displayName || email.split('@')[0] || 'Admin').slice(0, 120),
    photoURL: (fbUser.photoUrl || '').slice(0, 500),
    role: 'admin',
    isActive: true,
    authProvider: 'google',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Accepts either a valid in-memory Express admin session token OR a live
 * verified Firebase Auth ID token belonging to an authorized Admin.
 * Ensures Admin proxy routes keep working across server restarts & cold starts.
 */
export async function requireAdminFlexible(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ success: false, error: 'Admin sign-in required.' });
    return;
  }

  const token = match[1].trim();
  const session = verifySessionToken(token);
  if (session) {
    if (session.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin authorization required.',
      });
      return;
    }
    req.authUser = session.user;
    req.authJti = session.jti;
    next();
    return;
  }

  try {
    const fbAdmin = await verifyFirebaseAdminIdToken(token);
    if (!fbAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin authorization required. Please sign in with an authorized Admin Google account.',
      });
      return;
    }
    req.authUser = fbAdmin;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Unable to verify Admin session. Please refresh and try again.',
    });
  }
}
