"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { useAuthSession } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/require-auth";
import {
  createGift,
  deleteGift,
  subscribeGifts,
  updateGift,
} from "@/lib/firebase/gifts";
import { GIFT_ROOMS, isGiftRoom, type Gift } from "@/lib/firebase/models";
import {
  formatCurrencyBRLFromCents,
  parseCurrencyInputToCents,
} from "@/lib/formatters";

type FormState = {
  name: string;
  room: string;
  allowsQuantity: boolean;
  quantityInput: string;
  priceInput: string;
  productUrl: string;
  isActive: boolean;
  imageFile: File | null;
};

const INITIAL_FORM: FormState = {
  name: "",
  room: "",
  allowsQuantity: false,
  quantityInput: "1",
  priceInput: "",
  productUrl: "",
  isActive: true,
  imageFile: null,
};

export default function AdminPresentesPage() {
  const { profile } = useAuthSession();
  const [presentes, setPresentes] = useState<Gift[]>([]);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingGiftId, setDeletingGiftId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => subscribeGifts(setPresentes), []);

  const editingGift = useMemo(
    () => presentes.find((gift) => gift.id === editingGiftId) ?? null,
    [editingGiftId, presentes],
  );

  const resetForm = () => {
    setFormState(INITIAL_FORM);
    setEditingGiftId(null);
  };

  const handleEdit = (gift: Gift) => {
    setError("");
    setSuccess("");
    setEditingGiftId(gift.id);
    setFormState({
      name: gift.name,
      room: gift.room,
      allowsQuantity: gift.allowsQuantity,
      quantityInput: String(gift.requestedQuantity),
      priceInput: (gift.priceCents / 100).toFixed(2).replace(".", ","),
      productUrl: gift.productUrl,
      isActive: gift.isActive,
      imageFile: null,
    });
  };

  const handleDelete = async (gift: Gift) => {
    if (gift.reservationStatus !== "available" || gift.reservedQuantity > 0) {
      setError("Cancele a reserva antes de excluir este presente.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setDeletingGiftId(gift.id);
      await deleteGift(gift.id);
      setSuccess("Presente excluído com sucesso.");
      if (editingGiftId === gift.id) {
        resetForm();
      }
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível excluir o presente.");
    } finally {
      setDeletingGiftId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setError("");
    setSuccess("");

    const name = formState.name.trim();
    const room = formState.room.trim();
    const productUrl = formState.productUrl.trim();
    const priceCents = parseCurrencyInputToCents(formState.priceInput);
    const requestedQuantity = formState.allowsQuantity
      ? Number.parseInt(formState.quantityInput, 10)
      : 1;

    if (!name || !productUrl || !priceCents) {
      setError("Preencha todos os campos obrigatórios de forma válida.");
      return;
    }

    if (!isGiftRoom(room)) {
      setError("Selecione um cômodo válido.");
      return;
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      setError("Informe uma quantidade válida.");
      return;
    }

    if (editingGift && editingGift.reservedQuantity > requestedQuantity) {
      setError("A quantidade total não pode ser menor que a quantidade já reservada.");
      return;
    }

    if (
      editingGift &&
      editingGift.reservedQuantity > 0 &&
      editingGift.allowsQuantity !== formState.allowsQuantity
    ) {
      setError("Não é possível alterar o modo de quantidade com reservas ativas.");
      return;
    }

    if (!editingGiftId && !formState.imageFile) {
      setError("A imagem do presente é obrigatória no cadastro.");
      return;
    }

    try {
      setSubmitting(true);

      if (editingGiftId && editingGift) {
        await updateGift(editingGiftId, editingGift, {
          name,
          room,
          allowsQuantity: formState.allowsQuantity,
          requestedQuantity,
          priceCents,
          productUrl,
          isActive: formState.isActive,
          imageFile: formState.imageFile,
          actorUid: profile.id,
        });
        setSuccess("Presente atualizado com sucesso.");
      } else if (formState.imageFile) {
        await createGift({
          name,
          room,
          allowsQuantity: formState.allowsQuantity,
          requestedQuantity,
          priceCents,
          productUrl,
          isActive: formState.isActive,
          imageFile: formState.imageFile,
          actorUid: profile.id,
        });
        setSuccess("Presente criado com sucesso.");
      }

      resetForm();
    } catch (nextError) {
      console.error(nextError);
      setError("Não foi possível salvar o presente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminShell active="presentes">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <article className="surface overflow-hidden rounded-2xl">
            <div className="border-b border-[#dde4cf] px-6 py-4">
              <h2 className="text-2xl font-semibold">Lista de itens</h2>
            </div>

            <div className="h-full max-h-[449px] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="text-left text-xs tracking-[0.12em] text-[#838a79] uppercase">
                    <th className="px-6 py-4 font-semibold">Presente</th>
                    <th className="px-6 py-4 font-semibold w-28">Valor</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {presentes.length === 0 ? (
                    <tr className="border-t border-[#e6ecd8]">
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm text-[#676f5c]"
                      >
                        Nenhum presente cadastrado.
                      </td>
                    </tr>
                  ) : (
                    presentes.map((item) => {
                      const status =
                        item.reservationStatus === "reserved"
                          ? "Reservado"
                          : item.isActive
                            ? "Ativo"
                            : "Inativo";

                      return (
                        <tr key={item.id} className="border-t border-[#e6ecd8]">
                          <td className="px-6 py-4 text-sm font-semibold text-[#3d452f]">
                            <span className="block max-w-[220px] truncate" title={item.name}>
                              {item.name}
                            </span>
                            {item.room ? (
                              <span className="mt-1 block max-w-[220px] truncate text-xs font-normal text-[#778069]" title={item.room}>
                                {item.room}
                              </span>
                            ) : null}
                            {item.allowsQuantity ? (
                              <span className="mt-1 block text-xs font-normal text-[#778069]">
                                {item.reservedQuantity}/{item.requestedQuantity} reservados
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#616955] w-28 whitespace-nowrap">
                            {formatCurrencyBRLFromCents(item.priceCents)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex w-28 items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${
                                status === "Ativo"
                                  ? "bg-[#e5ecd3] text-[#4c5f2a]"
                                  : status === "Reservado"
                                    ? "bg-[#f0ecd9] text-[#89703b]"
                                    : "bg-[#e1e7d4] text-[#6f775f]"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="ghost-button px-3 py-1.5 text-xs"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={deletingGiftId === item.id}
                                className="ghost-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingGiftId === item.id ? "Excluindo..." : "Excluir"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="surface rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-semibold">
                {editingGift ? "Editar Presente" : "Novo Presente"}
              </h2>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Nome do Presente
                </span>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Ex: Jogo de Taças de Cristal"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Cômodo
                </span>
                <select
                  required
                  value={formState.room}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, room: event.target.value }))
                  }
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                >
                  <option value="">Selecione um cômodo</option>
                  {GIFT_ROOMS.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-3 rounded-xl border border-[#d5dbc6] bg-[#f7f9f1] p-4">
                <label className="inline-flex items-center gap-2 text-sm text-[#5f6652]">
                  <input
                    type="checkbox"
                    checked={formState.allowsQuantity}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        allowsQuantity: event.target.checked,
                        quantityInput: event.target.checked ? prev.quantityInput : "1",
                      }))
                    }
                    disabled={Boolean(editingGift && editingGift.reservedQuantity > 0)}
                    className="size-4 rounded border-[#c5ccb8] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  Convidado pode escolher quantidade
                </label>

                {formState.allowsQuantity ? (
                  <label className="block space-y-2">
                    <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                      Quantidade desejada
                    </span>
                    <input
                      type="number"
                      min={Math.max(1, editingGift?.reservedQuantity ?? 1)}
                      step={1}
                      required
                      value={formState.quantityInput}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          quantityInput: event.target.value,
                        }))
                      }
                      className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                    />
                    {editingGift && editingGift.reservedQuantity > 0 ? (
                      <p className="text-xs text-[#676f5c]">
                        Já reservado: {editingGift.reservedQuantity} unidade(s).
                      </p>
                    ) : null}
                  </label>
                ) : null}
              </div>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Valor Sugerido (R$)
                </span>
                <input
                  type="text"
                  required
                  value={formState.priceInput}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, priceInput: event.target.value }))
                  }
                  placeholder="350,00"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Imagem do item
                </span>
                <input
                  type="file"
                  accept="image/*"
                  required={!editingGift}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      imageFile: event.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
                {editingGift ? (
                  <p className="text-xs text-[#676f5c]">
                    Deixe vazio para manter a imagem atual.
                  </p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs tracking-[0.12em] font-semibold text-[#667235] uppercase">
                  Link do Produto
                </span>
                <input
                  type="url"
                  required
                  value={formState.productUrl}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, productUrl: event.target.value }))
                  }
                  placeholder="https://"
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#9ca592]"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-[#5f6652]">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                  className="size-4 rounded border-[#c5ccb8]"
                />
                Presente ativo para convidados
              </label>

              {error ? <p className="text-sm text-[#9b3e3e]">{error}</p> : null}
              {success ? <p className="text-sm text-[#486227]">{success}</p> : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="gold-button py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting
                    ? "Salvando..."
                    : editingGift
                      ? "Atualizar Presente"
                      : "Salvar Presente"}
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
          </aside>
        </section>
      </AdminShell>
    </RequireAuth>
  );
}
