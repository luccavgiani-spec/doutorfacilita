"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMevoPrescricao } from "@/hooks/useMevoPrescricao";
import MevoDocumentosViewer from "@/components/cockpit/MevoDocumentosViewer";
import { avisarDocumentosAtualizados, fmtHora } from "@/lib/mevo/documentos";
import type { DocumentoArquivado, EventoMevo, PrescricaoMevo } from "@/lib/mevo/types";

const IS_DEV = process.env.NODE_ENV !== "production";

// Origens confiáveis para mensagens postMessage vindas da iframe da Mevo.
// Qualquer evento de outra origem é ignorado (defesa contra postMessage forjado).
const MEVO_EMBED_ORIGINS = [
  "https://staging-embedded.nexodata.com.br", // homologação (confirmado)
  "https://embedded.nexodata.com.br", // confirmar host de prod com a Mevo
];

// Fallback de exibição quando a probe ainda não respondeu.
const AMBIENTE_FALLBACK =
  process.env.NEXT_PUBLIC_MEVO_AMBIENTE === "produção" ||
  process.env.NEXT_PUBLIC_MEVO_AMBIENTE === "producao"
    ? "produção"
    : "homologação";

type Estado =
  | { kind: "ocioso" }
  | { kind: "carregando" }
  | { kind: "modal"; url: string; prescricao: PrescricaoAtiva }
  | { kind: "erro"; msg: string }
  | { kind: "nao_configurada" }
  | { kind: "salvando"; prescricao: PrescricaoAtiva }
  | {
      kind: "salvo";
      prescricao: PrescricaoAtiva;
      salvos: number;
      jaArquivados: number;
      falhas: number;
    };

/** Prescrição aberta na modal: id local + identificação Mevo exibida na tela. */
type PrescricaoAtiva = {
  id: string;
  idMevo: string | null;
  codigo: string | null;
};

// null = ainda checando.
type ConfigCheck =
  | null
  | { configured: false }
  | { configured: true; ambiente: "homologacao" | "producao" };

const STATUS_LABEL: Record<string, string> = {
  iniciada: "Em aberto",
  finalizada: "Finalizada",
  finalizada_com_erro: "Finalizada (com falhas)",
  cancelada: "Cancelada",
  excluida: "Excluída",
};

function fmtData(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MevoPrescricaoCard({
  consultationId,
}: {
  consultationId?: string;
}) {
  const {
    verificarConfiguracao,
    iniciarPrescricao,
    reabrirPrescricao,
    salvarDocumentos,
    listarPrescricoesDaConsulta,
    listarDocumentos,
  } = useMevoPrescricao(consultationId);

  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });
  const [prescricoes, setPrescricoes] = useState<PrescricaoMevo[]>([]);
  const [docs, setDocs] = useState<DocumentoArquivado[]>([]);
  const [config, setConfig] = useState<ConfigCheck>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState<PrescricaoMevo | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  // Prescrição "ao vivo" — usada pelo listener de postMessage sem stale closure.
  const prescricaoAtivaRef = useRef<PrescricaoAtiva | null>(null);

  const consultationActive = !!consultationId;

  const recarregarLista = useCallback(async () => {
    const lista = await listarPrescricoesDaConsulta();
    setPrescricoes(lista);
    setDocs(await listarDocumentos(lista.map((p) => p.id)));
  }, [listarPrescricoesDaConsulta, listarDocumentos]);

  useEffect(() => {
    if (consultationId) recarregarLista();
  }, [consultationId, recarregarLista]);

  // ─── Probe de credencial Mevo (sem efeito colateral) ──────────────
  useEffect(() => {
    let vivo = true;
    verificarConfiguracao().then((r) => {
      if (vivo) setConfig(r);
    });
    return () => {
      vivo = false;
    };
  }, [verificarConfiguracao]);

  const fecharIframe = useCallback(() => {
    prescricaoAtivaRef.current = null;
    setEstado({ kind: "ocioso" });
    recarregarLista();
    avisarDocumentosAtualizados();
  }, [recarregarLista]);

  // ─── Listener de mensagens da iframe Mevo ─────────────────────────
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      // Só aceita mensagens das origens oficiais da Mevo.
      if (!MEVO_EMBED_ORIGINS.includes(event.origin)) return;
      const data = event.data as EventoMevo | undefined;
      const validos = ["cancel", "excluded", "prescricao"];
      if (!data || !validos.includes(data.type)) return;

      const ativa = prescricaoAtivaRef.current;
      if (!ativa) return;

      if (data.type === "prescricao") {
        // A modal fecha aqui. O webhook EMISSION normalmente já arquivou os
        // PDFs; este repasse é a redundância (o backend não duplica).
        setEstado({ kind: "salvando", prescricao: ativa });
        const r = await salvarDocumentos(ativa.id, data.Documentos ?? []);
        prescricaoAtivaRef.current = null;
        if (r.ok) {
          setEstado({
            kind: "salvo",
            prescricao: ativa,
            salvos: r.documentos_salvos,
            jaArquivados: r.ja_arquivados,
            falhas: r.falhas.length,
          });
        } else {
          setEstado({
            kind: "erro",
            msg:
              "Documentos emitidos mas falha ao arquivar: " +
              (r.erro.message ?? r.erro.error) +
              ". Reabra a prescrição e tente novamente.",
          });
        }
        recarregarLista();
        avisarDocumentosAtualizados();
      } else if (data.type === "cancel") {
        // "Terminar mais tarde" — idPrescricao já está salvo, nada a fazer.
        fecharIframe();
      } else if (data.type === "excluded") {
        fecharIframe();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [salvarDocumentos, fecharIframe, recarregarLista]);

  function abrirModal(url: string, prescricao: PrescricaoAtiva) {
    // A interface da Mevo renderiza SEMPRE inline no card do centro, que o
    // grid garante com ≥900px. Sem overlay, sem expandir, sem guard de tela.
    prescricaoAtivaRef.current = prescricao;
    setEstado({ kind: "modal", url, prescricao });
  }

  async function handleEmitir() {
    setEstado({ kind: "carregando" });
    const r = await iniciarPrescricao();
    if (r.ok) {
      abrirModal(r.data.modal_url, {
        id: r.data.prescricao_id,
        idMevo: r.data.mevo_id_prescricao,
        codigo: r.data.codigo_validacao ?? null,
      });
      return;
    }
    if (r.erro.naoConfigurada) {
      setConfig({ configured: false });
      setEstado({ kind: "nao_configurada" });
      return;
    }
    setEstado({
      kind: "erro",
      msg: r.erro.message ?? r.erro.error ?? "Falha ao iniciar prescrição.",
    });
  }

  async function handleReabrir(p: PrescricaoMevo) {
    setEstado({ kind: "carregando" });
    const r = await reabrirPrescricao(p.id);
    if (r.ok) {
      abrirModal(r.modal_url, { id: p.id, idMevo: p.mevo_id_prescricao, codigo: p.codigo_validacao });
      return;
    }
    if (r.erro.naoConfigurada) {
      setConfig({ configured: false });
      setEstado({ kind: "nao_configurada" });
      return;
    }
    setEstado({
      kind: "erro",
      msg: r.erro.message ?? r.erro.error ?? "Falha ao reabrir prescrição.",
    });
  }

  // Texto para enviar à Mevo (seção 5 do roteiro de validação).
  async function copiarIdentificacao(p: PrescricaoMevo) {
    const texto = `idPrescricao: ${p.mevo_id_prescricao ?? "—"} · Código de validação: ${p.codigo_validacao ?? "—"}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(p.id);
      window.setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 1800);
    } catch {
      /* clipboard indisponível */
    }
  }

  // ─── Subtítulo dinâmico (estado REAL — substitui o banner mock) ────
  const ambienteLabel =
    config && config.configured
      ? config.ambiente === "producao"
        ? "produção"
        : "homologação"
      : AMBIENTE_FALLBACK;

  let subtitulo: React.ReactNode;
  if (!consultationActive) {
    subtitulo = <span>Sem consulta em andamento</span>;
  } else if (config === null) {
    subtitulo = <span>Verificando credencial Mevo…</span>;
  } else if (!config.configured) {
    subtitulo = (
      <span className="mevo-sub-warn">
        ⚠ Aguardando credencial Mevo ({ambienteLabel})
      </span>
    );
  } else {
    subtitulo = (
      <span>
        Pronto para emitir · ambiente {ambienteLabel} · CRM será validado
        no CFM ao iniciar
      </span>
    );
  }

  // ─── Confirmação de envio (SMS + e-mail) — só se já emitida ────────
  const ultima = prescricoes[0];
  const ultimaFinalizada =
    ultima &&
    (ultima.status === "finalizada" ||
      ultima.status === "finalizada_com_erro");

  return (
    <div>
      {/* ─── Subtítulo dinâmico ────────────────────────────────── */}
      <div className="mevo-subtitle">{subtitulo}</div>

      {/* ─── CTA / estados ─────────────────────────────────────── */}
      <div className="mevo-cta-wrap">
        {estado.kind === "modal" ? (
          <div className="mevo-modal">
            <div className="mevo-modal-head">
              <strong style={{ fontSize: 13 }}>
                Mevo Prescritores
                {estado.prescricao.idMevo && (
                  <span className="mevo-modal-id"> · Prescrição nº {estado.prescricao.idMevo}</span>
                )}
              </strong>
              <div className="mevo-modal-actions">
                <button
                  type="button"
                  className="doc-emitted-btn"
                  onClick={fecharIframe}
                  title="Fechar"
                >
                  Fechar ✕
                </button>
              </div>
            </div>
            <iframe
              src={estado.url}
              title="Mevo Prescritores"
              className="mevo-iframe"
              allow="camera; microphone; clipboard-write"
            />
          </div>
        ) : estado.kind === "carregando" || estado.kind === "salvando" ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--txt2)" }}>
            <span className="mevo-spinner" aria-hidden />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {estado.kind === "salvando"
                ? `Prescrição nº ${estado.prescricao.idMevo ?? "—"} finalizada · arquivando documentos no prontuário…`
                : "Abrindo prescrição na Mevo…"}
            </div>
          </div>
        ) : estado.kind === "nao_configurada" ? (
          <div className="mevo-state-warn">
            {IS_DEV ? (
              <>
                🔧 Aguardando credenciais da Mevo. Configure{" "}
                <code>MEVO_AUTH_B64</code> nos secrets do Supabase para ativar.
              </>
            ) : (
              <>Emissão de receita digital temporariamente indisponível.</>
            )}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="mevo-start-btn" onClick={handleEmitir}>
                Tentar novamente
              </button>
            </div>
          </div>
        ) : estado.kind === "erro" ? (
          <div className="mevo-state-erro">
            <div style={{ marginBottom: 10 }}>⚠️ {estado.msg}</div>
            <button type="button" className="mevo-start-btn" onClick={handleEmitir}>
              Tentar novamente
            </button>
          </div>
        ) : estado.kind === "salvo" ? (
          <div className="mevo-state-ok">
            <div>
              ✅ Prescrição nº <b>{estado.prescricao.idMevo ?? "—"}</b> emitida
              {estado.prescricao.codigo && (
                <> · código de validação <b>{estado.prescricao.codigo}</b></>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              {estado.salvos + estado.jaArquivados} documento(s) no prontuário
              {estado.jaArquivados > 0 && estado.salvos === 0
                ? " (recebidos pelo webhook)"
                : estado.jaArquivados > 0
                  ? ` (${estado.jaArquivados} pelo webhook)`
                  : ""}
              {estado.falhas > 0 && ` · ${estado.falhas} com falha (verifique a lista)`}.
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="mevo-start-btn" onClick={() => setEstado({ kind: "ocioso" })}>
                Emitir outra prescrição
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="mevo-start-btn"
              onClick={handleEmitir}
              disabled={!consultationId}
              style={!consultationId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Emitir prescrição
            </button>
            <div className="mevo-start-hint">
              {consultationId
                ? <>Receita digital via <b>Mevo</b> · emita múltiplos documentos na mesma sessão</>
                : <>Nenhuma consulta em andamento — chame um paciente para emitir.</>}
            </div>
          </>
        )}
      </div>

      {/* ─── Prescrições desta consulta ────────────────────────── */}
      <div className="actions-section">
        <div className="actions-section-head">
          <div className="actions-section-title">Prescrições desta consulta</div>
          <div className="actions-section-count">
            {prescricoes.length} {prescricoes.length === 1 ? "registro" : "registros"}
          </div>
        </div>

        {prescricoes.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--txt3)", padding: "4px 2px" }}>
            Nenhuma prescrição emitida nesta consulta ainda.
          </div>
        ) : (
          prescricoes.map((p) => {
            const n = docs.filter((d) => d.prescricao_id === p.id).length;
            return (
              <div className="doc-emitted" key={p.id}>
                <div className="doc-emitted-ic receita">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="doc-emitted-info">
                  <div className="doc-emitted-title">
                    Prescrição nº {p.mevo_id_prescricao ?? "—"}
                    {p.ambiente === "homologacao" && (
                      <span style={{ marginLeft: 6, fontSize: 9, color: "var(--txt3)" }}>
                        [HOMOLOG]
                      </span>
                    )}
                  </div>
                  <div className="doc-emitted-meta">
                    <span>{STATUS_LABEL[p.status] ?? p.status}</span>
                    {p.codigo_validacao && <span>· Código de validação: {p.codigo_validacao}</span>}
                    {(p.finalizada_em || p.created_at) && (
                      <span>· {fmtData(p.finalizada_em ?? p.created_at)}</span>
                    )}
                    {p.webhook_recebido_em && (
                      <span className="mevo-webhook-ok">· webhook ✓ {fmtHora(p.webhook_recebido_em)}</span>
                    )}
                  </div>
                </div>
                <div className="doc-emitted-actions">
                  {(p.status === "iniciada" || p.status === "finalizada_com_erro") && (
                    <button
                      type="button"
                      className="doc-emitted-btn"
                      title="Reabrir / terminar mais tarde"
                      onClick={() => handleReabrir(p)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                  )}
                  {p.qrcode_url && (
                    <button
                      type="button"
                      className="doc-emitted-btn"
                      title="Ver QR Code"
                      onClick={() => setQrUrl(p.qrcode_url)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="doc-emitted-btn"
                    title="Copiar idPrescricao e código de validação"
                    onClick={() => copiarIdentificacao(p)}
                  >
                    {copiado === p.id ? (
                      <span style={{ fontSize: 10 }}>✓</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="doc-emitted-btn doc-emitted-btn-wide"
                    title={n > 0 ? `Ver ${n} PDF(s) arquivado(s)` : "Nenhum PDF arquivado ainda"}
                    onClick={() => setViewer(p)}
                    disabled={n === 0}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {n > 0 && <span style={{ fontSize: 10 }}>{n}</span>}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {ultimaFinalizada && (
          <div className="mevo-sent-confirm">
            ✓ Última prescrição enviada para o paciente (SMS + e-mail)
          </div>
        )}

        <div style={{ marginTop: 6, fontSize: 10, color: "var(--txt3)", lineHeight: 1.5, padding: "0 2px" }}>
          Assinatura digital obrigatória (ICP-Brasil) · PDFs baixados no
          recebimento e arquivados no prontuário · CFM 1.821/2007
        </div>
      </div>

      {viewer && (
        <MevoDocumentosViewer
          titulo={`Prescrição nº ${viewer.mevo_id_prescricao ?? "—"}`}
          subtitulo={
            viewer.codigo_validacao
              ? `Código de validação ${viewer.codigo_validacao} · PDF arquivado no prontuário`
              : "PDF arquivado no prontuário"
          }
          documentos={docs.filter((d) => d.prescricao_id === viewer.id)}
          idPrescricao={viewer.mevo_id_prescricao}
          onClose={() => setViewer(null)}
        />
      )}

      {/* ─── Modal QR Code ─────────────────────────────────────── */}
      {qrUrl && (
        <div
          className="mevo-qr-overlay"
          onClick={() => setQrUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="mevo-qr-box" onClick={(e) => e.stopPropagation()}>
            <div className="mevo-qr-head">
              <strong>QR Code da prescrição</strong>
              <button
                type="button"
                className="doc-emitted-btn"
                onClick={() => setQrUrl(null)}
                title="Fechar"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR Code da prescrição Mevo" className="mevo-qr-img" />
            <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="mevo-qr-link">
              Abrir em nova aba
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
