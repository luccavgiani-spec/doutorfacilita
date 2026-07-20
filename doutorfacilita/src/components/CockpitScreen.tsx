"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DoctorMenu from "@/components/cockpit/DoctorMenu";
import MevoPrescricaoCard from "@/components/cockpit/MevoPrescricaoCard";
import CockpitFila from "@/components/cockpit/CockpitFila";
import DoctorCallEmbedded from "@/components/cockpit/DoctorCallEmbedded";
import EvasaoTimer from "@/components/cockpit/EvasaoTimer";
import ChartPanel, { type ChartPanelHandle } from "@/components/cockpit/ChartPanel";
import type { ActiveCallPayload } from "@/components/cockpit/CallNextButton";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

/**
 * Cockpit do médico (desktop). Vira client porque mantém o estado da chamada
 * ativa — o LiveKit fica embedded no `.doc-video-strip` enquanto o médico
 * preenche Mevo/prontuário sem mudar de aba.
 */
export default function CockpitScreen({
  consultationId,
  doctorNome,
  doctorSub,
  doctorAvatarUrl,
}: {
  consultationId?: string;
  doctorNome: string;
  doctorSub: string;
  doctorAvatarUrl?: string | null;
}) {
  const [activeCall, setActiveCall] = useState<ActiveCallPayload | null>(null);
  const [finishing, setFinishing] = useState(false);
  const chartRef = useRef<ChartPanelHandle | null>(null);

  // ── Split redimensionável vídeo ↔ Mevo (vertical) ─────────────────────
  // Vídeo com ALTURA FIXA em px (default 280) e reduzida, deixando o resto da
  // coluna central para a Mevo renderizar a interface inteira (≥900px de
  // largura garantidos pelo grid) sem precisar expandir. O divisor é opcional:
  // o médico pode arrastar pra dar mais altura ao vídeo se quiser. Persistido
  // só em estado local (sem localStorage), como pedido.
  const [videoPx, setVideoPx] = useState(280);
  const mainRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const px = e.clientY - rect.top;
    setVideoPx(Math.min(560, Math.max(160, px)));
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

  // ── Evasão (no_show) confirmada pelo servidor ─────────────────────────
  // A varredura pg_cron já marcou a consulta como no_show. Aqui apenas
  // liberamos o médico: desmonta o vídeo e encerra a sala LiveKit (kicka
  // participantes). end_consultation NÃO regride o status no_show (só avança de
  // in_queue/in_progress), então serve como teardown seguro da sala.
  function handleEvasao() {
    const id = activeCall?.consultationId;
    setActiveCall(null);
    if (!id) return;
    try {
      const supabase = createClient();
      void supabase.functions.invoke("end_consultation", {
        body: { consultation_id: id },
      });
    } catch (err) {
      console.error("[CockpitScreen] teardown pós-evasão falhou:", err);
    }
  }

  // ── "Encerrar e chamar o próximo" ─────────────────────────────────────
  // (1) salva + finaliza o prontuário da consulta atual (nada se perde);
  // (2) encerra a atual (end_consultation: status='completed', ended_at,
  //     fecha sala LiveKit); (3) pega a PRÓXIMA da fila (in_queue sem médico)
  //     na v_cockpit_fila; (4) faz o claim + inicia o vídeo via
  //     create_enter_doc (mesmo caminho do "Chamar próximo": seta doctor_id +
  //     status='in_progress' e devolve o token LiveKit). started_at=now() é
  //     carimbado best-effort no claim. Fila vazia → só encerra (estado vazio).
  async function handleFinishAndNext() {
    if (finishing) return;
    setFinishing(true);

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (err) {
      console.error("[CockpitScreen] supabase init failed:", err);
      setFinishing(false);
      return;
    }

    const currentId = effectiveConsultationId;
    try {
      // 1) Persiste prontuário/anamnese em voo e finaliza o prontuário.
      try {
        await chartRef.current?.flushPending();
        await chartRef.current?.finalize();
      } catch (err) {
        console.error("[CockpitScreen] flush/finalize prontuário failed:", err);
      }

      // 2) Encerra a consulta atual (idempotente; service role).
      if (currentId) {
        try {
          await supabase.functions.invoke("end_consultation", {
            body: { consultation_id: currentId },
          });
        } catch (err) {
          console.error("[CockpitScreen] end_consultation failed:", err);
        }
      }
      setActiveCall(null);

      // 3) Próxima da fila: in_queue, ainda sem médico.
      const { data: next, error: nextErr } = await supabase
        .from("v_cockpit_fila")
        .select("id, status, doctor_id, queued_at, created_at")
        .eq("status", "in_queue")
        .is("doctor_id", null)
        .order("queued_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextErr) {
        console.error("[CockpitScreen] busca próxima da fila falhou:", nextErr);
        return;
      }
      if (!next) return; // fila vazia → só encerrou; estado vazio.

      // 4) Claim + inicia vídeo (create_enter_doc devolve o token LiveKit).
      const { data, error } = await supabase.functions.invoke("create_enter_doc", {
        body: { consultation_id: next.id },
      });
      if (error) {
        console.error("[CockpitScreen] create_enter_doc falhou:", error);
        return;
      }
      const d = data as { room_name?: string; token?: string; livekit_url?: string };
      if (!d?.token || !d?.livekit_url || !d?.room_name) {
        console.error("[CockpitScreen] resposta inválida de create_enter_doc");
        return;
      }

      // started_at=now() best-effort (só se ainda não carimbado). O claim já
      // foi feito pelo create_enter_doc; aqui apenas registra o início.
      void supabase
        .from("consultations")
        .update({ started_at: new Date().toISOString() })
        .eq("id", next.id)
        .is("started_at", null);

      setActiveCall({
        consultationId: next.id,
        token: d.token,
        url: d.livekit_url,
        roomName: d.room_name,
      });
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="cockpit-desktop">

      <div className="doc-top">
        <div className="doc-top-left">
          <div style={{ display: "flex", alignItems: "center" }}>
            <Logo size={28} />
            <span style={{color:'var(--txt2)', fontWeight:'400', fontSize:'12px', marginLeft:'6px'}}>painel médico</span>
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
          <DoctorMenu nome={doctorNome} sub={doctorSub} avatarUrl={doctorAvatarUrl ?? null} />
        </div>
      </div>

      <CockpitFila
        onCallNext={setActiveCall}
        activeConsultationId={activeCall?.consultationId ?? null}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* MAIN — centro ≥900px: vídeo (topo, reduzido) +       */}
      {/* card/iframe da Mevo inline e completo (embaixo).     */}
      {/* ═══════════════════════════════════════════════════ */}
      <div
        className="doc-main"
        ref={mainRef}
        style={{
          gridTemplateRows: `${videoPx}px 10px minmax(0, 1fr)`,
        }}
      >
        {activeCall ? (
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            <EvasaoTimer
              consultationId={activeCall.consultationId}
              onEvasao={handleEvasao}
            />
            <DoctorCallEmbedded
              token={activeCall.token}
              url={activeCall.url}
              onDisconnect={handleDoctorEndCall}
            />
          </div>
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

        {/* Divisor redimensionável (opcional) — arraste p/ dar mais altura
            ao vídeo. O default já mostra a Mevo inteira sem arrastar. */}
        <div
          className="doc-split-handle"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Redimensionar vídeo e Mevo"
          title="Arraste para dar mais altura ao vídeo"
        />

        {/* ═══════════════════════════════════════════════════ */}
        {/* MEVO — card/iframe inline e completo, abaixo do      */}
        {/* vídeo. O centro garante ≥900px, então a interface da */}
        {/* Mevo renderiza inteira sem expandir nem overlay.     */}
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

          {/* Finalização */}
          <div className="actions-footer">
            <button
              type="button"
              className="finish-btn"
              onClick={handleFinishAndNext}
              disabled={finishing}
              style={finishing ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {finishing ? "Encerrando…" : "Encerrar e chamar próximo"}
            </button>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PRONTUÁRIO / HISTÓRICO / ANAMNESE — coluna direita    */}
      {/* (mais estreita). Dados reais por paciente + autosave  */}
      {/* em medical_records (CFM 1.821/2007).                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <ChartPanel ref={chartRef} consultationId={effectiveConsultationId} />
    </div>
  );
}
