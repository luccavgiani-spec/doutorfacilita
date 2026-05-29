"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toggleIntegrationEnabled } from "@/app/admin/integracoes/actions";

interface Props {
  id: string;                   // 'mevo' | 'prontia_redirect' | 'livekit'
  title: string;
  description: string;
  logoSrc?: string;
  initialEnabled: boolean;
  /** Texto curto explicando o que muda quando liga */
  whatHappens: string;
  /** Read-only não mostra toggle (ex: LiveKit cuja config tá em secrets) */
  readOnly?: boolean;
  configHref?: string;
  configLabel?: string;
  badge?: "ok" | "warn" | null;
  badgeText?: string;
  /** Slot extra renderizado no rodapé do card (ex: editor de URL do Prontia). */
  extra?: React.ReactNode;
}

export default function IntegrationToggleCard({
  id,
  title,
  description,
  logoSrc,
  initialEnabled,
  whatHappens,
  readOnly,
  configHref,
  configLabel,
  badge,
  badgeText,
  extra,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (readOnly) return;
    const next = !enabled;
    setEnabled(next);
    setError(null);
    start(async () => {
      const r = await toggleIntegrationEnabled(id, next);
      if (!r.ok) {
        setEnabled(!next);
        setError(r.error);
      }
    });
  }

  return (
    <article className="flex items-center gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-7">
      {logoSrc ? (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center md:h-24 md:w-24">
          <Image
            src={logoSrc}
            alt={title}
            width={96}
            height={96}
            className="h-auto w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-bg-3 text-xl font-bold uppercase text-txt-2 md:h-24 md:w-24">
          {title.slice(0, 2)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          {badge && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                badge === "ok" ? "bg-green text-white" : "bg-yellow-l text-[#7a5a00]"
              }`}
            >
              {badgeText ?? (badge === "ok" ? "tudo certo" : "atenção")}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-txt-2">{description}</p>
        <p className="mt-3 text-xs text-txt-3">{whatHappens}</p>
        {configHref && (
          <Link
            href={configHref}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue hover:underline"
          >
            {configLabel ?? "Abrir configuração"} →
          </Link>
        )}
        {extra}
        {error && (
          <div className="mt-2 rounded-md border border-red bg-red-l px-2 py-1 text-xs text-red">
            {error}
          </div>
        )}
      </div>

      {/* Toggle grande à direita */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        {readOnly ? (
          <div
            className={`flex h-10 items-center rounded-full px-4 text-xs font-bold uppercase ${
              enabled ? "bg-green text-white" : "bg-bg-4 text-txt-2"
            }`}
          >
            {enabled ? "ativo" : "off"}
          </div>
        ) : (
          <>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? "Desativar" : "Ativar"} ${title}`}
              onClick={toggle}
              disabled={pending}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors disabled:opacity-60 ${
                enabled ? "bg-green" : "bg-bg-4"
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-11" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                enabled ? "text-green-d" : "text-txt-3"
              }`}
            >
              {enabled ? "ativo" : "desativado"}
            </span>
          </>
        )}
      </div>
    </article>
  );
}
