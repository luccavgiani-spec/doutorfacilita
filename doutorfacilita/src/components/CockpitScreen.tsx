import { CallNextButton } from "@/components/cockpit/CallNextButton";
import LogoutButton from "@/components/auth/LogoutButton";

/**
 * Tela Cockpit — Cockpit do médico — desktop (rota /cockpit)
 * Convertida do protótipo telemed_v2.html mantendo classes legadas.
 * Estilos em src/app/globals.css.
 */
export default function CockpitScreen({ consultationId }: { consultationId?: string }) {
  return (
    <>
    <LogoutButton />
    <div className="cockpit-desktop">
    
        <div className="doc-top">
          <div className="doc-top-left">
            <div className="logo-no">
              <span className="dots"><span></span><span></span><span></span><span></span></span>
              <span className="no-word">nó</span> telemed <span style={{color:'var(--txt2)', fontWeight:'400', fontSize:'12px', marginLeft:'6px'}}>painel médico</span>
            </div>
            <div className="doc-status-pill"><span className="sd"></span>Disponível</div>
            <div className="doc-top-stats">
              <div className="doc-stat">Hoje: <b>12</b> consultas</div>
              <div className="doc-stat">Tempo médio: <b>18min</b></div>
              <div className="doc-stat">NPS: <b>9,2</b></div>
            </div>
          </div>
          <div className="doc-top-right">
            <div className="doc-toggle">
              Aceitar próximos
              <div className="doc-toggle-switch"></div>
            </div>
            <div className="doc-user">
              <div className="doc-user-av">CM</div>
              <div className="doc-user-info">
                <b>Dr. Carlos Mendes</b>
                <span style={{color:'var(--txt2)'}}>CRM-SP 345678</span>
              </div>
            </div>
          </div>
        </div>
    
        <div className="doc-queue">
          <div className="doc-queue-header">
            <div className="doc-queue-title">Fila de atendimento</div>
            <div className="doc-queue-count">5</div>
          </div>
          <div className="doc-queue-filter">
            <div className="doc-filter-tab active">Aguardando</div>
            <div className="doc-filter-tab">Em espera</div>
          </div>
          <div className="queue-card current">
            <div className="queue-card-top">
              <div className="qc-pos">●</div>
              <div className="qc-name">Maria Almeida</div>
              <div className="qc-time">em andamento</div>
            </div>
            <div className="queue-card-meta">32 anos · <b>dor de garganta, febre</b><br/>Entrou há 7 min</div>
          </div>
          <div className="queue-card">
            <div className="queue-card-top">
              <div className="qc-pos">1</div>
              <div className="qc-name">José Ferreira</div>
              <div className="qc-time">~1 min</div>
            </div>
            <div className="queue-card-meta">58 anos · <b>pressão alta</b><br/>Aguardando há 9 min</div>
            <CallNextButton consultationId={consultationId} className="queue-card-btn" />
          </div>
          <div className="queue-card">
            <div className="queue-card-top">
              <div className="qc-pos">2</div>
              <div className="qc-name">Patrícia Lima</div>
              <div className="qc-time">~3 min</div>
            </div>
            <div className="queue-card-meta">28 anos · <b>dor de cabeça</b><br/>Aguardando há 6 min</div>
          </div>
          <div className="queue-card">
            <div className="queue-card-top">
              <div className="qc-pos">3</div>
              <div className="qc-name">Roberto Souza</div>
              <div className="qc-time">~5 min</div>
            </div>
            <div className="queue-card-meta">45 anos · <b>resfriado</b><br/>Aguardando há 4 min</div>
          </div>
          <div className="queue-card">
            <div className="queue-card-top">
              <div className="qc-pos">4</div>
              <div className="qc-name">Ana Beatriz</div>
              <div className="qc-time">~7 min</div>
            </div>
            <div className="queue-card-meta">35 anos · <b>renovação de receita</b><br/>Aguardando há 2 min</div>
          </div>
        </div>
    
        <div className="doc-main">
          <div className="doc-video-strip">
            <div className="doc-vid-patient">
              <div className="doc-vid-timer">
                <div className="doc-vid-timer-pill"><span className="ld"></span>AO VIVO</div>
                <div className="doc-vid-timer-num">06:42</div>
              </div>
              <div className="doc-vid-patient-av">MA</div>
              <div className="doc-vid-patient-name">Maria Almeida</div>
              <div className="doc-vid-patient-info">32 anos · primeira consulta</div>
              <div className="doc-vid-controls">
                <button className="doc-vid-ctrl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>
                <button className="doc-vid-ctrl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></button>
                <button className="doc-vid-ctrl end"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            </div>
            <div className="doc-vid-self">
              📹
              <div className="doc-vid-self-label">Você · Dr. Carlos</div>
            </div>
          </div>
    
          <div className="doc-chart">
            <div className="doc-chart-tabs">
              <div className="doc-tab active">Prontuário</div>
              <div className="doc-tab">Histórico <span className="doc-tab-badge">3</span></div>
              <div className="doc-tab">Anamnese rápida</div>
            </div>
            <div className="doc-chart-body">
              <div className="chart-patient-header">
                <div className="chart-patient-av">MA</div>
                <div className="chart-patient-info">
                  <div className="chart-patient-name">Maria Almeida</div>
                  <div className="chart-patient-meta">CPF 123.456.789-00 · 32 anos · ♀ · (11) 9****-9898</div>
                </div>
                <div className="chart-quick-actions">
                  <button className="chart-qa">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Sem alergias
                  </button>
                </div>
              </div>
    
              <div className="chart-section">
                <div className="chart-section-label">Queixa principal</div>
                <textarea className="chart-textarea" defaultValue="Dor de garganta forte há 3 dias, febre baixa (37,8°C), dificuldade para engolir. Nega tosse e coriza." />
              </div>
    
              <div className="chart-section">
                <div className="chart-section-label">Evolução / exame físico</div>
                <textarea className="chart-textarea tall" defaultValue="Ao exame (vídeo): orofaringe hiperemiada, amígdalas aumentadas com pontos esbranquiçados sugestivos de amigdalite bacteriana. Paciente em bom estado geral, consciente e orientada. Nega comorbidades prévias ou medicação contínua." />
              </div>
    
              <div className="chart-section">
                <div className="chart-section-label">Hipótese diagnóstica (CID-10)</div>
                <div className="chart-cid-row">
                  <div className="chart-cid-chip">J03.9 — Amigdalite aguda
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                  <div className="chart-cid-input">+ adicionar CID</div>
                </div>
                <div className="chart-ai-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <div><b>sugestão nó IA:</b> considere também <i>faringite aguda (J02.9)</i> como hipótese alternativa.</div>
                </div>
              </div>
    
              <div className="chart-section">
                <div className="chart-section-label">Conduta</div>
                <textarea className="chart-textarea" defaultValue="" />
              </div>
            </div>
          </div>
        </div>
    
        {/* ═══════════════════════════════════════════════════ */}
        {/* ACTIONS PANEL — EXPANDIDO COM CAPACIDADES MEVO        */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="doc-actions">
    
          {/* Header */}
          <div className="actions-header">
            <div className="actions-header-left">
              <div>
                <div className="actions-title-main">Documentos médicos</div>
                <div className="actions-powered">
                  integração oficial ·
                  <span className="actions-powered-logo">mevo</span>
                </div>
              </div>
            </div>
          </div>
    
          {/* Banner de sessão Mevo ativa */}
          <div className="mevo-session-banner">
            <div className="mevo-session-dot"></div>
            <div className="mevo-session-text">
              <b>Sessão pronta</b>
              Paciente vinculada · CRM validado · certificado Soluti BirdID ativo
            </div>
          </div>
    
          {/* CTA principal: abrir Mevo */}
          <div className="mevo-cta-wrap">
            <button className="mevo-start-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Iniciar prescrição
            </button>
            <div className="mevo-start-hint">
              Abre a interface <b>Mevo Prescritores</b> embedada · emita múltiplos documentos na mesma sessão
            </div>
          </div>
    
          {/* Tipos de documento disponíveis */}
          <div className="actions-section">
            <div className="actions-section-head">
              <div className="actions-section-title">Atalhos diretos</div>
              <div className="actions-section-count">6 tipos</div>
            </div>
    
            <div className="doc-types-grid">
              <div className="doc-type-card">
                <div className="doc-type-hotkey">R</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">Receita médica</div>
                  <div className="doc-type-sub">Comum · controlada C1/C5</div>
                </div>
              </div>
    
              <div className="doc-type-card">
                <div className="doc-type-hotkey">A</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">Atestado</div>
                  <div className="doc-type-sub">Com CID e período</div>
                </div>
              </div>
    
              <div className="doc-type-card">
                <div className="doc-type-hotkey">E</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">Solicitação exame</div>
                  <div className="doc-type-sub">Código TUSS · lab + imagem</div>
                </div>
              </div>
    
              <div className="doc-type-card">
                <div className="doc-type-hotkey">N</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">Encaminhamento</div>
                  <div className="doc-type-sub">Especialista · 50+ áreas</div>
                </div>
              </div>
    
              <div className="doc-type-card">
                <div className="doc-type-hotkey">L</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">Laudo / relatório</div>
                  <div className="doc-type-sub">Com título e texto livre</div>
                </div>
              </div>
    
              <div className="doc-type-card">
                <div className="doc-type-hotkey">M</div>
                <div className="doc-type-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </div>
                <div className="doc-type-info">
                  <div className="doc-type-name">LME</div>
                  <div className="doc-type-sub">Medicamento excepcional</div>
                </div>
              </div>
            </div>
          </div>
    
          {/* Documentos já emitidos nesta consulta */}
          <div className="actions-section">
            <div className="actions-section-head">
              <div className="actions-section-title">Emitidos nesta consulta</div>
              <div className="actions-section-count">1 documento</div>
            </div>
    
            <div className="doc-emitted">
              <div className="doc-emitted-ic receita">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="doc-emitted-info">
                <div className="doc-emitted-title">Receita · Amoxicilina 500mg</div>
                <div className="doc-emitted-meta">
                  NX742981 · há 2 min
                  <span className="signed">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    assinada
                  </span>
                </div>
              </div>
              <div className="doc-emitted-actions">
                <button className="doc-emitted-btn" title="Ver PDF">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button className="doc-emitted-btn" title="Reenviar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                </button>
              </div>
            </div>
    
            <div style={{marginTop:'6px', fontSize:'10px', color:'var(--txt3)', lineHeight:'1.5', padding:'0 2px'}}>
              PDFs armazenados no seu storage · retenção 20 anos · conformidade CFM/NGS2
            </div>
          </div>
    
          {/* Recursos Mevo embutidos (sidebar do iframe) */}
          <div className="actions-section">
            <div className="actions-section-head">
              <div className="actions-section-title">Recursos clínicos Mevo</div>
            </div>
    
            <div className="mevo-features-grid">
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="mevo-feature-name">Histórico<span className="mevo-feature-badge">3</span></div>
                <div className="mevo-feature-sub">consultas anteriores</div>
              </div>
    
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="mevo-feature-name">Alergias</div>
                <div className="mevo-feature-sub">estruturadas</div>
              </div>
    
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <div className="mevo-feature-name">Interações</div>
                <div className="mevo-feature-sub">IBM Micromedex</div>
              </div>
    
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>
                </div>
                <div className="mevo-feature-name">Modelos</div>
                <div className="mevo-feature-sub">receitas salvas</div>
              </div>
    
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9M14 17H5M17 4l3 3-3 3M7 14l-3 3 3 3"/></svg>
                </div>
                <div className="mevo-feature-name">Farmácias</div>
                <div className="mevo-feature-sub">rede nacional</div>
              </div>
    
              <div className="mevo-feature-card">
                <div className="mevo-feature-ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="mevo-feature-name">Benefícios</div>
                <div className="mevo-feature-sub">Rename · desconto</div>
              </div>
            </div>
          </div>
    
          {/* MevoSync: diferencial IA */}
          <div style={{padding:'0 16px'}}>
            <div className="mevosync-card">
              <div className="mevosync-header">
                <span className="mevosync-logo">
                  mevo<span className="mevosync-logo-tag">SYNC</span>
                </span>
                <span className="mevosync-ai-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  IA
                </span>
              </div>
              <div className="mevosync-title">Transcrição → prescrição automática</div>
              <div className="mevosync-desc">
                A IA transformou o que você disse na consulta em uma prescrição pronta. Revise e emita em 1 clique.
              </div>
    
              <div className="mevosync-preview">
                <div className="mevosync-preview-label">O que você disse</div>
                <div className="mevosync-preview-text">
                  "...vou passar amoxicilina 500mg, 1 comprimido de 8 em 8 horas por 7 dias, e dipirona se sentir dor..."
                </div>
    
                <div className="mevosync-preview-out">
                  <div className="mevosync-preview-out-label">Gerou automaticamente</div>
                  <div className="mevosync-preview-item">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span><b>Amoxicilina 500mg</b> · 1 cp 8/8h · 7 dias</span>
                  </div>
                  <div className="mevosync-preview-item">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span><b>Dipirona 500mg</b> · se dor · até 4x/dia</span>
                  </div>
                </div>
              </div>
    
              <button className="mevosync-use-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Usar sugestão e abrir prescrição
              </button>
            </div>
          </div>
    
          {/* Finalização */}
          <div className="actions-footer">
            <button className="finish-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Encerrar e chamar próximo
            </button>
            <div className="finish-btn-note">
              Documentos chegam no SMS e email da paciente em segundos
            </div>
          </div>
    
        </div>
      </div>
    </>
  );
}
