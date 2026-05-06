/**
 * Tela Consulta — Sala de consulta do paciente (rota /consulta)
 * Convertida do protótipo telemed_v2.html mantendo classes legadas.
 * Estilos em src/app/globals.css.
 */
export default function ConsultaScreen() {
  return (
    <>
    <div className="mobile-frame-wrap">
        <div className="mobile-frame">
          <div className="mobile-status" style={{color:'white'}}>
            <span>9:54</span>
            <div className="mobile-status-icons">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v3H2v-3zm3.5-3h2v6h-2v-6zm3.5-3h2v9H9v-9zm3.5-3h2v12h-2V8zm3.5-3h2v15h-2V5z"/></svg>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            </div>
          </div>
          <div className="mobile-content" style={{background:'#0a0c0e'}}>
            <div className="consulta-m">
              <div className="cm-video-area">
                <div className="cm-top-bar">
                  <div className="cm-live-pill">
                    <span className="ld"></span>
                    AO VIVO
                  </div>
                  <div className="cm-timer">06:42</div>
                </div>
    
                <div className="cm-self-video">
                  <div>📹</div>
                  <div className="cm-self-label">Você</div>
                </div>
    
                <div className="cm-doctor-big">CM</div>
    
                <div className="cm-doctor-info">
                  <div className="cm-doctor-name">Dr. Carlos Mendes</div>
                  <div className="cm-doctor-spec">Clínico Geral</div>
                  <div className="cm-doctor-crm">CRM-SP 345678</div>
                </div>
              </div>
    
              <div className="cm-sheet">
                <div className="cm-sheet-handle"></div>
    
                <div className="cm-received-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div className="cm-received-banner-text">
                    <b>Receita recebida</b>
                    <span>chegou no seu SMS há 1 min</span>
                  </div>
                  <button className="cm-received-banner-btn">Ver</button>
                </div>
    
                <div className="cm-chat-preview">
                  <div className="cm-chat-preview-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="cm-chat-preview-info">
                    <div className="cm-chat-preview-title">Mensagens</div>
                    <div className="cm-chat-preview-last">Dr. Carlos: Abra a boca pra eu ver...</div>
                  </div>
                  <div className="cm-chat-preview-badge">1</div>
                </div>
              </div>
    
              <div className="cm-controls">
                <button className="cm-ctrl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                </button>
                <button className="cm-ctrl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </button>
                <button className="cm-ctrl end">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" transform="rotate(135 12 12)"/></svg>
                </button>
                <button className="cm-ctrl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
