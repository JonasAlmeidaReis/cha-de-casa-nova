import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase/client";
import { toDateOrNull } from "@/lib/firebase/date-utils";
import type {
  Gift,
  ReservationMethod,
  ReservationStatus,
  UserRole,
} from "@/lib/firebase/models";

type GiftRecord = {
  name: string;
  priceCents: number;
  productUrl: string;
  imageUrl: string;
  imagePath: string;
  isActive: boolean;
  reservationStatus: ReservationStatus;
  reservedByUid: string | null;
  reservedByName: string | null;
  reservedByEmail: string | null;
  reservationMethod?: ReservationMethod | null;
  pixReceiptConfirmedAt?: unknown;
  pixReceiptConfirmedBy?: string | null;
  reservedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy: string;
  updatedBy: string;
};

type GiftInput = {
  name: string;
  priceCents: number;
  productUrl: string;
  isActive: boolean;
};

const GIFTS_COLLECTION = "gifts";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function mapGift(id: string, raw: GiftRecord): Gift {
  const reservationMethod =
    raw.reservationMethod === "marketplace" || raw.reservationMethod === "pix"
      ? raw.reservationMethod
      : null;

  return {
    id,
    name: raw.name,
    priceCents: raw.priceCents,
    productUrl: raw.productUrl,
    imageUrl: raw.imageUrl,
    imagePath: raw.imagePath,
    isActive: raw.isActive,
    reservationStatus: raw.reservationStatus,
    reservedByUid: raw.reservedByUid ?? null,
    reservedByName: raw.reservedByName ?? null,
    reservedByEmail: raw.reservedByEmail ?? null,
    reservationMethod,
    pixReceiptConfirmedAt: toDateOrNull(raw.pixReceiptConfirmedAt),
    pixReceiptConfirmedBy: raw.pixReceiptConfirmedBy ?? null,
    reservedAt: toDateOrNull(raw.reservedAt),
    createdAt: toDateOrNull(raw.createdAt),
    updatedAt: toDateOrNull(raw.updatedAt),
    createdBy: raw.createdBy,
    updatedBy: raw.updatedBy,
  };
}

async function uploadGiftImage(giftId: string, file: File): Promise<{ url: string; path: string }> {
  const storage = getFirebaseStorage();
  const safeName = sanitizeFileName(file.name);
  const path = `gifts/${giftId}/${Date.now()}-${safeName}`;
  const imageRef = ref(storage, path);

  await uploadBytes(imageRef, file, {
    contentType: file.type || "image/jpeg",
  });

  const url = await getDownloadURL(imageRef);
  return { url, path };
}

export function subscribeGifts(callback: (gifts: Gift[]) => void): Unsubscribe {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const giftsQuery = query(giftsRef, orderBy("createdAt", "desc"));

  return onSnapshot(giftsQuery, (snapshot) => {
    const items: Gift[] = snapshot.docs.map((giftDoc) => {
      const raw = giftDoc.data() as GiftRecord;
      return mapGift(giftDoc.id, raw);
    });

    callback(items);
  });
}

export function subscribeReservedGifts(
  callback: (gifts: Gift[]) => void,
  limitCount = 20,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const reservedQuery = query(
    giftsRef,
    where("reservationStatus", "==", "reserved"),
    orderBy("reservedAt", "desc"),
  );

  return onSnapshot(reservedQuery, (snapshot) => {
    const items = snapshot.docs.slice(0, limitCount).map((giftDoc) => {
      const raw = giftDoc.data() as GiftRecord;
      return mapGift(giftDoc.id, raw);
    });

    callback(items);
  });
}

export function subscribeMyReservedGifts(
  uid: string,
  callback: (gifts: Gift[]) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const myReservationsQuery = query(
    giftsRef,
    where("reservedByUid", "==", uid),
    where("reservationStatus", "==", "reserved"),
    orderBy("updatedAt", "desc"),
  );

  return onSnapshot(myReservationsQuery, (snapshot) => {
    const items = snapshot.docs.map((giftDoc) => {
      const raw = giftDoc.data() as GiftRecord;
      return mapGift(giftDoc.id, raw);
    });

    callback(items);
  });
}

export async function countAllGifts(): Promise<number> {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const snapshot = await getCountFromServer(giftsRef);
  return snapshot.data().count;
}

export async function countGiftsByStatus(status: ReservationStatus): Promise<number> {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const statusQuery = query(giftsRef, where("reservationStatus", "==", status));
  const snapshot = await getCountFromServer(statusQuery);
  return snapshot.data().count;
}

export async function createGift(input: GiftInput & {
  imageFile: File;
  actorUid: string;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(collection(db, GIFTS_COLLECTION));
  const uploaded = await uploadGiftImage(giftRef.id, input.imageFile);

  await setDoc(giftRef, {
    name: input.name,
    priceCents: input.priceCents,
    productUrl: input.productUrl,
    imageUrl: uploaded.url,
    imagePath: uploaded.path,
    isActive: input.isActive,
    reservationStatus: "available",
    reservedByUid: null,
    reservedByName: null,
    reservedByEmail: null,
    reservationMethod: null,
    pixReceiptConfirmedAt: null,
    pixReceiptConfirmedBy: null,
    reservedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: input.actorUid,
    updatedBy: input.actorUid,
  });
}

export async function updateGift(
  giftId: string,
  currentGift: Gift,
  input: GiftInput & {
    actorUid: string;
    imageFile?: File | null;
  },
): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, giftId);

  let imageUrl = currentGift.imageUrl;
  let imagePath = currentGift.imagePath;

  if (input.imageFile) {
    const uploaded = await uploadGiftImage(giftId, input.imageFile);
    imageUrl = uploaded.url;
    imagePath = uploaded.path;
  }

  await updateDoc(giftRef, {
    name: input.name,
    priceCents: input.priceCents,
    productUrl: input.productUrl,
    imageUrl,
    imagePath,
    isActive: input.isActive,
    reservationMethod: currentGift.reservationMethod,
    pixReceiptConfirmedAt: currentGift.pixReceiptConfirmedAt ?? null,
    pixReceiptConfirmedBy: currentGift.pixReceiptConfirmedBy ?? null,
    updatedAt: serverTimestamp(),
    updatedBy: input.actorUid,
  });

  if (input.imageFile && currentGift.imagePath && currentGift.imagePath !== imagePath) {
    try {
      const storage = getFirebaseStorage();
      await deleteObject(ref(storage, currentGift.imagePath));
    } catch {
      // Segue o fluxo caso a imagem antiga não exista mais.
    }
  }
}

export async function deleteGift(giftId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, giftId);
  const snapshot = await getDoc(giftRef);

  if (!snapshot.exists()) {
    throw new Error("Presente não encontrado.");
  }

  const gift = snapshot.data() as GiftRecord;

  if (gift.reservationStatus !== "available") {
    throw new Error("Não é possível excluir um presente reservado.");
  }

  await deleteDoc(giftRef);

  if (gift.imagePath) {
    try {
      const storage = getFirebaseStorage();
      await deleteObject(ref(storage, gift.imagePath));
    } catch {
      // Segue caso a imagem já tenha sido removida.
    }
  }
}

export async function reserveGift(input: {
  giftId: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  reservationMethod: ReservationMethod;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, input.giftId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(giftRef);
    if (!snapshot.exists()) {
      throw new Error("Presente não encontrado.");
    }

    const gift = snapshot.data() as GiftRecord;
    if (!gift.isActive || gift.reservationStatus !== "available") {
      throw new Error("Presente indisponível para reserva.");
    }

    transaction.update(giftRef, {
      reservationStatus: "reserved",
      reservedByUid: input.actorUid,
      reservedByName: input.actorName,
      reservedByEmail: input.actorEmail,
      reservationMethod: input.reservationMethod,
      pixReceiptConfirmedAt: null,
      pixReceiptConfirmedBy: null,
      reservedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: input.actorUid,
    });
  });
}

export async function cancelGiftReservation(input: {
  giftId: string;
  actorUid: string;
  actorRole: UserRole;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, input.giftId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(giftRef);
    if (!snapshot.exists()) {
      throw new Error("Presente não encontrado.");
    }

    const gift = snapshot.data() as GiftRecord;
    if (gift.reservationStatus !== "reserved") {
      throw new Error("Este presente não possui reserva ativa.");
    }

    const canCancel =
      input.actorRole === "admin" || gift.reservedByUid === input.actorUid;

    if (!canCancel) {
      throw new Error("Você não pode cancelar esta reserva.");
    }

    transaction.update(giftRef, {
      reservationStatus: "available",
      reservedByUid: null,
      reservedByName: null,
      reservedByEmail: null,
      reservationMethod: null,
      pixReceiptConfirmedAt: null,
      pixReceiptConfirmedBy: null,
      reservedAt: null,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorUid,
    });
  });
}

export async function confirmPixReceipt(input: {
  giftId: string;
  actorUid: string;
  actorRole: UserRole;
}): Promise<void> {
  if (input.actorRole !== "admin") {
    throw new Error("Apenas administradores podem confirmar PIX.");
  }

  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, input.giftId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(giftRef);
    if (!snapshot.exists()) {
      throw new Error("Presente não encontrado.");
    }

    const gift = snapshot.data() as GiftRecord;
    if (gift.reservationStatus !== "reserved") {
      throw new Error("Este presente não possui reserva ativa.");
    }

    if (gift.reservationMethod !== "pix") {
      throw new Error("Este presente não foi selecionado para pagamento via PIX.");
    }

    if (gift.pixReceiptConfirmedAt) {
      throw new Error("Recebimento de PIX já confirmado.");
    }

    transaction.update(giftRef, {
      pixReceiptConfirmedAt: serverTimestamp(),
      pixReceiptConfirmedBy: input.actorUid,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorUid,
    });
  });
}
