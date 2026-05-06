import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Avatares de médicos e pacientes (Supabase Storage)
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // PDFs/imagens da Mevo (durante a janela de 10 min)
      {
        protocol: "https",
        hostname: "privatepdf-dev.s3.sa-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
