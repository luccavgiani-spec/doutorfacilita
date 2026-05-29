"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import {
  quickCreatePatient,
  quickCreateConsultation,
  type QuickPatientResult,
  type QuickConsultaResult,
} from "@/app/admin/actions";
import { useCpfCheck } from "@/hooks/useCpfCheck";

type Patient = { id: string; full_name: string | null; email: string | null; cpf: string | null };

export default function QuickActionsPanel({
  patients,
  compact = false,
  hideAvulsa = false,
}: {
  patients: Patient[]; // pra autocomplete
  compact?: boolean;
  hideAvulsa?: boolean;
}) {
  const [openPaciente, setOpenPaciente] = useState(false);
  const [openConsulta, setOpenConsulta] = useState(false);

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "rounded-xl border border-blue/30 bg-gradient-to-br from-blue-l to-white p-5"}>
      {!compact && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold">Ações rápidas</h2>
            <p className="text-xs text-txt-2">
              Cadastre um lead novo na hora ou gere uma consulta imediata pra
              alguém da base.
            </p>
          </div>
          <span className="rounded-full bg-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            admin
          </span>
        </div>
      )}

      <div className={compact ? "flex gap-2" : "grid grid-cols-1 gap-3 md:grid-cols-2"}>
        <ActionCard
          icon="user-plus"
          accent="green"
          title="Novo paciente"
          desc="Cria a conta + dispara o cadastro do paciente"
          compact={compact}
          onClick={() => setOpenPaciente(true)}
        />
        {!hideAvulsa && (
          <ActionCard
            icon="plus-circle"
            accent="blue"
            title="Consulta imediata"
            desc="Coloca um paciente direto na fila do cockpit"
            compact={compact}
            onClick={() => setOpenConsulta(true)}
          />
        )}
      </div>

      <NovoPacienteModal open={openPaciente} onClose={() => setOpenPaciente(false)} />
      <NovaConsultaModal
        open={openConsulta}
        onClose={() => setOpenConsulta(false)}
        patients={patients}
      />
    </div>
  );
}

function ActionCard({
  icon,
  accent,
  title,
  desc,
  onClick,
  compact,
}: {
  icon: "user-plus" | "plus-circle";
  accent: "blue" | "green";
  title: string;
  desc: string;
  onClick: () => void;
  compact: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white ${
          accent === "green" ? "bg-green hover:bg-green-d" : "bg-blue hover:bg-blue-d"
        }`}
      >
        {icon === "user-plus" ? <UserPlusIcon /> : <PlusCircleIcon />}
        {title}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-left transition-shadow hover:shadow-md"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${
          accent === "green" ? "bg-green" : "bg-blue"
        }`}
      >
        {icon === "user-plus" ? <UserPlusIcon /> : <PlusCircleIcon />}
      </span>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-txt-2">{desc}</div>
      </div>
    </button>
  );
}

// ─── Modal: Novo paciente ───────────────────────────────────
function NovoPacienteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<QuickPatientResult | null>(null);
  const [cpf, setCpf] = useState("");
  const cpfCheck = useCpfCheck(cpf);
  const cpfBlocked = cpfCheck.result?.exists === true;

  function submit(formData: FormData) {
    if (cpfBlocked) return;
    setResult(null);
    start(async () => {
      const r = await quickCreatePatient({
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        cpf: String(formData.get("cpf") ?? ""),
        celular: String(formData.get("celular") ?? ""),
        birth_date: String(formData.get("birth_date") ?? "") || undefined,
        gender: String(formData.get("gender") ?? "") || undefined,
      });
      setResult(r);
    });
  }

  function handleClose() {
    setResult(null);
    setCpf("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo paciente"
      subtitle="O paciente entra na base já ativo e pode fazer login com a senha temporária abaixo."
      maxWidth={560}
    >
      {result?.ok ? (
        <SuccessBox
          title="Paciente cadastrado"
          desc="Compartilhe a senha temporária — recomendar troca no primeiro login."
          credentials={{ password: result.tempPassword }}
          onClose={handleClose}
        />
      ) : (
        <form
          action={submit}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <Field label="Nome completo*" name="full_name" required colSpan={2} />
          <Field label="Email*" name="email" type="email" required />
          <Field label="Celular* (só dígitos)" name="celular" inputMode="numeric" required maxLength={11} placeholder="11999990000" />
          <div className="md:col-span-2">
            <Label>CPF* (só dígitos)</Label>
            <input
              name="cpf"
              required
              inputMode="numeric"
              maxLength={11}
              placeholder="00000000000"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className={`${inputClass} ${cpfBlocked ? "border-red focus:border-red focus:ring-red/20" : ""}`}
            />
            <CpfHint state={cpfCheck} />
          </div>
          <Field label="Nascimento" name="birth_date" type="date" />
          <div>
            <Label>Gênero</Label>
            <select name="gender" className={inputClass} defaultValue="">
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="O">Outro</option>
              <option value="N">Prefiro não informar</option>
            </select>
          </div>
          {result && !result.ok && (
            <div className="col-span-full rounded-lg border border-red bg-red-l px-3 py-2 text-xs text-red">
              {result.error}
            </div>
          )}
          <div className="col-span-full mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-txt-2 hover:bg-bg-3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || cpfBlocked || cpfCheck.loading}
              className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-d disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? "Criando…" : "Cadastrar paciente"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Modal: Nova consulta imediata ──────────────────────────
function NovaConsultaModal({
  open,
  onClose,
  patients,
}: {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
}) {
  const [pending, start] = useTransition();
  const [pid, setPid] = useState("");
  const [chief, setChief] = useState("");
  const [result, setResult] = useState<QuickConsultaResult | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? patients
        .filter((p) =>
          [p.full_name, p.email, p.cpf]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(search.toLowerCase())),
        )
        .slice(0, 10)
    : patients.slice(0, 10);

  function submit() {
    if (!pid) return;
    setResult(null);
    start(async () => {
      const r = await quickCreateConsultation(pid, chief);
      setResult(r);
    });
  }

  function handleClose() {
    setResult(null);
    setPid("");
    setChief("");
    setSearch("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Consulta imediata"
      subtitle="Cria uma consulta paga manualmente. O paciente entra na fila do cockpit na hora."
      maxWidth={560}
    >
      {result?.ok ? (
        <SuccessBox
          title="Consulta criada na fila"
          desc="O médico já vê esse paciente no cockpit (atualização via realtime)."
          extra={
            <code className="block text-[11px] text-txt-2">id: {result.consultationId}</code>
          }
          onClose={handleClose}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <Label>Buscar paciente</Label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou CPF…"
              className={inputClass}
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-txt-2">
                Nenhum paciente encontrado.
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPid(p.id)}
                className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                  pid === p.id ? "bg-blue-l" : "hover:bg-bg-3"
                }`}
              >
                <div>
                  <div className="font-medium">{p.full_name ?? "—"}</div>
                  <div className="text-[11px] text-txt-2">
                    {p.email ?? "—"} · {p.cpf ?? "—"}
                  </div>
                </div>
                {pid === p.id && (
                  <span className="text-xs font-semibold text-blue">selecionado</span>
                )}
              </button>
            ))}
          </div>

          <div>
            <Label>Queixa principal (opcional)</Label>
            <textarea
              value={chief}
              onChange={(e) => setChief(e.target.value)}
              placeholder="Ex.: dor de cabeça intensa há 2 dias"
              className={`${inputClass} min-h-[72px] resize-y`}
            />
          </div>

          {result && !result.ok && (
            <div className="rounded-lg border border-red bg-red-l px-3 py-2 text-xs text-red">
              {result.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-txt-2 hover:bg-bg-3"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !pid}
              className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60"
            >
              {pending ? "Enfileirando…" : "Gerar consulta"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Comum ───────────────────────────────────────────────────
function SuccessBox({
  title,
  desc,
  credentials,
  extra,
  onClose,
}: {
  title: string;
  desc: string;
  credentials?: { password: string };
  extra?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-green bg-green-l p-3">
        <div className="text-sm font-bold text-green-d">✓ {title}</div>
        <div className="text-xs text-txt-2">{desc}</div>
      </div>
      {credentials && (
        <div className="rounded-lg border border-border bg-bg-3 p-3">
          <div className="text-xs font-semibold text-txt-2">Senha temporária</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="block flex-1 break-all font-mono text-sm">
              {credentials.password}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(credentials.password)}
              className="rounded border border-border bg-white px-2 py-1 text-xs font-semibold hover:bg-bg-3"
            >
              copiar
            </button>
          </div>
        </div>
      )}
      {extra}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-txt-2">{children}</label>;
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  inputMode,
  maxLength,
  placeholder,
  colSpan,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric" | "text" | "email";
  maxLength?: number;
  placeholder?: string;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : undefined}>
      <Label>{label}</Label>
      <input
        type={type}
        name={name}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export function CpfHint({ state }: { state: ReturnType<typeof useCpfCheck> }) {
  if (state.loading) {
    return <div className="mt-1 text-xs text-txt-3">Verificando CPF…</div>;
  }
  if (state.result?.exists) {
    return (
      <div className="mt-1 rounded-md border border-red bg-red-l px-2.5 py-1.5 text-xs font-medium text-red">
        ⚠ Já existe {state.result.kind === "doctor" ? "um médico" : "um paciente"} com esse CPF
        {state.result.full_name ? `: ${state.result.full_name}` : ""}.
      </div>
    );
  }
  return null;
}

function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
function PlusCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
