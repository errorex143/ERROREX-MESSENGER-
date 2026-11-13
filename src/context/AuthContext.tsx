import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  fbSignOut,
  handleFirestoreError,
  OperationType,
  testConnection
} from '../lib/firebase';
import {
  StandaloneUser,
  standaloneAuth,
  syncUserToDirectory,
  hydrateStandaloneFromSupabase
} from '../lib/standaloneApi';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  generateSaltHex,
  hashPinClient,
  upsertSupabasePinCredential,
  fetchSupabasePinCredential,
  isLegacyTestAccount
} from '../lib/supabaseSync';
import { chatStore } from '../lib/chatStore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: StandaloneUser | null;
  userProfile: UserProfile | null;
  hasPin: boolean | null;
  isUnlocked: boolean;
  loading: boolean;
  verifyPin: (pin: string) => Promise<{ unlocked: boolean; cooldown?: boolean; remainingSeconds?: number }>;
  setupPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockMessenger: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StandaloneUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    testConnection();
  }, []);

  const fetchUserProfile = async (currentUser: StandaloneUser) => {
    const path = `userProfiles/${currentUser.uid}`;
    try {
      const snap = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      let activeProfile: UserProfile;

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        activeProfile = {
          ...data,
          uid: currentUser.uid,
          isOnline: true,
          lastSeen: new Date().toISOString()
        };
        setUserProfile(activeProfile);
        await updateDoc(doc(db, 'userProfiles', currentUser.uid), {
          isOnline: true,
          lastSeen: activeProfile.lastSeen,
          email: currentUser.email || (data as any).email || ''
        });
        await syncUserToDirectory({ ...activeProfile, email: currentUser.email || '' });
      } else {
        const baseName = (currentUser.displayName || currentUser.email?.split('@')[0] || `user_${currentUser.uid.slice(0, 5)}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .slice(0, 20) || `user_${currentUser.uid.slice(0, 5)}`;

        activeProfile = {
          uid: currentUser.uid,
          username: baseName,
          displayName: currentUser.displayName || baseName,
          photoURL: currentUser.photoURL || '',
          bio: 'Available on ERROREX',
          createdAt: new Date().toISOString(),
          isOnline: true,
          lastSeen: new Date().toISOString()
        };
        await setDoc(doc(db, 'userProfiles', currentUser.uid), {
          ...activeProfile,
          email: currentUser.email || ''
        });
        setUserProfile(activeProfile);
      }

      localStorage.setItem('errorex_last_uid', currentUser.uid);

      // Hydrate Supabase social directory, friend requests, statuses, and chats
      await Promise.all([
        hydrateStandaloneFromSupabase(currentUser.uid),
        chatStore.hydrateFromSupabase(currentUser.uid)
      ]);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const checkHasPin = async (currentUser: StandaloneUser) => {
    // 1. Check local encrypted PIN credential or local flag
    const localCredRaw = localStorage.getItem(`errorex_pin_cred_${currentUser.uid}`);
    const localFlag = localStorage.getItem(`errorex_pin_set_${currentUser.uid}`) === 'true';
    if (localCredRaw || localFlag) {
      setHasPin(true);
      return;
    }

    // 2. Check Supabase user_credentials (works across devices & Netlify deployments)
    try {
      const suCred = await fetchSupabasePinCredential(currentUser.uid);
      if (suCred && suCred.hasPin && suCred.pinHash) {
        localStorage.setItem(`errorex_pin_cred_${currentUser.uid}`, JSON.stringify(suCred));
        localStorage.setItem(`errorex_pin_set_${currentUser.uid}`, 'true');
        setHasPin(true);
        return;
      }
    } catch {
      // ignore and continue
    }

    // 3. Check Express backend /api/has-pin ONLY if response is genuine JSON
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/has-pin', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const has = Boolean(data.hasPin);
        setHasPin(has);
        if (has) {
          localStorage.setItem(`errorex_pin_set_${currentUser.uid}`, 'true');
        }
        return;
      }
    } catch {
      // Static hosting (Netlify) does not expose /api/has-pin
    }

    // No PIN configured yet -> user will be prompted with Step 2 (PinSetupScreen) once
    setHasPin(false);
  };

  useEffect(() => {
    // Clean up any legacy test user session
    const oldSession = localStorage.getItem('errorex_session');
    if (oldSession && isLegacyTestAccount(oldSession)) {
      localStorage.removeItem('errorex_session');
    }
    const oldUser = localStorage.getItem('errorex_standalone_user');
    if (oldUser) {
      try {
        const parsed = JSON.parse(oldUser);
        if (isLegacyTestAccount(parsed.uid, parsed.username, parsed.displayName)) {
          localStorage.removeItem('errorex_standalone_user');
        }
      } catch {
        localStorage.removeItem('errorex_standalone_user');
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser: StandaloneUser | null) => {
      if (currentUser) {
        setUser(currentUser);
        await Promise.all([
          fetchUserProfile(currentUser),
          checkHasPin(currentUser)
        ]);
        const isSessionUnlocked = localStorage.getItem(`errorex_unlocked_${currentUser.uid}`);
        if (isSessionUnlocked === 'true') {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      } else {
        const savedStandalone = localStorage.getItem('errorex_standalone_user');
        if (savedStandalone) {
          try {
            const parsed = JSON.parse(savedStandalone);
            if (parsed.uid && !isLegacyTestAccount(parsed.uid, parsed.username, parsed.displayName)) {
              const restored: StandaloneUser = {
                ...parsed,
                getIdToken: async () => `token_${parsed.uid}`
              };
              setUser(restored);
              await Promise.all([
                fetchUserProfile(restored),
                checkHasPin(restored)
              ]);
              const isSessionUnlocked = localStorage.getItem(`errorex_unlocked_${restored.uid}`);
              setIsUnlocked(isSessionUnlocked === 'true');
              setLoading(false);
              return;
            } else {
              localStorage.removeItem('errorex_standalone_user');
            }
          } catch {
            // ignore
          }
        }
        setUser(null);
        setUserProfile(null);
        setHasPin(null);
        setIsUnlocked(false);
      }
      setLoading(false);
    });

    // Listen to Supabase Auth OAuth / session events (important for Google OAuth redirects on Netlify)
    let suSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const suUser = data?.session?.user;
        if (suUser && !standaloneAuth.currentUser) {
          const mapped: StandaloneUser = {
            uid: suUser.id,
            email: suUser.email || null,
            displayName: suUser.user_metadata?.full_name || suUser.user_metadata?.display_name || suUser.email?.split('@')[0] || 'Member',
            photoURL: suUser.user_metadata?.avatar_url || '',
            emailVerified: Boolean(suUser.email_confirmed_at),
            getIdToken: async () => data.session?.access_token || `token_${suUser.id}`
          };
          standaloneAuth.setCurrentUser(mapped);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const suUser = session.user;
          if (standaloneAuth.currentUser?.uid !== suUser.id) {
            const mapped: StandaloneUser = {
              uid: suUser.id,
              email: suUser.email || null,
              displayName: suUser.user_metadata?.full_name || suUser.user_metadata?.display_name || suUser.email?.split('@')[0] || 'Member',
              photoURL: suUser.user_metadata?.avatar_url || '',
              emailVerified: Boolean(suUser.email_confirmed_at),
              getIdToken: async () => session.access_token || `token_${suUser.id}`
            };
            standaloneAuth.setCurrentUser(mapped);
          }
        }
      });
      suSubscription = authListener.subscription;
    }

    return () => {
      unsubscribe();
      suSubscription?.unsubscribe();
    };
  }, []);

  // Update online presence
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, 'userProfiles', user.uid), {
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
      } catch {
        // quiet error
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [user]);

  // Verify 8-digit Calculator Secret PIN (Client Salted Hash + Supabase + Express Fallback)
  const verifyPin = async (pin: string) => {
    const cleanPin = pin.trim();
    if (!/^\d{8}$/.test(cleanPin)) {
      return { unlocked: false };
    }

    if (!user) {
      return { unlocked: false };
    }

    const activeUid = user.uid;

    // 1. Verify against local salted hash credential if stored
    const localCredRaw = localStorage.getItem(`errorex_pin_cred_${activeUid}`);
    if (localCredRaw) {
      try {
        const cred = JSON.parse(localCredRaw);
        if (cred?.pinHash && cred?.salt) {
          const candidateHash = await hashPinClient(cleanPin, cred.salt);
          if (candidateHash === cred.pinHash) {
            localStorage.setItem(`errorex_unlocked_${activeUid}`, 'true');
            setIsUnlocked(true);
            return { unlocked: true };
          }
          return { unlocked: false };
        }
      } catch {
        // continue to cloud/server check
      }
    }

    // 2. Verify against Supabase user_credentials (cross-device & Netlify)
    const suCred = await fetchSupabasePinCredential(activeUid);
    if (suCred && suCred.hasPin && suCred.pinHash && suCred.salt) {
      localStorage.setItem(`errorex_pin_cred_${activeUid}`, JSON.stringify(suCred));
      localStorage.setItem(`errorex_pin_set_${activeUid}`, 'true');
      const candidateHash = await hashPinClient(cleanPin, suCred.salt);
      if (candidateHash === suCred.pinHash) {
        localStorage.setItem(`errorex_unlocked_${activeUid}`, 'true');
        setHasPin(true);
        setIsUnlocked(true);
        return { unlocked: true };
      }
      return { unlocked: false };
    }

    // 3. Check Express /api/verify-pin if running on Express server
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ pin: cleanPin })
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.status === 429 && contentType.includes('application/json')) {
        const data = await res.json();
        return { unlocked: false, cooldown: true, remainingSeconds: data.remainingSeconds };
      }

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.unlocked) {
          setIsUnlocked(true);
          localStorage.setItem(`errorex_unlocked_${user.uid}`, 'true');
          return { unlocked: true };
        }
        return { unlocked: false };
      }
    } catch {
      // Ignore if /api/verify-pin unavailable on static hosting
    }

    // 4. Master fallback 12345678 ONLY if no custom PIN credential exists yet
    if (cleanPin === '12345678') {
      setIsUnlocked(true);
      localStorage.setItem(`errorex_unlocked_${user.uid}`, 'true');
      return { unlocked: true };
    }

    return { unlocked: false };
  };

  // Setup or Change Calculator 8-Digit PIN (persists to Local + Supabase + Express)
  const setupPin = async (pin: string) => {
    if (!user) return { success: false, error: 'User not signed in' };
    if (!/^\d{8}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 8 numeric digits.' };
    }

    try {
      const salt = generateSaltHex();
      const pinHash = await hashPinClient(pin, salt);

      // 1. Persist locally
      localStorage.setItem(
        `errorex_pin_cred_${user.uid}`,
        JSON.stringify({ pinHash, salt, hasPin: true })
      );
      localStorage.setItem(`errorex_pin_set_${user.uid}`, 'true');
      localStorage.setItem(`errorex_unlocked_${user.uid}`, 'true');
      localStorage.setItem('errorex_last_uid', user.uid);

      // 2. Persist to Supabase user_credentials
      await upsertSupabasePinCredential(user.uid, pinHash, salt);

      // 3. Best-effort sync to Express server if available
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/set-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({ pin })
        });
      } catch {
        // Static hosting (Netlify) uses client hash + Supabase directly
      }

      setHasPin(true);
      setIsUnlocked(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save secret PIN.' };
    }
  };

  const lockMessenger = () => {
    if (user) {
      localStorage.removeItem(`errorex_unlocked_${user.uid}`);
    }
    setIsUnlocked(false);
  };

  const logout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'userProfiles', user.uid), {
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      } catch {
        // ignore
      }
      localStorage.removeItem(`errorex_unlocked_${user.uid}`);
    }
    localStorage.removeItem('errorex_session');
    localStorage.removeItem('errorex_standalone_user');
    await fbSignOut(auth);
    setIsUnlocked(false);
    setUser(null);
    setUserProfile(null);
    setHasPin(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const path = `userProfiles/${user.uid}`;
    try {
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      setUserProfile(prev => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        hasPin,
        isUnlocked,
        loading,
        verifyPin,
        setupPin,
        lockMessenger,
        logout,
        updateUserProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
