import { JoinConsultButton } from "@/components/fila/JoinConsultButton";
import LogoutButton from "@/components/auth/LogoutButton";

/**
 * Tela Fila — Fila de espera do paciente (rota /fila)
 * Convertida do protótipo telemed_v2.html mantendo classes legadas.
 * Estilos em src/app/globals.css.
 */
export default function FilaScreen({
  consultationId,
  onEnterCall,
}: {
  consultationId?: string;
  onEnterCall?: () => void;
}) {
  return (
    <>
    <LogoutButton />
    <div className="mobile-frame-wrap">
        <div className="mobile-frame">
          <div className="mobile-status">
            <span>9:47</span>
            <div className="mobile-status-icons">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v3H2v-3zm3.5-3h2v6h-2v-6zm3.5-3h2v9H9v-9zm3.5-3h2v12h-2V8zm3.5-3h2v15h-2V5z"/></svg>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            </div>
          </div>
          <div className="mobile-content">
            <div className="fila-m">
              <div className="bar4"><span></span><span></span><span></span><span></span></div>
    
              <div className="fila-m-top">
                <div className="logo-no">
                  <span className="dots"><span></span><span></span><span></span><span></span></span>
                  <span className="no-word">nó</span>
                </div>
                <div className="fila-m-user">
                  <div className="fila-m-user-av">MA</div>
                  <div className="fila-m-user-info">
                    <b>Maria Almeida</b>
                    <span style={{color:'var(--txt2)'}}>#8421</span>
                  </div>
                </div>
              </div>
    
              <div className="fila-m-status-label">você está na fila</div>
              <div className="fila-m-accent">aguardando...</div>
              <p className="fila-m-sub">Em breve um médico vai te atender pelo vídeo.</p>
    
              <div className="fila-m-ring-wrap">
                <div className="fila-m-ring">
                  <div className="fila-m-ring-inner">
                    <div className="fila-m-ring-num">3º</div>
                    <div className="fila-m-ring-label">sua posição</div>
                  </div>
                </div>
              </div>
    
              <div className="fila-m-info-row">
                <div className="fila-m-info-card">
                  <div className="fim-ic-label">Estimado</div>
                  <div className="fim-ic-value">~7 min</div>
                </div>
                <div className="fila-m-info-card">
                  <div className="fim-ic-label">Médicos</div>
                  <div className="fim-ic-value">3 online</div>
                </div>
              </div>
    
              <div className="fila-m-progress">
                <div className="fila-m-progress-fill"></div>
              </div>
    
              <div className="fila-m-section">
                <div className="fila-m-section-title">
                  Checagem técnica · tudo ok
                  <svg className="collapse-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div className="tech-m-item">
                  <div className="tech-m-ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                  <div className="tech-m-info">
                    <div className="tech-m-t">Câmera</div>
                    <div className="tech-m-s">HD · funcionando</div>
                  </div>
                </div>
                <div className="tech-m-item">
                  <div className="tech-m-ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                  </div>
                  <div className="tech-m-info">
                    <div className="tech-m-t">Microfone</div>
                    <div className="tech-m-s">Captando bem</div>
                  </div>
                </div>
                <div className="tech-m-item">
                  <div className="tech-m-ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/></svg>
                  </div>
                  <div className="tech-m-info">
                    <div className="tech-m-t">Internet</div>
                    <div className="tech-m-s">Estável · 42 Mbps</div>
                  </div>
                </div>
              </div>
    
              <div className="fila-m-section">
                <div className="fila-m-section-title">Médicos atendendo</div>
                <div className="fila-m-docs-slider">
                  <div className="fila-m-doc-card">
                    <div className="fmd-av b">JS<span className="sd busy"></span></div>
                    <div className="fmd-info">
                      <div className="fmd-name">Dr. João Silva</div>
                      <div className="fmd-st y">Em consulta</div>
                    </div>
                  </div>
                  <div className="fila-m-doc-card">
                    <div className="fmd-av g">AR<span className="sd busy"></span></div>
                    <div className="fmd-info">
                      <div className="fmd-name">Dra. Ana Rocha</div>
                      <div className="fmd-st y">Em consulta</div>
                    </div>
                  </div>
                  <div className="fila-m-doc-card">
                    <div className="fmd-av r">CM<span className="sd"></span></div>
                    <div className="fmd-info">
                      <div className="fmd-name">Dr. Carlos M.</div>
                      <div className="fmd-st g">Livre · próximo</div>
                    </div>
                  </div>
                </div>
              </div>
    
              <div className="fila-m-tip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div className="fila-m-tip-text">
                  <b>Dica:</b> deixe à mão um documento com foto e a lista dos remédios que você toma.
                </div>
              </div>
    
              <div className="fila-m-bottom-bar">
                <button className="fila-m-cancel">Cancelar</button>
                <JoinConsultButton
                  consultationId={consultationId}
                  variant="mobile"
                  onEnterCall={onEnterCall}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
