"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  consultationId?: string;
  variant: "mobile" | "desktop";
};

type Status =
  | { kind: "checking" }
  | { kind: "waiting" }
  | { kind: "ready" }
  | { kind: "joining" }
  | { kind: "error"; message: string };

/**
 * Botão da fila do paciente.
 *
 * Estado 1 (waiting): "Aguardando médico", disabled, cinza com pulse sutil.
 * Estado 2 (ready):   "Acessar consulta", enabled, azul brilhante.
 *
 * Detecção: SELECT inicial em consultations.doctor_called_at + Realtime
 * subscription pra UPDATE da própria row. Quando doctor_called_at vira não-null,
 * o estado vira `ready` (até 2s de latência).
 *
 * onClick em ready: invoca get_patient_token edge function e console.log do
 * retorno. Não navega ainda — render de vídeo fica pra próxima fase.
 */
export function JoinConsultButton({ consultationId, variant }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    if (!consultationId) {
      setStatus({ kind: "error", message: "consultation_id ausente (?consultation=…)" });
      return;
    }

    let cancelled = false;

    // Initial fetch covers the case where the doctor already called
    // before the patient opened this page.
    (async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("doctor_called_at")
        .eq("id", consultationId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }
      if (data?.doctor_called_at) {
        setStatus({ kind: "ready" });
      } else {
        setStatus({ kind: "waiting" });
      }
    })();

    // Realtime: flip to "ready" when doctor_called_at lands.
    const channel = supabase
      .channel(`consultation:${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultations",
          filter: `id=eq.${consultationId}`,
        },
        (payload) => {
          const newRow = payload.new as { doctor_called_at?: string | null };
          const oldRow = payload.old as { doctor_called_at?: string | null };
          if (newRow?.doctor_called_at && !oldRow?.doctor_called_at) {
            setStatus({ kind: "ready" });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [consultationId, supabase]);

  async function handleClick() {
    if (!consultationId || status.kind !== "ready") return;
    setStatus({ kind: "joining" });
    const { data, error } = await supabase.functions.invoke("get_patient_token", {
      body: { consultation_id: consultationId },
    });
    if (error) {
      console.error("[get_patient_token] erro:", error, data);
      setStatus({ kind: "error", message: error.message });
      return;
    }
    console.log("[get_patient_token] sucesso:", data);
    // Mantém em "ready" pra permitir reentrar; render de vídeo virá na próxima fase.
    setStatus({ kind: "ready" });
  }

  const ready = status.kind === "ready" || status.kind === "joining";
  const baseClass = variant === "mobile" ? "fila-m-join" : "fila-d-join";
  const label = (() => {
    switch (status.kind) {
      case "checking": return "Verificando…";
      case "waiting": return "Aguardando médico";
      case "joining": return "Carregando token…";
      case "error": return "Erro";
      case "ready": default: return "Acessar consulta";
    }
  })();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      className={baseClass}
      style={!ready ? waitingStyle : readyStyle}
      aria-live="polite"
    >
      {!ready && <span style={pulseDot} />}
      <span>{label}</span>
      {ready && (
        <svg width={variant === "desktop" ? 16 : 14} height={variant === "desktop" ? 16 : 14}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

const waitingStyle: React.CSSProperties = {
  background: "var(--bg3)",
  color: "var(--txt2)",
  boxShadow: "none",
  cursor: "not-allowed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const readyStyle: React.CSSProperties = {
  background: "var(--blue)",
  color: "white",
  boxShadow: "0 0 0 4px rgba(66,133,244,0.18), 0 8px 24px rgba(66,133,244,0.45)",
  cursor: "pointer",
};

const pulseDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--txt3)",
  animation: "pulse-sm 1.6s infinite",
  display: "inline-block",
};
