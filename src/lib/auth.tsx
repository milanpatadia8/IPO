import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from './firebase';
import { AdminUser } from '../types/ipo';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  isActive: boolean;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUserProfile | null;
  adminUser: AdminUser | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  authReady: boolean;
  authBusy: boolean;
  authError: string;
  signInWithGoogle: () => Promise<AppUserProfile | null>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const sanitizeText = (value: string | null | undefined, fallback: string, maxLen: number): string => {
  const cleaned = (value || '').trim();
  return (cleaned || fallback).slice(0, maxLen);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const syncUserProfile = useCallback(async (user: User): Promise<AppUserProfile> => {
    const uid = user.uid;
    const email = (user.email || '').trim().toLowerCase();
    const displayName = sanitizeText(user.displayName, email.split('@')[0] || 'IPO Investor', 120);
    const photoURL = sanitizeText(user.photoURL, '', 500);
    const isBootstrapAdmin = email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified === true;

    // 1. Check trusted /admins/{uid} marker document
    let hasAdminMarker = false;
    const adminRef = doc(db, 'admins', uid);
    try {
      const adminSnap = await getDoc(adminRef);
      hasAdminMarker = adminSnap.exists();
    } catch {
      hasAdminMarker = false;
    }

    const effectiveRole: 'admin' | 'user' = isBootstrapAdmin || hasAdminMarker ? 'admin' : 'user';

    // 2. Ensure bootstrap admin also has an /admins/{uid} marker doc
    if (isBootstrapAdmin && !hasAdminMarker) {
      try {
        await setDoc(adminRef, {
          uid,
          email,
          grantedBy: uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not sync bootstrap admin marker:', err);
      }
    }

    // 3. Create or update /users/{uid} profile document
    const userRef = doc(db, 'users', uid);
    try {
      const existingSnap = await getDoc(userRef);
      if (!existingSnap.exists()) {
        await setDoc(userRef, {
          uid,
          email,
          displayName,
          photoURL,
          role: effectiveRole,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingData = existingSnap.data();
        const updates: Record<string, unknown> = {
          displayName,
          photoURL,
          updatedAt: serverTimestamp(),
        };
        if (effectiveRole === 'admin' && existingData.role !== 'admin') {
          updates.role = 'admin';
        }
        await updateDoc(userRef, updates);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    return {
      uid,
      email,
      displayName,
      photoURL,
      role: effectiveRole,
      isActive: true,
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const synced = await syncUserProfile(user);
        setProfile(synced);
      } catch (err) {
        console.error('Failed to sync user profile:', err);
        const email = (user.email || '').trim().toLowerCase();
        const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified;
        setProfile({
          uid: user.uid,
          email,
          displayName: sanitizeText(user.displayName, email.split('@')[0] || 'IPO Investor', 120),
          photoURL: sanitizeText(user.photoURL, '', 500),
          role: isBootstrap ? 'admin' : 'user',
          isActive: true,
        });
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [syncUserProfile]);

  const signInWithGoogle = useCallback(async (): Promise<AppUserProfile | null> => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      if (!credential.user) return null;
      const synced = await syncUserProfile(credential.user);
      setFirebaseUser(credential.user);
      setProfile(synced);
      return synced;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed before completing login.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in with Google right now.');
      }
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, [syncUserProfile]);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setProfile(null);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to sign out.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const isAdmin = Boolean(profile?.role === 'admin' && firebaseUser?.emailVerified);
  const adminUser: AdminUser | null =
    isAdmin && profile
      ? {
          id: profile.uid,
          email: profile.email,
          role: 'admin',
          full_name: profile.displayName,
          is_active: profile.isActive,
          created_at: new Date().toISOString(),
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        adminUser,
        isSignedIn: Boolean(firebaseUser && profile),
        isAdmin,
        authReady,
        authBusy,
        authError,
        signInWithGoogle,
        signOut,
        clearAuthError: () => setAuthError(''),
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
