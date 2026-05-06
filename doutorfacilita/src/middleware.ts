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
     * Match em todas as rotas exceto:
     * - _next/static (assets)
     * - _next/image (imagens otimizadas)
     * - favicon.ico
     * - imagens (svg, png, jpg, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
