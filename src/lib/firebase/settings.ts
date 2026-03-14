import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { toDateOrNull } from "@/lib/firebase/date-utils";
import {
  DEFAULT_EVENT_SETTINGS,
  type EventSettings,
} from "@/lib/firebase/models";

type EventSettingsRecord = {
  coupleName: string;
  eventDate?: unknown;
  story: string;
  venue: string;
  pixKey?: string;
  whatsappNumber?: string;
  coupleImageUrl: string;
  coupleImagePath: string;
  updatedAt?: unknown;
  updatedBy: string;
};

const SETTINGS_DOC_ID = "event";

function mapSettings(raw?: EventSettingsRecord): EventSettings {
  if (!raw) {
    return DEFAULT_EVENT_SETTINGS;
  }

  return {
    coupleName: raw.coupleName || DEFAULT_EVENT_SETTINGS.coupleName,
    eventDate: toDateOrNull(raw.eventDate) ?? DEFAULT_EVENT_SETTINGS.eventDate,
    story: raw.story || DEFAULT_EVENT_SETTINGS.story,
    venue: raw.venue || DEFAULT_EVENT_SETTINGS.venue,
    pixKey: raw.pixKey || DEFAULT_EVENT_SETTINGS.pixKey,
    whatsappNumber: raw.whatsappNumber || DEFAULT_EVENT_SETTINGS.whatsappNumber,
    coupleImageUrl: raw.coupleImageUrl || "",
    coupleImagePath: raw.coupleImagePath || "",
    updatedAt: toDateOrNull(raw.updatedAt),
    updatedBy: raw.updatedBy || "",
  };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function uploadCoupleImage(file: File): Promise<{ url: string; path: string }> {
  const storage = getFirebaseStorage();
  const safeName = sanitizeFileName(file.name);
  const path = `settings/couple/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "image/jpeg",
  });

  const url = await getDownloadURL(fileRef);
  return { url, path };
}

export function subscribeEventSettings(
  callback: (settings: EventSettings) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);

  return onSnapshot(settingsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(DEFAULT_EVENT_SETTINGS);
      return;
    }

    callback(mapSettings(snapshot.data() as EventSettingsRecord));
  });
}

export async function saveEventSettings(input: {
  coupleName: string;
  eventDate: Date;
  story: string;
  venue: string;
  pixKey: string;
  whatsappNumber: string;
  actorUid: string;
  currentImageUrl: string;
  currentImagePath: string;
  imageFile?: File | null;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);

  let imageUrl = input.currentImageUrl;
  let imagePath = input.currentImagePath;

  if (input.imageFile) {
    const uploaded = await uploadCoupleImage(input.imageFile);
    imageUrl = uploaded.url;
    imagePath = uploaded.path;
  }

  await setDoc(
    settingsRef,
    {
      coupleName: input.coupleName,
      eventDate: Timestamp.fromDate(input.eventDate),
      story: input.story,
      venue: input.venue,
      pixKey: input.pixKey,
      whatsappNumber: input.whatsappNumber,
      coupleImageUrl: imageUrl,
      coupleImagePath: imagePath,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorUid,
    },
    { merge: true },
  );

  if (input.imageFile && input.currentImagePath && input.currentImagePath !== imagePath) {
    try {
      const storage = getFirebaseStorage();
      await deleteObject(ref(storage, input.currentImagePath));
    } catch {
      // Se a imagem antiga nao existir mais, segue o fluxo normal.
    }
  }
}
