import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware que faz refresh do token Supabase em cada request.
 * Sem isso, a sessão expira silenciosamente e o usuário é deslogado.
 *
 * Também é onde implementamos guards de rota (proteger /cockpit, /fila etc).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida o token contra o servidor Supabase.
  // NÃO substitua por getSession() — esse último só lê o cookie sem validar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Guards de rota ────────────────────────────────────────────────
  // TODO: ativar quando /login estiver implementado.
  // Por enquanto, todas as rotas são abertas pra facilitar visualização do protótipo.
  //
  // const path = request.nextUrl.pathname;
  // const isProtected =
  //   path.startsWith("/fila") ||
  //   path.startsWith("/consulta") ||
  //   path.startsWith("/cockpit");
  //
  // if (!user && isProtected) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/login";
  //   url.searchParams.set("next", path);
  //   return NextResponse.redirect(url);
  // }

  // Marca user como "lido" pra TS não reclamar (mantém o getUser ativo pro refresh)
  void user;

  return supabaseResponse;
}
