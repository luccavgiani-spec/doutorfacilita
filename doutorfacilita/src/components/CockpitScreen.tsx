"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DoctorMenu from "@/components/cockpit/DoctorMenu";
import MevoPrescricaoCard from "@/components/cockpit/MevoPrescricaoCard";
import CockpitFila from "@/components/cockpit/CockpitFila";
import DoctorCallEmbedded from "@/components/cockpit/DoctorCallEmbedded";
import ChartPanel, { type ChartPanelHandle } from "@/components/cockpit/ChartPanel";
import type { ActiveCallPayload } from "@/components/cockpit/CallNextButton";
import { createClient } from "@/lib/supabase/client";

/**
 * Cockpit do médico (desktop). Vira client porque mantém o estado da chamada
 * ativa — o LiveKit fica embedded no `.doc-video-strip` enquanto o médico
 * preenche Mevo/prontuário sem mudar de aba.
 */
export default function CockpitScreen({
  consultationId,
  doctorNome,
  doctorSub,
}: {
  consultationId?: string;
  doctorNome: string;
  doctorSub: string;
}) {
  const [activeCall, setActiveCall] = useState<ActiveCallPayload | null>(null);
  const chartRef = useRef<ChartPanelHandle | null>(null);

  // ── Split redimensionável vídeo ↔ prontuário/Mevo (vertical) ──────────
  // Default dá MENOS espaço ao vídeo (38%) e MAIS ao painel Mevo (62%), para
  // o iframe da Mevo (≥900px) caber confortavelmente. Persistido só em estado
  // local (sem localStorage), como pedido.
  const [videoPct, setVideoPct] = useState(38);
  const mainRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    setVideoPct(Math.min(80, Math.max(20, pct)));
  }, []);

  const stopDrag = useCallback(() => {
    draggingRef.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
    },
    []
  );

  useEffect(() => {
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [onDragMove, stopDrag]);

  // ID efetivo da consulta ativa: a chamada em andamento se houver,
  // senão o que veio do server (in_progress prévio resolvido em /cockpit/page.tsx).
  const effectiveConsultationId = activeCall?.consultationId ?? consultationId;

  async function handleDoctorEndCall() {
    if (!activeCall) return;
    const id = activeCall.consultationId;

    // 1) Garante que TODO conteúdo das abas (prontuário + anamnese) está
    //    persistido — mesmo edições em voo no debounce (~800ms).
    try {
      await chartRef.current?.flushPending();
    } catch (err) {
      console.error("[CockpitScreen] flushPending failed:", err);
    }

    // 2) UI responde imediato; sala LiveKit + status='completed' em paralelo.
    setActiveCall(null);
    try {
      const supabase = createClient();
      void supabase.functions.invoke("end_consultation", {
        body: { consultation_id: id },
      });
    } catch (err) {
      console.error("[CockpitScreen] end_consultation invoke failed:", err);
    }
  }

  return (
    <div className="cockpit-desktop">

      <div className="doc-top">
        <div className="doc-top-left">
          <div className="logo-no">
            <span className="dots"><span></span><span></span><span></span><span></span></span>
            <span className="no-word">nó</span> telemed <span style={{color:'var(--txt2)', fontWeight:'400', fontSize:'12px', marginLeft:'6px'}}>painel médico</span>
          </div>
          <div className="doc-status-pill"><span className="sd"></span>Disponível</div>
          <div className="doc-top-stats">
            <div className="doc-stat">Hoje: <b>12</b> consultas</div>
            <div className="doc-stat">Tempo médio: <b>18min</b></div>
            <div className="doc-stat">NPS: <b>9,2</b></div>
          </div>
        </div>
        <div className="doc-top-right">
          <div className="doc-toggle">
            Aceitar próximos
            <div className="doc-toggle-switch"></div>
          </div>
          <DoctorMenu nome={doctorNome} sub={doctorSub} />
        </div>
      </div>

      <CockpitFila
        onCallNext={setActiveCall}
        activeConsultationId={activeCall?.consultationId ?? null}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* MAIN — visor da telechamada + painel Mevo (embaixo)  */}
      {/* ═══════════════════════════════════════════════════ */}
      <div
        className="doc-main"
        ref={mainRef}
        style={{
          gridTemplateRows: `minmax(0, ${videoPct}fr) 10px minmax(0, ${
            100 - videoPct
          }fr)`,
        }}
      >
        {activeCall ? (
          <DoctorCallEmbedded
            token={activeCall.token}
            url={activeCall.url}
            onDisconnect={handleDoctorEndCall}
          />
        ) : (
          <div className="doc-video-strip doc-video-empty">
            <div className="doc-video-empty-text">
              <div className="doc-video-empty-eyebrow">aguardando</div>
              <div className="doc-video-empty-title">Nenhuma consulta em andamento</div>
              <div className="doc-video-empty-sub">
                Clique em <b>Chamar próximo</b> no card do paciente à esquerda
                para iniciar a videochamada aqui.
              </div>
            </div>
          </div>
        )}

        {/* Divisor redimensionável — arraste p/ dar mais espaço ao vídeo
            ou ao painel Mevo/prontuário. */}
        <div
          className="doc-split-handle"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Redimensionar vídeo e prontuário"
          title="Arraste para redimensionar"
        />

        {/* ═══════════════════════════════════════════════════ */}
        {/* ACTIONS PANEL — EXPANDIDO COM CAPACIDADES MEVO        */}
        {/* (movido para baixo do visor da telechamada)          */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="doc-actions">

          {/* Header */}
          <div className="actions-header">
            <div className="actions-header-left">
              <div>
                <div className="actions-title-main">Documentos médicos</div>
                <div className="actions-powered">
                  integração oficial ·
                  <span className="actions-powered-logo">mevo</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Mevo + subtítulo dinâmico + lista de prescrições (client component) */}
          <MevoPrescricaoCard consultationId={effectiveConsultationId} />

          {/* Tipos de documento disponíveis NA modal Mevo (informativo).
              O médico NÃO escolhe o tipo aqui — a modal Mevo abre única e
              o tipo é selecionado dentro dela. Lista fiel à doc v1.42 (p.18-19). */}
          <div style={{ padding: "0 16px 16px" }}>
            <details className="mevo-doctypes">
              <summary>Tipos de documento disponíveis na modal Mevo</summary>
              <div className="mevo-doctypes-list">
                Receita simples · Controle especial · Manipulados<br />
                Atestado · Solicitação de exame · Encaminhamento<br />
                Laudo/Relatório · LME · Instrução
              </div>
              <div className="mevo-doctypes-note">
                O tipo do documento é escolhido dentro da modal Mevo, não aqui.
              </div>
            </details>
          </div>

          {/* Finalização */}
          <div className="actions-footer">
            <button className="finish-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Encerrar e chamar próximo
            </button>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PRONTUÁRIO / HISTÓRICO / ANAMNESE — coluna direita    */}
      {/* Dados reais por paciente + autosave em medical_records  */}
      {/* (compliance CFM Resolução 1.821/2007).                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <ChartPanel ref={chartRef} consultationId={effectiveConsultationId} />
    </div>
  );
}
