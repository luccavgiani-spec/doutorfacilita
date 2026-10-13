"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MevoDocumentosViewer from "@/components/cockpit/MevoDocumentosViewer";
import {
  EVENTO_DOCUMENTOS_ATUALIZADOS,
  fmtHora,
  listarDocumentosArquivados,
  rotuloDocumento,
} from "@/lib/mevo/documentos";
import type { DocumentoArquivado, PrescricaoMevo } from "@/lib/mevo/types";

type Prescricao = Pick<
  PrescricaoMevo,
  "id" | "mevo_id_prescricao" | "codigo_validacao" | "status" | "ambiente" | "created_at" | "finalizada_em" | "webhook_recebido_em"
>;

const STATUS_LABEL: Record<string, string> = {
  finalizada: "emitida",
  finalizada_com_erro: "emitida · falha ao arquivar",
  cancelada: "cancelada",
  excluida: "excluída",
};

/**
 * Documentos emitidos pela Mevo numa consulta, lidos do prontuário (PDFs
 * baixados e arquivados no recebimento — não dependem do link da Mevo).
 * Sessões abertas e abandonadas (status `iniciada`) ficam só no card Mevo.
 *
 * `aoVivo`: atualiza sozinho quando chega webhook/arquivamento (Realtime em
 * mevo_eventos + aviso de janela do card + polling enquanto há prescrição
 * em aberto).
 */
export default function DocumentosMevoConsulta({
  consultationId,
  aoVivo = false,
}: {
  consultationId: string;
  aoVivo?: boolean;
}) {
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!sbRef.current) {
    try {
      sbRef.current = createClient();
    } catch {
      /* noop */
    }
  }
  const [prescricoes, setPrescricoes] = useState<Prescricao[] | null>(null);
  const [docs, setDocs] = useState<DocumentoArquivado[]>([]);
  const [emAberto, setEmAberto] = useState(false);
  const [viewer, setViewer] = useState<{ presc: Prescricao; inicial: number } | null>(null);

  const carregar = useCallback(async () => {
    const sb = sbRef.current;
    if (!sb) return;
    const { data } = await sb
      .from("prescricoes_mevo")
      .select("id, mevo_id_prescricao, codigo_validacao, status, ambiente, created_at, finalizada_em, webhook_recebido_em")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false });
    const todas = (data as Prescricao[] | null) ?? [];
    const emitidas = todas.filter((p) => p.status !== "iniciada");
    setEmAberto(todas.some((p) => p.status === "iniciada"));
    setDocs(await listarDocumentosArquivados(sb, emitidas.map((p) => p.id)));
    setPrescricoes(emitidas);
  }, [consultationId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!aoVivo) return;
    const onAviso = () => void carregar();
    window.addEventListener(EVENTO_DOCUMENTOS_ATUALIZADOS, onAviso);
    window.addEventListener("focus", onAviso);
    return () => {
      window.removeEventListener(EVENTO_DOCUMENTOS_ATUALIZADOS, onAviso);
      window.removeEventListener("focus", onAviso);
    };
  }, [aoVivo, carregar]);

  // Realtime: cada evento da consulta (webhook, PDF arquivado) refaz a lista.
  useEffect(() => {
    const sb = sbRef.current;
    if (!aoVivo || !sb) return;
    const channel = sb.channel(`mevo-docs:${consultationId}:${crypto.randomUUID()}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mevo_eventos", filter: `consultation_id=eq.${consultationId}` },
      () => void carregar(),
    );
    let ativo = true;
    (async () => {
      // postgres_changes é filtrado por RLS: o socket precisa do JWT do médico.
      try {
        const { data } = await sb.auth.getSession();
        if (data.session?.access_token) sb.realtime.setAuth(data.session.access_token);
      } catch (err) {
        console.error("[DocumentosMevoConsulta] realtime setAuth falhou", err);
      }
      if (ativo) channel.subscribe();
    })();
    return () => {
      ativo = false;
      sb.removeChannel(channel);
    };
  }, [aoVivo, consultationId, carregar]);

  // Rede de segurança: enquanto há sessão Mevo aberta, confere a cada 5s.
  useEffect(() => {
    if (!aoVivo || !emAberto) return;
    const id = window.setInterval(() => void carregar(), 5_000);
    return () => window.clearInterval(id);
  }, [aoVivo, emAberto, carregar]);

  return (
    <div className="chart-section">
      <div className="chart-section-label">Documentos emitidos (Mevo)</div>
      {prescricoes === null && <div className="chart-empty-soft">Carregando…</div>}
      {prescricoes?.length === 0 && (
        <div className="chart-empty-soft">
          Nenhum documento emitido nesta consulta. Os PDFs aparecem aqui assim que a Mevo confirma a emissão.
        </div>
      )}
      {prescricoes?.map((p) => {
        const docsDaPresc = docs.filter((d) => d.prescricao_id === p.id);
        return (
          <div key={p.id} className="chart-pres-card">
            <div className="chart-pres-top">
              <span className="chart-pres-status">{STATUS_LABEL[p.status] ?? p.status}</span>
              <span className="chart-pres-id">Prescrição nº {p.mevo_id_prescricao ?? "—"}</span>
            </div>
            <div className="chart-pres-meta">
              {p.codigo_validacao && (
                <span>
                  Código de validação <b className="chart-pres-code">{p.codigo_validacao}</b>
                </span>
              )}
              {p.webhook_recebido_em && <span>· webhook recebido {fmtHora(p.webhook_recebido_em)}</span>}
              {p.ambiente === "homologacao" && <span>· homologação</span>}
            </div>
            <div className="chart-pres-docs">
              {docsDaPresc.length === 0 ? (
                <span className="chart-pres-link chart-pres-link--off">
                  {p.status === "finalizada"
                    ? "Arquivando PDF…"
                    : p.status === "finalizada_com_erro"
                      ? "PDF não arquivado — falha registrada no admin"
                      : "Sem documentos"}
                </span>
              ) : (
                docsDaPresc.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    className="chart-pres-link"
                    onClick={() => setViewer({ presc: p, inicial: i })}
                  >
                    📄 {rotuloDocumento(d)}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}

      {viewer && (
        <MevoDocumentosViewer
          titulo={`Prescrição nº ${viewer.presc.mevo_id_prescricao ?? "—"}`}
          subtitulo={
            viewer.presc.codigo_validacao
              ? `Código de validação ${viewer.presc.codigo_validacao} · PDF arquivado no prontuário`
              : "PDF arquivado no prontuário"
          }
          documentos={docs.filter((d) => d.prescricao_id === viewer.presc.id)}
          idPrescricao={viewer.presc.mevo_id_prescricao}
          inicial={viewer.inicial}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
