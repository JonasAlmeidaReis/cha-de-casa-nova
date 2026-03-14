"use client";

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createGuestUserProfile } from "@/lib/firebase/users";

export default function CadastroConvidadoPage() {
  const router = useRouter();
  const { authUser, profile, loading } = useAuthSession();
  const { settings } = useEventSettings();

  const [displayName, setDisplayName] = useState("");
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

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const auth = getFirebaseAuth();
      const credentials = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(credentials.user, {
        displayName: displayName.trim(),
      });

      await createGuestUserProfile({
        uid: credentials.user.uid,
        displayName: displayName.trim(),
        email: credentials.user.email ?? email,
      });

      router.replace("/convidado");
    } catch (nextError) {
      console.error(nextError);
      setError("Nao foi possivel concluir o cadastro. Revise os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between pb-6">
        <p className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#2e3526]">
          Cha de casa nova {settings.coupleName}
        </p>
        <Link
          href="/"
          className="text-sm font-semibold text-[#5e6a2f] hover:text-[#77843f]"
        >
          Voltar para login
        </Link>
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
              Lista de presentes
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold italic md:text-5xl">
              Estamos te esperando
            </h1>
            <p className="mt-4 max-w-md text-sm text-[#e3e9d7] md:text-base">
              Crie sua conta para acessar os presentes disponiveis e participar desse
              momento com a gente.
            </p>
          </div>
        </section>

        <section className="surface reveal rounded-none border-0 p-7 md:p-10 min-h-[480px] max-h-[480px] md:min-h-[480px]">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold text-[var(--color-ink)]">
              Criar conta
            </h2>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#5a624e]">Nome completo</span>
              <input
                type="text"
                required
                minLength={3}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ex.: Maria Fernanda Souza"
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
              />
            </label>

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
                placeholder="Crie uma senha segura"
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
              />
            </label>

            {error ? <p className="text-sm text-[#9b3e3e]">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="gold-button mt-3 block w-full py-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Finalizando..." : "Finalizar Cadastro"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#69705e]">
            Ja possui conta?{" "}
            <Link href="/" className="font-semibold text-[#5a652f]">
              Fazer login
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

