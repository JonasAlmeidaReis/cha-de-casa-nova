"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";

type NavKey = "dashboard" | "presentes" | "reservas" | "configuracoes";

type AdminShellProps = {
  active: NavKey;
  children: ReactNode;
};

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "dashboard", label: "Visao geral", href: "/admin/dashboard" },
  { key: "presentes", label: "Presentes", href: "/admin/presentes" },
  { key: "reservas", label: "Reservas", href: "/admin/reservas" },
  { key: "configuracoes", label: "Configuracoes", href: "/admin/configuracoes" },
];

export function AdminShell({ active, children }: AdminShellProps) {
  const router = useRouter();
  const { signOutUser } = useAuthSession();
  const { settings } = useEventSettings();

  const handleLogout = async () => {
    await signOutUser();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1260px] gap-5">
        <aside className="surface scrollbar-thin hidden w-[300px] rounded-2xl p-6 md:flex md:flex-col md:gap-10">
          <div className="space-y-1">
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-semibold">
              {settings.coupleName}
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            <Link
              href="/convidado"
              className="ghost-button mb-2 px-4 py-3 text-sm font-semibold"
            >
              Ver site
            </Link>
            {navItems.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[var(--color-gold)] text-[#f4f6e8]"
                      : "text-[#5f6652] hover:bg-[#edf2e1]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="ghost-button mt-3 px-4 py-3 text-sm font-semibold"
            >
              Sair
            </button>
          </nav>
        </aside>
        <main className="w-full space-y-4">{children}</main>
      </div>
    </div>
  );
}

