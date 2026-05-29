"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CallNextButton,
  type ActiveCallPayload,
} from "@/components/cockpit/CallNextButton";

interface CockpitFilaProps {
  onCallNext?: (payload: ActiveCallPayload) => void;
  activeConsultationId?: string | null;
}

type QueueItem = {
  id: string;
  queued_at: string | null;
  created_at: string;
  chief_complaint: string | null;
  patient: {
    id: string;
    full_name: string | null;
    birth_date: string | null;
    gender: string | null;
  } | null;
};

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function minutesAgo(iso?: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CockpitFila({ onCallNext, activeConsultationId }: CockpitFilaProps) {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0); // força re-render pra atualizar "Aguardando há Xmin"

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient();
    } catch (err) {
      // fica null; trataremos abaixo
      console.error("[CockpitFila] supabase init failed", err);
    }
  }

  const fetchQueue = useCallback(async () => {
    const sb = supabaseRef.current;
    if (!sb) {
      setError("NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em .env.local");
      return;
    }
    const { data, error: e } = await sb
      .from("consultations")
      .select(
        "id, queued_at, created_at, chief_complaint, patient:patients(id, full_name, birth_date, gender)"
      )
      .eq("status", "in_queue")
      .is("doctor_id", null)
      .order("queued_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (e) {
      setError(e.message);
      return;
    }
    setError(null);
    setItems((data ?? []) as unknown as QueueItem[]);
  }, []);

  // Fetch inicial
  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  // Realtime: qualquer mudança em consultations → refaz fetch (fila pequena).
  useEffect(() => {
    const sb = supabaseRef.current;
    if (!sb) return;
    const topic = `cockpit-fila:${crypto.randomUUID()}`;
    const channel = sb.channel(topic);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "consultations" },
      () => {
        void fetchQueue();
      }
    );
    channel.subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [fetchQueue]);

  // Tick a cada 30s pra "Aguardando há Xmin" não congelar.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="doc-queue">
        <div className="doc-queue-header">
          <div className="doc-queue-title">Fila de atendimento</div>
        </div>
        <div className="cockpit-queue-empty" role="alert" style={{ color: "var(--red)" }}>
          Erro: {error}
        </div>
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="doc-queue">
        <div className="doc-queue-header">
          <div className="doc-queue-title">Fila de atendimento</div>
        </div>
        <div className="cockpit-queue-empty">Carregando fila…</div>
      </div>
    );
  }

  return (
    <div className="doc-queue">
      <div className="doc-queue-header">
        <div className="doc-queue-title">Fila de atendimento</div>
        <div className="doc-queue-count">{items.length}</div>
      </div>
      <div className="doc-queue-filter">
        <div className="doc-filter-tab active">Aguardando</div>
        <div className="doc-filter-tab">Em espera</div>
      </div>

      {items.length === 0 && (
        <div className="cockpit-queue-empty">
          Nenhum paciente na fila no momento.
        </div>
      )}

      {items.map((c, idx) => {
        const age = calcAge(c.patient?.birth_date);
        const since = minutesAgo(c.queued_at ?? c.created_at);
        const isNext = idx === 0;
        return (
          <div
            key={c.id}
            className={`queue-card${isNext ? " is-next" : ""}`}
          >
            <div className="queue-card-top">
              <div className="qc-pos">{idx + 1}</div>
              <div className="qc-name">
                <span className="qc-av">{initials(c.patient?.full_name)}</span>
                {c.patient?.full_name ?? "Paciente"}
              </div>
              <div className="qc-time">~{Math.max(1, since)} min</div>
            </div>
            <div className="queue-card-meta">
              {age !== null ? `${age} anos · ` : ""}
              <b>{c.chief_complaint ?? "Sem queixa informada"}</b>
              <br />
              Aguardando há {since} min
            </div>
            {isNext && !activeConsultationId && (
              <CallNextButton
                consultationId={c.id}
                className="queue-card-btn"
                label="Chamar próximo"
                onSuccess={onCallNext}
              />
            )}
            {isNext && activeConsultationId && (
              <div className="qc-in-call">
                <span className="ld" /> atendendo agora
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
