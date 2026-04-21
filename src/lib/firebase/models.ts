import type { Timestamp } from "firebase/firestore";

export type UserRole = "guest" | "admin";

export type FirestoreDateLike = Timestamp | Date | null | undefined;

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ReservationStatus = "available" | "reserved";
export type ReservationMethod = "marketplace" | "pix";

export const GIFT_ROOMS = [
  "Cozinha",
  "Quarto",
  "Banheiro",
  "Lavanderia",
  "Varanda",
  "Sala",
] as const;

export type GiftRoom = (typeof GIFT_ROOMS)[number];

export function isGiftRoom(value: string): value is GiftRoom {
  return GIFT_ROOMS.includes(value as GiftRoom);
}

export type GiftQuantityReservation = {
  uid: string;
  reservedByName: string;
  reservedByEmail: string;
  quantity: number;
  reservationMethod: ReservationMethod | null;
  pixReceiptConfirmedAt: Date | null;
  pixReceiptConfirmedBy: string | null;
  reservedAt: Date | null;
};

export type Gift = {
  id: string;
  name: string;
  room: GiftRoom | "";
  allowsQuantity: boolean;
  requestedQuantity: number;
  reservedQuantity: number;
  quantityReservations: GiftQuantityReservation[];
  priceCents: number;
  productUrl: string;
  imageUrl: string;
  imagePath: string;
  isActive: boolean;
  reservationStatus: ReservationStatus;
  reservedByUid: string | null;
  reservedByName: string | null;
  reservedByEmail: string | null;
  reservationMethod: ReservationMethod | null;
  pixReceiptConfirmedAt: Date | null;
  pixReceiptConfirmedBy: string | null;
  reservedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
  updatedBy: string;
};

export type EventSettings = {
  coupleName: string;
  eventDate: Date | null;
  story: string;
  venue: string;
  pixKey: string;
  whatsappNumber: string;
  coupleImageUrl: string;
  coupleImagePath: string;
  updatedAt: Date | null;
  updatedBy: string;
};

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  coupleName: "Fulana & Fulano",
  eventDate: new Date("2026-05-02T12:00:00.000Z"),
  story:
    "Nos conhecemos em uma festa e, desde então, nunca mais nos separamos. Depois de muitos momentos especiais, decidimos dar o próximo passo e iniciar a nossa vida a dois. Estamos ansiosos para celebrar este dia especial com vocês.",
  venue: "Avenida Teste, 123 - Vila da Imaginação, São Paulo - SP",
  pixKey: "11123456789",
  whatsappNumber: "+5511123456789",
  coupleImageUrl: "",
  coupleImagePath: "",
  updatedAt: null,
  updatedBy: "",
};
