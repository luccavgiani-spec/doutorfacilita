import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Sem Supabase configurado (ex: protótipo visual local), passa direto.
  // Em produção/preview as env vars estão no Vercel.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * O middleware só roda nas rotas que dependem de sessão Supabase
     * (refresh de token + guards). A landing "/" e páginas estáticas do
     * protótipo NÃO precisam — evitar rodá-lo lá tira uma ida à rede
     * Supabase de cada navegação por essas áreas.
     */
    "/cockpit/:path*",
    "/fila/:path*",
    "/consulta/:path*",
    "/checkout/:path*",
    "/area-do-medico/:path*",
    "/login/:path*",
    "/login",
  ],
};
