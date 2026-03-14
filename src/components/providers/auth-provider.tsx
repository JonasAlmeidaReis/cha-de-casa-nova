"use client";

import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/firebase/models";
import { subscribeUserProfile } from "@/lib/firebase/users";

type AuthContextValue = {
  authUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    try {
      const auth = getFirebaseAuth();
      unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
        setAuthUser(nextUser);
        setAuthReady(true);

        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (!nextUser) {
          setProfile(null);
          setProfileLoading(false);
          return;
        }

        setProfileLoading(true);
        unsubscribeProfile = subscribeUserProfile(nextUser.uid, (nextProfile) => {
          setProfile(nextProfile);
          setProfileLoading(false);
        });
      });
    } catch (error) {
      console.error(error);
      queueMicrotask(() => {
        setAuthReady(true);
        setProfile(null);
        setProfileLoading(false);
      });
    }

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      profile,
      loading: !authReady || (!!authUser && profileLoading),
      signOutUser,
    }),
    [authReady, authUser, profile, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthSession deve ser usado dentro de AuthProvider.");
  }

  return context;
}
