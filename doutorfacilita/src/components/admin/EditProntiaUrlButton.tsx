"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { saveProntiaUrl } from "@/app/admin/actions";

export default function EditProntiaUrlButton({ urlAtual }: { urlAtual: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(urlAtual);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const r = await saveProntiaUrl(url.trim());
      if (r.ok) setOpen(false);
      else setErr(r.error);
    });
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-txt-3">Destino:</span>
        <code className="max-w-[280px] truncate text-txt-2">
          {urlAtual || "—"}
        </code>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-blue hover:underline"
        >
          editar
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="URL de destino · Prontia"
        subtitle="Para onde os encaminhamentos vão quando o redirecionamento está ativo."
        maxWidth={500}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-txt-2">URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://prontia.com.br/..."
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
            />
          </label>
          {err && (
            <div className="rounded-md border border-red bg-red-l px-2 py-1 text-xs text-red">
              {err}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-d disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar URL"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
