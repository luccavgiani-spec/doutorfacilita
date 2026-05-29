"use client";

import { useState, useTransition } from "react";
import { deleteTemplate } from "@/app/admin/templates/actions";

export default function DeleteTemplateButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="rounded-lg border border-red/40 px-4 py-2 text-sm font-semibold text-red hover:bg-red-l"
      >
        Excluir
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-txt-2">Confirmar exclusão?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => void deleteTemplate(id))}
        className="rounded-lg bg-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Excluindo…" : "Sim, excluir"}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-txt-2"
      >
        Cancelar
      </button>
    </div>
  );
}
