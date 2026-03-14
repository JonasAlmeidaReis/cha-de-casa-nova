"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import type { UserRole } from "@/lib/firebase/models";

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
};

const DEFAULT_FALLBACK = (
  <div className="min-h-screen px-4 py-10 text-center text-sm text-[#5f6652]">
    Carregando...
  </div>
);

function getRedirectPath(role: UserRole | null): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "guest") {
    return "/convidado";
  }

  return "/";
}

export function RequireAuth({
  children,
  allowedRoles,
  fallback = DEFAULT_FALLBACK,
}: RequireAuthProps) {
  const router = useRouter();
  const { authUser, profile, loading } = useAuthSession();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authUser) {
      router.replace("/");
      return;
    }

    if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
      router.replace(getRedirectPath(profile?.role ?? null));
    }
  }, [allowedRoles, authUser, loading, profile, router]);

  if (loading) {
    return fallback;
  }

  if (!authUser) {
    return fallback;
  }

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    return fallback;
  }

  return <>{children}</>;
}

