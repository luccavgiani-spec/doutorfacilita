"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { DataTable, StatusBadge } from "@/components/ui/data-table";

type SaleRow = {
  consultation_id: string;
  sale_at: string | null;
  paid_at: string | null;
  queued_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  amount_cents: number | null;
  payment_id: string | null;
  service_name: string | null;
  service_code: string | null;
  cancellation_reason: string | null;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  doctor_name: string | null;
};

const brl = (c: number | null) =>
  ((c ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

export default function SalesTable({ rows }: { rows: SaleRow[] }) {
  const [open, setOpen] = useState<SaleRow | null>(null);

  return (
    <>
      <DataTable<SaleRow>
        rows={rows}
        rowKey={(r) => r.consultation_id}
        empty="Nenhuma venda no período."
        columns={[
          { key: "sale_at", header: "Data", render: (r) => fmt(r.sale_at) },
          {
            key: "paciente",
            header: "Paciente",
            render: (r) => (
              <div>
                <p className="font-medium">{r.patient_name || "—"}</p>
                <p className="text-xs text-txt-3">
                  {r.patient_email || ""} {r.patient_phone || ""}
                </p>
              </div>
            ),
          },
          { key: "doctor_name", header: "Médico", render: (r) => r.doctor_name || "—" },
          {
            key: "status",
            header: "Status",
            render: (r) => {
              const tone =
                r.status === "completed" ? "green"
                : r.status === "refunded" || r.status === "cancelled" ? "red"
                : r.status === "no_show" ? "yellow"
                : "neutral";
              return <StatusBadge label={r.status} tone={tone} />;
            },
          },
          { key: "amount", header: "Valor", render: (r) => brl(r.amount_cents) },
          {
            key: "details",
            header: "",
            render: (r) => (
              <button
                type="button"
                onClick={() => setOpen(r)}
                className="text-xs font-semibold text-blue hover:underline"
              >
                abrir
              </button>
            ),
          },
        ]}
      />

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `Venda · ${open.patient_name ?? "—"}` : "Venda"}
        subtitle={open?.consultation_id}
        maxWidth={640}
      >
        {open && <SaleDetail row={open} />}
      </Modal>
    </>
  );
}

function methodLabel(paymentId: string | null): { label: string; tone: "green" | "blue" | "neutral" } {
  if (!paymentId) return { label: "Sem pagamento", tone: "neutral" };
  if (paymentId.startsWith("STUB-PIX")) return { label: "PIX (stub)", tone: "green" };
  if (paymentId.startsWith("STUB-CARD")) return { label: "Cartão (stub)", tone: "blue" };
  if (paymentId.startsWith("STUB-")) return { label: "Stub interno", tone: "neutral" };
  if (paymentId.startsWith("ADMIN-MANUAL")) return { label: "Lançamento manual (admin)", tone: "neutral" };
  // Outros prefixos = gateway real
  return { label: paymentId.split("-")[0] || "Gateway", tone: "blue" };
}

function SaleDetail({ row }: { row: SaleRow }) {
  const m = methodLabel(row.payment_id);
  return (
    <div className="flex flex-col gap-4">
      {/* Top — valor + método */}
      <div className="rounded-xl border border-border bg-bg-3 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-txt-2">
          Valor
        </div>
        <div className="text-2xl font-bold">{brl(row.amount_cents)}</div>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge label={m.label} tone={m.tone} />
          {row.payment_id && (
            <code className="rounded bg-white px-2 py-0.5 text-[11px] text-txt-2">
              {row.payment_id}
            </code>
          )}
        </div>
      </div>

      {/* Paciente / médico */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Block label="Paciente">
          <div className="font-semibold">{row.patient_name ?? "—"}</div>
          <div className="text-xs text-txt-2">{row.patient_email ?? "—"}</div>
          <div className="text-xs text-txt-2">{row.patient_phone ?? "—"}</div>
        </Block>
        <Block label="Médico">
          <div className="font-semibold">{row.doctor_name ?? "—"}</div>
          <div className="text-xs text-txt-2">
            Serviço: {row.service_name ?? row.service_code ?? "—"}
          </div>
        </Block>
      </div>

      {/* Timeline */}
      <Block label="Linha do tempo">
        <ul className="flex flex-col gap-1 text-xs">
          <TimelineItem label="Criada" at={row.sale_at} />
          <TimelineItem label="Paga" at={row.paid_at} />
          <TimelineItem label="Entrou na fila" at={row.queued_at} />
          <TimelineItem label="Início do atendimento" at={row.started_at} />
          <TimelineItem label="Encerrada" at={row.ended_at} />
        </ul>
      </Block>

      {/* Status final */}
      <Block label="Status atual">
        <div className="flex items-center gap-2">
          <StatusBadge
            label={row.status}
            tone={
              row.status === "completed" ? "green"
              : row.status === "refunded" || row.status === "cancelled" ? "red"
              : row.status === "no_show" ? "yellow"
              : "neutral"
            }
          />
          {row.cancellation_reason && (
            <span className="text-xs text-txt-2">
              motivo: <i>{row.cancellation_reason}</i>
            </span>
          )}
        </div>
      </Block>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-txt-3">
        {label}
      </div>
      {children}
    </div>
  );
}
function TimelineItem({ label, at }: { label: string; at: string | null }) {
  return (
    <li className="flex items-center justify-between">
      <span className={at ? "text-txt" : "text-txt-3"}>
        {at ? "● " : "○ "}
        {label}
      </span>
      <span className="text-txt-2">{fmt(at)}</span>
    </li>
  );
}
