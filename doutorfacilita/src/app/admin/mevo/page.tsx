import { createClient } from "@/lib/supabase/server";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import MevoConfigCard from "@/components/admin/MevoConfigCard";
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

  const { data: row } = await supabase
    .from("integration_configs")
    .select("enabled, ambiente, config")
    .eq("id", "mevo")
    .maybeSingle();

  const c = (row?.config ?? {}) as Partial<MevoConfig>;
  const inicial: MevoConfig = {
    ...DEFAULT_CFG,
    ...c,
    enabled: row?.enabled ?? false,
    ambiente:
      (row?.ambiente as MevoConfig["ambiente"]) ?? DEFAULT_CFG.ambiente,
  };

  // Dashboard: últimas 50 + agregados (todas — RLS admin enxerga tudo).
  const { data: presc } = await supabase
    .from("prescricoes_mevo")
    .select("id, status, ambiente, created_at, mevo_token, qrcode_url")
    .order("created_at", { ascending: false })
    .limit(50);

  const lista = presc ?? [];
  const finalizadas = lista.filter((p) => p.status === "finalizada").length;
  const comErro = lista.filter(
    (p) => p.status === "finalizada_com_erro",
  ).length;
  const taxa =
    finalizadas + comErro > 0
      ? Math.round((finalizadas / (finalizadas + comErro)) * 100)
      : null;

  const { data: falhas } = await supabase
    .from("v_failed_pdf_downloads")
    .select("*")
    .limit(50);

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
          value={String(falhas?.length ?? 0)}
          tone={(falhas?.length ?? 0) > 0 ? "red" : "green"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold">Últimas 50 prescrições</h2>
        <DataTable
          rows={lista as Record<string, unknown>[]}
          rowKey={(r) => r.id as string}
          columns={[
            { key: "created_at", header: "Data", render: (r) => fmt(r.created_at as string) },
            { key: "mevo_token", header: "Token", render: (r) => (r.mevo_token as string) ?? "—" },
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

      <section>
        <h2 className="mb-3 text-sm font-bold">
          Falhas de download de PDF (v_failed_pdf_downloads)
        </h2>
        <DataTable
          rows={(falhas ?? []) as Record<string, unknown>[]}
          rowKey={(r, i) => String((r.id as string) ?? i)}
          empty="Nenhuma falha de download registrada. 🎉"
          columns={Object.keys((falhas?.[0] as object) ?? { info: 0 }).map(
            (k) => ({
              key: k,
              header: k,
              render: (r: Record<string, unknown>) => String(r[k] ?? "—"),
            }),
          )}
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
