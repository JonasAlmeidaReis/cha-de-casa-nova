import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/client";
import { toDateOrNull } from "@/lib/firebase/date-utils";
import type { UserProfile, UserRole } from "@/lib/firebase/models";

type UserProfileRecord = {
  displayName: string;
  email: string;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function createGuestUserProfile(input: {
  uid: string;
  displayName: string;
  email: string;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", input.uid);

  await setDoc(userRef, {
    displayName: input.displayName,
    email: input.email,
    role: "guest",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function mapProfile(uid: string, raw: UserProfileRecord): UserProfile {
  return {
    id: uid,
    displayName: raw.displayName,
    email: raw.email,
    role: raw.role,
    createdAt: toDateOrNull(raw.createdAt),
    updatedAt: toDateOrNull(raw.updatedAt),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const raw = snapshot.data() as UserProfileRecord;
  return mapProfile(uid, raw);
}

export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", uid);

  return onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const raw = snapshot.data() as UserProfileRecord;
    callback(mapProfile(uid, raw));
  });
}

