"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/Logo";
import type { EventoIntegracaoMevo } from "@/lib/mevo/types";

const COLUNAS =
  "id, criado_em, origem, evento, http_status, duracao_ms, mevo_id_prescricao, prescricao_id, consultation_id, resumo, detalhe";
const LIMITE_TELA = 300;

const FLUXO: Record<EventoIntegracaoMevo["origem"], { rotulo: string; classe: string }> = {
  backend: { rotulo: "Backend → API Mevo", classe: "bg-blue-light text-blue-dark" },
  webhook: { rotulo: "Mevo → Webhook", classe: "bg-mevo-purple-l text-mevo-purple" },
  iframe: { rotulo: "Iframe → Sistema", classe: "bg-yellow-light text-[#92400E]" },
  storage: { rotulo: "Prontuário", classe: "bg-green-light text-green-dark" },
};

function rotuloFluxo(e: EventoIntegracaoMevo): string {
  if (e.origem === "backend" && !e.evento.startsWith("POST")) return "Backend";
  return FLUXO[e.origem].rotulo;
}

function hora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleTimeString("pt-BR")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function classeHttp(s: number | null): string {
  if (s == null) return "text-txt-3";
  if (s < 300) return "bg-green-light text-green-dark";
  if (s < 500) return "bg-yellow-light text-[#92400E]";
  return "bg-red-light text-red";
}

function hostMevo(eventos: EventoIntegracaoMevo[]): string | null {
  for (let i = eventos.length - 1; i >= 0; i--) {
    const endpoint = (eventos[i].detalhe as { endpoint?: unknown } | null)?.endpoint;
    if (typeof endpoint === "string") {
      try {
        return new URL(endpoint).host;
      } catch {
        /* segue */
      }
    }
  }
  return null;
}

/**
 * Tabela ao vivo de tudo que acontece entre o Plantão Digital e a Mevo:
 * chamadas do backend à API, webhooks recebidos, eventos da iframe e PDFs
 * arquivados. Realtime em mevo_eventos + polling incremental (3s) como rede
 * de segurança. Detalhes já chegam sanitizados (sem token nem credencial).
 */
export default function MevoMonitor({ escopo }: { escopo: "todos" | "meus" }) {
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!sbRef.current) sbRef.current = createClient();

  const [eventos, setEventos] = useState<EventoIntegracaoMevo[]>([]);
  const [novos, setNovos] = useState<Set<number>>(new Set());
  const [aberto, setAberto] = useState<Set<number>>(new Set());
  const [desde, setDesde] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(false);
  const [agora, setAgora] = useState<Date | null>(null);
  const maxIdRef = useRef(0);
  const idsRef = useRef<Set<number>>(new Set());
  const carregouRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const adicionar = useCallback((lista: EventoIntegracaoMevo[]) => {
    const frescos = lista.filter((e) => !idsRef.current.has(e.id));
    if (frescos.length === 0) return;
    for (const e of frescos) idsRef.current.add(e.id);
    maxIdRef.current = Math.max(maxIdRef.current, ...frescos.map((e) => e.id));
    if (carregouRef.current) {
      setNovos((n) => new Set([...n, ...frescos.map((e) => e.id)]));
    }
    setEventos((atual) =>
      [...atual, ...frescos].sort((a, b) => a.id - b.id).slice(-LIMITE_TELA),
    );
  }, []);

  // Carga inicial: últimos 100 eventos.
  useEffect(() => {
    const sb = sbRef.current!;
    (async () => {
      const { data } = await sb
        .from("mevo_eventos")
        .select(COLUNAS)
        .order("id", { ascending: false })
        .limit(100);
      adicionar(((data as EventoIntegracaoMevo[] | null) ?? []).reverse());
      carregouRef.current = true;
    })();
  }, [adicionar]);

  // Realtime (caminho rápido).
  useEffect(() => {
    const sb = sbRef.current!;
    const channel = sb.channel(`mevo-monitor:${crypto.randomUUID()}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mevo_eventos" },
      (payload) => adicionar([payload.new as EventoIntegracaoMevo]),
    );
    let ativo = true;
    (async () => {
      // postgres_changes é filtrado por RLS: o socket precisa do JWT do usuário.
      try {
        const { data } = await sb.auth.getSession();
        if (data.session?.access_token) sb.realtime.setAuth(data.session.access_token);
      } catch (err) {
        console.error("[MevoMonitor] realtime setAuth falhou", err);
      }
      if (!ativo) return;
      channel.subscribe((st) => setAoVivo(st === "SUBSCRIBED"));
    })();
    return () => {
      ativo = false;
      sb.removeChannel(channel);
    };
  }, [adicionar]);

  // Polling incremental (rede de segurança do realtime).
  useEffect(() => {
    const sb = sbRef.current!;
    const id = window.setInterval(async () => {
      if (!carregouRef.current) return;
      const { data } = await sb
        .from("mevo_eventos")
        .select(COLUNAS)
        .gt("id", maxIdRef.current)
        .order("id", { ascending: true })
        .limit(100);
      adicionar((data as EventoIntegracaoMevo[] | null) ?? []);
    }, 3_000);
    return () => window.clearInterval(id);
  }, [adicionar]);

  // Relógio com data — o roteiro pede data e hora visíveis na gravação.
  useEffect(() => {
    setAgora(new Date());
    const id = window.setInterval(() => setAgora(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const visiveis = useMemo(
    () => (desde ? eventos.filter((e) => e.criado_em >= desde) : eventos),
    [eventos, desde],
  );

  // Rola para o fim quando chega evento novo (leitura cronológica).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visiveis.length]);

  const host = hostMevo(eventos);
  const contagem = {
    api: visiveis.filter((e) => e.origem === "backend" && e.evento.startsWith("POST")).length,
    webhook: visiveis.filter((e) => e.origem === "webhook").length,
    pdfs: visiveis.filter((e) => e.evento === "PDF arquivado no prontuário").length,
  };

  function alternar(id: number) {
    setAberto((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="flex h-screen flex-col bg-bg font-sans text-txt">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <LogoMark size={30} />
          <div>
            <h1 className="text-sm font-bold leading-tight">Monitor da integração Mevo</h1>
            <p className="text-[11px] text-txt-2">
              {host ? (
                <>
                  API <span className="font-mono">{host}</span>
                  {host.includes("homolog") ? " · homologação" : ""}
                </>
              ) : (
                "Aguardando a primeira chamada à API"
              )}
              {escopo === "meus" && " · somente suas prescrições"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              aoVivo ? "bg-green-light text-green-dark" : "bg-yellow-light text-[#92400E]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${aoVivo ? "animate-pulse-sm bg-green" : "bg-yellow"}`} />
            {aoVivo ? "ao vivo" : "atualizando a cada 3s"}
          </span>
          <div className="text-right font-mono leading-tight">
            <div className="text-lg font-bold tabular-nums">{agora ? agora.toLocaleTimeString("pt-BR") : "--:--:--"}</div>
            <div className="text-[11px] text-txt-2">{agora ? agora.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : ""}</div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-5 py-2">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FLUXO) as EventoIntegracaoMevo["origem"][]).map((o) => (
            <span key={o} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${FLUXO[o].classe}`}>
              {FLUXO[o].rotulo}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-txt-2">
          <span>
            <b className="text-txt">{contagem.api}</b> chamadas à API · <b className="text-txt">{contagem.webhook}</b> webhooks ·{" "}
            <b className="text-txt">{contagem.pdfs}</b> PDFs arquivados
          </span>
          {desde ? (
            <button type="button" className="rounded-md border border-border px-2.5 py-1 font-semibold hover:bg-bg-3" onClick={() => setDesde(null)}>
              Mostrar histórico
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 font-semibold hover:bg-bg-3"
              onClick={() => {
                setDesde(new Date().toISOString());
                setAberto(new Set());
              }}
            >
              Limpar tela
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-bg-3 text-left text-[10px] uppercase tracking-wide text-txt-2">
            <tr>
              <th className="w-[92px] px-3 py-2 font-semibold">Hora</th>
              <th className="w-[132px] px-2 py-2 font-semibold">Fluxo</th>
              <th className="w-[190px] px-2 py-2 font-semibold">Evento</th>
              <th className="w-[52px] px-2 py-2 font-semibold">HTTP</th>
              <th className="w-[86px] px-2 py-2 font-semibold">idPrescricao</th>
              <th className="px-2 py-2 font-semibold">Resumo</th>
              <th className="w-[56px] px-3 py-2 text-right font-semibold">ms</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm text-txt-2">
                  Nenhum evento ainda. Emita uma prescrição no Cockpit — cada chamada à API, webhook e PDF
                  arquivado aparece aqui na hora.
                </td>
              </tr>
            )}
            {visiveis.map((e) => (
              <FragmentoLinha
                key={e.id}
                evento={e}
                novo={novos.has(e.id)}
                aberto={aberto.has(e.id)}
                onToggle={() => alternar(e.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentoLinha({
  evento: e,
  novo,
  aberto,
  onToggle,
}: {
  evento: EventoIntegracaoMevo;
  novo: boolean;
  aberto: boolean;
  onToggle: () => void;
}) {
  const temDetalhe = e.detalhe != null;
  return (
    <>
      <tr
        className={`border-b border-border align-top ${novo ? "mevo-mon-novo" : "bg-white"} ${temDetalhe ? "cursor-pointer hover:bg-bg-3" : ""}`}
        onClick={temDetalhe ? onToggle : undefined}
      >
        <td className="px-3 py-2 font-mono tabular-nums text-txt-2">{hora(e.criado_em)}</td>
        <td className="px-2 py-2">
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${FLUXO[e.origem].classe}`}>
            {rotuloFluxo(e)}
          </span>
        </td>
        <td className="break-words px-2 py-2 font-mono text-[11px] font-semibold">{e.evento}</td>
        <td className="px-2 py-2">
          {e.http_status != null ? (
            <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${classeHttp(e.http_status)}`}>{e.http_status}</span>
          ) : (
            <span className="text-txt-3">—</span>
          )}
        </td>
        <td className="px-2 py-2 font-mono text-[11px]">{e.mevo_id_prescricao ?? "—"}</td>
        <td className="break-words px-2 py-2 text-txt">
          {e.resumo}
          {temDetalhe && <span className="ml-1 text-[10px] text-txt-3">{aberto ? "▲" : "▼ detalhes"}</span>}
        </td>
        <td className="px-3 py-2 text-right font-mono tabular-nums text-txt-2">{e.duracao_ms ?? ""}</td>
      </tr>
      {aberto && temDetalhe && (
        <tr className="border-b border-border bg-bg">
          <td colSpan={7} className="px-3 py-2">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#0B1B3A] p-3 font-mono text-[11px] leading-relaxed text-[#E6ECF8]">
              {JSON.stringify(e.detalhe, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
