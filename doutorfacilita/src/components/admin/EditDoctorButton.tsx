"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { adminUpdateDoctor } from "@/app/admin/medicos/actions";

type Doctor = {
  id: string;
  full_name: string | null;
  email: string | null;
  council: string | null;
  council_state: string | null;
  council_number: string | null;
  primary_specialty: string | null;
  cpf: string | null;
  phone: string | null;
};

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function EditDoctorButton({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(formData: FormData) {
    setErr(null);
    start(async () => {
      const r = await adminUpdateDoctor(doctor.id, {
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        cpf: String(formData.get("cpf") ?? ""),
        council: String(formData.get("council") ?? ""),
        council_state: String(formData.get("council_state") ?? ""),
        council_number: String(formData.get("council_number") ?? ""),
        primary_specialty: String(formData.get("primary_specialty") ?? ""),
        phone: String(formData.get("phone") ?? ""),
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
        title="Editar perfil do médico"
        subtitle={doctor.full_name ?? doctor.id}
        maxWidth={620}
      >
        <form action={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Nome completo" name="full_name" defaultValue={doctor.full_name ?? ""} colSpan={2} />
          <Field label="Email" name="email" type="email" defaultValue={doctor.email ?? ""} />
          <Field
            label="CPF"
            name="cpf"
            inputMode="numeric"
            defaultValue={doctor.cpf ?? ""}
          />
          <div>
            <Label>Conselho</Label>
            <select name="council" defaultValue={doctor.council ?? "CRM"} className={inputClass}>
              <option value="CRM">CRM</option>
              <option value="CRO">CRO</option>
              <option value="CRF">CRF</option>
              <option value="CREFITO">CREFITO</option>
              <option value="CRP">CRP</option>
              <option value="COREN">COREN</option>
            </select>
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field
              label="Número do registro"
              name="council_number"
              defaultValue={doctor.council_number ?? ""}
            />
            <div>
              <Label>UF</Label>
              <select
                name="council_state"
                defaultValue={doctor.council_state ?? "SP"}
                className={inputClass}
              >
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field
            label="Especialidade"
            name="primary_specialty"
            defaultValue={doctor.primary_specialty ?? ""}
          />
          <Field
            label="Telefone"
            name="phone"
            inputMode="numeric"
            defaultValue={doctor.phone ?? ""}
          />

          {err && (
            <div className="col-span-full rounded-lg border border-red bg-red-l px-3 py-2 text-xs text-red">
              {err}
            </div>
          )}

          <div className="col-span-full mt-2 flex justify-between gap-2">
            <p className="text-[11px] text-txt-3">
              Perfil cadastral · não altera login. Gravado em <code>audit_log</code>.
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
