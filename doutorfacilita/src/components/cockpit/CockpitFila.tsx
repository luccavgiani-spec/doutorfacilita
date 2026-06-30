"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/format/initials";
import {
  CallNextButton,
  type ActiveCallPayload,
} from "@/components/cockpit/CallNextButton";
import {
  getFinalizadosHoje,
  type FinalizadoItem,
} from "@/app/cockpit/actions";

interface CockpitFilaProps {
  onCallNext?: (payload: ActiveCallPayload) => void;
  activeConsultationId?: string | null;
}

// Espelha a view public.v_cockpit_fila: campos OPERACIONAIS apenas
// (sem queixa/idade/gênero), pois a view fura a RLS por-médico para o board.
type QueueItem = {
  id: string;
  status: string;
  patient_id: string;
  patient_name: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  queued_at: string | null;
  started_at: string | null;
  created_at: string;
};

function minutesAgo(iso?: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function horaBRT(iso?: string | null): string {
  if (!iso) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function duracaoMin(sec?: number | null): string | null {
  if (sec == null || sec <= 0) return null;
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

type Tab = "aguardando" | "finalizados";

export default function CockpitFila({ onCallNext, activeConsultationId }: CockpitFilaProps) {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("aguardando");
  const [finalizados, setFinalizados] = useState<FinalizadoItem[] | null>(null);
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
    // Lê do board multi-médico: v_cockpit_fila já inclui in_queue não atribuído
    // + TODOS os in_progress (de qualquer médico), com patient_name/doctor_name
    // achatados. O filtro de status mora na própria view; "Chamar próximo" e
    // demais writes continuam em consultations (RLS normal).
    const { data, error: e } = await sb
      .from("v_cockpit_fila")
      .select(
        "id, status, patient_id, patient_name, doctor_id, doctor_name, queued_at, started_at, created_at"
      )
      .order("queued_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (e) {
      setError(e.message);
      return;
    }
    setError(null);
    setItems((data ?? []) as unknown as QueueItem[]);
  }, []);

  // Finalizados de hoje (BRT) do médico logado — via server action service-role
  // (a RLS de patients não libera nome para consultas concluídas).
  const fetchFinalizados = useCallback(async () => {
    try {
      const rows = await getFinalizadosHoje();
      setFinalizados(rows);
    } catch (err) {
      console.error("[CockpitFila] getFinalizadosHoje failed", err);
      setFinalizados([]);
    }
  }, []);

  // Fetch inicial (fila + finalizados).
  useEffect(() => {
    void fetchQueue();
    void fetchFinalizados();
  }, [fetchQueue, fetchFinalizados]);

  // Realtime: qualquer mudança em consultations → refaz ambos os fetches
  // (fila pequena). Listener registrado ANTES do .subscribe() (Realtime v2).
  // Caminho RÁPIDO (quando entrega) — o polling abaixo é a rede de segurança.
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
        void fetchFinalizados();
      }
    );

    let active = true;
    (async () => {
      // postgres_changes é filtrado por RLS no servidor de realtime; sem o JWT
      // do médico no socket, a policy consultations_doctor_queue_view nega a
      // entrega (current_doctor_id() vira null). Seta o token ANTES do subscribe.
      try {
        const { data } = await sb.auth.getSession();
        const tok = data.session?.access_token;
        if (tok) sb.realtime.setAuth(tok);
      } catch (err) {
        console.error("[CockpitFila] realtime setAuth falhou", err);
      }
      if (!active) return;
      channel.subscribe((st) => {
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
          console.error("[CockpitFila] realtime status:", st);
        }
      });
    })();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [fetchQueue, fetchFinalizados]);

  // Polling de segurança (10s): garante que a fila atualiza sozinha mesmo se o
  // realtime não entregar o evento (entrega de postgres_changes c/ RLS é
  // instável). Também mantém "Aguardando há Xmin" fresco via setTick.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      void fetchQueue();
      void fetchFinalizados();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [fetchQueue, fetchFinalizados]);

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

  // Em atendimento (in_progress) vão para o TOPO; quem aguarda mantém a ordem
  // relativa abaixo. Menos disruptivo: a fila de espera continua igual e o
  // "Chamar próximo" segue apontando para o primeiro AGUARDANDO (não o primeiro
  // da lista, que agora pode ser um card já em atendimento).
  const attending = items.filter((c) => c.status === "in_progress");
  const waiting = items.filter((c) => c.status === "in_queue");
  const firstWaitingId = waiting[0]?.id ?? null;
  const cards = [
    ...attending.map((c) => ({ c, pos: null as number | null })),
    ...waiting.map((c, i) => ({ c, pos: i + 1 })),
  ];

  const finalizadosCount = finalizados?.length ?? 0;

  return (
    <div className="doc-queue">
      <div className="doc-queue-header">
        <div className="doc-queue-title">Fila de atendimento</div>
        {/* Contagem reflete a aba ativa: aguardando vs finalizados de hoje. */}
        <div className="doc-queue-count">
          {tab === "aguardando" ? waiting.length : finalizadosCount}
        </div>
      </div>
      <div className="doc-queue-filter">
        <button
          type="button"
          className={`doc-filter-tab${tab === "aguardando" ? " active" : ""}`}
          onClick={() => setTab("aguardando")}
        >
          Aguardando
        </button>
        <button
          type="button"
          className={`doc-filter-tab${tab === "finalizados" ? " active" : ""}`}
          onClick={() => setTab("finalizados")}
        >
          Finalizados
        </button>
      </div>

      {tab === "aguardando" ? (
        <>
          {cards.length === 0 && (
            <div className="cockpit-queue-empty">
              Nenhum paciente na fila no momento.
            </div>
          )}

          <AnimatePresence initial={false}>
            {cards.map(({ c, pos }) => {
              const since = minutesAgo(
                c.status === "in_progress"
                  ? c.started_at ?? c.queued_at ?? c.created_at
                  : c.queued_at ?? c.created_at
              );
              const isAttending = c.status === "in_progress";
              const isNext = !isAttending && c.id === firstWaitingId;
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={`queue-card${isNext ? " is-next" : ""}${
                    isAttending ? " is-attending" : ""
                  }`}
                >
                  <div className="queue-card-top">
                    <div className="qc-pos">{isAttending ? "•" : pos}</div>
                    <div className="qc-name">
                      <span className="qc-av">{initials(c.patient_name)}</span>
                      {c.patient_name ?? "Paciente"}
                    </div>
                    <div className="qc-time">~{Math.max(1, since)} min</div>
                  </div>
                  <div className="queue-card-meta">
                    {isAttending ? (
                      <span className="qc-attending-label">
                        Atendendo
                        {c.doctor_name ? ` - ${c.doctor_name}` : ""}
                      </span>
                    ) : (
                      <>Aguardando há {since} min</>
                    )}
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </>
      ) : (
        <>
          {finalizados === null && (
            <div className="cockpit-queue-empty">Carregando…</div>
          )}
          {finalizados !== null && finalizados.length === 0 && (
            <div className="cockpit-queue-empty">
              Nenhuma consulta finalizada hoje.
            </div>
          )}
          <AnimatePresence initial={false}>
            {(finalizados ?? []).map((f) => {
              const dur = duracaoMin(f.duration_seconds);
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="queue-card is-done"
                >
                  <div className="queue-card-top">
                    <div className="qc-pos">✓</div>
                    <div className="qc-name">
                      <span className="qc-av">{initials(f.patient_name)}</span>
                      {f.patient_name ?? "Paciente"}
                    </div>
                    <div className="qc-time">{horaBRT(f.ended_at)}</div>
                  </div>
                  <div className="queue-card-meta">
                    Finalizada{dur ? ` · ${dur}` : ""}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
