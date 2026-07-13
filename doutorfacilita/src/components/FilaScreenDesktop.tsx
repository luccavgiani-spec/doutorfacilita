import { JoinConsultButton } from "@/components/fila/JoinConsultButton";
import LogoutButton from "@/components/auth/LogoutButton";
import { initials } from "@/lib/format/initials";
import { Logo } from "@/components/Logo";

/**
 * Fila desktop (≥1024px). Card central com ring grande, info e checagem técnica.
 * Estilos com prefixo `fila-d-*` em globals.css (Seção 5).
 */
export default function FilaScreenDesktop({
  consultationId,
  displayName,
  onEnterCall,
}: {
  consultationId?: string;
  displayName?: string;
  onEnterCall?: () => void;
}) {
  const nome = displayName?.trim() || "Você";
  return (
    <>
    <LogoutButton />
    <div className="fila-d">
      <header className="fila-d-top">
        <div className="fila-d-top-inner">
          <div>
            <Logo size={28} />
          </div>
          <div className="fila-d-user">
            <div className="fila-d-user-av">{initials(nome)}</div>
            <div className="fila-d-user-info">
              <b>{nome}</b>
              <span>Você está na fila</span>
            </div>
          </div>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>

      <main className="fila-d-main">
        <div className="fila-d-card">
          <div className="fila-d-status-label">você está na fila</div>
          <div className="fila-d-accent">aguardando...</div>
          <p className="fila-d-sub">
            Em breve um médico vai te atender pelo vídeo. Mantenha esta página
            aberta — você será chamado automaticamente.
          </p>

          <div className="fila-d-ring-wrap">
            <div className="fila-d-ring">
              <div className="fila-d-ring-inner">
                <div className="fila-d-ring-num">3º</div>
                <div className="fila-d-ring-label">sua posição</div>
              </div>
            </div>
          </div>

          <div className="fila-d-info-row">
            <div className="fila-d-info-card">
              <div className="fila-d-ic-label">Tempo estimado</div>
              <div className="fila-d-ic-value">~7 min</div>
            </div>
            <div className="fila-d-info-card">
              <div className="fila-d-ic-label">Médicos online</div>
              <div className="fila-d-ic-value g">3 atendendo</div>
            </div>
            <div className="fila-d-info-card">
              <div className="fila-d-ic-label">Chegou às</div>
              <div className="fila-d-ic-value">09:47</div>
            </div>
          </div>

          <div className="fila-d-progress">
            <div className="fila-d-progress-fill"></div>
          </div>

          <div className="fila-d-actions">
            <button className="fila-d-cancel">Cancelar consulta</button>
            <JoinConsultButton
              consultationId={consultationId}
              variant="desktop"
              onEnterCall={onEnterCall}
            />
          </div>
        </div>

        <div className="fila-d-side">
          <div className="fila-d-side-card">
            <div className="fila-d-side-title">
              Checagem técnica
              <span className="fila-d-side-ok">tudo ok</span>
            </div>
            <div className="fila-d-tech-item">
              <div className="fila-d-tech-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <div className="fila-d-tech-info">
                <div className="fila-d-tech-t">Câmera</div>
                <div className="fila-d-tech-s">HD · funcionando</div>
              </div>
            </div>
            <div className="fila-d-tech-item">
              <div className="fila-d-tech-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
              </div>
              <div className="fila-d-tech-info">
                <div className="fila-d-tech-t">Microfone</div>
                <div className="fila-d-tech-s">Captando bem</div>
              </div>
            </div>
            <div className="fila-d-tech-item">
              <div className="fila-d-tech-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/></svg>
              </div>
              <div className="fila-d-tech-info">
                <div className="fila-d-tech-t">Internet</div>
                <div className="fila-d-tech-s">Estável · 42 Mbps</div>
              </div>
            </div>
          </div>

          <div className="fila-d-side-card">
            <div className="fila-d-side-title">Médicos atendendo</div>
            <div className="fila-d-doc-item">
              <div className="fila-d-doc-av b">JS<span className="sd busy"></span></div>
              <div className="fila-d-doc-info">
                <div className="fila-d-doc-name">Dr. João Silva</div>
                <div className="fila-d-doc-st y">Em consulta</div>
              </div>
            </div>
            <div className="fila-d-doc-item">
              <div className="fila-d-doc-av g">AR<span className="sd busy"></span></div>
              <div className="fila-d-doc-info">
                <div className="fila-d-doc-name">Dra. Ana Rocha</div>
                <div className="fila-d-doc-st y">Em consulta</div>
              </div>
            </div>
            <div className="fila-d-doc-item">
              <div className="fila-d-doc-av r">CM<span className="sd"></span></div>
              <div className="fila-d-doc-info">
                <div className="fila-d-doc-name">Dr. Carlos M.</div>
                <div className="fila-d-doc-st g">Livre · você é o próximo</div>
              </div>
            </div>
          </div>

          <div className="fila-d-tip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div className="fila-d-tip-text">
              <b>Dica:</b> deixe à mão um documento com foto e a lista dos
              remédios que você toma para acelerar o atendimento.
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
