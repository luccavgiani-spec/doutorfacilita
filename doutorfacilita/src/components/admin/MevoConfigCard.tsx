"use client";

import { useState, useTransition } from "react";
import { type MevoConfig, saveMevoConfig } from "@/app/admin/mevo/actions";

export default function MevoConfigCard({ inicial }: { inicial: MevoConfig }) {
  const [cfg, setCfg] = useState<MevoConfig>(inicial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  function set<K extends keyof MevoConfig>(k: K, v: MevoConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = await saveMevoConfig(cfg);
      setMsg(
        r.ok
          ? { ok: true, t: "Configuração salva." }
          : { ok: false, t: `Erro: ${r.error}` },
      );
    });
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <div className="mb-5 rounded-lg border border-yellow bg-yellow-l px-4 py-3 text-sm text-txt">
        ⚠️ Credenciais sensíveis (<code>MEVO_AUTH_B64</code>) são configuradas
        via terminal (<code>supabase secrets set</code>). Falar com o admin
        técnico para alterar — nunca são editáveis por esta tela.
      </div>

      <h2 className="mb-4 text-sm font-bold">Configuração da integração Mevo</h2>

      <div className="flex flex-col gap-4">
        <Toggle
          label="Integração ativa"
          v={cfg.enabled}
          on={(b) => set("enabled", b)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-txt-2">Ambiente</span>
          <select
            className={input}
            value={cfg.ambiente}
            onChange={(e) =>
              set("ambiente", e.target.value as MevoConfig["ambiente"])
            }
          >
            <option value="homologacao">Homologação</option>
            <option value="producao">Produção</option>
          </select>
        </label>

        <Texto label="SubParceiro" v={cfg.subparceiro} on={(v) => set("subparceiro", v)} />
        <Texto label="Logo URL" v={cfg.logo_url} on={(v) => set("logo_url", v)} placeholder="https://… (162x50px, ≤500kb)" />

        <div className="grid grid-cols-2 gap-4">
          <Cor label="Cor primária" v={cfg.cor_primaria} on={(v) => set("cor_primaria", v)} />
          <Cor label="Cor secundária" v={cfg.cor_secundaria} on={(v) => set("cor_secundaria", v)} />
        </div>

        <Toggle label="Certificado digital obrigatório" v={cfg.certificado_obrigatorio} on={(b) => set("certificado_obrigatorio", b)} />
        <Toggle label="Permitir impressão" v={cfg.permitir_impressao} on={(b) => set("permitir_impressao", b)} />
        <Toggle label="Exibir e-mail para envio" v={cfg.exibir_email} on={(b) => set("exibir_email", b)} />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar configuração"}
        </button>
        {msg && (
          <span className={`text-sm font-medium ${msg.ok ? "text-green" : "text-red"}`}>
            {msg.t}
          </span>
        )}
      </div>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

function Texto({
  label,
  v,
  on,
  placeholder,
}: {
  label: string;
  v: string;
  on: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      <input
        className={input}
        value={v}
        placeholder={placeholder}
        onChange={(e) => on(e.target.value)}
      />
    </label>
  );
}

function Cor({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={v || "#0066CC"}
          onChange={(e) => on(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border"
        />
        <input
          className={input}
          value={v}
          onChange={(e) => on(e.target.value)}
          placeholder="#0066CC"
        />
      </div>
    </label>
  );
}

function Toggle({
  label,
  v,
  on,
}: {
  label: string;
  v: boolean;
  on: (b: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => on(!v)}
      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm hover:bg-bg-3"
    >
      <span className="font-medium">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          v ? "bg-green" : "bg-bg-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            v ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
