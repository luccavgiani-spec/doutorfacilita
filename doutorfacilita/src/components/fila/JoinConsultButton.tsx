"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTO_REDIRECT_MS = 30_000;

type Props = {
  consultationId?: string;
  variant: "mobile" | "desktop";
  /** Quando definido, é chamado em vez de navegar pra /consulta.
   *  Usado pelo FilaShell pra trocar o conteúdo da /fila pelo LiveKit. */
  onEnterCall?: () => void;
};

type Status =
  | { kind: "checking" }
  | { kind: "waiting" }
  | { kind: "ready" }
  | { kind: "joining" }
  | { kind: "error"; message: string };

function tryCreateClient() {
  try {
    return createClient();
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}

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
export function JoinConsultButton({ consultationId, variant, onEnterCall }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [countdown, setCountdown] = useState<number | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | Error | null>(null);

  if (!supabaseRef.current) supabaseRef.current = tryCreateClient();
  const supabase = supabaseRef.current;
  const supabaseReady = !(supabase instanceof Error);

  // Verificação inicial: cobre o caso onde o médico já chamou antes de o paciente
  // abrir a página. Em useEffect separado pra simplicidade.
  useEffect(() => {
    if (!supabaseReady) {
      setStatus({
        kind: "error",
        message: "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em .env.local",
      });
      return;
    }
    if (!consultationId) {
      setStatus({ kind: "error", message: "consultation_id ausente (?consultation=…)" });
      return;
    }

    let cancelled = false;
    const sb = supabase as ReturnType<typeof createClient>;

    (async () => {
      const { data, error } = await sb
        .from("consultations")
        .select("doctor_called_at")
        .eq("id", consultationId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[JoinConsultButton] initial check failed", error);
        setStatus({ kind: "error", message: error.message });
        return;
      }
      // Só promove pra ready/waiting se ainda estamos em checking — evita
      // sobrescrever um "ready" que veio do Realtime entre o SELECT e o setState.
      setStatus((prev) => {
        if (prev.kind !== "checking") return prev;
        return data?.doctor_called_at ? { kind: "ready" } : { kind: "waiting" };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [consultationId, supabase, supabaseReady]);

  // Realtime: registra .on() ANTES de .subscribe() (Supabase Realtime v2).
  // Sufixo único no topic evita "cannot add postgres_changes after subscribe()"
  // quando React 18 Strict Mode roda o effect 2× e o Supabase-JS reaproveita
  // um canal pelo nome (o segundo mount pegaria o canal já subscrito).
  useEffect(() => {
    if (!supabaseReady || !consultationId) return;
    const sb = supabase as ReturnType<typeof createClient>;

    const topic = `consultation:${consultationId}:${crypto.randomUUID()}`;
    const channel = sb.channel(topic);

    channel.on(
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
    );

    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        console.log("[JoinConsultButton] Realtime subscribed");
      } else if (subStatus === "CHANNEL_ERROR") {
        console.error("[JoinConsultButton] Realtime channel error");
      }
    });

    return () => {
      sb.removeChannel(channel);
    };
  }, [consultationId, supabase, supabaseReady]);

  async function handleClick() {
    if (!consultationId || (status.kind !== "ready" && status.kind !== "joining")) return;
    setStatus({ kind: "joining" });
    if (onEnterCall) {
      onEnterCall();
      return;
    }
    // Fallback: se ninguém passou callback, navega pra /consulta (compat).
    router.push(`/consulta?consultation=${consultationId}`);
  }

  // Auto-redirect: quando virar "ready", começa contagem de 30s. O timer é
  // cancelado se o usuário clicar antes ou se o componente desmontar.
  useEffect(() => {
    if (status.kind !== "ready") {
      setCountdown(null);
      return;
    }
    setCountdown(Math.round(AUTO_REDIRECT_MS / 1000));
    const tickId = window.setInterval(() => {
      setCountdown((n) => (n === null ? null : Math.max(0, n - 1)));
    }, 1000);
    const redirectId = window.setTimeout(() => {
      void handleClick();
    }, AUTO_REDIRECT_MS);
    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(redirectId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.kind]);

  const ready = status.kind === "ready" || status.kind === "joining";
  const baseClass = variant === "mobile" ? "fila-m-join" : "fila-d-join";
  const label = (() => {
    switch (status.kind) {
      case "checking": return "Verificando…";
      case "waiting": return "Aguardando médico";
      case "joining": return "Entrando na consulta…";
      case "error": return "Erro";
      case "ready":
      default:
        return countdown !== null
          ? `Entrar na Consulta (${countdown}s)`
          : "Entrar na Consulta";
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
