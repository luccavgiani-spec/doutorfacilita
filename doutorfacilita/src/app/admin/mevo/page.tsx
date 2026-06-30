import { createClient } from "@/lib/supabase/server";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import MevoConfigCard from "@/components/admin/MevoConfigCard";
import MevoFailuresAlert, { type FailureRow } from "@/components/admin/MevoFailuresAlert";
import type { MevoConfig } from "@/app/admin/mevo/actions";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

const DEFAULT_CFG: MevoConfig = {
  enabled: false,
  ambiente: "homologacao",
  subparceiro: "",
  logo_url: "",
  cor_primaria: "#0066CC",
  cor_secundaria: "#00A3FF",
  certificado_obrigatorio: true,
  permitir_impressao: false,
  exibir_email: false,
};

export default async function MevoPage() {
  const supabase = await createClient();

  // As 3 leituras são independentes → uma única ida à rede (Promise.all) em vez
  // de 3 round-trips sequenciais para o Supabase (sa-east-1).
  const [{ data: row }, { data: presc }, { data: falhasRaw }] = await Promise.all([
    supabase
      .from("integration_configs")
      .select("enabled, ambiente, config")
      .eq("id", "mevo")
      .maybeSingle(),
    supabase
      .from("prescricoes_mevo")
      .select("id, status, ambiente, created_at, mevo_token, qrcode_url")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("v_failed_pdf_downloads")
      .select(
        "documento_id, prescricao_id, tipo_documento, categoria, download_attempted_at, download_error, seconds_since_attempt, recovery_status",
      )
      .limit(50),
  ]);

  const c = (row?.config ?? {}) as Partial<MevoConfig>;
  const inicial: MevoConfig = {
    ...DEFAULT_CFG,
    ...c,
    enabled: row?.enabled ?? false,
    ambiente:
      (row?.ambiente as MevoConfig["ambiente"]) ?? DEFAULT_CFG.ambiente,
  };

  const lista = presc ?? [];
  const finalizadas = lista.filter((p) => p.status === "finalizada").length;
  const comErro = lista.filter(
    (p) => p.status === "finalizada_com_erro",
  ).length;
  const taxa =
    finalizadas + comErro > 0
      ? Math.round((finalizadas / (finalizadas + comErro)) * 100)
      : null;

  const falhas = (falhasRaw ?? []) as FailureRow[];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-bold">Mevo Receita Digital</h1>
        <p className="text-xs text-txt-2">
          Configuração da integração e monitoramento de prescrições
        </p>
      </header>

      <MevoConfigCard inicial={inicial} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Prescrições (últimas 50)" value={String(lista.length)} />
        <Kpi
          label="Taxa de sucesso"
          value={taxa === null ? "—" : `${taxa}%`}
          hint={`${finalizadas} ok · ${comErro} c/ erro`}
        />
        <Kpi
          label="Falhas de download PDF"
          value={String(falhas.length)}
          tone={falhas.length > 0 ? "red" : "green"}
        />
      </div>

      <MevoFailuresAlert failures={falhas} />

      <section>
        <h2 className="mb-3 text-sm font-bold">Últimas 50 prescrições</h2>
        <DataTable
          rows={lista as Record<string, unknown>[]}
          rowKey={(r) => r.id as string}
          columns={[
            { key: "created_at", header: "Data", className: "whitespace-nowrap", render: (r) => fmt(r.created_at as string) },
            {
              key: "mevo_token",
              header: "Token",
              render: (r) => (
                <span className="block max-w-[200px] truncate font-mono text-xs" title={(r.mevo_token as string) ?? ""}>
                  {(r.mevo_token as string) ?? "—"}
                </span>
              ),
            },
            { key: "ambiente", header: "Ambiente" },
            {
              key: "status",
              header: "Status",
              render: (r) => {
                const s = r.status as string;
                return (
                  <StatusBadge
                    label={s}
                    tone={
                      s === "finalizada"
                        ? "green"
                        : s === "finalizada_com_erro"
                          ? "red"
                          : s === "iniciada"
                            ? "yellow"
                            : "neutral"
                    }
                  />
                );
              },
            },
            {
              key: "qr",
              header: "QR",
              render: (r) =>
                r.qrcode_url ? (
                  <a
                    href={r.qrcode_url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue hover:underline"
                  >
                    abrir
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-txt-2">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          tone === "red" ? "text-red" : tone === "green" ? "text-green" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-txt-3">{hint}</p>}
    </div>
  );
}
