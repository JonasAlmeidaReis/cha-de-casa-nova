"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/users";

export default function AdminLoginPage() {
  const router = useRouter();
  const { authUser, profile, loading } = useAuthSession();
  const { settings } = useEventSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (authUser && profile) {
      router.replace(profile.role === "admin" ? "/admin/dashboard" : "/convidado");
    }
  }, [authUser, loading, profile, router]);

  const heroStyle = useMemo(
    () =>
      settings.coupleImageUrl
        ? { backgroundImage: `url(${settings.coupleImageUrl})` }
        : undefined,
    [settings.coupleImageUrl],
  );

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const auth = getFirebaseAuth();
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await getUserProfile(credentials.user.uid);

      if (!userProfile || userProfile.role !== "admin") {
        await signOut(auth);
        setError("Este usuário não possui permissão de administrador.");
        return;
      }

      router.replace("/admin/dashboard");
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível entrar no painel admin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between pb-6">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5e6a2f] hover:text-[#77843f]"
        >
          Voltar para área do convidado
        </Link>
      </div>

      <main className="mx-auto grid max-w-[1100px] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-paper)] md:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden md:block">
          <div className="absolute inset-0 bg-[linear-gradient(130deg,#1a2616_0%,#2a3b22_48%,#415633_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,107,47,0.45),transparent_36%)]" />
          <div className="absolute inset-0 bg-black/40" />

          <div
            className={`relative z-10 h-full ${
              settings.coupleImageUrl ? "bg-cover bg-center" : ""
            }`}
            style={heroStyle}
          />
        </section>

        <section className="surface reveal rounded-none border-0 p-8 md:p-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-[var(--color-ink)]">
              Login casal
            </h2>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleAdminLogin}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#5a624e]">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@casamento.com"
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#5a624e]">Senha</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
              />
            </label>

            {error ? <p className="text-sm text-[#9b3e3e]">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="gold-button mt-3 block w-full py-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Entrando..." : "Entrar no Painel"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
