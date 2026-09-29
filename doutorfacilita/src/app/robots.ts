import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cockpit", "/checkout", "/fila", "/consulta", "/posconsulta", "/api", "/login", "/cadastrar", "/auth", "/area-do-medico", "/esqueci-senha", "/redefinir-senha", "/trocar-senha"] },
    sitemap: "https://plantaodigital.com.br/sitemap.xml",
  };
}
