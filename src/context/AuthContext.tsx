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
import { StandaloneUser } from '../lib/standaloneApi';
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
  loginWithTestAccount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StandaloneUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check initial connection
  useEffect(() => {
    testConnection();
  }, []);

  const fetchUserProfile = async (currentUser: StandaloneUser) => {
    const path = `userProfiles/${currentUser.uid}`;
    try {
      const snap = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUserProfile(data);
      } else {
        // Create initial default profile
        const initialUsername = (currentUser.email?.split('@')[0] || `user_${currentUser.uid.slice(0, 5)}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .slice(0, 20);

        const newProfile: UserProfile = {
          uid: currentUser.uid,
          username: initialUsername,
          displayName: currentUser.displayName || initialUsername,
          photoURL: currentUser.photoURL || '',
          bio: 'Available on ERROREX',
          createdAt: new Date().toISOString(),
          isOnline: true,
          lastSeen: new Date().toISOString()
        };
        await setDoc(doc(db, 'userProfiles', currentUser.uid), newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const checkHasPin = async (currentUser: StandaloneUser) => {
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/has-pin', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasPin(Boolean(data.hasPin));
      } else {
        setHasPin(false);
      }
    } catch (err) {
      console.error('Failed to check has-pin:', err);
      setHasPin(false);
    }
  };

  const loginWithTestAccount = () => {
    const testUser: StandaloneUser = {
      uid: 'test_user_noor_1434',
      email: 'webdwebd18@gmail.com',
      displayName: 'Noor',
      photoURL: '',
      emailVerified: true,
      getIdToken: async () => 'demo_token_webdwebd18'
    };

    setUser(testUser);
    setUserProfile({
      uid: 'test_user_noor_1434',
      username: 'noor',
      displayName: 'Noor',
      photoURL: '',
      bio: 'ERROREX Master Sovereign Account',
      createdAt: new Date().toISOString(),
      isOnline: true,
      lastSeen: new Date().toISOString()
    });
    setHasPin(true);
    setIsUnlocked(false);
    localStorage.setItem('errorex_session', 'test_user_noor_1434');
  };

  useEffect(() => {
    // Check saved demo session if not already in standalone auth
    const saved = localStorage.getItem('errorex_session');
    if (saved === 'test_user_noor_1434') {
      loginWithTestAccount();
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser: StandaloneUser | null) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem('errorex_session');
        await Promise.all([
          fetchUserProfile(currentUser),
          checkHasPin(currentUser)
        ]);
      } else if (localStorage.getItem('errorex_session') === 'test_user_noor_1434') {
        // Keep test user session
      } else {
        setUser(null);
        setUserProfile(null);
        setHasPin(null);
        setIsUnlocked(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      } catch (e) {
        // quiet error
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  // Server-side PIN verification
  const verifyPin = async (pin: string) => {
    if (!user) return { unlocked: false };
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ pin })
      });

      if (res.status === 429) {
        const data = await res.json();
        return { unlocked: false, cooldown: true, remainingSeconds: data.remainingSeconds };
      }

      const data = await res.json();
      if (data.unlocked) {
        setIsUnlocked(true);
        return { unlocked: true };
      }
      return { unlocked: false };
    } catch (err) {
      console.error('PIN verification error:', err);
      return { unlocked: false };
    }
  };

  // Setup Initial PIN
  const setupPin = async (pin: string) => {
    if (!user) return { success: false, error: 'User not signed in' };
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasPin(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to setup PIN' };
    } catch (err) {
      console.error('Error setting PIN:', err);
      return { success: false, error: 'Connection failed' };
    }
  };

  const lockMessenger = () => {
    setIsUnlocked(false);
  };

  const logout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'userProfiles', user.uid), {
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('errorex_session');
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
        refreshProfile,
        loginWithTestAccount
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
