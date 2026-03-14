"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { UserRole } from "@/lib/firebase/models";
import { getUserProfile } from "@/lib/firebase/users";

function resolveRoute(role: UserRole): string {
  return role === "admin" ? "/admin/dashboard" : "/convidado";
}

export default function LoginConvidadoPage() {
  const router = useRouter();
  const { authUser, profile, loading } = useAuthSession();
  const { settings } = useEventSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (authUser && profile) {
      router.replace(resolveRoute(profile.role));
    }
  }, [authUser, loading, profile, router]);

  const heroStyle = useMemo(
    () =>
      settings.coupleImageUrl
        ? { backgroundImage: `url(${settings.coupleImageUrl})` }
        : undefined,
    [settings.coupleImageUrl],
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const auth = getFirebaseAuth();
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );

      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await getUserProfile(credentials.user.uid);

      if (!userProfile) {
        await signOut(auth);
        setError(
          "Seu perfil não foi encontrado no banco. Fale com os noivos para liberar seu acesso.",
        );
        return;
      }

      router.replace(resolveRoute(userProfile.role));
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível entrar. Verifique e-mail e senha.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Enviamos um e-mail para redefinição de senha.");
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível enviar o e-mail de recuperação.");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between pb-6">
        <p className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#2e3526]">
          Chá de casa nova {settings.coupleName}
        </p>
      </div>

      <main className="mx-auto grid w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-paper)] md:grid-cols-2">
        <section
          className={`relative min-h-[480px] max-h-[480px] overflow-hidden md:min-h-[480px] ${
            settings.coupleImageUrl
              ? "bg-cover bg-center"
              : "bg-[linear-gradient(130deg,#1a2616_0%,#2a3b22_48%,#415633_100%)]"
          }`}
          style={heroStyle}
        >
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center text-white">
            <p className="text-xs tracking-[0.24em] text-[#d7dfbf] uppercase">
              Celebre com a gente
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold italic md:text-5xl">
              Um brinde ao amor
            </h1>
            <p className="mt-4 max-w-md text-sm text-[#e3e9d7] md:text-base">
              Estamos muito felizes em compartilhar este momento único com você.
            </p>
          </div>
        </section>

        <section className="surface reveal rounded-none border-0 p-7 md:p-10 min-h-[480px] max-h-[480px] md:min-h-[480px]">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-[var(--color-ink)]">
              Seja bem-vindo
            </h2>
          </div>

          <div className="mt-8 inline-flex rounded-full border border-[var(--color-border)] bg-[#f7f9f0] p-1 text-sm font-semibold">
            <span className="rounded-full bg-[var(--color-gold)] px-4 py-2 text-[#f4f6e8]">
              Login
            </span>
            <Link
              href="/cadastro"
              className="rounded-full px-4 py-2 text-[#7f876f] hover:text-[#5f6652]"
            >
              Criar conta
            </Link>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#5a624e]">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu.email@exemplo.com"
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

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-[#76806d]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="size-4 rounded border-[#c5ccb8]"
                />
                Lembrar de mim
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="font-semibold text-[#687436] hover:text-[#8b9652]"
              >
                Esqueceu a senha?
              </button>
            </div>

            {error ? <p className="text-sm text-[#9b3e3e]">{error}</p> : null}
            {notice ? <p className="text-sm text-[#486227]">{notice}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="gold-button block w-full py-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Entrando..." : "Entrar no Portal"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
