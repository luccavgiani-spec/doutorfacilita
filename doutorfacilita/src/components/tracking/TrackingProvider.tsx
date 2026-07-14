"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initMetaTracking, trackPageView } from "@/lib/tracking/meta-tracking";

/**
 * Inicializa o rastreamento client-side e re-dispara o PageView do Meta Pixel
 * nas navegações SPA do App Router.
 *
 * - PageView inicial: já disparado pelo GTM (gatilho All Pages) para Meta + GA4.
 * - GA4 em troca de rota: coberto pela medição otimizada do GA4 (histórico).
 * - Meta em troca de rota: o gatilho All Pages do GTM não re-dispara em SPA,
 *   então chamamos trackPageView() aqui.
 *
 * Renderiza null. Incluído uma vez no RootLayout.
 */
export default function TrackingProvider() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    initMetaTracking();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // evita PageView duplicado no load inicial (GTM já disparou)
    }
    trackPageView();
  }, [pathname]);

  return null;
}
