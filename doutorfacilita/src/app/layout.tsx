import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import TrackingProvider from "@/components/tracking/TrackingProvider";
import { GTM_ID } from "@/lib/tracking/config";

export const metadata: Metadata = {
  title: "Plantão Digital — Consulta médica online por R$ 39,90",
  description:
    "Atendimento médico por vídeo em até 10 minutos. Sem agendamento. Receita digital, atestado e exames pelo celular. CRM ativo, LGPD, conformidade CFM.",
  metadataBase: new URL("https://www.meuplantaodigital.com"),
  openGraph: {
    title: "Plantão Digital — Saúde sem sair de casa",
    description: "Paga, entra na fila, médico te atende pelo vídeo em até 10 min.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          name="facebook-domain-verification"
          content="3a5yrek88b4r53flgehe775cilqlcg"
        />
        {/* Google Tag Manager — injeta Meta Pixel + GA4 (tags dentro do container) */}
        <Script id="gtm-base" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}</Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Caveat:wght@700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <TrackingProvider />
      </body>
    </html>
  );
}
