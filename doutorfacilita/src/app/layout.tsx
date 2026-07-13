import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plantão Digital — Consulta médica online por R$ 59",
  description:
    "Atendimento médico por vídeo em até 10 minutos. Sem agendamento. Receita digital, atestado e exames pelo celular. CRM ativo, LGPD, conformidade CFM.",
  metadataBase: new URL("https://plantaodigital.com.br"),
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Caveat:wght@700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
