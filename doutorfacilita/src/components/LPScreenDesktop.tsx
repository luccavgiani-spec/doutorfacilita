import Link from "next/link";

/**
 * LP desktop (≥1024px). Layout full-width, hero em 2 colunas.
 * Estilos com prefixo `lp-d-*` em globals.css (Seção 5).
 */
export default function LPScreenDesktop() {
  return (
    <div className="lp-d">
      <div className="bar4">
        <span></span><span></span><span></span><span></span>
      </div>

      <header className="lp-d-nav">
        <div className="lp-d-nav-inner">
          <div className="logo-no">
            <span className="dots"><span></span><span></span><span></span><span></span></span>
            <span className="no-word">nó</span> telemed
          </div>
          <nav className="lp-d-nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#beneficios">Por que nós</a>
            <a href="#precos">Preços</a>
            <Link href="/login" className="lp-d-nav-login">Entrar</Link>
          </nav>
          <Link href="/login" className="lp-d-nav-cta">
            Consultar agora
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </header>

      <section className="lp-d-hero">
        <div className="lp-d-hero-inner">
          <div className="lp-d-hero-text">
            <div className="lp-d-badge">
              <span className="pulse"></span>
              3 médicos online agora
            </div>
            <h1 className="lp-d-h1">
              Consulta médica <span className="accent">sem sair</span> de casa.
            </h1>
            <p className="lp-d-sub">
              Você paga, entra na fila e um médico te atende pelo vídeo em até
              10 minutos. Receita digital, atestado e pedido de exame chegam
              direto no seu celular.
            </p>

            <div className="lp-d-cta-row">
              <Link href="/fila" className="lp-d-cta-primary">
                Começar consulta — R$ 59
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#como-funciona" className="lp-d-cta-secondary">
                Como funciona
              </a>
            </div>

            <div className="lp-d-trust-row">
              <div className="lp-d-trust-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                CRM ativo
              </div>
              <div className="lp-d-trust-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Receita digital válida
              </div>
              <div className="lp-d-trust-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                LGPD · CFM
              </div>
            </div>
          </div>

          <div className="lp-d-hero-mock">
            <div className="lp-d-mock-card">
              <div className="lp-d-mock-header">
                <div className="lp-d-mock-tag">
                  <span className="ld"></span>Atendendo agora
                </div>
                <div className="lp-d-mock-time">~7 min</div>
              </div>

              <div className="lp-d-mock-doctor">
                <div className="lp-d-mock-av">JS</div>
                <div className="lp-d-mock-info">
                  <div className="lp-d-mock-name">Dr. João Silva</div>
                  <div className="lp-d-mock-spec">Clínico Geral · CRM-SP 123456</div>
                </div>
              </div>

              <div className="lp-d-mock-queue">
                <div className="lp-d-mock-queue-label">Fila</div>
                <div className="lp-d-mock-q">
                  <div className="lp-d-mock-q-pos">2</div>
                  <div className="lp-d-mock-q-name">Pedro O.</div>
                  <div className="lp-d-mock-q-time">~4 min</div>
                </div>
                <div className="lp-d-mock-q you">
                  <div className="lp-d-mock-q-pos">3</div>
                  <div className="lp-d-mock-q-name"><b>Você</b> · aguardando</div>
                  <div className="lp-d-mock-q-time">~7 min</div>
                </div>
                <div className="lp-d-mock-q">
                  <div className="lp-d-mock-q-pos">4</div>
                  <div className="lp-d-mock-q-name">Ana M.</div>
                  <div className="lp-d-mock-q-time">~10 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-d-section" id="beneficios">
        <div className="lp-d-section-inner">
          <span className="lp-d-eyebrow">por que nós</span>
          <h2 className="lp-d-h2">Saúde descomplicada</h2>

          <div className="lp-d-benefits-grid">
            <div className="lp-d-benefit">
              <div className="lp-d-benefit-icon b">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>Atendimento em 10 min</h3>
              <p>Sem agendamento, sem espera no consultório. Paga e entra na fila online.</p>
            </div>
            <div className="lp-d-benefit">
              <div className="lp-d-benefit-icon r">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>R$ 59 por consulta</h3>
              <p>Sem mensalidade obrigatória, sem surpresa no fim. Você paga só pela consulta.</p>
            </div>
            <div className="lp-d-benefit">
              <div className="lp-d-benefit-icon y">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h3>Tudo no seu celular</h3>
              <p>Receita digital, atestado e pedido de exame chegam por SMS e email.</p>
            </div>
            <div className="lp-d-benefit">
              <div className="lp-d-benefit-icon g">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Seguro e privado</h3>
              <p>Criptografia ponta-a-ponta, dados sob LGPD e médicos com CRM ativo.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-d-section lp-d-section-alt" id="como-funciona">
        <div className="lp-d-section-inner">
          <span className="lp-d-eyebrow">simples assim</span>
          <h2 className="lp-d-h2">4 passos pra ser atendido</h2>

          <div className="lp-d-steps-grid">
            <div className="lp-d-step">
              <div className="lp-d-step-num lp-d-step-num--1">1</div>
              <h4>Cadastra</h4>
              <p>Nome, CPF, celular. Menos de 1 minuto.</p>
            </div>
            <div className="lp-d-step-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </div>
            <div className="lp-d-step">
              <div className="lp-d-step-num lp-d-step-num--2">2</div>
              <h4>Paga</h4>
              <p>PIX cai na hora. Cartão em segundos.</p>
            </div>
            <div className="lp-d-step-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </div>
            <div className="lp-d-step">
              <div className="lp-d-step-num lp-d-step-num--3">3</div>
              <h4>Entra na fila</h4>
              <p>Vê posição e tempo estimado ao vivo.</p>
            </div>
            <div className="lp-d-step-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </div>
            <div className="lp-d-step">
              <div className="lp-d-step-num lp-d-step-num--4">4</div>
              <h4>Conversa</h4>
              <p>Vídeo pelo navegador. Documentos no celular.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-d-section" id="precos">
        <div className="lp-d-section-inner">
          <span className="lp-d-eyebrow">sem surpresa</span>
          <h2 className="lp-d-h2">Preços claros</h2>

          <div className="lp-d-pricing-grid">
            <div className="lp-d-price-card">
              <h4>Consulta avulsa</h4>
              <div className="lp-d-price-cat">Para uma consulta pontual</div>
              <div className="lp-d-price-value">
                <span className="small">R$</span>
                <span className="big">59</span>
                <span className="small">/consulta</span>
              </div>
              <ul className="lp-d-price-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Vídeo até 20 min</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Receita digital assinada</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atestado e pedido de exame</li>
              </ul>
              <Link href="/fila" className="lp-d-price-cta">Consultar</Link>
            </div>

            <div className="lp-d-price-card featured">
              <span className="lp-d-price-tag">Mais popular</span>
              <h4>Pacote família</h4>
              <div className="lp-d-price-cat">Você e mais 3 dependentes</div>
              <div className="lp-d-price-value">
                <span className="small">R$</span>
                <span className="big">199</span>
                <span className="small">/mês</span>
              </div>
              <ul className="lp-d-price-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Até 4 consultas/mês</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>4 dependentes</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Prioridade na fila</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Suporte por WhatsApp</li>
              </ul>
              <Link href="/fila" className="lp-d-price-cta primary">Assinar família</Link>
            </div>

            <div className="lp-d-price-card">
              <h4>Empresas</h4>
              <div className="lp-d-price-cat">Benefício para o seu time</div>
              <div className="lp-d-price-value">
                <span className="big lp-d-price-soft">Sob consulta</span>
              </div>
              <ul className="lp-d-price-features">
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atendimento corporativo</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Faturamento PJ</li>
                <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Relatório de uso</li>
              </ul>
              <a href="mailto:contato@plantaodigital.com.br" className="lp-d-price-cta">Falar com vendas</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-d-footer">
        <div className="lp-d-footer-inner">
          <div className="lp-d-footer-col">
            <div className="logo-no">
              <span className="dots"><span></span><span></span><span></span><span></span></span>
              <span className="no-word">nó</span> telemed
            </div>
            <p className="lp-d-footer-tagline">
              Saúde sem sair de casa, sem complicar.
            </p>
          </div>
          <div className="lp-d-footer-col">
            <h5>Produto</h5>
            <a href="#como-funciona">Como funciona</a>
            <a href="#precos">Preços</a>
            <a href="#beneficios">Benefícios</a>
          </div>
          <div className="lp-d-footer-col">
            <h5>Empresa</h5>
            <a href="#">Sobre a nó</a>
            <a href="#">Termos de uso</a>
            <a href="#">Política de privacidade</a>
          </div>
          <div className="lp-d-footer-col">
            <h5>Suporte</h5>
            <a href="mailto:suporte@plantaodigital.com.br">suporte@plantaodigital.com.br</a>
            <a href="#">Central de ajuda</a>
          </div>
        </div>
        <div className="lp-d-footer-legal">
          © 2026 Clínica Exemplo · CNPJ 00.000.000/0001-00 · RT Dr. João Silva · CRM-SP 123456
        </div>
      </footer>
    </div>
  );
}
