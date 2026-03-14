"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { RequireAuth } from "@/components/require-auth";
import { ReservedGiftsChart } from "@/components/reserved-gifts-chart";
import {
  countAllGifts,
  countGiftsByStatus,
  subscribeGifts,
  subscribeReservedGifts,
} from "@/lib/firebase/gifts";
import type { Gift } from "@/lib/firebase/models";

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

export default function AdminDashboardPage() {
  const [totalPresentes, setTotalPresentes] = useState(0);
  const [disponiveis, setDisponiveis] = useState(0);
  const [reservados, setReservados] = useState(0);
  const [ultimasReservas, setUltimasReservas] = useState<Gift[]>([]);

  const metricCards = useMemo(
    () => [
      { label: "Total de Presentes", value: totalPresentes },
      { label: "Disponiveis", value: disponiveis },
      { label: "Reservados", value: reservados },
    ],
    [disponiveis, reservados, totalPresentes],
  );

  useEffect(() => {
    const refreshMetrics = async () => {
      try {
        const [total, available, reserved] = await Promise.all([
          countAllGifts(),
          countGiftsByStatus("available"),
          countGiftsByStatus("reserved"),
        ]);

        setTotalPresentes(total);
        setDisponiveis(available);
        setReservados(reserved);
      } catch (error) {
        console.error(error);
      }
    };

    void refreshMetrics();

    const unsubscribeAllGifts = subscribeGifts(() => {
      void refreshMetrics();
    });

    const unsubscribeReserved = subscribeReservedGifts((gifts) => {
      setUltimasReservas(gifts.slice(0, 4));
    }, 4);

    return () => {
      unsubscribeAllGifts();
      unsubscribeReserved();
    };
  }, []);

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminShell active="dashboard">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {metricCards.map((metric, index) => (
            <article
              key={metric.label}
              className="surface reveal rounded-2xl p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm text-[#737b69]">{metric.label}</p>
              <p className="mt-3 text-5xl font-semibold text-[#2e3522]">
                {metric.value}
              </p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <article className="surface rounded-2xl pr-6 pl-6 pb-6">
            <h2 className="text-2xl font-semibold py-4">Presentes reservados</h2>
            <ReservedGiftsChart reserved={reservados} total={totalPresentes} />

            <div className="mt-8 space-y-3 text-sm text-[#5e6652]">
              <p className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-[var(--color-gold)]" />
                Reservado
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-[#ced6c0]" />
                Livre
              </p>
            </div>
          </article>

          <article id="reservas" className="surface overflow-hidden rounded-2xl">
            <div className="border-b border-[#dde4cf] px-6 py-4">
              <h2 className="text-2xl font-semibold">Ultimas reservas</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="text-left text-xs tracking-[0.12em] text-[#838a79] uppercase">
                    <th className="px-6 py-4 font-semibold">Convidado</th>
                    <th className="px-6 py-4 font-semibold">Presente</th>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasReservas.length === 0 ? (
                    <tr className="border-t border-[#e6ecd8]">
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm text-[#676f5c]"
                      >
                        Nenhuma reserva encontrada.
                      </td>
                    </tr>
                  ) : (
                    ultimasReservas.map((reserva) => (
                      <tr key={reserva.id} className="border-t border-[#e6ecd8]">
                        <td className="px-6 py-4 text-sm font-semibold text-[#3d452f]">
                          <span className="block max-w-[150px] truncate">
                            {reserva.reservedByName ?? "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#616955]">
                          <span className="block max-w-[100px] truncate">
                            {reserva.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#676f5c]">
                          {formatReservationDate(reserva.reservedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex w-28 justify-center rounded-full bg-[#e5ecd3] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#4c5f2a] uppercase">
                            Confirmado
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </AdminShell>
    </RequireAuth>
  );
}
