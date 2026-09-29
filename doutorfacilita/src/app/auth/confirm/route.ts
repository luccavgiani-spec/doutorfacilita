import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DESTINO_REDEFINIR, destinoSeguro } from "@/lib/auth/recuperacaoSenha";

/**
 * Retorno do link de recuperação de senha enviado pelo Supabase Auth.
 *
 *  - `?token_hash=…&type=recovery` (template "Reset Password" apontando para
 *    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`):
 *    verifyOtp no servidor — funciona em qualquer navegador/dispositivo.
 *  - `?code=…` (template padrão `{{ .ConfirmationURL }}`, fluxo PKCE): troca o
 *    código pela sessão — só funciona no navegador que pediu o link, onde está
 *    o code verifier.
 *
 * Sucesso → sessão de recuperação gravada em cookie e redirect para
 * /redefinir-senha. Link expirado, já usado ou inválido → /redefinir-senha?erro=link.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (!error) return redirecionar(DESTINO_REDEFINIR);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirecionar(destinoSeguro(searchParams.get("next")));
  }

  return redirecionar(`${DESTINO_REDEFINIR}?erro=link`);
}

// Location relativo: o navegador resolve contra o host em que o usuário
// está (a origem do request no servidor pode divergir atrás de proxy/dev).
// Os cookies da sessão gravados via cookies() seguem nesta resposta.
function redirecionar(caminho: string) {
  return new NextResponse(null, { status: 303, headers: { Location: caminho } });
}
