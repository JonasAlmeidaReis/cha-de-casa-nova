"use client";

import { AdminReservasTable } from "@/components/admin-reservas-table";
import { AdminShell } from "@/components/admin-shell";
import { RequireAuth } from "@/components/require-auth";

export default function AdminReservasPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminShell active="reservas">
        <section className="grid min-w-0 grid-cols-1">
          <AdminReservasTable />
        </section>
      </AdminShell>
    </RequireAuth>
  );
}

