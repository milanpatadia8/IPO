import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  BOOTSTRAP_ADMIN_EMAIL,
  toAuthorizedAdminKey,
  OperationType,
  handleFirestoreError,
} from './firebase';
import { api } from './api';
import { AdminUser } from '../types/ipo';

const MOBILE_AUTH_DOMAIN = 'mobile.ipoinsiders.app';

export interface AppUserProfile {
  uid: string;
  email: string;
  phone?: string;
  displayContact?: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  isActive: boolean;
}

export function formatUserContact(email?: string | null, phone?: string | null): string {
  if (phone && phone.trim()) {
    const d = phone.trim();
    return d.length === 10 ? `+91 ${d}` : d.startsWith('+') ? d : `+${d}`;
  }
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail.endsWith(`@${MOBILE_AUTH_DOMAIN}`)) {
    const digits = cleanEmail.replace(/^m/, '').replace(`@${MOBILE_AUTH_DOMAIN}`, '');
    return digits.length === 10 ? `+91 ${digits}` : `+${digits}`;
  }
  return cleanEmail;
}

async function resolveAndSyncFirebaseUser(fbUser: FirebaseUser): Promise<AppUserProfile> {
  const email = (fbUser.email || '').trim().toLowerCase();
  const safeDisplayName = (
    fbUser.displayName?.trim() ||
    email.split('@')[0] ||
    'Member'
  ).slice(0, 120);
  const safePhotoURL = (fbUser.photoURL || '').trim().slice(0, 500);

  let isAuthorizedAdmin = Boolean(fbUser.emailVerified && email === BOOTSTRAP_ADMIN_EMAIL);

  // Check /admins/{uid} marker (owner can always read own admin marker)
  if (!isAuthorizedAdmin && fbUser.emailVerified) {
    try {
      const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
      if (adminSnap.exists()) {
        isAuthorizedAdmin = true;
      }
    } catch {
      // Non-fatal: continue checking authorized_admins
    }
  }

  // Check /authorized_admins/{emailKey} (rules allow get iff user isAdmin(), which checks authorized_admins)
  if (!isAuthorizedAdmin && fbUser.emailVerified && email) {
    try {
      const key = toAuthorizedAdminKey(email);
      const authSnap = await getDoc(doc(db, 'authorized_admins', key));
      if (authSnap.exists()) {
        isAuthorizedAdmin = true;
      }
    } catch {
      // Permission denied simply indicates this email is not in authorized_admins
    }
  }

  const resolvedRole: 'admin' | 'user' = isAuthorizedAdmin ? 'admin' : 'user';
  let finalDisplayName = safeDisplayName;
  let finalPhotoURL = safePhotoURL;
  let finalIsActive = true;
  let finalPhone: string | undefined;

  // Sync persistent /users/{uid} profile document in Cloud Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  try {
    const existingSnap = await getDoc(userDocRef);
    if (!existingSnap.exists()) {
      const newDoc: Record<string, unknown> = {
        uid: fbUser.uid,
        email: email || `${fbUser.uid}@users.ipoinsiders.app`,
        displayName: safeDisplayName,
        role: resolvedRole,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhotoURL) {
        newDoc.photoURL = safePhotoURL;
      }
      await setDoc(userDocRef, newDoc);
    } else {
      const existingData = existingSnap.data();
      finalDisplayName = (existingData.displayName as string) || safeDisplayName;
      finalPhotoURL = (existingData.photoURL as string) || safePhotoURL;
      finalIsActive = existingData.isActive !== false;
      finalPhone = (existingData.phone as string | undefined) || undefined;

      const patch: Record<string, unknown> = {};
      if (resolvedRole === 'admin' && existingData.role !== 'admin') {
        patch.role = 'admin';
      }
      if (safeDisplayName && safeDisplayName !== existingData.displayName && !existingData.displayName) {
        patch.displayName = safeDisplayName;
      }
      if (safePhotoURL && !existingData.photoURL) {
        patch.photoURL = safePhotoURL;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = serverTimestamp();
        await updateDoc(userDocRef, patch);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }

  // Ensure /admins/{uid} document exists for verified admins (persisted in Cloud Firestore)
  if (resolvedRole === 'admin' && fbUser.emailVerified && email) {
    try {
      const adminRef = doc(db, 'admins', fbUser.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: fbUser.uid,
          email,
          grantedBy: fbUser.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-fatal if bootstrap/authorized_admins already grants admin privileges
    }
  }

  // Best-effort optional backend session sync (non-fatal if server restarts)
  try {
    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (data.token) {
        api.setAuthToken(data.token);
      }
    }
  } catch {
    // Cloud Firestore works directly without Express token
  }

  return {
    uid: fbUser.uid,
    email,
    phone: finalPhone,
    displayContact: formatUserContact(email, finalPhone),
    displayName: finalDisplayName,
    photoURL: finalPhotoURL,
    role: resolvedRole,
    isActive: finalIsActive,
  };
}

interface AuthContextValue {
  profile: AppUserProfile | null;
  adminUser: AdminUser | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  isCloudConnected: boolean;
  adminClaimed: boolean;
  authReady: boolean;
  authBusy: boolean;
  authError: string;
  signUpWithCredentials: (params: {
    name: string;
    identifier: string;
    password: string;
  }) => Promise<AppUserProfile | null>;
  signInWithCredentials: (params: {
    identifier: string;
    password: string;
  }) => Promise<AppUserProfile | null>;
  signInWithGoogle: () => Promise<AppUserProfile | null>;
  updateUserProfile: (input: {
    displayName: string;
    phone?: string;
    photoURL?: string;
  }) => Promise<AppUserProfile>;
  refreshAuthStatus: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [adminClaimed, setAdminClaimed] = useState<boolean>(true);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const manualCredSessionRef = useRef<boolean>(false);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = (await res.json()) as { adminClaimed?: boolean };
        setAdminClaimed(Boolean(data.adminClaimed));
      }
    } catch {
      // ignore transient network check
    }
  }, []);

  // Automatically restore Firebase Auth session across reloads & app republishes
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;

      if (fbUser) {
        manualCredSessionRef.current = false;
        setIsCloudConnected(Boolean(fbUser.emailVerified));
        try {
          const synced = await resolveAndSyncFirebaseUser(fbUser);
          if (active) {
            setProfile(synced);
          }
        } catch (err) {
          console.error('Failed to sync Firebase user profile:', err);
          if (active) {
            const email = (fbUser.email || '').trim().toLowerCase();
            setProfile({
              uid: fbUser.uid,
              email,
              displayContact: email,
              displayName: fbUser.displayName || email.split('@')[0] || 'Member',
              photoURL: fbUser.photoURL || '',
              role: fbUser.emailVerified && email === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : 'user',
              isActive: true,
            });
          }
        } finally {
          if (active) setAuthReady(true);
        }
      } else {
        setIsCloudConnected(false);
        if (!manualCredSessionRef.current) {
          setProfile(null);
        }
        setAuthReady(true);
      }
    });

    refreshAuthStatus();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshAuthStatus]);

  const signUpWithCredentials = useCallback(
    async ({
      name,
      identifier,
      password,
    }: {
      name: string;
      identifier: string;
      password: string;
    }): Promise<AppUserProfile | null> => {
      setAuthBusy(true);
      setAuthError('');
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, identifier, password }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          token?: string;
          user?: AppUserProfile;
          error?: string;
        };

        if (!res.ok || !data.success || !data.token || !data.user) {
          throw new Error(data.error || 'Could not create account.');
        }

        manualCredSessionRef.current = true;
        api.setAuthToken(data.token);
        setProfile(data.user);
        if (data.user.role === 'admin') {
          setAdminClaimed(true);
        }
        return data.user;
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to create account right now.');
        return null;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const signInWithCredentials = useCallback(
    async ({
      identifier,
      password,
    }: {
      identifier: string;
      password: string;
    }): Promise<AppUserProfile | null> => {
      setAuthBusy(true);
      setAuthError('');
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          token?: string;
          user?: AppUserProfile;
          error?: string;
        };

        if (!res.ok || !data.success || !data.token || !data.user) {
          throw new Error(data.error || 'Invalid login credentials.');
        }

        manualCredSessionRef.current = true;
        api.setAuthToken(data.token);
        setProfile(data.user);
        return data.user;
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to login right now.');
        return null;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AppUserProfile | null> => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      if (!credential.user) {
        throw new Error('Google login did not return a user.');
      }

      manualCredSessionRef.current = false;
      setIsCloudConnected(Boolean(credential.user.emailVerified));
      const synced = await resolveAndSyncFirebaseUser(credential.user);
      setProfile(synced);
      return synced;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Google login window was closed. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the Google sign-in pop-up. Please allow pop-ups for this site and try again.');
      } else {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to sign in with Google right now.'
        );
      }
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const token = api.getAuthToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      manualCredSessionRef.current = false;
      await firebaseSignOut(auth).catch(() => {});
      api.setAuthToken(null);
      setIsCloudConnected(false);
      setProfile(null);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const updateUserProfile = useCallback(
    async (input: {
      displayName: string;
      phone?: string;
      photoURL?: string;
    }): Promise<AppUserProfile> => {
      if (!profile) {
        throw new Error('Please sign in to update your profile.');
      }

      const cleanName = input.displayName.trim();
      if (cleanName.length < 2 || cleanName.length > 120) {
        throw new Error('Full name must be between 2 and 120 characters.');
      }

      const rawPhone = (input.phone || '').trim();
      let cleanPhone = '';
      if (rawPhone) {
        const digitsOnly = rawPhone.replace(/\D/g, '');
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
          throw new Error('Please enter a valid 10 to 15 digit mobile number.');
        }
        cleanPhone = rawPhone.startsWith('+')
          ? `+${digitsOnly}`.slice(0, 20)
          : digitsOnly.slice(0, 20);
      }

      const cleanPhoto = (input.photoURL || '').trim();
      if (cleanPhoto) {
        if (cleanPhoto.length > 500 || !/^https?:\/\/\S+$/i.test(cleanPhoto)) {
          throw new Error('Profile photo URL must start with http:// or https:// and be under 500 characters.');
        }
      }

      const fbUser = auth.currentUser;
      if (fbUser) {
        try {
          await firebaseUpdateProfile(fbUser, {
            displayName: cleanName,
            photoURL: cleanPhoto || null,
          });
        } catch {
          // Non-fatal; Firestore profile remains the source of truth
        }

        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          await updateDoc(userDocRef, {
            displayName: cleanName,
            phone: cleanPhone,
            photoURL: cleanPhoto,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${fbUser.uid}`);
        }

        const token = api.getAuthToken();
        if (token) {
          fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: cleanName,
              phone: cleanPhone,
              photoURL: cleanPhoto,
            }),
          }).catch(() => {});
        }

        const updated: AppUserProfile = {
          ...profile,
          displayName: cleanName,
          phone: cleanPhone || undefined,
          photoURL: cleanPhoto,
          displayContact: formatUserContact(profile.email, cleanPhone || undefined),
        };
        setProfile(updated);
        return updated;
      }

      const token = api.getAuthToken();
      if (!token) {
        throw new Error('Your session has expired. Please login again.');
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: cleanName,
          phone: cleanPhone,
          photoURL: cleanPhoto,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        user?: AppUserProfile;
        error?: string;
      };

      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || 'Could not save profile changes.');
      }

      const updated: AppUserProfile = {
        ...data.user,
        displayContact: formatUserContact(data.user.email, data.user.phone),
      };
      setProfile(updated);
      return updated;
    },
    [profile]
  );

  const clearAuthError = useCallback(() => {
    setAuthError('');
  }, []);

  const isAdmin = Boolean(profile?.role === 'admin');
  const adminUser: AdminUser | null =
    isAdmin && profile
      ? {
          id: profile.uid,
          email: profile.displayContact || formatUserContact(profile.email, profile.phone),
          role: 'admin',
          full_name: profile.displayName,
          is_active: profile.isActive,
          created_at: new Date().toISOString(),
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        profile,
        adminUser,
        isSignedIn: Boolean(profile),
        isAdmin,
        isCloudConnected,
        adminClaimed,
        authReady,
        authBusy,
        authError,
        signUpWithCredentials,
        signInWithCredentials,
        signInWithGoogle,
        updateUserProfile,
        refreshAuthStatus,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
