import type { FirestoreDateLike } from "@/lib/firebase/models";

type TimestampLike = {
  toDate: () => Date;
};

function hasToDate(value: unknown): value is TimestampLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "toDate" in value && typeof value.toDate === "function";
}

export function toDateOrNull(value: FirestoreDateLike | unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (hasToDate(value)) {
    return value.toDate();
  }

  return null;
}

