"use client";

import { useState, useTransition } from "react";
import { type PatientEdit, updatePatient } from "@/app/admin/pacientes/actions";

const input =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

export default function PatientEditForm({
  id,
  inicial,
  cpf,
}: {
  id: string;
  inicial: PatientEdit;
  cpf: string;
}) {
  const [p, setP] = useState<PatientEdit>(inicial);
  const [alergiaInput, setAlergiaInput] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  function set<K extends keyof PatientEdit>(k: K, v: PatientEdit[K]) {
    setP((s) => ({ ...s, [k]: v }));
  }

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = await updatePatient(id, p);
      setMsg(
        r.ok
          ? { ok: true, t: "Paciente atualizado." }
          : { ok: false, t: `Erro: ${r.error}` },
      );
    });
  }

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-sm font-bold">Dados do paciente</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nome completo">
          <input className={input} value={p.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field label="CPF (não editável)">
          <input className={`${input} cursor-not-allowed bg-bg-3 text-txt-3`} value={cpf} disabled readOnly />
        </Field>
        <Field label="E-mail">
          <input className={input} value={p.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Celular">
          <input className={input} value={p.celular} onChange={(e) => set("celular", e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input className={input} value={p.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Logradouro (rua/av.)">
          <input className={input} value={p.address_line} onChange={(e) => set("address_line", e.target.value)} />
        </Field>
        <Field label="Número">
          <input className={input} value={p.address_number} onChange={(e) => set("address_number", e.target.value)} />
        </Field>
        <Field label="Complemento">
          <input className={input} value={p.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
        </Field>
        <Field label="Bairro">
          <input className={input} value={p.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
        </Field>
        <Field label="Cidade">
          <input className={input} value={p.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="UF">
          <input className={input} maxLength={2} value={p.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
        </Field>
        <Field label="CEP">
          <input className={input} value={p.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
        </Field>
        <Field label="Endereço completo (texto livre — legado)">
          <input className={input} value={p.endereco_completo} onChange={(e) => set("endereco_completo", e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-txt-2">Alergias</p>
        <div className="flex flex-wrap gap-2">
          {p.alergias.map((a) => (
            <span key={a} className="flex items-center gap-1 rounded-full bg-red-l px-2.5 py-1 text-xs font-semibold text-red">
              {a}
              <button type="button" onClick={() => set("alergias", p.alergias.filter((x) => x !== a))}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex max-w-md gap-2">
          <input
            className={input}
            value={alergiaInput}
            onChange={(e) => setAlergiaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = alergiaInput.trim();
                if (v && !p.alergias.includes(v))
                  set("alergias", [...p.alergias, v]);
                setAlergiaInput("");
              }
            }}
            placeholder="Adicionar alergia + Enter"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {msg && (
          <span className={`text-sm font-medium ${msg.ok ? "text-green" : "text-red"}`}>
            {msg.t}
          </span>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      {children}
    </label>
  );
}
