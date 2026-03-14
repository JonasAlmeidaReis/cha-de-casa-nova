"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";
import { RequireAuth } from "@/components/require-auth";
import { saveEventSettings } from "@/lib/firebase/settings";
import { formatDateForInput, parseDateInput } from "@/lib/formatters";

type FormState = {
  coupleName: string;
  eventDate: string;
  story: string;
  venue: string;
  pixKey: string;
  whatsappNumber: string;
  imageFile: File | null;
};

const INITIAL_FORM: FormState = {
  coupleName: "",
  eventDate: "",
  story: "",
  venue: "",
  pixKey: "",
  whatsappNumber: "",
  imageFile: null,
};

export default function AdminConfiguracoesPage() {
  const { profile } = useAuthSession();
  const { settings } = useEventSettings();

  const [formState, setFormState] = useState<FormState>(INITIAL_FORM);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (initialized) {
      return;
    }

    setFormState({
      coupleName: settings.coupleName,
      eventDate: formatDateForInput(settings.eventDate),
      story: settings.story,
      venue: settings.venue,
      pixKey: settings.pixKey,
      whatsappNumber: settings.whatsappNumber,
      imageFile: null,
    });
    setInitialized(true);
  }, [initialized, settings]);

  const previewUrl = useMemo(() => {
    if (formState.imageFile) {
      return URL.createObjectURL(formState.imageFile);
    }

    return settings.coupleImageUrl;
  }, [formState.imageFile, settings.coupleImageUrl]);

  useEffect(
    () => () => {
      if (formState.imageFile && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [formState.imageFile, previewUrl],
  );

  const resetForm = () => {
    setFormState({
      coupleName: settings.coupleName,
      eventDate: formatDateForInput(settings.eventDate),
      story: settings.story,
      venue: settings.venue,
      pixKey: settings.pixKey,
      whatsappNumber: settings.whatsappNumber,
      imageFile: null,
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setError("");
    setSuccess("");

    const eventDate = parseDateInput(formState.eventDate);
    if (
      !formState.coupleName.trim() ||
      !formState.story.trim() ||
      !formState.venue.trim() ||
      !formState.pixKey.trim() ||
      !formState.whatsappNumber.trim() ||
      !eventDate
    ) {
      setError("Preencha todos os campos obrigatorios.");
      return;
    }

    try {
      setSubmitting(true);
      await saveEventSettings({
        coupleName: formState.coupleName.trim(),
        eventDate,
        story: formState.story.trim(),
        venue: formState.venue.trim(),
        pixKey: formState.pixKey.trim(),
        whatsappNumber: formState.whatsappNumber.trim(),
        actorUid: profile.id,
        currentImageUrl: settings.coupleImageUrl,
        currentImagePath: settings.coupleImagePath,
        imageFile: formState.imageFile,
      });
      setFormState((prev) => ({ ...prev, imageFile: null }));
      setSuccess("Configuracoes salvas com sucesso.");
    } catch (nextError) {
      console.error(nextError);
      setError("Nao foi possivel salvar as configuracoes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminShell active="configuracoes">
        <section className="grid grid-cols-1">
          <article className="surface overflow-hidden rounded-2xl">
            <div className="border-b border-[#dde4cf] px-6 py-4">
              <h2 className="text-2xl font-semibold">Configuracoes do evento</h2>
            </div>

            <form className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Nome do casal
                </span>
                <input
                  type="text"
                  required
                  value={formState.coupleName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, coupleName: event.target.value }))
                  }
                  placeholder="Ex: Natalia e Jonas"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Data da celebracao
                </span>
                <input
                  type="date"
                  required
                  value={formState.eventDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, eventDate: event.target.value }))
                  }
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Historia do casal
                </span>
                <textarea
                  rows={4}
                  required
                  value={formState.story}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, story: event.target.value }))
                  }
                  placeholder="Escreva um resumo curto da historia do casal."
                  className="w-full resize-none rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Local da celebracao
                </span>
                <input
                  type="text"
                  required
                  value={formState.venue}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, venue: event.target.value }))
                  }
                  placeholder="Ex: Espaco Jardim Imperial, Sao Paulo"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Chave PIX
                </span>
                <input
                  type="text"
                  required
                  value={formState.pixKey}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, pixKey: event.target.value }))
                  }
                  placeholder="Ex: email@exemplo.com ou CPF"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  WhatsApp para comprovante
                </span>
                <input
                  type="tel"
                  required
                  value={formState.whatsappNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      whatsappNumber: event.target.value,
                    }))
                  }
                  placeholder="Ex: +55 11 99999-9999"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Imagem do casal
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      imageFile: event.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
                {previewUrl ? (
                  <div
                    className="h-24 rounded-xl border border-[var(--color-border)] bg-cover bg-center"
                    style={{ backgroundImage: `url(${previewUrl})` }}
                  />
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-[#d6dcc7] bg-[#f3f6ec] px-4 py-4">
                    <p className="text-sm text-[#676f5c]">
                      Selecione uma imagem para destaque.
                    </p>
                  </div>
                )}
              </div>

              {error ? (
                <p className="text-sm text-[#9b3e3e] md:col-span-2">{error}</p>
              ) : null}
              {success ? (
                <p className="text-sm text-[#486227] md:col-span-2">{success}</p>
              ) : null}

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="gold-button py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Salvando..." : "Salvar Configuracoes"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="ghost-button py-2.5 text-sm"
                >
                  Descartar
                </button>
              </div>
            </form>
          </article>
        </section>
      </AdminShell>
    </RequireAuth>
  );
}
