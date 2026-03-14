"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/providers/auth-provider";
import { useEventSettings } from "@/components/providers/event-settings-provider";
import { RequireAuth } from "@/components/require-auth";
import {
  cancelGiftReservation,
  reserveGift,
  subscribeGifts,
  subscribeMyReservedGifts,
} from "@/lib/firebase/gifts";
import type { Gift, ReservationMethod } from "@/lib/firebase/models";
import { formatCurrencyBRLFromCents, formatEventDate } from "@/lib/formatters";

function toWhatsAppDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export default function ConvidadoPage() {
  const router = useRouter();
  const { authUser, profile, signOutUser } = useAuthSession();
  const { settings } = useEventSettings();

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [myReservedGifts, setMyReservedGifts] = useState<Gift[]>([]);
  const [loadingGiftId, setLoadingGiftId] = useState<string | null>(null);
  const [selectingGiftId, setSelectingGiftId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => subscribeGifts(setGifts), []);

  useEffect(() => {
    if (!profile) {
      setMyReservedGifts([]);
      return;
    }

    return subscribeMyReservedGifts(profile.id, setMyReservedGifts);
  }, [profile]);

  const activeGifts = useMemo(
    () => gifts.filter((gift) => gift.isActive),
    [gifts],
  );
  const pixKey = settings.pixKey.trim();
  const whatsappDigits = useMemo(
    () => toWhatsAppDigits(settings.whatsappNumber),
    [settings.whatsappNumber],
  );
  const hasPixConfiguration = pixKey.length > 0 && whatsappDigits.length > 0;

  const handleReserveGift = async (gift: Gift, reservationMethod: ReservationMethod) => {
    if (!profile || !authUser) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingGiftId(gift.id);
      await reserveGift({
        giftId: gift.id,
        actorUid: profile.id,
        actorName: profile.displayName || authUser.displayName || "Convidado",
        actorEmail: profile.email || authUser.email || "",
        reservationMethod,
      });
      setSelectingGiftId(null);
      setNotice(
        reservationMethod === "pix"
          ? "Presente reservado com pagamento via PIX."
          : "Presente reservado com compra em marketplace.",
      );
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível reservar este presente.");
    } finally {
      setLoadingGiftId(null);
    }
  };

  const handleCancelReservation = async (gift: Gift) => {
    if (!profile) {
      return;
    }

    try {
      setError("");
      setNotice("");
      setLoadingGiftId(gift.id);
      await cancelGiftReservation({
        giftId: gift.id,
        actorUid: profile.id,
        actorRole: profile.role,
      });
      setSelectingGiftId((current) => (current === gift.id ? null : current));
      setNotice("Reserva cancelada com sucesso.");
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível cancelar a reserva.");
    } finally {
      setLoadingGiftId(null);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    router.replace("/");
  };

  const heroStyle = settings.coupleImageUrl
    ? { backgroundImage: `url(${settings.coupleImageUrl})` }
    : undefined;

  const mapIframeSrc = useMemo(() => {
    const venue = settings.venue.trim();
    const query = encodeURIComponent(venue || "São Paulo SP");
    return `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }, [settings.venue]);

  return (
    <RequireAuth allowedRoles={["guest", "admin"]}>
      <div className="min-h-screen">
        <style>{`
          html {
            scroll-behavior: smooth;
          }
        `}</style>

        <header className="sticky top-0 z-20 border-b border-[#cfd6bf] bg-[rgb(241,243,232,0.92)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1220px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div>
              <p className="font-[family-name:var(--font-playfair)] text-xl font-semibold">
                {settings.coupleName}
              </p>
              <p className="text-xs tracking-[0.18em] text-[#7c8471] uppercase">
                {formatEventDate(settings.eventDate)}
              </p>
            </div>

            <input
              id="menu-toggle-convidado"
              type="checkbox"
              className="peer sr-only md:hidden"
            />
            <label
              htmlFor="menu-toggle-convidado"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#cfd6bf] text-[#58604c] md:hidden"
            >
              <span className="sr-only">Abrir menu de navegação</span>
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </label>

            <nav className="hidden w-full flex-col gap-3 border-t border-[#cfd6bf] pt-4 text-sm font-semibold text-[#58604c] peer-checked:flex md:w-auto md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:pt-0">
              <a href="#inicio" className="rounded-md px-2 py-1 hover:text-[#2c331f] md:px-0 md:py-0">
                Início
              </a>
              <a
                href="#historia"
                className="rounded-md px-2 py-1 hover:text-[#2c331f] md:px-0 md:py-0"
              >
                Nossa História
              </a>
              <a
                href="#presentes"
                className="rounded-md px-2 py-1 hover:text-[#2c331f] md:px-0 md:py-0"
              >
                Lista de Presentes
              </a>
              <a href="#local" className="rounded-md px-2 py-1 hover:text-[#2c331f] md:px-0 md:py-0">
                Local
              </a>
              {profile?.role === "admin" ? (
                <Link
                  href="/admin/dashboard"
                  className="rounded-full border border-[#9fab6d] px-8 py-2 text-center text-[#59652d] hover:bg-[#edf1e0]"
                >
                  Painel admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[#9fab6d] px-8 py-2 text-center text-[#59652d] hover:bg-[#edf1e0]"
              >
                Sair
              </button>
            </nav>
          </div>
        </header>

        <main>
          <section id="inicio" className="scroll-mt-24 overflow-hidden">
            <div className="grid w-full md:h-[480px] md:min-h-[400px] md:grid-cols-2">
              <div
                className={`h-[380px] md:h-auto ${
                  settings.coupleImageUrl
                    ? "bg-cover bg-center"
                    : "bg-[linear-gradient(140deg,#e3ead2,#cad5b2,#aab985)]"
                }`}
                style={heroStyle}
                aria-hidden="true"
              />

              <div className="flex items-center bg-[#f1f3e8] px-6 py-12 md:px-10 md:py-16 lg:px-14">
                <div className="max-w-xl text-[#2a311e]">
                  <h1 className="reveal mt-5 text-4xl leading-tight font-semibold italic md:text-6xl">
                    Junte-se a nós para celebrar o amor
                  </h1>
                  <p className="reveal mt-6 text-base text-[#5d6650]">
                    Cada presente será um pedaço da nossa nova casa. Obrigado por
                    fazer parte da nossa história.
                  </p>
                  <a
                    href="#presentes"
                    className="gold-button reveal mt-10 inline-flex px-6 py-3 text-sm"
                  >
                    Ver Lista de Presentes
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section id="historia" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
            <div className="mx-auto max-w-[900px] text-center">
              <p className="text-xs tracking-[0.23em] text-[var(--color-gold)] uppercase">
                O início de tudo
              </p>
              <h2 className="mt-4 text-4xl font-semibold md:text-5xl">
                Nossa História
              </h2>
              <p className="mt-6 text-base leading-8 text-[var(--color-muted)]">
                {settings.story}
              </p>
            </div>
          </section>

          <section
            id="presentes"
            className="scroll-mt-24 bg-[#edf1e2] px-4 py-16 md:px-8 md:py-20"
          >
            <div className="mx-auto max-w-[1220px]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.22em] text-[var(--color-gold)] uppercase">
                    Lista de presentes
                  </p>
                  <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
                    Escolha com carinho
                  </h2>
                </div>
                <p className="rounded-full border border-[#d2d8c1] bg-white px-4 py-2 text-sm text-[#666d59]">
                  Seus presentes selecionados: {myReservedGifts.length} item(ns)
                </p>
              </div>

              {error ? <p className="mt-4 text-sm text-[#9b3e3e]">{error}</p> : null}
              {notice ? <p className="mt-4 text-sm text-[#486227]">{notice}</p> : null}

              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeGifts.map((gift, index) => {
                  const isReserved = gift.reservationStatus === "reserved";
                  const isMine = gift.reservedByUid === profile?.id;
                  const isLoading = loadingGiftId === gift.id;
                  const isChoosingOption = selectingGiftId === gift.id;
                  const isPixReservation = gift.reservationMethod === "pix";
                  const isMarketplaceReservation = gift.reservationMethod === "marketplace";
                  const whatsappMessage = encodeURIComponent(
                    `Oi! Reservei o presente "${gift.name}" e estou enviando o comprovante do PIX.`,
                  );
                  const whatsappUrl = hasPixConfiguration
                    ? `https://wa.me/${whatsappDigits}?text=${whatsappMessage}`
                    : null;

                  return (
                    <article
                      key={gift.id}
                      className="surface reveal overflow-hidden rounded-2xl"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {gift.imageUrl ? (
                        <div
                          className="aspect-[4/3] bg-cover bg-center"
                          style={{ backgroundImage: `url(${gift.imageUrl})` }}
                        />
                      ) : (
                        <div className="aspect-[4/3] bg-[linear-gradient(140deg,#e3ead2,#cad5b2,#aab985)]" />
                      )}
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold text-[#2a311e]">{gift.name}</h3>
                          {isReserved ? (
                            <span className="rounded-full bg-[#e1e7d4] px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-[#6f775f] uppercase">
                              Reservado
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e5ecd3] px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-[#4c5f2a] uppercase">
                              Disponível
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-[#586437]">
                          {formatCurrencyBRLFromCents(gift.priceCents)}
                        </p>

                        {isReserved && !isMine ? (
                          <button
                            type="button"
                            disabled
                            className="w-full cursor-not-allowed rounded-lg border border-[#d5dbc6] bg-[#f0f4e8] py-2.5 text-sm font-semibold text-[#8a917e]"
                          >
                            Já reservado
                          </button>
                        ) : isReserved && isMine ? (
                          <div className="space-y-3">
                            {isMarketplaceReservation ? (
                              <div className="rounded-xl border border-[#d5dbc6] bg-[#f7f9f1] p-3">
                                <p className="text-xs font-semibold tracking-[0.07em] text-[#6f775f] uppercase">
                                  Forma escolhida: Marketplace
                                </p>
                                <p className="mt-2 text-xs text-[#5f6652]">
                                  Compre online e leve o presente no dia do evento.
                                </p>
                                <a
                                  href={gift.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gold-button mt-3 block w-full py-2.5 text-center text-sm"
                                >
                                  Abrir link do produto
                                </a>
                              </div>
                            ) : isPixReservation ? (
                              <div className="rounded-xl border border-[#d5dbc6] bg-[#f7f9f1] p-3">
                                <p className="text-xs font-semibold tracking-[0.07em] text-[#6f775f] uppercase">
                                  Forma escolhida: PIX
                                </p>
                                {hasPixConfiguration ? (
                                  <div className="mt-3 space-y-2 rounded-lg border border-[#d5dbc6] bg-white p-3">
                                    <div>
                                      <p className="text-[11px] font-semibold tracking-[0.06em] text-[#6f775f] uppercase">
                                        Chave PIX
                                      </p>
                                      <p className="mt-1 break-all text-sm font-semibold text-[#2a311e]">
                                        {settings.pixKey}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold tracking-[0.06em] text-[#6f775f] uppercase">
                                        WhatsApp para comprovante
                                      </p>
                                      <a
                                        href={whatsappUrl ?? undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-block text-sm font-semibold text-[#4c5f2a] underline"
                                      >
                                        {settings.whatsappNumber}
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-3 text-xs text-[#8a917e]">
                                    Dados de PIX indisponíveis no momento. Fale com os noivos.
                                  </p>
                                )}
                                {gift.pixReceiptConfirmedAt ? (
                                  <p className="mt-3 text-xs font-semibold text-[#4c5f2a]">
                                    PIX confirmado pelos noivos.
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-[#d5dbc6] bg-[#f7f9f1] p-3">
                                <p className="text-xs text-[#5f6652]">
                                  Forma de presente ainda não informada.
                                </p>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCancelReservation(gift)}
                              disabled={isLoading}
                              className="ghost-button w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isLoading ? "Cancelando..." : "Cancelar reserva"}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {isChoosingOption ? (
                              <div className="rounded-xl border border-[#d5dbc6] bg-[#f7f9f1] p-3">
                                <p className="text-xs font-semibold tracking-[0.07em] text-[#6f775f] uppercase">
                                  Escolha a forma do presente
                                </p>
                                <div className="mt-3 space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => handleReserveGift(gift, "marketplace")}
                                    disabled={isLoading}
                                    className="gold-button w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isLoading ? "Reservando..." : "Comprar no marketplace"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReserveGift(gift, "pix")}
                                    disabled={isLoading || !hasPixConfiguration}
                                    className="ghost-button w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isLoading ? "Reservando..." : "Enviar via PIX"}
                                  </button>
                                </div>
                                {!hasPixConfiguration ? (
                                  <p className="mt-3 text-xs text-[#8a917e]">
                                    PIX ainda não foi configurado pelos noivos.
                                  </p>
                                ) : null}
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                setSelectingGiftId((current) =>
                                  current === gift.id ? null : gift.id,
                                )
                              }
                              disabled={isLoading}
                              className="gold-button w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isLoading
                                ? "Reservando..."
                                : isChoosingOption
                                  ? "Fechar opções"
                                  : "Selecionar presente"}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="local" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
            <div className="mx-auto grid max-w-[1220px] gap-7 lg:grid-cols-[1.05fr_1fr]">
              <div className="surface rounded-2xl p-7">
                <p className="text-xs tracking-[0.22em] text-[var(--color-gold)] uppercase">
                  Local da cerimônia
                </p>
                <h2 className="mt-3 text-4xl font-semibold">Nosso cantinho</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                  {settings.venue}
                </p>
              </div>

              <div className="surface overflow-hidden rounded-2xl">
                <iframe
                  title="Mapa do local do evento"
                  src={mapIframeSrc}
                  className="h-[360px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </RequireAuth>
  );
}
