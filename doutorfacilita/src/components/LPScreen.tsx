import Link from 'next/link';
import MobileMenu from '@/components/lp/MobileMenu';

/**
 * Tela LP — Landing page (rota /)
 * Convertida do protótipo telemed_v2.html mantendo classes legadas.
 * Estilos em src/app/globals.css.
 */
export default function LPScreen() {
  return (
    <>
    <div className="mobile-frame-wrap">
        <div className="mobile-frame">
          <div className="mobile-status">
            <span>9:41</span>
            <div className="mobile-status-icons">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v3H2v-3zm3.5-3h2v6h-2v-6zm3.5-3h2v9H9v-9zm3.5-3h2v12h-2V8zm3.5-3h2v15h-2V5z"/></svg>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H5v12h12V6zm-2 10H7V8h8v8zm6-10h-2v12h2V6z"/></svg>
            </div>
          </div>
          <div className="mobile-content">
            <div className="lp-m">
              <div className="bar4"><span></span><span></span><span></span><span></span></div>
    
              <nav className="lp-m-nav">
                <div className="logo-no">
                  <span className="dots"><span></span><span></span><span></span><span></span></span>
                  <span className="no-word">nó</span> telemed
                </div>
                <MobileMenu />
              </nav>
    
              <section className="lp-m-hero">
                <div className="lp-m-badge">
                  <span className="pulse"></span>
                  3 médicos online agora
                </div>
                <h1 className="lp-m-h1">Consulta <span className="accent">sem sair</span> de casa.</h1>
                <p className="lp-m-sub">
                  Paga, entra na fila, médico te atende pelo vídeo em até 10 min. Receita no seu celular.
                </p>
    
                <div className="lp-m-mock">
                  <div className="lp-m-mock-doctor">
                    <div className="mock-av">JS</div>
                    <div className="mock-info">
                      <div className="mock-name">Dr. João Silva</div>
                      <div className="mock-spec">Clínico Geral · CRM-SP 123456</div>
                    </div>
                    <div className="mock-live"><span className="ld"></span>Atende</div>
                  </div>
                  <div className="mock-q you">
                    <div className="mock-q-pos">3</div>
                    <div className="mock-q-txt"><b>Você está aqui</b> · aguardando</div>
                    <div className="mock-q-time">~7 min</div>
                  </div>
                  <div className="mock-q">
                    <div className="mock-q-pos">4</div>
                    <div className="mock-q-txt">Ana M.</div>
                    <div className="mock-q-time">~10 min</div>
                  </div>
                </div>
    
                <div className="lp-m-trust-row">
                  <div className="lp-m-trust-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    CRM ativo
                  </div>
                  <div className="lp-m-trust-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Receita válida
                  </div>
                  <div className="lp-m-trust-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    LGPD
                  </div>
                </div>
              </section>
    
              <section className="lp-m-benefits">
                <span className="lp-m-section-eyebrow">por que nós</span>
                <h2 className="lp-m-section-title">Saúde descomplicada</h2>
    
                <div className="lp-m-benefit">
                  <div className="lp-m-benefit-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <h3>Atendimento em 10 min</h3>
                    <p>Sem agendamento. Paga e entra na fila.</p>
                  </div>
                </div>
    
                <div className="lp-m-benefit">
                  <div className="lp-m-benefit-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div>
                    <h3>R$ 59 por consulta</h3>
                    <p>Sem mensalidade, sem surpresa no fim.</p>
                  </div>
                </div>
    
                <div className="lp-m-benefit">
                  <div className="lp-m-benefit-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <h3>Tudo no seu celular</h3>
                    <p>Receita, atestado e exames por SMS e email.</p>
                  </div>
                </div>
    
                <div className="lp-m-benefit">
                  <div className="lp-m-benefit-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <h3>Seguro e privado</h3>
                    <p>Criptografia ponta-a-ponta, conformidade total.</p>
                  </div>
                </div>
              </section>
    
              <section className="lp-m-steps-wrap">
                <span className="lp-m-section-eyebrow">simples assim</span>
                <h2 className="lp-m-section-title">4 passos</h2>
    
                <div className="lp-m-step">
                  <div className="lp-m-step-num">1</div>
                  <h4>Clica e cadastra</h4>
                  <p>Nome, CPF, celular. Menos de 1 minuto.</p>
                </div>
                <div className="lp-m-step">
                  <div className="lp-m-step-num">2</div>
                  <h4>Paga com PIX ou cartão</h4>
                  <p>PIX cai na hora. Cartão em segundos.</p>
                </div>
                <div className="lp-m-step">
                  <div className="lp-m-step-num">3</div>
                  <h4>Entra na fila</h4>
                  <p>Vê sua posição e o tempo estimado ao vivo.</p>
                </div>
                <div className="lp-m-step">
                  <div className="lp-m-step-num">4</div>
                  <h4>Conversa com o médico</h4>
                  <p>Vídeo pelo navegador. Documentos chegam no celular.</p>
                </div>
              </section>
    
              <section className="lp-m-pricing">
                <span className="lp-m-section-eyebrow">sem surpresa</span>
                <h2 className="lp-m-section-title">Preços</h2>
    
                <div className="lp-m-price-card">
                  <h4>Consulta avulsa</h4>
                  <div className="pcat">Para uma consulta pontual</div>
                  <div className="lp-m-price-value">
                    <span className="small">R$</span>
                    <span className="big">59</span>
                    <span className="small">/consulta</span>
                  </div>
                  <ul className="lp-m-price-features">
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Consulta por vídeo até 20 min</li>
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Receita digital assinada</li>
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atestado e pedido de exame</li>
                  </ul>
                </div>
    
                <div className="lp-m-price-card featured">
                  <h4>Pacote família</h4>
                  <div className="pcat">Para você e mais 3 dependentes</div>
                  <div className="lp-m-price-value">
                    <span className="small">R$</span>
                    <span className="big">199</span>
                    <span className="small">/mês</span>
                  </div>
                  <ul className="lp-m-price-features">
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Até 4 consultas/mês</li>
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>4 dependentes</li>
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Prioridade na fila</li>
                  </ul>
                </div>
    
                <div className="lp-m-price-card">
                  <h4>Empresas</h4>
                  <div className="pcat">Benefício para o seu time</div>
                  <div className="lp-m-price-value">
                    <span className="big" style={{fontSize:'22px'}}>Sob consulta</span>
                  </div>
                  <ul className="lp-m-price-features">
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atendimento corporativo</li>
                    <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Faturamento PJ</li>
                  </ul>
                </div>
              </section>
    
              <footer className="lp-m-footer">
                <div className="logo-no">
                  <span className="dots"><span></span><span></span><span></span><span></span></span>
                  <span className="no-word">nó</span> telemed
                </div>
                <div>© 2026 Clínica Exemplo · CNPJ 00.000.000/0001-00</div>
                <div style={{marginTop:'6px'}}>RT Dr. João Silva · CRM-SP 123456</div>
              </footer>
            </div>
          </div>
    
          {/* CTA fixo no rodapé */}
          <div className="lp-m-cta-fixed">
            <div className="cta-fixed-price">A partir de <b>R$ 59</b> · sem mensalidade</div>
            <Link href="/fila" className="lp-m-cta-primary">
              Quero me consultar agora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
