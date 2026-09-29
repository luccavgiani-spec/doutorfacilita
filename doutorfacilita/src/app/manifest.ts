import type { MetadataRoute } from "next";

/* Web app manifest — identidade do atalho "Plantão Digital" na tela
   inicial do celular. Nome e ícone ficam gravados no aparelho de quem
   instalar (no iOS, mudar depois exige reinstalar). Ícones gerados da
   logo public/assets/logo-plantao-digital.jpg. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Plantão Digital",
    short_name: "Plantão Digital",
    description: "Consulta médica online por vídeo, com médicos de CRM ativo.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#1E5AE8",
    background_color: "#FFFFFF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
