import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cockpit", "/checkout", "/fila", "/consulta", "/posconsulta", "/api", "/login", "/cadastro"] },
    sitemap: "https://plantaodigital.com.br/sitemap.xml",
  };
}
