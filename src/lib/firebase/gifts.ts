import {
  collection,
  deleteDoc,
  deleteField,
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
import { isGiftRoom } from "@/lib/firebase/models";
import type {
  Gift,
  GiftRoom,
  GiftQuantityReservation,
  ReservationMethod,
  ReservationStatus,
  UserRole,
} from "@/lib/firebase/models";

type GiftQuantityReservationRecord = {
  reservedByName?: string;
  reservedByEmail?: string;
  quantity?: number;
  reservationMethod?: ReservationMethod | null;
  pixReceiptConfirmedAt?: unknown;
  pixReceiptConfirmedBy?: string | null;
  reservedAt?: unknown;
};

type GiftRecord = {
  name: string;
  room?: string;
  allowsQuantity?: boolean;
  requestedQuantity?: number;
  reservedQuantity?: number;
  quantityReservations?: Record<string, GiftQuantityReservationRecord>;
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
  room: GiftRoom;
  allowsQuantity: boolean;
  requestedQuantity: number;
  priceCents: number;
  productUrl: string;
  isActive: boolean;
};

const GIFTS_COLLECTION = "gifts";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getQuantityReservations(
  raw: GiftRecord,
): GiftQuantityReservation[] {
  if (!raw.quantityReservations || typeof raw.quantityReservations !== "object") {
    return [];
  }

  return Object.entries(raw.quantityReservations)
    .map(([uid, reservation]) => {
      if (!reservation || typeof reservation !== "object") {
        return null;
      }

      const reservationMethod =
        reservation.reservationMethod === "marketplace" ||
        reservation.reservationMethod === "pix"
          ? reservation.reservationMethod
          : null;

      return {
        uid,
        reservedByName: reservation.reservedByName ?? "",
        reservedByEmail: reservation.reservedByEmail ?? "",
        quantity:
          typeof reservation.quantity === "number" && reservation.quantity > 0
            ? reservation.quantity
            : 1,
        reservationMethod,
        pixReceiptConfirmedAt: toDateOrNull(reservation.pixReceiptConfirmedAt),
        pixReceiptConfirmedBy: reservation.pixReceiptConfirmedBy ?? null,
        reservedAt: toDateOrNull(reservation.reservedAt),
      };
    })
    .filter((reservation): reservation is GiftQuantityReservation => Boolean(reservation))
    .sort((current, next) => {
      const currentTime = current.reservedAt?.getTime() ?? 0;
      const nextTime = next.reservedAt?.getTime() ?? 0;
      return nextTime - currentTime;
    });
}

function getRequestedQuantity(raw: GiftRecord): number {
  return typeof raw.requestedQuantity === "number" && raw.requestedQuantity > 0
    ? raw.requestedQuantity
    : 1;
}

function getReservedQuantity(raw: GiftRecord): number {
  if (typeof raw.reservedQuantity === "number" && raw.reservedQuantity >= 0) {
    return raw.reservedQuantity;
  }

  return raw.reservationStatus === "reserved" ? 1 : 0;
}

function toQuantityReservationRecord(
  reservations: GiftQuantityReservation[],
): Record<string, GiftQuantityReservationRecord> {
  return reservations.reduce<Record<string, GiftQuantityReservationRecord>>(
    (accumulator, reservation) => {
      accumulator[reservation.uid] = {
        reservedByName: reservation.reservedByName,
        reservedByEmail: reservation.reservedByEmail,
        quantity: reservation.quantity,
        reservationMethod: reservation.reservationMethod,
        pixReceiptConfirmedAt: reservation.pixReceiptConfirmedAt,
        pixReceiptConfirmedBy: reservation.pixReceiptConfirmedBy,
        reservedAt: reservation.reservedAt,
      };
      return accumulator;
    },
    {},
  );
}

function mapGift(id: string, raw: GiftRecord): Gift {
  const reservationMethod =
    raw.reservationMethod === "marketplace" || raw.reservationMethod === "pix"
      ? raw.reservationMethod
      : null;
  const allowsQuantity = raw.allowsQuantity === true;
  const requestedQuantity = getRequestedQuantity(raw);
  const reservedQuantity = getReservedQuantity(raw);

  return {
    id,
    name: raw.name,
    room: typeof raw.room === "string" && isGiftRoom(raw.room) ? raw.room : "",
    allowsQuantity,
    requestedQuantity,
    reservedQuantity,
    quantityReservations: getQuantityReservations(raw),
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
  const reservedQuery = query(giftsRef, orderBy("updatedAt", "desc"));

  return onSnapshot(reservedQuery, (snapshot) => {
    const items = snapshot.docs
      .map((giftDoc) => {
        const raw = giftDoc.data() as GiftRecord;
        return mapGift(giftDoc.id, raw);
      })
      .filter(
        (gift) =>
          gift.reservationStatus === "reserved" || gift.reservedQuantity > 0,
      )
      .slice(0, limitCount);

    callback(items);
  });
}

export function subscribeMyReservedGifts(
  uid: string,
  callback: (gifts: Gift[]) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const giftsRef = collection(db, GIFTS_COLLECTION);
  const myReservationsQuery = query(giftsRef, orderBy("updatedAt", "desc"));

  return onSnapshot(myReservationsQuery, (snapshot) => {
    const items = snapshot.docs
      .map((giftDoc) => {
        const raw = giftDoc.data() as GiftRecord;
        return mapGift(giftDoc.id, raw);
      })
      .filter(
        (gift) =>
          gift.reservedByUid === uid ||
          gift.quantityReservations.some((reservation) => reservation.uid === uid),
      );

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
    room: input.room,
    allowsQuantity: input.allowsQuantity,
    requestedQuantity: input.allowsQuantity ? input.requestedQuantity : 1,
    reservedQuantity: 0,
    quantityReservations: {},
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

  const requestedQuantity = input.allowsQuantity ? input.requestedQuantity : 1;
  const reservationStatus: ReservationStatus = input.allowsQuantity
    ? currentGift.reservedQuantity >= requestedQuantity
      ? "reserved"
      : "available"
    : currentGift.reservationStatus;

  await updateDoc(giftRef, {
    name: input.name,
    room: input.room,
    allowsQuantity: input.allowsQuantity,
    requestedQuantity,
    reservedQuantity: currentGift.reservedQuantity,
    quantityReservations: toQuantityReservationRecord(
      currentGift.quantityReservations,
    ),
    priceCents: input.priceCents,
    productUrl: input.productUrl,
    imageUrl,
    imagePath,
    isActive: input.isActive,
    reservationStatus,
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

  if (gift.reservationStatus !== "available" || getReservedQuantity(gift) > 0) {
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
  quantity?: number;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, input.giftId);
  const requestedQuantity = Math.max(1, Math.floor(input.quantity ?? 1));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(giftRef);
    if (!snapshot.exists()) {
      throw new Error("Presente não encontrado.");
    }

    const gift = snapshot.data() as GiftRecord;
    if (!gift.isActive || gift.reservationStatus !== "available") {
      throw new Error("Presente indisponível para reserva.");
    }

    if (gift.allowsQuantity === true) {
      const quantityReservations = gift.quantityReservations ?? {};
      if (quantityReservations[input.actorUid]) {
        throw new Error("Você já reservou este presente.");
      }

      const totalQuantity = getRequestedQuantity(gift);
      const currentReservedQuantity = getReservedQuantity(gift);
      const availableQuantity = totalQuantity - currentReservedQuantity;

      if (requestedQuantity > availableQuantity) {
        throw new Error("Quantidade indisponível para este presente.");
      }

      const nextReservedQuantity = currentReservedQuantity + requestedQuantity;

      transaction.update(giftRef, {
        [`quantityReservations.${input.actorUid}`]: {
          reservedByName: input.actorName,
          reservedByEmail: input.actorEmail,
          quantity: requestedQuantity,
          reservationMethod: input.reservationMethod,
          pixReceiptConfirmedAt: null,
          pixReceiptConfirmedBy: null,
          reservedAt: serverTimestamp(),
        },
        reservedQuantity: nextReservedQuantity,
        reservationStatus:
          nextReservedQuantity >= totalQuantity ? "reserved" : "available",
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
      return;
    }

    transaction.update(giftRef, {
      allowsQuantity: false,
      requestedQuantity: 1,
      quantityReservations: {},
      reservationStatus: "reserved",
      reservedByUid: input.actorUid,
      reservedByName: input.actorName,
      reservedByEmail: input.actorEmail,
      reservationMethod: input.reservationMethod,
      reservedQuantity: 1,
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
  reservationUid?: string;
}): Promise<void> {
  const db = getFirebaseFirestore();
  const giftRef = doc(db, GIFTS_COLLECTION, input.giftId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(giftRef);
    if (!snapshot.exists()) {
      throw new Error("Presente não encontrado.");
    }

    const gift = snapshot.data() as GiftRecord;
    if (gift.allowsQuantity === true) {
      const targetUid = input.reservationUid ?? input.actorUid;
      const reservation = gift.quantityReservations?.[targetUid];

      if (!reservation) {
        throw new Error("Este presente não possui reserva ativa.");
      }

      const canCancel = input.actorRole === "admin" || targetUid === input.actorUid;
      if (!canCancel) {
        throw new Error("Você não pode cancelar esta reserva.");
      }

      const totalQuantity = getRequestedQuantity(gift);
      const currentReservedQuantity = getReservedQuantity(gift);
      const reservationQuantity =
        typeof reservation.quantity === "number" && reservation.quantity > 0
          ? reservation.quantity
          : 1;
      const nextReservedQuantity = Math.max(
        0,
        currentReservedQuantity - reservationQuantity,
      );

      transaction.update(giftRef, {
        [`quantityReservations.${targetUid}`]: deleteField(),
        reservedQuantity: nextReservedQuantity,
        reservationStatus:
          nextReservedQuantity >= totalQuantity ? "reserved" : "available",
        updatedAt: serverTimestamp(),
        updatedBy: input.actorUid,
      });
      return;
    }

    if (gift.reservationStatus !== "reserved") {
      throw new Error("Este presente não possui reserva ativa.");
    }

    const canCancel =
      input.actorRole === "admin" || gift.reservedByUid === input.actorUid;

    if (!canCancel) {
      throw new Error("Você não pode cancelar esta reserva.");
    }

    transaction.update(giftRef, {
      allowsQuantity: false,
      requestedQuantity: 1,
      quantityReservations: {},
      reservationStatus: "available",
      reservedByUid: null,
      reservedByName: null,
      reservedByEmail: null,
      reservationMethod: null,
      reservedQuantity: 0,
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
  reservationUid?: string;
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
    if (gift.allowsQuantity === true) {
      const targetUid = input.reservationUid;
      if (!targetUid) {
        throw new Error("Reserva não informada.");
      }

      const reservation = gift.quantityReservations?.[targetUid];
      if (!reservation) {
        throw new Error("Este presente não possui reserva ativa.");
      }

      if (reservation.reservationMethod !== "pix") {
        throw new Error("Este presente não foi selecionado para pagamento via PIX.");
      }

      if (reservation.pixReceiptConfirmedAt) {
        throw new Error("Recebimento de PIX já confirmado.");
      }

      transaction.update(giftRef, {
        [`quantityReservations.${targetUid}.pixReceiptConfirmedAt`]:
          serverTimestamp(),
        [`quantityReservations.${targetUid}.pixReceiptConfirmedBy`]: input.actorUid,
        updatedAt: serverTimestamp(),
        updatedBy: input.actorUid,
      });
      return;
    }

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
