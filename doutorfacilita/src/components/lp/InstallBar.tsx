"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

/* Barra promocional (só < 768 px) que cria o atalho "Plantão Digital" na
   tela inicial do celular.
   - Chrome/Edge/Samsung no Android: usa o `beforeinstallprompt`, capturado
     cedo por um script `beforeInteractive` no layout raiz
     (window.__pdInstallPrompt) — o evento pode disparar antes da hidratação.
   - Safari iOS (sem API de instalação): mostra os passos do Compartilhar.
   - Demais navegadores: orienta a usar o menu do navegador.
   Some quando o site já está aberto pelo atalho, quando o usuário dispensa
   (chave no localStorage) e quando o navegador dispara `appinstalled`. */

export const INSTALL_DISMISS_KEY = "pd-atalho-dispensado";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pdInstallPrompt?: InstallPromptEvent | null;
  }
}

type Help = null | "ios" | "menu";

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

function isIOSSafari(ua: string): boolean {
  const iOS =
    /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return iOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram/.test(ua);
}

function ShareIcon() {
  return (
    <svg className="inline-block align-[-2px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export default function InstallBar() {
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState<Help>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const update = () => setVisible(mobile.matches && !isStandalone() && !readDismissed());
    update();
    mobile.addEventListener("change", update);

    const onInstalled = () => {
      writeDismissed();
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mobile.removeEventListener("change", update);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

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
        }
      } catch {
        setHelp("menu");
      }
      return;
    }
    setHelp(isIOSSafari(navigator.userAgent) ? "ios" : "menu");
  }

  function dismiss() {
    writeDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      data-install-bar
      role="region"
      aria-label="Atalho do Plantão Digital na tela do celular"
      className="bg-gradient-to-r from-[#123FBF] to-[#1E5AE8] text-white md:hidden"
    >
      <div className="flex items-center gap-3 py-2 pl-4 pr-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
          <LogoMark size={22} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          Tenha o Plantão Digital na tela do seu celular{" "}
          <button
            type="button"
            data-install-add
            onClick={handleAdd}
            className="font-bold underline decoration-white/70 underline-offset-2"
          >
            Adicionar atalho
          </button>
        </p>
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

      {help === "ios" && (
        <div data-install-help="ios" role="status" className="border-t border-white/20 px-4 pb-3 pt-2.5 text-[13px] leading-snug">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Toque em Compartilhar <ShareIcon /> na barra do Safari
            </li>
            <li>Escolha Adicionar à Tela de Início</li>
          </ol>
        </div>
      )}

      {help === "menu" && (
        <div data-install-help="menu" role="status" className="border-t border-white/20 px-4 pb-3 pt-2.5 text-[13px] leading-snug">
          {"Abra o menu do navegador e escolha 'Adicionar à tela inicial'"}
        </div>
      )}
    </div>
  );
}
