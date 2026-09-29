"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

/* Barra promocional que cria o atalho "Plantão Digital" no celular ou no
   computador.
   - Chrome/Edge/Samsung (Android e desktop): o botão abre o diálogo nativo de
     instalação via `beforeinstallprompt`, capturado cedo por um script
     `beforeInteractive` no layout raiz (window.__pdInstallPrompt), que avisa
     com o evento `pd-install-ready` quando chega depois da hidratação. O
     Chrome só libera o evento após um toque na página e ~30 s de visita; se o
     usuário tocar antes, a barra mostra "preparando" e troca o botão por
     "Instalar agora" assim que ele chega (o prompt() exige um novo toque).
   - Safari iOS / Safari macOS / Firefox Android (sem API de instalação):
     passos com o ícone do próprio navegador.
   - Desktop sem suporte a instalar (ex.: Firefox): a barra não aparece.
   Some quando o site já está aberto pelo atalho, quando o usuário dispensa
   (chave no localStorage) e quando o navegador dispara `appinstalled`. */

export const INSTALL_DISMISS_KEY = "pd-atalho-dispensado";

// Sem o evento depois disso, o Chrome não vai oferecer a instalação (ex.: já
// instalado ou bloqueado) — cai para o passo a passo manual.
const WAIT_FALLBACK_MS = 45_000;

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pdInstallPrompt?: InstallPromptEvent | null;
  }
}

type Platform = "chromium" | "ios" | "mac-safari" | "android-other" | "none";
type Stage = "idle" | "waiting" | "ready" | "help";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* sem storage: a barra apenas reaparece no próximo acesso */
  }
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function detectPlatform(mobile: boolean): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) {
    return /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram/.test(ua)
      ? "ios"
      : "none";
  }
  if ("onbeforeinstallprompt" in window) return "chromium";
  if (/Macintosh/.test(ua) && /Version\/\d+.*Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) {
    return "mac-safari";
  }
  return mobile ? "android-other" : "none";
}

function Icon({ d }: { d: string[] }) {
  return (
    <svg className="mx-0.5 inline-block align-[-3px]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}
const SHARE = ["M12 3v12", "M8 7l4-4 4 4", "M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"];
const DOTS = ["M12 5h.01", "M12 12h.01", "M12 19h.01"];
const INSTALL = ["M4 5h16v11H4z", "M8 20h8", "M12 8v5", "M9.5 10.5L12 13l2.5-2.5"];

function Steps({ platform, mobile }: { platform: Platform; mobile: boolean }) {
  if (platform === "ios") {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Toque em Compartilhar <Icon d={SHARE} /> na barra do Safari
        </li>
        <li>Role e escolha <b>Adicionar à Tela de Início</b></li>
      </ol>
    );
  }
  if (platform === "mac-safari") {
    return (
      <p>
        No menu <b>Arquivo</b> do Safari, escolha <b>Adicionar ao Dock</b>.
      </p>
    );
  }
  if (mobile) {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Toque nos três pontinhos <Icon d={DOTS} /> no canto superior direito do navegador
        </li>
        <li>
          Escolha <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>
        </li>
      </ol>
    );
  }
  return (
    <p>
      Clique no ícone de instalar <Icon d={INSTALL} /> no canto direito da barra de endereço, ou
      no menu <Icon d={DOTS} /> do navegador → <b>Instalar Plantão Digital</b>.
    </p>
  );
}

export default function InstallBar() {
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [platform, setPlatform] = useState<Platform>("none");
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      const isMobile = mq.matches;
      const p = detectPlatform(isMobile);
      setMobile(isMobile);
      setPlatform(p);
      setVisible(p !== "none" && !isStandalone() && !readDismissed());
    };
    update();
    mq.addEventListener("change", update);

    const onInstalled = () => {
      writeDismissed();
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Esperando o Chrome liberar a instalação: troca para "Instalar agora" quando
  // o evento chegar; sem ele em WAIT_FALLBACK_MS, mostra o passo a passo.
  useEffect(() => {
    if (stage !== "waiting") return;
    const onReady = () => setStage("ready");
    window.addEventListener("pd-install-ready", onReady);
    const t = window.setTimeout(() => setStage("help"), WAIT_FALLBACK_MS);
    return () => {
      window.removeEventListener("pd-install-ready", onReady);
      window.clearTimeout(t);
    };
  }, [stage]);

  async function handleAdd() {
    const deferred = window.__pdInstallPrompt;
    if (deferred) {
      // o evento só pode abrir o diálogo uma vez
      window.__pdInstallPrompt = null;
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          writeDismissed();
          setVisible(false);
        } else {
          setStage("idle");
        }
      } catch {
        setStage("help");
      }
      return;
    }
    setStage(platform === "chromium" ? "waiting" : "help");
  }

  function dismiss() {
    writeDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  const title = mobile
    ? "Tenha o Plantão Digital na tela do seu celular"
    : "Instale o Plantão Digital no seu computador e abra com um clique";
  const buttonLabel = stage === "ready" ? "Instalar agora" : mobile ? "Adicionar atalho" : "Instalar atalho";

  return (
    <div
      data-install-bar
      data-install-platform={platform}
      role="region"
      aria-label="Atalho do Plantão Digital"
      className="bg-gradient-to-r from-[#123FBF] to-[#1E5AE8] text-white"
    >
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 py-2 pl-4 pr-2 md:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
          <LogoMark size={22} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug md:text-[14px]">{title}</p>
        <button
          type="button"
          data-install-add
          onClick={handleAdd}
          disabled={stage === "waiting"}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition md:text-[13px] ${
            stage === "ready"
              ? "bg-[#10B981] text-white shadow-[0_0_0_3px_rgba(255,255,255,0.35)] hover:bg-[#0EA271]"
              : "bg-white text-[#1E5AE8] hover:bg-[#EEF4FF] disabled:opacity-80"
          }`}
        >
          {stage === "waiting" ? "Preparando…" : buttonLabel}
        </button>
        <button
          type="button"
          data-install-close
          aria-label="Fechar aviso do atalho"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {stage === "waiting" && (
        <div data-install-help="waiting" role="status" className="mx-auto max-w-[1180px] border-t border-white/20 px-4 pb-2.5 pt-2 text-[13px] leading-snug md:px-5">
          Preparando o atalho — mantenha esta página aberta por alguns segundos. O botão vai mudar
          para <b>Instalar agora</b>.
        </div>
      )}

      {stage === "ready" && (
        <div data-install-help="ready" role="status" className="mx-auto max-w-[1180px] border-t border-white/20 px-4 pb-2.5 pt-2 text-[13px] leading-snug md:px-5">
          Pronto! Toque em <b>Instalar agora</b> e confirme para criar o atalho.
        </div>
      )}

      {stage === "help" && (
        <div data-install-help={platform} role="status" className="mx-auto max-w-[1180px] border-t border-white/20 px-4 pb-3 pt-2.5 text-[13px] leading-snug md:px-5">
          <Steps platform={platform} mobile={mobile} />
        </div>
      )}
    </div>
  );
}
