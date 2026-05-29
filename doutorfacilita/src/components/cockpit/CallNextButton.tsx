"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ActiveCallPayload = {
  consultationId: string;
  token: string;
  url: string;
  roomName: string;
};

type Props = {
  consultationId?: string;
  className?: string;
  label?: string;
  /** Quando definido, é chamado em vez de fazer toast/navegar.
   *  Permite ao CockpitScreen montar o LiveKit embedded na hora. */
  onSuccess?: (payload: ActiveCallPayload) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

/**
 * Botão "Chamar próximo" do médico no cockpit.
 *
 * onClick: invoca a edge function `create_enter_doc`. Em sucesso, chama
 * `onSuccess({consultationId, token, url, roomName})` pra que o CockpitScreen
 * monte o LiveKit embedded no doc-video-strip. Não navega.
 *
 * create_enter_doc é idempotente — clicar 2× não recria sala.
 */
export function CallNextButton({
  consultationId,
  className,
  label = "Chamar próximo",
  onSuccess,
}: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const disabled = state.kind === "loading" || !consultationId;

  async function handleClick() {
    if (!consultationId) {
      setState({ kind: "error", message: "consultation_id ausente" });
      return;
    }
    setState({ kind: "loading" });
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setState({
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
      setState({ kind: "error", message: error.message });
      return;
    }
    const d = data as { room_name?: string; token?: string; livekit_url?: string };
    if (!d?.token || !d?.livekit_url || !d?.room_name) {
      setState({ kind: "error", message: "Resposta inválida da edge function" });
      return;
    }
    setState({ kind: "idle" });
    onSuccess?.({
      consultationId,
      token: d.token,
      url: d.livekit_url,
      roomName: d.room_name,
    });
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
        {state.kind === "loading" ? "Chamando..." : label}
      </button>
      {state.kind === "error" && (
        <div
          role="alert"
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "var(--red)",
            background: "var(--red-l)",
            padding: "6px 8px",
            borderRadius: 6,
          }}
        >
          {state.message}
        </div>
      )}
    </>
  );
}
