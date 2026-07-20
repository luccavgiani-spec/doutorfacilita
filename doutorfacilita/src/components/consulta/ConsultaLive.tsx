"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";

import { createClient } from "@/lib/supabase/client";

type Role = "doctor" | "patient";

interface Props {
  consultationId: string;
  role: Role;
  displayName: string;
  /** Se vier preenchido, pula a chamada à edge function (ex: médico que já obteve
   *  token via CallNextButton). */
  initialToken?: string;
  initialUrl?: string;
  /** Callback ao desconectar. Se omitido, redireciona pra /cockpit (doctor) ou /fila (patient). */
  onDisconnect?: () => void;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; token: string; url: string }
  | { kind: "error"; message: string };

export default function ConsultaLive({
  consultationId,
  role,
  displayName,
  initialToken,
  initialUrl,
  onDisconnect,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>(() =>
    initialToken && initialUrl
      ? { kind: "ready", token: initialToken, url: initialUrl }
      : { kind: "loading" },
  );
  const triedRef = useRef(Boolean(initialToken && initialUrl));

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;

    (async () => {
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

      const fn = role === "doctor" ? "create_enter_doc" : "get_patient_token";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { consultation_id: consultationId },
      });
      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }
      const d = data as { token?: string; livekit_url?: string };
      if (!d?.token || !d?.livekit_url) {
        setState({ kind: "error", message: "Resposta inválida da edge function" });
        return;
      }
      setState({ kind: "ready", token: d.token, url: d.livekit_url });
    })();
  }, [consultationId, role]);

  function handleDisconnect() {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    if (role === "doctor") {
      router.push("/cockpit");
    } else {
      router.push("/fila");
    }
  }

  // Sinal de "paciente entrou" — cancela o timer de evasão (no_show). Fonte
  // PRIMÁRIA é o webhook do LiveKit (server-side); este write no cliente é um
  // backup idempotente (RLS consultations_patient_update permite o paciente
  // atualizar a própria row; `.is(null)` evita sobrescrever).
  function handleConnected() {
    if (role !== "patient") return;
    (async () => {
      try {
        const supabase = createClient();
        await supabase
          .from("consultations")
          .update({ patient_joined_at: new Date().toISOString() })
          .eq("id", consultationId)
          .is("patient_joined_at", null);
      } catch {
        // best-effort — o webhook do LiveKit é a fonte autoritativa.
      }
    })();
  }

  if (state.kind === "loading") {
    return (
      <div className="consulta-loading">
        <div className="consulta-loading-spinner" aria-hidden />
        <div className="consulta-loading-text">
          Conectando ao vídeo… <span style={{ color: "var(--txt3)" }}>({displayName})</span>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="consulta-error">
        <h1>Não foi possível entrar na consulta</h1>
        <p>{state.message}</p>
        <button
          type="button"
          className="auth-button auth-button--primary"
          onClick={handleDisconnect}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="consulta-live">
      <LiveKitRoom
        serverUrl={state.url}
        token={state.token}
        connect
        video
        audio
        data-lk-theme="default"
        onConnected={handleConnected}
        onDisconnected={handleDisconnect}
        style={{ height: "100vh" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
