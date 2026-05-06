"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  consultationId?: string;
  className?: string;
  label?: string;
};

type ToastState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; roomName: string }
  | { kind: "error"; message: string };

/**
 * Botão "Chamar próximo" do médico no cockpit.
 *
 * onClick: invoca a edge function `create_enter_doc` passando consultation_id;
 * faz console.log do retorno (room_name, token, livekit_url) — não monta
 * <LiveKitRoom> ainda. Mostra toast inline simples.
 *
 * Idempotente no backend (clicar 2x não recria sala). UI desabilita durante
 * a invocação pra evitar duplo-clique.
 */
export function CallNextButton({ consultationId, className, label = "Chamar próximo" }: Props) {
  const [toast, setToast] = useState<ToastState>({ kind: "idle" });
  const disabled = toast.kind === "loading" || !consultationId;

  async function handleClick() {
    if (!consultationId) {
      setToast({ kind: "error", message: "consultation_id ausente na URL (?consultation=…)" });
      return;
    }
    setToast({ kind: "loading" });
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setToast({
        kind: "error",
        message:
          "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em .env.local — " +
          (err instanceof Error ? err.message : String(err)),
      });
      return;
    }
    const { data, error } = await supabase.functions.invoke("create_enter_doc", {
      body: { consultation_id: consultationId },
    });
    if (error) {
      console.error("[create_enter_doc] erro:", error, data);
      setToast({ kind: "error", message: error.message });
      return;
    }
    console.log("[create_enter_doc] sucesso:", data);
    const roomName = (data as { room_name?: string } | null)?.room_name ?? "?";
    setToast({ kind: "success", roomName });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className ?? "queue-card-btn"}
        style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      >
        {toast.kind === "loading" ? "Chamando..." : label}
      </button>
      {toast.kind !== "idle" && toast.kind !== "loading" && (
        <Toast state={toast} onClose={() => setToast({ kind: "idle" })} />
      )}
    </>
  );
}

function Toast({
  state,
  onClose,
}: {
  state: Extract<ToastState, { kind: "success" } | { kind: "error" }>;
  onClose: () => void;
}) {
  const isError = state.kind === "error";
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        padding: "12px 16px",
        borderRadius: 12,
        background: isError ? "var(--red-l)" : "var(--green-l)",
        border: `1px solid ${isError ? "var(--red)" : "var(--green)"}`,
        color: isError ? "var(--red)" : "var(--green-d)",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxWidth: 360,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={{ flex: 1 }}>
        {isError
          ? `Erro: ${state.message}`
          : `Sala criada — paciente foi notificado (${state.roomName.slice(0, 24)}${
              state.roomName.length > 24 ? "…" : ""
            })`}
      </span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          fontSize: 18,
          cursor: "pointer",
          lineHeight: 1,
        }}
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  );
}
