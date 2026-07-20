"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Contador visual de evasão exibido sobre o vídeo do cockpit enquanto o médico
// aguarda o paciente entrar. Ancorado em consultations.doctor_called_at (T0).
// - patient_joined_at preenchido  → "Paciente entrou" (o corte é cancelado).
// - status vira no_show (varredura server-side pg_cron) → banner de evasão e,
//   após um instante, libera o médico via onEvasao (que encerra a sala LiveKit).
// O corte AUTORITATIVO é server-side; este componente só reflete o estado.

const GRACE_MS = 5 * 60 * 1000;

type Props = {
  consultationId: string;
  onEvasao: () => void;
};

export default function EvasaoTimer({ consultationId, onEvasao }: Props) {
  const [calledAt, setCalledAt] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);
  const [noShow, setNoShow] = useState(false);
  const [now, setNow] = useState<number>(() => calledAt ?? 0);
  const onEvasaoRef = useRef(onEvasao);
  onEvasaoRef.current = onEvasao;

  // Fetch inicial + assinatura realtime da própria consulta.
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase
        .from("consultations")
        .select("doctor_called_at, patient_joined_at, status")
        .eq("id", consultationId)
        .maybeSingle();
      if (!active || !data) return;
      if (data.doctor_called_at) setCalledAt(new Date(data.doctor_called_at).getTime());
      if (data.patient_joined_at) setJoined(true);
      if (data.status === "no_show") setNoShow(true);
      setNow(Date.now());
    })();

    const channel = supabase
      .channel(`evasao-${consultationId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultations", filter: `id=eq.${consultationId}` },
        (payload) => {
          const row = payload.new as {
            doctor_called_at?: string | null;
            patient_joined_at?: string | null;
            status?: string;
          };
          if (row.doctor_called_at) setCalledAt(new Date(row.doctor_called_at).getTime());
          if (row.patient_joined_at) setJoined(true);
          if (row.status === "no_show") setNoShow(true);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  // Tique de 1s enquanto aguarda (para quando o paciente entra ou dá no_show).
  useEffect(() => {
    if (joined || noShow) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [joined, noShow]);

  // Confirmada a evasão pelo servidor: mostra o banner um instante e libera o médico.
  useEffect(() => {
    if (!noShow) return;
    const t = setTimeout(() => onEvasaoRef.current(), 4000);
    return () => clearTimeout(t);
  }, [noShow]);

  const base: React.CSSProperties = {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.2,
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  };

  if (joined) {
    return (
      <div style={{ ...base, background: "#0f5132", color: "#d1e7dd" }}>
        ✓ Paciente entrou na chamada
      </div>
    );
  }

  if (noShow) {
    return (
      <div style={{ ...base, background: "#842029", color: "#f8d7da" }}>
        Evasão — paciente não entrou em 5 min. Consulta cancelada.
      </div>
    );
  }

  if (calledAt === null) return null;

  const remaining = Math.max(0, GRACE_MS - (now - calledAt));
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const warn = remaining <= 60000;

  if (remaining === 0) {
    return (
      <div style={{ ...base, background: "#664d03", color: "#fff3cd" }}>
        Tempo esgotado — cancelando por evasão…
      </div>
    );
  }

  return (
    <div
      style={{
        ...base,
        background: warn ? "#664d03" : "rgba(20,20,22,0.82)",
        color: warn ? "#fff3cd" : "#e8e8ea",
      }}
    >
      Aguardando o paciente entrar — {mm}:{String(ss).padStart(2, "0")}
    </div>
  );
}
