"use client";

import { useMemo, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import {
  saveProntiaValores,
  registrarEncaminhamentoProntia,
} from "@/app/admin/actions";

type Encaminhamento = {
  id: string;
  created_at: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  destino_url: string | null;
  valor_cobrado_cents: number;
  valor_pago_prontia_cents: number;
  status: "sent" | "confirmed" | "failed";
};

interface Props {
  valorCobradoCents: number;
  valorPagoProntiaCents: number;
  encaminhamentos: Encaminhamento[];
}

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ProntiaDashboard({
  valorCobradoCents: vc0,
  valorPagoProntiaCents: vp0,
  encaminhamentos,
}: Props) {
  const [valorCobrado, setValorCobrado] = useState(vc0 / 100);
  const [valorRepasse, setValorRepasse] = useState(vp0 / 100);

  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [openTeste, setOpenTeste] = useState(false);

  // KPIs derivados da lista (já filtrada por período no server)
  const k = useMemo(() => {
    const n = encaminhamentos.length;
    const receita = encaminhamentos.reduce(
      (s, e) => s + (e.valor_cobrado_cents || 0),
      0,
    );
    const repasse = encaminhamentos.reduce(
      (s, e) => s + (e.valor_pago_prontia_cents || 0),
      0,
    );
    const margem = receita - repasse;
    const margemPct = receita > 0 ? Math.round((margem / receita) * 100) : 0;
    return { n, receita, repasse, margem, margemPct };
  }, [encaminhamentos]);

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = await saveProntiaValores(
        Math.round(valorCobrado * 100),
        Math.round(valorRepasse * 100),
      );
      setMsg(
        r.ok
          ? { ok: true, t: "Valores salvos." }
          : { ok: false, t: `Erro: ${r.error}` },
      );
    });
  }

  // Margem prevista por consulta (com valores atuais do form, não os salvos)
  const margemPrevista = Math.round((valorCobrado - valorRepasse) * 100);
  const margemPrevPct =
    valorCobrado > 0 ? Math.round((margemPrevista / (valorCobrado * 100)) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPIs ── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Encaminhamentos" value={String(k.n)} tone="blue" />
        <Kpi label="Receita gerada" value={brl(k.receita)} tone="green" />
        <Kpi label="Repassado à Prontia" value={brl(k.repasse)} tone="red" />
        <Kpi
          label="Margem (Doutor Facilita)"
          value={`${brl(k.margem)} · ${k.margemPct}%`}
          tone={k.margem >= 0 ? "green" : "red"}
        />
      </section>

      {/* ── Configuração de valores ── */}
      <section className="rounded-xl border border-border bg-white p-6">
        <h3 className="text-sm font-bold">Calibrar valores</h3>
        <p className="mb-4 text-xs text-txt-2">
          Quanto o paciente paga e quanto a Doutor Facilita repassa à Prontia
          por encaminhamento. (Para ligar/desligar o redirecionamento ou trocar
          a URL de destino, use o card grande no topo da página.)
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Valor cobrado do paciente (R$)" hint="Padrão R$ 59,00">
            <MoneyInput value={valorCobrado} onChange={setValorCobrado} />
          </Field>
          <Field label="Repasse para Prontia (R$)" hint="Custo por encaminhamento">
            <MoneyInput value={valorRepasse} onChange={setValorRepasse} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-3 px-4 py-3">
          <div className="text-xs text-txt-2">
            Margem prevista por encaminhamento:{" "}
            <b className={margemPrevista >= 0 ? "text-green" : "text-red"}>
              {brl(margemPrevista)} ({margemPrevPct}%)
            </b>
          </div>
          <div className="flex items-center gap-3">
            {msg && (
              <span className={`text-xs font-medium ${msg.ok ? "text-green-d" : "text-red"}`}>
                {msg.t}
              </span>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={pending}
              className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar valores"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Lista de encaminhamentos ── */}
      <section className="rounded-xl border border-border bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Encaminhamentos recentes</h3>
            <p className="text-xs text-txt-2">
              Cada linha = um lead redirecionado pra Prontia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenTeste(true)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
          >
            + Simular encaminhamento (teste)
          </button>
        </div>

        {encaminhamentos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-3 px-4 py-8 text-center text-xs text-txt-2">
            Nenhum encaminhamento ainda. Quando o override estiver ativo, cada
            redirect insere uma linha aqui.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-3 text-left text-xs uppercase tracking-wide text-txt-2">
                <tr>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Lead</th>
                  <th className="px-3 py-2">Contato</th>
                  <th className="px-3 py-2 text-right">Cobrado</th>
                  <th className="px-3 py-2 text-right">Repasse</th>
                  <th className="px-3 py-2 text-right">Margem</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {encaminhamentos.map((e) => {
                  const margem =
                    (e.valor_cobrado_cents || 0) - (e.valor_pago_prontia_cents || 0);
                  return (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs text-txt-2">
                        {fmtDate(e.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{e.patient_name ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-txt-2">
                        {e.patient_email ?? "—"}
                        <div className="text-txt-3">{e.patient_phone ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {brl(e.valor_cobrado_cents)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {brl(e.valor_pago_prontia_cents)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono text-xs font-bold ${
                          margem >= 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {brl(margem)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={e.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TesteModal open={openTeste} onClose={() => setOpenTeste(false)} />
    </div>
  );
}

function TesteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function submit(formData: FormData) {
    setErr(null);
    start(async () => {
      const r = await registrarEncaminhamentoProntia({
        patient_name: String(formData.get("patient_name") ?? ""),
        patient_email: String(formData.get("patient_email") ?? ""),
        patient_phone: String(formData.get("patient_phone") ?? ""),
      });
      if (r.ok) {
        onClose();
        // page é Server Component — revalidatePath na action força nova render
      } else {
        setErr(r.error);
      }
    });
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Simular encaminhamento Prontia"
      subtitle="Registra um lead fictício pra testar o dashboard — usa os valores atualmente salvos."
      maxWidth={460}
    >
      <form action={submit} className="flex flex-col gap-3">
        <FieldRow label="Nome*">
          <input name="patient_name" required className={input} />
        </FieldRow>
        <FieldRow label="Email*">
          <input name="patient_email" type="email" required className={input} />
        </FieldRow>
        <FieldRow label="Telefone">
          <input name="patient_phone" inputMode="numeric" maxLength={11} className={input} />
        </FieldRow>
        {err && (
          <div className="rounded-md border border-red bg-red-l px-3 py-2 text-xs text-red">
            {err}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Registrando…" : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "confirmed"
      ? "bg-green-l text-green-d"
      : status === "failed"
        ? "bg-red-l text-red"
        : "bg-blue-l text-blue-d";
  const label =
    status === "confirmed" ? "confirmado" : status === "failed" ? "falhou" : "enviado";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "blue";
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-txt-2">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          tone === "green" ? "text-green"
          : tone === "red" ? "text-red"
          : tone === "blue" ? "text-blue"
          : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-txt-3">{hint}</span>}
    </label>
  );
}
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      {children}
    </label>
  );
}
function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-white">
      <span className="flex items-center bg-bg-3 px-3 text-xs font-bold text-txt-2">R$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

const input =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";
