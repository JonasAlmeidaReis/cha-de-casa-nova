"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import {
  cancelGiftReservation,
  confirmPixReceipt,
  subscribeReservedGifts,
} from "@/lib/firebase/gifts";
import type { Gift } from "@/lib/firebase/models";
import { formatCurrencyBRLFromCents } from "@/lib/formatters";

type ReservaStatus = "Marketplace" | "PIX" | "Não informado";

type ReservationRow = {
  id: string;
  gift: Gift;
  reservationUid: string | null;
  reservedByName: string | null;
  quantity: number;
  reservationMethod: Gift["reservationMethod"];
  pixReceiptConfirmedAt: Date | null;
  reservedAt: Date | null;
};

const statusStyles: Record<ReservaStatus, string> = {
  Marketplace: "bg-[#e5ecd3] text-[#4c5f2a]",
  PIX: "bg-[#f0ecd9] text-[#89703b]",
  "Não informado": "bg-[#e1e7d4] text-[#6f775f]",
};

function formatReservationDate(value: Date | null): string {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function getReservationRows(gifts: Gift[]): ReservationRow[] {
  return gifts.flatMap<ReservationRow>((gift) => {
    if (gift.allowsQuantity) {
      return gift.quantityReservations.map((reservation) => ({
        id: `${gift.id}-${reservation.uid}`,
        gift,
        reservationUid: reservation.uid,
        reservedByName: reservation.reservedByName,
        quantity: reservation.quantity,
        reservationMethod: reservation.reservationMethod,
        pixReceiptConfirmedAt: reservation.pixReceiptConfirmedAt,
        reservedAt: reservation.reservedAt,
      }));
    }

    if (gift.reservationStatus !== "reserved") {
      return [];
    }

    return [
      {
        id: gift.id,
        gift,
        reservationUid: null,
        reservedByName: gift.reservedByName,
        quantity: 1,
        reservationMethod: gift.reservationMethod,
        pixReceiptConfirmedAt: gift.pixReceiptConfirmedAt,
        reservedAt: gift.reservedAt,
      },
    ];
  });
}

export function AdminReservasTable() {
  const { profile } = useAuthSession();
  const [reservas, setReservas] = useState<Gift[]>([]);
  const [search, setSearch] = useState("");
  const [loadingCancelId, setLoadingCancelId] = useState<string | null>(null);
  const [loadingConfirmPixId, setLoadingConfirmPixId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => subscribeReservedGifts(setReservas, 200), []);

  const reservationRows = useMemo(() => getReservationRows(reservas), [reservas]);

  const filteredReservas = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return reservationRows;
    }

    return reservationRows.filter((reserva) => {
      const convidado = (reserva.reservedByName ?? "").toLowerCase();
      const presente = reserva.gift.name.toLowerCase();
      const room = reserva.gift.room.toLowerCase();
      return convidado.includes(query) || presente.includes(query) || room.includes(query);
    });
  }, [reservationRows, search]);

  const handleCancelReservation = async (giftId: string, reservationUid: string | null) => {
    if (!profile) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingCancelId(reservationUid ? `${giftId}-${reservationUid}` : giftId);
      await cancelGiftReservation({
        giftId,
        reservationUid: reservationUid ?? undefined,
        actorUid: profile.id,
        actorRole: profile.role,
      });
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível cancelar a reserva.");
    } finally {
      setLoadingCancelId(null);
    }
  };

  const handleConfirmPix = async (giftId: string, reservationUid: string | null) => {
    if (!profile) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingConfirmPixId(reservationUid ? `${giftId}-${reservationUid}` : giftId);
      await confirmPixReceipt({
        giftId,
        reservationUid: reservationUid ?? undefined,
        actorUid: profile.id,
        actorRole: profile.role,
      });
      setNotice("Recebimento de PIX confirmado.");
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível confirmar o recebimento do PIX.");
    } finally {
      setLoadingConfirmPixId(null);
    }
  };

  return (
    <article className="surface min-w-0 overflow-hidden rounded-2xl">
      <div className="border-b border-[#dde4cf] px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Reservas</h2>
            <p className="mt-1 text-sm text-[#737b69]">
              {filteredReservas.length} reserva(s) encontrada(s)
            </p>
          </div>

          <label className="w-full md:max-w-md">
            <span className="sr-only">Buscar reserva</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por convidado, presente ou cômodo"
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[#9b3e3e]">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-[#486227]">{notice}</p> : null}
      </div>

      <div className="h-full max-h-[449px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="text-left text-xs tracking-[0.12em] text-[#838a79] uppercase">
              <th className="px-6 py-4 font-semibold">Convidado</th>
              <th className="px-6 py-4 font-semibold">Presente</th>
              <th className="px-6 py-4 font-semibold">Valor</th>
              <th className="px-6 py-4 font-semibold">Forma</th>
              <th className="px-6 py-4 font-semibold">Data</th>
              <th className="px-6 py-4 font-semibold">PIX</th>
              <th className="px-6 py-4 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservas.length === 0 ? (
              <tr className="border-t border-[#e6ecd8]">
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-sm font-medium text-[#676f5c]"
                >
                  Nenhuma reserva encontrada para essa busca.
                </td>
              </tr>
            ) : (
              filteredReservas.map((reserva) => {
                const isPix = reserva.reservationMethod === "pix";
                const actionId = reserva.id;
                const methodLabel: ReservaStatus =
                  reserva.reservationMethod === "pix"
                    ? "PIX"
                    : reserva.reservationMethod === "marketplace"
                      ? "Marketplace"
                      : "Não informado";

                return (
                  <tr key={reserva.id} className="border-t border-[#e6ecd8]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#3d452f]">
                      <span
                        className="block max-w-[180px] truncate"
                        title={reserva.reservedByName ?? "-"}
                      >
                        {reserva.reservedByName ?? "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#616955]">
                      <span className="block max-w-[220px] truncate" title={reserva.gift.name}>
                        {reserva.gift.name}
                      </span>
                      {reserva.gift.room ? (
                        <span className="mt-1 block max-w-[220px] truncate text-xs text-[#778069]" title={reserva.gift.room}>
                          {reserva.gift.room}
                        </span>
                      ) : null}
                      {reserva.gift.allowsQuantity ? (
                        <span className="mt-1 block max-w-[220px] truncate text-xs text-[#778069]">
                          Quantidade: {reserva.quantity}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#676f5c] whitespace-nowrap">
                      {formatCurrencyBRLFromCents(reserva.gift.priceCents)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex w-28 justify-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${
                          statusStyles[methodLabel]
                        }`}
                      >
                        {methodLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#676f5c] whitespace-nowrap">
                      {formatReservationDate(reserva.reservedAt)}
                    </td>
                    <td className="px-6 py-4">
                      {!isPix ? (
                        <span className="text-xs text-[#8a917e]">--</span>
                      ) : reserva.pixReceiptConfirmedAt ? (
                        <span className="inline-flex rounded-full bg-[#e5ecd3] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#4c5f2a] uppercase">
                          Recebido
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmPix(reserva.gift.id, reserva.reservationUid)
                          }
                          disabled={loadingConfirmPixId === actionId}
                          className="gold-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingConfirmPixId === actionId
                            ? "Confirmando..."
                            : "Confirmar PIX"}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleCancelReservation(reserva.gift.id, reserva.reservationUid)
                        }
                        disabled={loadingCancelId === actionId}
                        className="ghost-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingCancelId === actionId ? "Cancelando..." : "Cancelar"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
