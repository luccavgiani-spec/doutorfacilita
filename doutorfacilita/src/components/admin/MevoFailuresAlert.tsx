"use client";

import { useState } from "react";

/**
 * Aviso compacto de falhas de download de PDF da Mevo.
 *
 * Substitui a antiga tabela dedicada: só aparece quando há casos com
 * download_succeeded_at IS NULL (fonte: view v_failed_pdf_downloads, que já
 * lê as tabelas ativas prescricoes_documentos ⨝ prescricoes_mevo). Quando há
 * falhas, mostra um banner âmbar com um drop (accordion) que expande a lista.
 */

export type FailureRow = {
  documento_id?: string;
  prescricao_id?: string;
  tipo_documento?: string | null;
  categoria?: string | null;
  download_attempted_at?: string | null;
  download_error?: string | null;
  seconds_since_attempt?: number | null;
  recovery_status?: string | null;
};

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export default function MevoFailuresAlert({ failures }: { failures: FailureRow[] }) {
  const [open, setOpen] = useState(false);
  const n = failures.length;

  if (n === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green/40 bg-green-l px-3 py-2 text-xs font-medium text-green-d">
        ✓ Nenhuma falha de download de PDF pendente.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-yellow/50 bg-yellow-l">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-yellow">
          <WarnIcon />
          {n} falha{n > 1 ? "s" : ""} de download de PDF pendente{n > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-yellow">
          {open ? "ocultar" : "ver casos"}
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div className="border-t border-yellow/40 bg-white/60">
          <ul className="divide-y divide-border/60">
            {failures.map((f, i) => {
              const expired = f.recovery_status === "EXPIRED";
              return (
                <li key={f.documento_id ?? i} className="px-3 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {f.tipo_documento ?? "documento"}
                      {f.categoria ? ` · ${f.categoria}` : ""}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        expired ? "bg-red-l text-red" : "bg-blue-l text-blue"
                      }`}
                    >
                      {expired ? "expirado" : "retry possível"}
                    </span>
                    <span className="text-txt-3">
                      tentativa: {fmt(f.download_attempted_at)}
                    </span>
                  </div>
                  {f.download_error && (
                    <div className="mt-1 break-words font-mono text-[11px] text-red">
                      {f.download_error}
                    </div>
                  )}
                  <div className="mt-0.5 break-all text-[10px] text-txt-3">
                    doc: {f.documento_id ?? "—"} · prescrição: {f.prescricao_id ?? "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
