"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

export type ChartPanelHandle = {
  /** Persiste imediatamente prontuário + anamnese, ignorando debounce.
   *  Use quando o médico está encerrando a chamada pra evitar perder
   *  edições em voo. Resolve quando tudo foi salvo (ou ignorado em erro). */
  flushPending: () => Promise<void>;
  /** Salva o prontuário carimbando finalized_at=now(). Chamado no
   *  encerramento da consulta (ITEM 1) — fecha o prontuário do paciente. */
  finalize: () => Promise<void>;
};

type Tab = "prontuario" | "historico" | "anamnese";

type PatientInfo = {
  id: string;
  full_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  celular: string | null;
  alergias: string[] | null;
  medical_history: string | null;
  family_history: string | null;
  current_medications: string[] | null;
};

type Consultation = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
};

type Prontuario = {
  chief_complaint: string;
  physical_exam: string;
  history_present_illness: string;
  diagnostic_hypothesis: string;
  cid10_codes: string[];
  conduct: string;
};

const PRONTUARIO_VAZIO: Prontuario = {
  chief_complaint: "",
  physical_exam: "",
  history_present_illness: "",
  diagnostic_hypothesis: "",
  cid10_codes: [],
  conduct: "",
};

function calcAge(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function maskCpfDisplay(cpf?: string | null): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskPhoneDisplay(p?: string | null): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "").slice(-11);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)}****-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 3)}***-${d.slice(6)}`;
  return p;
}

function genderLabel(g?: string | null): string {
  if (g === "F") return "♀";
  if (g === "M") return "♂";
  if (g === "O") return "⚧";
  return "—";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const ChartPanel = forwardRef<ChartPanelHandle, { consultationId?: string | null }>(
  function ChartPanel({ consultationId }, ref) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient();
    } catch (err) {
      console.error("[ChartPanel] supabase init failed", err);
    }
  }

  const [tab, setTab] = useState<Tab>("prontuario");
  const [loading, setLoading] = useState(false);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [prontuario, setProntuario] = useState<Prontuario>(PRONTUARIO_VAZIO);
  const [savingProntuario, setSavingProntuario] = useState(false);
  const [savedAtProntuario, setSavedAtProntuario] = useState<number | null>(null);
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const [savedAtAnamnese, setSavedAtAnamnese] = useState<number | null>(null);

  // Refs do estado atual + flag "dirty" pra flush imediato no encerramento.
  // Os debounced saves marcam dirty=false ao começar; flushPending pula o
  // timer e salva o último valor conhecido se dirty=true.
  const prontuarioRef = useRef<Prontuario>(PRONTUARIO_VAZIO);
  const prontuarioDirtyRef = useRef(false);
  const patientRef = useRef<PatientInfo | null>(null);
  const patientDirtyRef = useRef(false);
  useEffect(() => {
    prontuarioRef.current = prontuario;
  }, [prontuario]);
  useEffect(() => {
    patientRef.current = patient;
  }, [patient]);

  // ── Carregamento inicial: consulta + paciente + medical_record ──
  useEffect(() => {
    if (!consultationId || !supabaseRef.current) {
      setConsultation(null);
      setPatient(null);
      setProntuario(PRONTUARIO_VAZIO);
      return;
    }
    const sb = supabaseRef.current;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: c } = await sb
        .from("consultations")
        .select("id, patient_id, doctor_id")
        .eq("id", consultationId)
        .maybeSingle();
      if (cancelled) return;
      if (!c) {
        setLoading(false);
        return;
      }
      setConsultation(c as Consultation);

      const { data: p } = await sb
        .from("patients")
        .select(
          "id, full_name, cpf, birth_date, gender, phone, celular, alergias, medical_history, family_history, current_medications",
        )
        .eq("id", c.patient_id)
        .maybeSingle();
      if (cancelled) return;
      setPatient((p as PatientInfo) ?? null);

      const { data: mr } = await sb
        .from("medical_records")
        .select(
          "chief_complaint, physical_exam, history_present_illness, diagnostic_hypothesis, cid10_codes, conduct",
        )
        .eq("consultation_id", consultationId)
        .maybeSingle();
      if (cancelled) return;
      if (mr) {
        setProntuario({
          chief_complaint: mr.chief_complaint ?? "",
          physical_exam: mr.physical_exam ?? "",
          history_present_illness: mr.history_present_illness ?? "",
          diagnostic_hypothesis: mr.diagnostic_hypothesis ?? "",
          cid10_codes: (mr.cid10_codes as string[]) ?? [],
          conduct: mr.conduct ?? "",
        });
      } else {
        setProntuario(PRONTUARIO_VAZIO);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [consultationId]);

  // ── Autosave Prontuário (upsert em medical_records) ──
  const saveProntuario = useCallback(
    async (data: Prontuario, opts?: { finalize?: boolean }) => {
      const sb = supabaseRef.current;
      if (!sb || !consultation || !consultation.doctor_id) return;
      prontuarioDirtyRef.current = false;
      setSavingProntuario(true);
      const row: Record<string, unknown> = {
        consultation_id: consultation.id,
        patient_id: consultation.patient_id,
        doctor_id: consultation.doctor_id,
        chief_complaint: data.chief_complaint || null,
        physical_exam: data.physical_exam || null,
        history_present_illness: data.history_present_illness || null,
        diagnostic_hypothesis: data.diagnostic_hypothesis || null,
        cid10_codes: data.cid10_codes,
        conduct: data.conduct || null,
      };
      if (opts?.finalize) row.finalized_at = new Date().toISOString();
      const { error } = await sb
        .from("medical_records")
        .upsert(row, { onConflict: "consultation_id" });
      setSavingProntuario(false);
      if (!error) setSavedAtProntuario(Date.now());
      else {
        prontuarioDirtyRef.current = true;
        console.error("[ChartPanel] save prontuario:", error);
      }
    },
    [consultation],
  );
  const debouncedSaveProntuario = useDebouncedCallback(saveProntuario, 800);
  // Salvar manual: persiste já, ignorando o debounce.
  const saveNow = useCallback(async () => {
    await saveProntuario(prontuarioRef.current);
  }, [saveProntuario]);
  function patchProntuario(patch: Partial<Prontuario>) {
    setProntuario((prev) => {
      const next = { ...prev, ...patch };
      prontuarioDirtyRef.current = true;
      debouncedSaveProntuario(next);
      return next;
    });
  }
  function addCid(code: string) {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (prontuario.cid10_codes.includes(c)) return;
    patchProntuario({ cid10_codes: [...prontuario.cid10_codes, c] });
  }
  function removeCid(code: string) {
    patchProntuario({
      cid10_codes: prontuario.cid10_codes.filter((x) => x !== code),
    });
  }

  // ── Autosave Anamnese (update em patients) ──
  const saveAnamnese = useCallback(async (data: PatientInfo) => {
    const sb = supabaseRef.current;
    if (!sb) return;
    patientDirtyRef.current = false;
    setSavingAnamnese(true);
    const { error } = await sb
      .from("patients")
      .update({
        alergias: data.alergias ?? [],
        medical_history: data.medical_history || null,
        family_history: data.family_history || null,
        current_medications: data.current_medications ?? [],
      })
      .eq("id", data.id);
    setSavingAnamnese(false);
    if (!error) setSavedAtAnamnese(Date.now());
    else {
      patientDirtyRef.current = true;
      console.error("[ChartPanel] save anamnese:", error);
    }
  }, []);
  const debouncedSaveAnamnese = useDebouncedCallback(saveAnamnese, 800);
  function patchPatient(patch: Partial<PatientInfo>) {
    setPatient((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      patientDirtyRef.current = true;
      debouncedSaveAnamnese(next);
      return next;
    });
  }

  // ── Flush imediato (chamado pelo CockpitScreen no encerramento) ──
  useImperativeHandle(
    ref,
    () => ({
      async flushPending() {
        const tasks: Array<Promise<void>> = [];
        if (prontuarioDirtyRef.current) {
          tasks.push(saveProntuario(prontuarioRef.current));
        }
        if (patientDirtyRef.current && patientRef.current) {
          tasks.push(saveAnamnese(patientRef.current));
        }
        await Promise.all(tasks);
      },
      async finalize() {
        await saveProntuario(prontuarioRef.current, { finalize: true });
      },
    }),
    [saveProntuario, saveAnamnese],
  );

  // ── Render ──
  if (!consultationId) {
    return (
      <div className="doc-chart">
        <div className="doc-chart-tabs">
          <div className="doc-tab active">Prontuário</div>
          <div className="doc-tab">Histórico</div>
          <div className="doc-tab">Anamnese rápida</div>
        </div>
        <div className="chart-empty">
          Selecione um paciente da fila para ver o prontuário.
        </div>
      </div>
    );
  }

  return (
    <div className="doc-chart">
      <div className="doc-chart-tabs">
        <button
          type="button"
          className={`doc-tab ${tab === "prontuario" ? "active" : ""}`}
          onClick={() => setTab("prontuario")}
        >
          Prontuário
        </button>
        <button
          type="button"
          className={`doc-tab ${tab === "historico" ? "active" : ""}`}
          onClick={() => setTab("historico")}
        >
          Histórico
        </button>
        <button
          type="button"
          className={`doc-tab ${tab === "anamnese" ? "active" : ""}`}
          onClick={() => setTab("anamnese")}
        >
          Anamnese rápida
        </button>
      </div>

      <div className="doc-chart-body">
        <PatientHeader patient={patient} loading={loading} />

        {tab === "prontuario" && (
          <ProntuarioForm
            data={prontuario}
            disabled={!consultation?.doctor_id}
            saving={savingProntuario}
            savedAt={savedAtProntuario}
            onChange={patchProntuario}
            onAddCid={addCid}
            onRemoveCid={removeCid}
            onSave={saveNow}
          />
        )}

        {tab === "historico" && consultation && (
          <Historico
            patientId={consultation.patient_id}
            currentConsultationId={consultation.id}
          />
        )}

        {tab === "anamnese" && patient && (
          <AnamneseForm
            patient={patient}
            saving={savingAnamnese}
            savedAt={savedAtAnamnese}
            onChange={patchPatient}
          />
        )}
      </div>
    </div>
  );
  },
);

export default ChartPanel;

// ─── Header do paciente (compartilhado entre abas) ────────────
function PatientHeader({
  patient,
  loading,
}: {
  patient: PatientInfo | null;
  loading: boolean;
}) {
  if (loading && !patient) {
    return <div className="chart-patient-header chart-patient-loading">Carregando paciente…</div>;
  }
  if (!patient) return null;
  const age = calcAge(patient.birth_date);
  const phoneRaw = patient.celular ?? patient.phone ?? "";
  const alergiasN = patient.alergias?.length ?? 0;
  return (
    <div className="chart-patient-header">
      <div className="chart-patient-av">{initials(patient.full_name)}</div>
      <div className="chart-patient-info">
        <div className="chart-patient-name">{patient.full_name ?? "—"}</div>
        <div className="chart-patient-meta">
          {patient.cpf ? `CPF ${maskCpfDisplay(patient.cpf)} · ` : ""}
          {age !== null ? `${age} anos · ` : ""}
          {genderLabel(patient.gender)}
          {phoneRaw ? ` · ${maskPhoneDisplay(phoneRaw)}` : ""}
        </div>
      </div>
      <div className="chart-quick-actions">
        <span
          className="chart-qa"
          style={alergiasN > 0 ? { color: "var(--red)" } : undefined}
          title={alergiasN > 0 ? patient.alergias!.join(", ") : "Sem alergias registradas"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {alergiasN > 0 ? `${alergiasN} alergia${alergiasN > 1 ? "s" : ""}` : "Sem alergias"}
        </span>
      </div>
    </div>
  );
}

// ─── Aba Prontuário ───────────────────────────────────────────
function ProntuarioForm({
  data,
  disabled,
  saving,
  savedAt,
  onChange,
  onAddCid,
  onRemoveCid,
  onSave,
}: {
  data: Prontuario;
  disabled: boolean;
  saving: boolean;
  savedAt: number | null;
  onChange: (patch: Partial<Prontuario>) => void;
  onAddCid: (code: string) => void;
  onRemoveCid: (code: string) => void;
  onSave: () => void | Promise<void>;
}) {
  const [cidInput, setCidInput] = useState("");
  return (
    <>
      <div className="chart-prontuario-head">
        <SavingTag saving={saving} savedAt={savedAt} disabled={disabled} />
        <button
          type="button"
          className="chart-save-btn"
          onClick={() => void onSave()}
          disabled={disabled || saving}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Queixa principal</div>
        <textarea
          className="chart-textarea"
          value={data.chief_complaint}
          disabled={disabled}
          onChange={(e) => onChange({ chief_complaint: e.target.value })}
          placeholder="Motivo da consulta, sintomas iniciais…"
        />
      </div>

      <div className="chart-section">
        <div className="chart-section-label">História da doença atual</div>
        <textarea
          className="chart-textarea"
          value={data.history_present_illness}
          disabled={disabled}
          onChange={(e) => onChange({ history_present_illness: e.target.value })}
          placeholder="Tempo de evolução, fatores que pioram/melhoram, sintomas associados…"
        />
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Evolução / exame físico</div>
        <textarea
          className="chart-textarea tall"
          value={data.physical_exam}
          disabled={disabled}
          onChange={(e) => onChange({ physical_exam: e.target.value })}
          placeholder="Achados observáveis em vídeo, sinais vitais relatados…"
        />
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Hipótese diagnóstica (CID-10)</div>
        <div className="chart-cid-row">
          {data.cid10_codes.map((c) => (
            <div key={c} className="chart-cid-chip">
              {c}
              <button
                type="button"
                onClick={() => onRemoveCid(c)}
                aria-label={`Remover ${c}`}
                disabled={disabled}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 4 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <input
            type="text"
            className="chart-cid-input chart-cid-input--editable"
            value={cidInput}
            onChange={(e) => setCidInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (cidInput.trim()) {
                  onAddCid(cidInput);
                  setCidInput("");
                }
              }
            }}
            placeholder="+ adicionar CID (Enter)"
            disabled={disabled}
          />
        </div>
        <textarea
          className="chart-textarea"
          value={data.diagnostic_hypothesis}
          disabled={disabled}
          onChange={(e) => onChange({ diagnostic_hypothesis: e.target.value })}
          placeholder="Hipótese diagnóstica em texto livre (opcional)"
          style={{ marginTop: 8 }}
        />
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Conduta</div>
        <textarea
          className="chart-textarea"
          value={data.conduct}
          disabled={disabled}
          onChange={(e) => onChange({ conduct: e.target.value })}
          placeholder="Tratamento prescrito, orientações, retorno…"
        />
      </div>
    </>
  );
}

// ─── Aba Anamnese (campos PERSISTENTES do paciente) ────────────
function AnamneseForm({
  patient,
  saving,
  savedAt,
  onChange,
}: {
  patient: PatientInfo;
  saving: boolean;
  savedAt: number | null;
  onChange: (patch: Partial<PatientInfo>) => void;
}) {
  const [alergiaInput, setAlergiaInput] = useState("");
  const [medInput, setMedInput] = useState("");

  function addAlergia() {
    const v = alergiaInput.trim();
    if (!v) return;
    const next = [...(patient.alergias ?? []), v];
    onChange({ alergias: Array.from(new Set(next)) });
    setAlergiaInput("");
  }
  function addMed() {
    const v = medInput.trim();
    if (!v) return;
    const next = [...(patient.current_medications ?? []), v];
    onChange({ current_medications: Array.from(new Set(next)) });
    setMedInput("");
  }

  return (
    <>
      <SavingTag saving={saving} savedAt={savedAt} />

      <div className="chart-section">
        <div className="chart-section-label">Alergias</div>
        <div className="chart-chip-input">
          <input
            type="text"
            className="chart-chip-field"
            value={alergiaInput}
            onChange={(e) => setAlergiaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAlergia();
              }
            }}
            placeholder="Ex: dipirona (Enter)"
          />
        </div>
        <div className="chart-chips">
          {(patient.alergias ?? []).map((a) => (
            <span key={a} className="chart-chip chart-chip--red">
              {a}
              <button
                type="button"
                aria-label={`Remover ${a}`}
                onClick={() =>
                  onChange({
                    alergias: (patient.alergias ?? []).filter((x) => x !== a),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Medicações em uso</div>
        <div className="chart-chip-input">
          <input
            type="text"
            className="chart-chip-field"
            value={medInput}
            onChange={(e) => setMedInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMed();
              }
            }}
            placeholder="Ex: losartana 50mg 1x/dia (Enter)"
          />
        </div>
        <div className="chart-chips">
          {(patient.current_medications ?? []).map((m) => (
            <span key={m} className="chart-chip">
              {m}
              <button
                type="button"
                aria-label={`Remover ${m}`}
                onClick={() =>
                  onChange({
                    current_medications: (patient.current_medications ?? []).filter((x) => x !== m),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Antecedentes pessoais</div>
        <textarea
          className="chart-textarea"
          value={patient.medical_history ?? ""}
          onChange={(e) => onChange({ medical_history: e.target.value })}
          placeholder="Doenças prévias, cirurgias, internações relevantes…"
        />
      </div>

      <div className="chart-section">
        <div className="chart-section-label">Antecedentes familiares</div>
        <textarea
          className="chart-textarea"
          value={patient.family_history ?? ""}
          onChange={(e) => onChange({ family_history: e.target.value })}
          placeholder="Doenças hereditárias na família (pais, irmãos)…"
        />
      </div>
    </>
  );
}

// ─── Aba Histórico ─────────────────────────────────────────────
type HistoricoItem = {
  id: string;
  status: string;
  service_name: string | null;
  paid_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  chief_complaint: string | null;
  doctor: { full_name: string | null } | null;
};

function Historico({
  patientId,
  currentConsultationId,
}: {
  patientId: string;
  currentConsultationId: string;
}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient();
    } catch {
      /* noop */
    }
  }
  const [items, setItems] = useState<HistoricoItem[] | null>(null);
  const [open, setOpen] = useState<HistoricoItem | null>(null);

  useEffect(() => {
    const sb = supabaseRef.current;
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("consultations")
        .select(
          "id, status, service_name, paid_at, started_at, ended_at, chief_complaint, doctor:doctors(full_name)",
        )
        .eq("patient_id", patientId)
        .neq("id", currentConsultationId)
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      setItems((data ?? []) as unknown as HistoricoItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, currentConsultationId]);

  return (
    <>
      <div className="chart-section">
        <div className="chart-section-label">
          Consultas anteriores {items ? `(${items.length})` : ""}
        </div>
        {items === null && <div className="chart-empty-soft">Carregando…</div>}
        {items?.length === 0 && (
          <div className="chart-empty-soft">Este paciente ainda não tem consultas anteriores.</div>
        )}
        <div className="chart-history-list">
          {items?.map((it) => (
            <button
              key={it.id}
              type="button"
              className="chart-history-card"
              onClick={() => setOpen(it)}
            >
              <div className="chart-history-top">
                <span className="chart-history-date">
                  {fmtDate(it.paid_at ?? it.started_at)}
                </span>
                <span className={`chart-history-status chart-history-status--${it.status}`}>
                  {labelStatus(it.status)}
                </span>
              </div>
              <div className="chart-history-doctor">
                {it.doctor?.full_name ?? "Médico não atribuído"}
              </div>
              {it.chief_complaint && (
                <div className="chart-history-snippet">{it.chief_complaint}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <HistoricoDrawer item={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function labelStatus(s: string): string {
  switch (s) {
    case "completed": return "concluída";
    case "in_progress": return "em andamento";
    case "in_queue": return "na fila";
    case "cancelled": return "cancelada";
    case "no_show": return "no-show";
    case "refunded": return "reembolsada";
    case "paid": return "paga";
    case "created": return "criada";
    default: return s;
  }
}

type DrawerRecord = {
  chief_complaint: string | null;
  history_present_illness: string | null;
  physical_exam: string | null;
  diagnostic_hypothesis: string | null;
  cid10_codes: string[] | null;
  conduct: string | null;
};

type DrawerPrescricao = {
  id: string;
  status: string;
  ambiente: string;
  created_at: string | null;
  codigo_validacao: string | null;
  documentos: Array<{ id: string; tipo_documento: string; storage_path: string }>;
};

function HistoricoDrawer({
  item,
  onClose,
}: {
  item: HistoricoItem;
  onClose: () => void;
}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient();
    } catch {
      /* noop */
    }
  }
  const [record, setRecord] = useState<DrawerRecord | null>(null);
  const [prescricoes, setPrescricoes] = useState<DrawerPrescricao[] | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const sb = supabaseRef.current;
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const [{ data: mr }, { data: ps }] = await Promise.all([
        sb
          .from("medical_records")
          .select(
            "chief_complaint, history_present_illness, physical_exam, diagnostic_hypothesis, cid10_codes, conduct",
          )
          .eq("consultation_id", item.id)
          .maybeSingle(),
        sb
          .from("prescricoes_mevo")
          .select(
            "id, status, ambiente, created_at, codigo_validacao, documentos:prescricoes_documentos(id, tipo_documento, storage_path)",
          )
          .eq("consultation_id", item.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setRecord((mr as DrawerRecord) ?? null);
      const prescricoesData = (ps ?? []) as unknown as DrawerPrescricao[];
      setPrescricoes(prescricoesData);

      // Signed URLs pros PDFs
      const allDocs = prescricoesData.flatMap((p) => p.documentos ?? []);
      const urlsByPath: Record<string, string> = {};
      await Promise.all(
        allDocs.map(async (d) => {
          const { data: signed } = await sb.storage
            .from("prescricoes-pdfs")
            .createSignedUrl(d.storage_path, 3600);
          if (signed?.signedUrl) urlsByPath[d.id] = signed.signedUrl;
        }),
      );
      if (!cancelled) setDocUrls(urlsByPath);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return (
    <div className="chart-drawer-backdrop" onClick={onClose}>
      <div
        className="chart-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="chart-drawer-head">
          <div>
            <div className="chart-drawer-eyebrow">consulta anterior</div>
            <div className="chart-drawer-title">{fmtDate(item.paid_at ?? item.started_at)}</div>
            <div className="chart-drawer-sub">
              {item.doctor?.full_name ?? "—"} · {labelStatus(item.status)}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="chart-drawer-close">
            ×
          </button>
        </div>

        <div className="chart-drawer-body">
          <DrawerSection label="Queixa principal" value={record?.chief_complaint} />
          <DrawerSection
            label="História da doença atual"
            value={record?.history_present_illness}
          />
          <DrawerSection label="Exame físico / evolução" value={record?.physical_exam} />
          <DrawerSection
            label="Hipótese diagnóstica"
            value={
              [
                ...(record?.cid10_codes ?? []),
                record?.diagnostic_hypothesis ?? "",
              ]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
          <DrawerSection label="Conduta" value={record?.conduct} />

          <div className="chart-section">
            <div className="chart-section-label">Documentos emitidos (Mevo)</div>
            {prescricoes === null && <div className="chart-empty-soft">Carregando…</div>}
            {prescricoes?.length === 0 && (
              <div className="chart-empty-soft">Nenhum documento Mevo nessa consulta.</div>
            )}
            {prescricoes?.map((p) => (
              <div key={p.id} className="chart-pres-card">
                <div className="chart-pres-top">
                  <span className="chart-pres-status">{p.status}</span>
                  {p.codigo_validacao && (
                    <span className="chart-pres-code">cod: {p.codigo_validacao}</span>
                  )}
                </div>
                <div className="chart-pres-docs">
                  {(p.documentos ?? []).map((d) => {
                    const url = docUrls[d.id];
                    return url ? (
                      <a
                        key={d.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chart-pres-link"
                      >
                        📄 {d.tipo_documento}
                      </a>
                    ) : (
                      <span key={d.id} className="chart-pres-link chart-pres-link--off">
                        📄 {d.tipo_documento}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="chart-drawer-section">
      <div className="chart-drawer-section-label">{label}</div>
      <div className="chart-drawer-section-text">{value}</div>
    </div>
  );
}

function SavingTag({
  saving,
  savedAt,
  disabled,
}: {
  saving: boolean;
  savedAt: number | null;
  disabled?: boolean;
}) {
  const text = useMemo(() => {
    if (disabled) return "Disponível somente durante o atendimento";
    if (saving) return "Salvando…";
    if (savedAt) {
      const sec = Math.max(1, Math.round((Date.now() - savedAt) / 1000));
      return `Salvo há ${sec}s`;
    }
    return "Edição automática";
  }, [saving, savedAt, disabled]);
  return (
    <div className={`chart-saving${disabled ? " chart-saving--off" : ""}`}>
      <span className="chart-saving-dot" />
      {text}
    </div>
  );
}
