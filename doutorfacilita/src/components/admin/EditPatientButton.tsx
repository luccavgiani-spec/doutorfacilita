"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { adminUpdatePatient } from "@/app/admin/actions";

type Patient = {
  id: string;
  full_name: string | null;
  email: string | null;
  celular: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  endereco_completo: string | null;
};

export default function EditPatientButton({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(formData: FormData) {
    setErr(null);
    start(async () => {
      const r = await adminUpdatePatient(patient.id, {
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        celular: String(formData.get("celular") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        birth_date: String(formData.get("birth_date") ?? "") || null,
        gender: String(formData.get("gender") ?? "") || null,
        endereco_completo: String(formData.get("endereco_completo") ?? ""),
      });
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setErr(r.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-blue hover:underline"
      >
        editar
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar paciente"
        subtitle={patient.full_name ?? patient.id}
        maxWidth={620}
      >
        <form action={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Nome completo" name="full_name" defaultValue={patient.full_name ?? ""} colSpan={2} />
          <Field label="Email" name="email" type="email" defaultValue={patient.email ?? ""} />
          <Field
            label="Celular"
            name="celular"
            inputMode="numeric"
            maxLength={11}
            defaultValue={patient.celular ?? patient.phone ?? ""}
          />
          <Field
            label="Telefone fixo"
            name="phone"
            inputMode="numeric"
            maxLength={11}
            defaultValue={patient.phone ?? ""}
          />
          <Field
            label="Nascimento (YYYY-MM-DD)"
            name="birth_date"
            type="date"
            defaultValue={patient.birth_date ?? ""}
          />
          <div>
            <Label>Gênero</Label>
            <select name="gender" defaultValue={patient.gender ?? ""} className={inputClass}>
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="O">Outro</option>
              <option value="N">Prefiro não informar</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Endereço completo</Label>
            <textarea
              name="endereco_completo"
              defaultValue={patient.endereco_completo ?? ""}
              rows={2}
              className={`${inputClass} resize-y`}
            />
          </div>

          {err && (
            <div className="col-span-full rounded-lg border border-red bg-red-l px-3 py-2 text-xs text-red">
              {err}
            </div>
          )}

          <div className="col-span-full mt-2 flex justify-between gap-2">
            <p className="text-[11px] text-txt-3">
              Ação gravada em <code>audit_log</code>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-txt-2 hover:bg-bg-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60"
              >
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-txt-2">{children}</label>;
}
function Field({
  label, name, type = "text", inputMode, maxLength, defaultValue, colSpan,
}: {
  label: string; name: string; type?: string;
  inputMode?: "numeric" | "text" | "email"; maxLength?: number;
  defaultValue?: string; colSpan?: 1 | 2;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : undefined}>
      <Label>{label}</Label>
      <input
        type={type} name={name} inputMode={inputMode} maxLength={maxLength}
        defaultValue={defaultValue} className={inputClass}
      />
    </div>
  );
}
