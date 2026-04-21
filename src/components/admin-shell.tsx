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
  { key: "dashboard", label: "Visão geral", href: "/admin/dashboard" },
  { key: "presentes", label: "Presentes", href: "/admin/presentes" },
  { key: "reservas", label: "Reservas", href: "/admin/reservas" },
  { key: "configuracoes", label: "Configurações", href: "/admin/configuracoes" },
];

export function AdminShell({ active, children }: AdminShellProps) {
  const router = useRouter();
  const { signOutUser } = useAuthSession();
  const { settings } = useEventSettings();
  const activeItem = navItems.find((item) => item.key === active);
  const activeLabel = activeItem?.label ?? "Painel";

  const handleLogout = async () => {
    await signOutUser();
    router.replace("/admin/login");
  };

  const renderNavigationContent = (isMobile: boolean) => (
    <>
      <Link
        href="/convidado"
        className={`ghost-button ${isMobile ? "w-full text-center" : "mb-2"} px-4 py-3 text-sm font-semibold`}
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
            } ${isMobile ? "text-center" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleLogout}
        className={`ghost-button ${isMobile ? "w-full" : "mt-3"} px-4 py-3 text-sm font-semibold`}
      >
        Sair
      </button>
    </>
  );

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto mb-4 w-full max-w-[1260px] md:hidden">
        <details className="surface overflow-hidden rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="font-[family-name:var(--font-playfair)] text-xl font-semibold">
                {settings.coupleName}
              </p>
              <p className="text-xs tracking-[0.08em] text-[#717966] uppercase">
                {activeLabel}
              </p>
            </div>
            <span className="ghost-button px-3 py-1.5 text-xs">Menu</span>
          </summary>
          <nav className="flex flex-col gap-2 border-t border-[#dde4cf] px-4 py-4">
            {renderNavigationContent(true)}
          </nav>
        </details>
      </div>
      <div className="mx-auto flex w-full max-w-[1260px] gap-5">
        <aside className="surface scrollbar-thin hidden w-[300px] rounded-2xl p-6 md:flex md:flex-col md:gap-10">
          <div className="space-y-1">
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-semibold">
              {settings.coupleName}
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            {renderNavigationContent(false)}
          </nav>
        </aside>
        <main className="min-w-0 w-full space-y-4">{children}</main>
      </div>
    </div>
  );
}
