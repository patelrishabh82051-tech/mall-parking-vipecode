import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { auth, isLiveFirebaseConfigured } from '../services/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: UserRole) => void;
  openAuthModal: (initialRole?: UserRole) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  targetRoleForModal: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo profiles for rapid evaluation of the two distinct roles
const DEMO_DRIVER: UserProfile = {
  uid: 'driver-demo-uid',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  role: 'driver',
  token: 'mock-driver-token-jwt',
};

const DEMO_ADMIN: UserProfile = {
  uid: 'admin-demo-uid',
  name: 'Mall Operations Lead',
  email: 'patelrishabh82051@gmail.com',
  role: 'admin',
  token: 'mock-admin-token-jwt',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('parksmart_current_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEMO_DRIVER; // Default to demo driver so user immediately sees live interactive dashboard
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [targetRoleForModal, setTargetRoleForModal] = useState<UserRole>('driver');

  useEffect(() => {
    if (isLiveFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const idTokenResult = await fbUser.getIdTokenResult();
          const token = await fbUser.getIdToken();
          // Check admin custom claim or admin email
          const isAdminClaim =
            idTokenResult.claims.role === 'admin' ||
            idTokenResult.claims.admin === true ||
            fbUser.email === 'patelrishabh82051@gmail.com';

          const profile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            role: isAdminClaim ? 'admin' : 'driver',
            token,
          };
          setUser(profile);
          localStorage.setItem('parksmart_current_user', JSON.stringify(profile));
        } else {
          // If no active live session and not explicitly in mock session, clear
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (u: UserProfile | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('parksmart_current_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('parksmart_current_user');
    }
  };

  const loginWithGoogle = async () => {
    if (isLiveFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const tokenResult = await res.user.getIdTokenResult();
      const token = await res.user.getIdToken();
      const isAdminClaim =
        tokenResult.claims.role === 'admin' ||
        tokenResult.claims.admin === true ||
        res.user.email === 'patelrishabh82051@gmail.com';

      const profile: UserProfile = {
        uid: res.user.uid,
        name: res.user.displayName || 'Google User',
        email: res.user.email || '',
        role: isAdminClaim ? 'admin' : 'driver',
        token,
      };
      saveUserSession(profile);
      setIsAuthModalOpen(false);
    } else {
      // In local mode, simulate Google login with selected role
      quickLoginAs(targetRoleForModal);
      setIsAuthModalOpen(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isLiveFirebaseConfigured && auth) {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const tokenResult = await res.user.getIdTokenResult();
      const token = await res.user.getIdToken();
      const isAdminClaim =
        tokenResult.claims.role === 'admin' ||
        tokenResult.claims.admin === true ||
        email === 'patelrishabh82051@gmail.com';

      const profile: UserProfile = {
        uid: res.user.uid,
        name: res.user.displayName || email.split('@')[0],
        email: email,
        role: isAdminClaim ? 'admin' : 'driver',
        token,
      };
      saveUserSession(profile);
      setIsAuthModalOpen(false);
    } else {
      // Fallback local authentication
      const isAdminEmail = email.toLowerCase().includes('admin') || email === 'patelrishabh82051@gmail.com';
      const role: UserRole = isAdminEmail ? 'admin' : 'driver';
      const profile: UserProfile = {
        uid: `usr-${Date.now().toString(36)}`,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email,
        role,
        token: `mock-${role}-token`,
      };
      saveUserSession(profile);
      setIsAuthModalOpen(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string) => {
    if (isLiveFirebaseConfigured && auth) {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const token = await res.user.getIdToken();
      const profile: UserProfile = {
        uid: res.user.uid,
        name: name || email.split('@')[0],
        email: email,
        role: 'driver', // Default new accounts to customer driver
        token,
      };
      saveUserSession(profile);
      setIsAuthModalOpen(false);
    } else {
      const profile: UserProfile = {
        uid: `usr-${Date.now().toString(36)}`,
        name,
        email,
        role: 'driver',
        token: 'mock-driver-token',
      };
      saveUserSession(profile);
      setIsAuthModalOpen(false);
    }
  };

  const logout = async () => {
    if (isLiveFirebaseConfigured && auth) {
      await signOut(auth);
    }
    saveUserSession(null);
  };

  const quickLoginAs = (role: UserRole) => {
    if (role === 'admin') {
      saveUserSession(DEMO_ADMIN);
    } else {
      saveUserSession(DEMO_DRIVER);
    }
  };

  const openAuthModal = (initialRole: UserRole = 'driver') => {
    setTargetRoleForModal(initialRole);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        quickLoginAs,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        targetRoleForModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
