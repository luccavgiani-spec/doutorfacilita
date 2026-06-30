"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { inviteDoctor, type InviteResult } from "@/app/admin/medicos/actions";
import { useCpfCheck } from "@/hooks/useCpfCheck";
import { CpfHint } from "@/components/admin/QuickActionsPanel";
import { isValidCpf } from "@/lib/forms/validators";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

const CONSELHOS = ["CRM","CRO","CRP","CRN","CREFITO","CREFONO"] as const;

export default function NewDoctorButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<InviteResult | null>(null);
  const [cpf, setCpf] = useState("");
  const cpfCheck = useCpfCheck(cpf);
  const cpfInvalid = cpf.length === 11 && !isValidCpf(cpf);
  const cpfBlocked = cpfCheck.result?.exists === true || cpfInvalid;

  function submit(formData: FormData) {
    if (cpfBlocked) return;
    setResult(null);
    start(async () => {
      const r = await inviteDoctor({
        full_name: String(formData.get("full_name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
        council: String(formData.get("council") ?? "CRM"),
        council_state: String(formData.get("council_state") ?? "SP").toUpperCase(),
        council_number: String(formData.get("council_number") ?? "").trim(),
        primary_specialty: String(formData.get("primary_specialty") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").replace(/\D/g, "") || undefined,
      });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  function handleClose() {
    setResult(null);
    setCpf("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d"
      >
        + Novo médico
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Cadastrar novo médico"
        subtitle="A senha é gerada agora — envie ao médico depois (link de login: /login)."
        maxWidth={640}
      >
        {result?.ok ? (
          <SuccessBox
            email={result.alreadyExisted ? null : null}
            password={result.tempPassword}
            doctorId={result.doctorId}
            alreadyExisted={result.alreadyExisted}
            onClose={handleClose}
            onGoToDoctor={() => {
              router.push(`/admin/medicos/${result.doctorId}?criado=1`);
            }}
          />
        ) : (
          <form action={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome completo*" name="full_name" required colSpan={2} />
            <Field label="Email*" name="email" type="email" required />
            <div>
              <Label>CPF (só dígitos)*</Label>
              <input
                name="cpf"
                required
                inputMode="numeric"
                maxLength={11}
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                className={`${inputClass} ${cpfBlocked ? "border-red focus:border-red focus:ring-red/20" : ""}`}
              />
              {cpfInvalid ? (
                <div className="mt-1 rounded-md border border-red bg-red-l px-2.5 py-1.5 text-xs font-medium text-red">
                  ⚠ CPF inválido (dígitos verificadores não conferem).
                </div>
              ) : (
                <CpfHint state={cpfCheck} />
              )}
            </div>

            <div>
              <Label>Conselho*</Label>
              <select name="council" defaultValue="CRM" className={inputClass}>
                {CONSELHOS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>UF*</Label>
              <select name="council_state" defaultValue="SP" className={inputClass}>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>

            <Field label="Nº registro*" name="council_number" required placeholder="123456" />
            <Field label="Especialidade*" name="primary_specialty" required placeholder="Clínica Geral" />
            <Field label="Telefone" name="phone" inputMode="numeric" maxLength={11} colSpan={2} />

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
                className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Criando…" : "Criar médico"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function SuccessBox({
  password,
  alreadyExisted,
  onClose,
  onGoToDoctor,
}: {
  email: string | null;
  password: string | null;
  doctorId: string;
  alreadyExisted: boolean;
  onClose: () => void;
  onGoToDoctor: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-green bg-green-l p-3">
        <div className="text-sm font-bold text-green-d">
          ✓ {alreadyExisted ? "Médico vinculado" : "Médico criado"}
        </div>
        <div className="text-xs text-txt-2">
          {alreadyExisted
            ? "Email já tinha conta no Auth — vínculo com doctors atualizado. Senha não alterada."
            : "Conta criada e papel doctor concedido."}
        </div>
      </div>

      {password && (
        <div className="rounded-lg border border-border bg-bg-3 p-3">
          <div className="text-xs font-semibold text-txt-2">Senha temporária</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="block flex-1 break-all font-mono text-sm">{password}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(password)}
              className="rounded border border-border bg-white px-2 py-1 text-xs font-semibold hover:bg-bg-3"
            >
              copiar
            </button>
          </div>
          <div className="mt-2 text-[11px] text-txt-3">
            Envie esta senha ao médico em um canal seguro. A troca é obrigatória
            no primeiro login.
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-txt-2 hover:bg-bg-3"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={onGoToDoctor}
          className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
        >
          Abrir perfil →
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
  label, name, type = "text", required = false, inputMode, maxLength, placeholder, colSpan,
}: {
  label: string; name: string; type?: string; required?: boolean;
  inputMode?: "numeric" | "text" | "email"; maxLength?: number; placeholder?: string;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : undefined}>
      <Label>{label}</Label>
      <input
        type={type} name={name} required={required}
        inputMode={inputMode} maxLength={maxLength} placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
