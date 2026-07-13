import { createClient } from "@/lib/supabase/server";
import IntegrationToggleCard from "@/components/admin/IntegrationToggleCard";
import ProntiaDashboard from "@/components/admin/ProntiaDashboard";
import { sinceIso } from "@/lib/admin/timeseries";

const PERIODS = [7, 15, 30, 60, 90] as const;

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: perRaw } = await searchParams;
  const periodo = PERIODS.includes(Number(perRaw) as never) ? Number(perRaw) : 30;
  const since = sinceIso(periodo);

  const supabase = await createClient();

  const [{ data: configs }, { data: encaminhamentosRaw }] = await Promise.all([
    supabase
      .from("integration_configs")
      .select("id, enabled, ambiente, config, updated_at"),
    supabase
      .from("prontia_encaminhamentos")
      .select(
        "id, created_at, patient_name, patient_email, patient_phone, destino_url, valor_cobrado_cents, valor_pago_prontia_cents, status",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const map = new Map((configs ?? []).map((r) => [r.id as string, r]));
  const mevo = map.get("mevo");
  const prontia = map.get("prontia_redirect");
  const livekitEnabled = true;

  const prontiaConfig = (prontia?.config ?? {}) as {
    destino_url?: string;
    valor_cobrado_cents?: number;
    valor_pago_prontia_cents?: number;
  };
  const encaminhamentos = (encaminhamentosRaw ?? []) as Parameters<typeof ProntiaDashboard>[0]["encaminhamentos"];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Integrações</h1>
          <p className="text-sm text-txt-2">
            Ligue e desligue os serviços externos da Plantão Digital. Use os
            botões grandes à direita pra ativar cada um.
          </p>
        </div>
        <form>
          <select
            name="periodo"
            defaultValue={String(periodo)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>Últimos {p} dias</option>
            ))}
          </select>
        </form>
      </header>

      <div className="flex flex-col gap-4">
        <IntegrationToggleCard
          id="mevo"
          title="Mevo"
          description="Emissão de receita digital, atestado e exames direto no cockpit."
          logoSrc="/assets/mevo-logo.png"
          initialEnabled={!!mevo?.enabled}
          whatHappens="Quando ativo, o botão Emitir prescrição aparece no atendimento e os documentos chegam no WhatsApp do paciente."
          configHref="/admin/mevo"
          configLabel="Configurar Mevo"
          badge={mevo?.enabled ? "ok" : null}
          badgeText={mevo?.enabled ? "operacional" : undefined}
        />

        <IntegrationToggleCard
          id="prontia_redirect"
          title="Prontia"
          description="Override que redireciona seu fluxo pra uma outra plataforma."
          logoSrc="/assets/prontia-logo.png"
          initialEnabled={!!prontia?.enabled}
          whatHappens="Ative só quando quiser desviar o tráfego pra outra ferramenta (ex.: migração, manutenção). A URL de destino se configura abaixo."
          badge={prontia?.enabled ? "warn" : null}
          badgeText={prontia?.enabled ? "redirecionando" : undefined}
        />

        <IntegrationToggleCard
          id="livekit"
          title="LiveKit"
          description="Vídeo em tempo real entre médico e paciente."
          initialEnabled={livekitEnabled}
          whatHappens="Provedor das videochamadas. As chaves são gerenciadas com a equipe técnica — este card é só pra você acompanhar o status."
          readOnly
        />
      </div>

      <section>
        <header className="mb-4">
          <h2 className="text-base font-bold">Dashboard · Override Prontia</h2>
          <p className="text-xs text-txt-2">
            Análise dos encaminhamentos pra Prontia + calibração de valores
            (cobrado/repasse). Período: últimos {periodo} dias.
          </p>
        </header>
        <ProntiaDashboard
          valorCobradoCents={prontiaConfig.valor_cobrado_cents ?? 3990}
          valorPagoProntiaCents={prontiaConfig.valor_pago_prontia_cents ?? 4000}
          encaminhamentos={encaminhamentos}
        />
      </section>
    </div>
  );
}
