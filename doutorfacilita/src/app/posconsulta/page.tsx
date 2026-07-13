import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { createClient } from "@/lib/supabase/server";

function formatPhone(p?: string | null): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return p;
}

export default async function PosConsultaPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, celular, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  // Última consulta paga do paciente (independente do status — pode estar
  // in_progress no servidor ainda; é só pra mostrar o resumo da que acabou).
  type ConsultaResumo = {
    service_name: string | null;
    ended_at: string | null;
    doctor: { full_name: string | null } | null;
  };
  let consulta: ConsultaResumo | null = null;
  if (patient) {
    const { data: pacienteRow } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pacienteRow) {
      const { data } = await supabase
        .from("consultations")
        .select("service_name, ended_at, doctor:doctors(full_name)")
        .eq("patient_id", pacienteRow.id)
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      consulta = data as unknown as ConsultaResumo | null;
    }
  }

  const phoneMasked = formatPhone(patient?.celular ?? patient?.phone ?? null);
  const firstName = (patient?.full_name ?? "").split(/\s+/)[0] || "";

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={30} />
          </Link>
          <Link href="/fila" className="auth-top-link">
            Voltar à <b>área do paciente</b>
          </Link>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>

      <main className="auth-main">
        <div className="pos-grid">
          <section className="auth-card auth-card--wide pos-main">
            <span className="auth-eyebrow">consulta encerrada</span>
            <h1 className="auth-h1">obrigado{firstName ? `, ${firstName}` : ""}!</h1>
            <p className="auth-sub">
              Sua consulta com {consulta?.doctor?.full_name ?? "o médico"}{" "}
              foi finalizada. Em até <b>10 minutos</b> você vai receber{" "}
              {phoneMasked ? <>no WhatsApp <b>{phoneMasked}</b></> : <b>no seu WhatsApp cadastrado</b>}{" "}
              todos os documentos emitidos: receitas, atestado e exames (se houver).
            </p>

            <div className="pos-whats">
              <div className="pos-whats-icon" aria-hidden>
                {/* whatsapp glyph simplificado */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.52 3.48A11.94 11.94 0 0 0 12.03 0C5.38 0 .02 5.36.02 12c0 2.12.55 4.18 1.6 6L0 24l6.16-1.6A11.96 11.96 0 0 0 12.03 24C18.68 24 24.04 18.64 24.04 12c0-3.2-1.25-6.21-3.52-8.52ZM12.03 21.8a9.78 9.78 0 0 1-4.99-1.37l-.36-.21-3.66.95.97-3.56-.23-.37a9.81 9.81 0 1 1 18.27-5.24c0 5.4-4.4 9.8-10 9.8Zm5.36-7.34c-.29-.15-1.74-.86-2.01-.95-.27-.1-.46-.15-.66.14-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.14-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.49.1-.2.05-.37-.02-.51-.07-.14-.66-1.6-.91-2.19-.24-.57-.49-.5-.66-.51l-.56-.01c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.43s1.04 2.83 1.19 3.02c.14.2 2.05 3.13 4.97 4.39.69.3 1.23.48 1.66.62.7.22 1.34.19 1.84.11.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.27.17-1.4-.07-.13-.27-.2-.55-.34Z" />
                </svg>
              </div>
              <div>
                <div className="pos-whats-title">Tudo no seu WhatsApp</div>
                <div className="pos-whats-sub">
                  Não precisa abrir nenhum app. Você recebe um link seguro e os
                  documentos chegam direto na conversa.
                </div>
              </div>
            </div>

            <div className="pos-summary">
              <div className="pos-summary-title">O que você acabou de viver</div>
              <ol className="pos-steps">
                <li>
                  <span className="pos-step-num">1</span>
                  <div>
                    <b>Cadastro e pagamento</b>
                    <span>Em menos de 2 minutos você cadastrou seus dados e pagou a consulta.</span>
                  </div>
                </li>
                <li>
                  <span className="pos-step-num">2</span>
                  <div>
                    <b>Fila com tempo real</b>
                    <span>Acompanhou sua posição até o médico te chamar.</span>
                  </div>
                </li>
                <li>
                  <span className="pos-step-num">3</span>
                  <div>
                    <b>Consulta por vídeo</b>
                    <span>Conversou com {consulta?.doctor?.full_name ?? "o médico"} sem sair de casa.</span>
                  </div>
                </li>
                <li>
                  <span className="pos-step-num">4</span>
                  <div>
                    <b>Documentos no celular</b>
                    <span>Receita digital, atestado e pedido de exame (se houver) já estão a caminho.</span>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <aside className="pos-side">
            <div className="pos-card pos-card--featured">
              <span className="pos-card-tag">mais escolhido</span>
              <h3>Pacote família</h3>
              <p>Adicione até 4 dependentes e tenha <b>prioridade na fila</b> a partir de R$ 199/mês.</p>
              <Link href="/fila" className="pos-cta pos-cta--primary">
                Assinar família
              </Link>
            </div>

            <div className="pos-card">
              <h3>Exames complementares</h3>
              <p>
                Pedido de hemograma, ECG ou ultrassom em parceiros próximos
                com desconto até 40%.
              </p>
              <Link href="/fila" className="pos-cta">Ver opções</Link>
            </div>

            <div className="pos-card">
              <h3>Reconsulta em 7 dias</h3>
              <p>
                Por <b>R$ 29</b> volte a conversar com o mesmo médico sobre a
                evolução do tratamento.
              </p>
              <Link href="/fila" className="pos-cta">Agendar</Link>
            </div>

            <div className="pos-card pos-card--soft">
              <h3>Indique e ganhe</h3>
              <p>
                Cada amigo que se consultar te dá <b>R$ 10</b> de crédito.
              </p>
              <Link href="/fila" className="pos-cta pos-cta--ghost">
                Pegar meu link
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
