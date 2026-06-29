"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMevoPrescricao } from "@/hooks/useMevoPrescricao";
import type { EventoMevo, PrescricaoMevo } from "@/lib/mevo/types";

const IS_DEV = process.env.NODE_ENV !== "production";
const MIN_IFRAME_W = 900;

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
  | { kind: "modal"; url: string; prescricaoId: string }
  | { kind: "erro"; msg: string }
  | { kind: "nao_configurada" }
  | { kind: "salvando" }
  | { kind: "salvo"; salvos: number; falhas: number };

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
    contarDocumentos,
  } = useMevoPrescricao(consultationId);

  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });
  const [prescricoes, setPrescricoes] = useState<PrescricaoMevo[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [config, setConfig] = useState<ConfigCheck>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // prescricaoId "ao vivo" — usado pelo listener de postMessage sem stale closure.
  const prescricaoAtivaRef = useRef<string | null>(null);

  const consultationActive = !!consultationId;

  const recarregarLista = useCallback(async () => {
    const lista = await listarPrescricoesDaConsulta();
    setPrescricoes(lista);
    setDocCounts(await contarDocumentos(lista.map((p) => p.id)));
  }, [listarPrescricoesDaConsulta, contarDocumentos]);

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
  }, [recarregarLista]);

  // ─── Listener de mensagens da iframe Mevo ─────────────────────────
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      // Só aceita mensagens das origens oficiais da Mevo.
      if (!MEVO_EMBED_ORIGINS.includes(event.origin)) return;
      const data = event.data as EventoMevo | undefined;
      const validos = ["cancel", "excluded", "prescricao"];
      if (!data || !validos.includes(data.type)) return;

      const prescricaoId = prescricaoAtivaRef.current;
      if (!prescricaoId) return;

      if (data.type === "prescricao") {
        // CRÍTICO: PDFs expiram em 10 min — salvar imediatamente.
        setEstado({ kind: "salvando" });
        const docs = data.Documentos ?? [];
        const r = await salvarDocumentos(prescricaoId, docs);
        prescricaoAtivaRef.current = null;
        if (r.ok) {
          setEstado({
            kind: "salvo",
            salvos: r.documentos_salvos,
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

  function abrirModal(url: string, prescricaoId: string) {
    prescricaoAtivaRef.current = prescricaoId;
    const largura = wrapRef.current?.clientWidth ?? 0;
    if (largura > 0 && largura < MIN_IFRAME_W) {
      // Card estreito → popup centralizado.
      const w = 1000;
      const h = 800;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      window.open(
        url,
        "mevo_prescricao",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      setEstado({ kind: "ocioso" });
    } else {
      setEstado({ kind: "modal", url, prescricaoId });
    }
  }

  async function handleEmitir() {
    setEstado({ kind: "carregando" });
    const r = await iniciarPrescricao();
    if (r.ok) {
      abrirModal(r.data.modal_url, r.data.prescricao_id);
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

  async function handleReabrir(prescricaoId: string) {
    setEstado({ kind: "carregando" });
    const r = await reabrirPrescricao(prescricaoId);
    if (r.ok) {
      abrirModal(r.modal_url, prescricaoId);
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

  async function baixarPdfs(prescricaoId: string) {
    const docs = await listarDocumentos(prescricaoId);
    if (docs.length === 0) {
      alert("Nenhum documento arquivado para esta prescrição ainda.");
      return;
    }
    for (const d of docs) {
      if (d.url) window.open(d.url, "_blank", "noopener");
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
    <div ref={wrapRef}>
      {/* ─── Subtítulo dinâmico ────────────────────────────────── */}
      <div className="mevo-subtitle">{subtitulo}</div>

      {/* ─── CTA / estados ─────────────────────────────────────── */}
      <div className="mevo-cta-wrap">
        {estado.kind === "modal" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 560,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13 }}>Mevo Prescritores</strong>
              <button
                type="button"
                className="doc-emitted-btn"
                onClick={fecharIframe}
                title="Fechar"
              >
                Fechar ✕
              </button>
            </div>
            <iframe
              src={estado.url}
              title="Mevo Prescritores"
              style={{
                width: "100%",
                minWidth: MIN_IFRAME_W,
                height: 700,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
              }}
              allow="camera; microphone; clipboard-write"
            />
          </div>
        ) : estado.kind === "carregando" || estado.kind === "salvando" ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--txt2)" }}>
            <span className="mevo-spinner" aria-hidden />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {estado.kind === "salvando"
                ? "Arquivando documentos (janela de 10 min)…"
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
            ✅ {estado.salvos} documento(s) arquivado(s) com sucesso
            {estado.falhas > 0 && ` · ${estado.falhas} com falha (verifique a lista)`}.
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
            const n = docCounts[p.id] ?? 0;
            return (
              <div className="doc-emitted" key={p.id}>
                <div className="doc-emitted-ic receita">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="doc-emitted-info">
                  <div className="doc-emitted-title">
                    {p.mevo_token ? `Token: ${p.mevo_token}` : "Prescrição"}
                    {p.ambiente === "homologacao" && (
                      <span style={{ marginLeft: 6, fontSize: 9, color: "var(--txt3)" }}>
                        [HOMOLOG]
                      </span>
                    )}
                  </div>
                  <div className="doc-emitted-meta">
                    <span>{STATUS_LABEL[p.status] ?? p.status}</span>
                    {p.codigo_validacao && <span>· Código: {p.codigo_validacao}</span>}
                    {(p.finalizada_em || p.created_at) && (
                      <span>· {fmtData(p.finalizada_em ?? p.created_at)}</span>
                    )}
                  </div>
                </div>
                <div className="doc-emitted-actions">
                  {(p.status === "iniciada" || p.status === "finalizada_com_erro") && (
                    <button
                      type="button"
                      className="doc-emitted-btn"
                      title="Reabrir / terminar mais tarde"
                      onClick={() => handleReabrir(p.id)}
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
                    className="doc-emitted-btn doc-emitted-btn-wide"
                    title={n > 0 ? `Baixar ${n} PDF(s)` : "Baixar PDFs"}
                    onClick={() => baixarPdfs(p.id)}
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
          Assinatura digital obrigatória (ICP-Brasil) · PDFs arquivados em até
          10min após emissão · CFM 1.821/2007
        </div>
      </div>

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
