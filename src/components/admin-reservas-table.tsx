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

type ReservaStatus = "Marketplace" | "PIX" | "Nao informado";

const statusStyles: Record<ReservaStatus, string> = {
  Marketplace: "bg-[#e5ecd3] text-[#4c5f2a]",
  PIX: "bg-[#f0ecd9] text-[#89703b]",
  "Nao informado": "bg-[#e1e7d4] text-[#6f775f]",
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

export function AdminReservasTable() {
  const { profile } = useAuthSession();
  const [reservas, setReservas] = useState<Gift[]>([]);
  const [search, setSearch] = useState("");
  const [loadingCancelId, setLoadingCancelId] = useState<string | null>(null);
  const [loadingConfirmPixId, setLoadingConfirmPixId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => subscribeReservedGifts(setReservas, 200), []);

  const filteredReservas = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return reservas;
    }

    return reservas.filter((reserva) => {
      const convidado = (reserva.reservedByName ?? "").toLowerCase();
      const presente = reserva.name.toLowerCase();
      return convidado.includes(query) || presente.includes(query);
    });
  }, [reservas, search]);

  const handleCancelReservation = async (giftId: string) => {
    if (!profile) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingCancelId(giftId);
      await cancelGiftReservation({
        giftId,
        actorUid: profile.id,
        actorRole: profile.role,
      });
    } catch (nextError) {
      console.error(nextError);
      setError("Nao foi possivel cancelar a reserva.");
    } finally {
      setLoadingCancelId(null);
    }
  };

  const handleConfirmPix = async (giftId: string) => {
    if (!profile) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingConfirmPixId(giftId);
      await confirmPixReceipt({
        giftId,
        actorUid: profile.id,
        actorRole: profile.role,
      });
      setNotice("Recebimento de PIX confirmado.");
    } catch (nextError) {
      console.error(nextError);
      setError("Nao foi possivel confirmar o recebimento do PIX.");
    } finally {
      setLoadingConfirmPixId(null);
    }
  };

  return (
    <article className="surface overflow-hidden rounded-2xl">
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
              placeholder="Buscar por convidado ou presente"
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[#9b3e3e]">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-[#486227]">{notice}</p> : null}
      </div>

      <div className="h-full max-h-[520px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="text-left text-xs tracking-[0.12em] text-[#838a79] uppercase">
              <th className="px-6 py-4 font-semibold">Convidado</th>
              <th className="px-6 py-4 font-semibold">Presente</th>
              <th className="px-6 py-4 font-semibold">Valor</th>
              <th className="px-6 py-4 font-semibold">Forma</th>
              <th className="px-6 py-4 font-semibold">Data</th>
              <th className="px-6 py-4 font-semibold">PIX</th>
              <th className="px-6 py-4 font-semibold">Acoes</th>
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
                const methodLabel: ReservaStatus =
                  reserva.reservationMethod === "pix"
                    ? "PIX"
                    : reserva.reservationMethod === "marketplace"
                      ? "Marketplace"
                      : "Nao informado";

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
                      <span className="block max-w-[220px] truncate" title={reserva.name}>
                        {reserva.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#676f5c] whitespace-nowrap">
                      {formatCurrencyBRLFromCents(reserva.priceCents)}
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
                          onClick={() => handleConfirmPix(reserva.id)}
                          disabled={loadingConfirmPixId === reserva.id}
                          className="gold-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingConfirmPixId === reserva.id
                            ? "Confirmando..."
                            : "Confirmar PIX"}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleCancelReservation(reserva.id)}
                        disabled={loadingCancelId === reserva.id}
                        className="ghost-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingCancelId === reserva.id ? "Cancelando..." : "Cancelar"}
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
