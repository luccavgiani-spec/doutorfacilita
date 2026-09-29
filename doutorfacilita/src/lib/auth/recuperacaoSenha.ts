/**
 * Regras puras do fluxo "Esqueci minha senha" (/esqueci-senha → e-mail →
 * /auth/confirm → /redefinir-senha). Sem dependências de runtime para poder
 * ser usado no client, no server e em testes.
 */

export const MSG_LINK_ENVIADO =
  "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.";
export const MSG_LIMITE_ENVIO =
  "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
export const MSG_ERRO_ENVIO =
  "Não foi possível enviar o link agora. Tente de novo em instantes.";
export const MSG_LINK_INVALIDO = "Link inválido ou expirado";
export const MSG_MESMA_SENHA = "A nova senha precisa ser diferente da atual.";
export const MSG_ERRO_SALVAR = "Não foi possível alterar a senha. Tente de novo.";

/** Destino padrão depois que o link de recuperação abre uma sessão. */
export const DESTINO_REDEFINIR = "/redefinir-senha";

type ErroAuth = { status?: number; code?: string; message?: string } | null | undefined;

export type ResultadoEnvio = { tipo: "enviado" | "limite" | "erro"; texto: string };

/**
 * Traduz a resposta de `resetPasswordForEmail` para a tela.
 * Sucesso → texto neutro (não revela se o e-mail tem conta). Limite de envio
 * do Supabase (HTTP 429 / over_email_send_rate_limit) → texto de espera.
 */
export function mensagemEnvioRecuperacao(error: ErroAuth): ResultadoEnvio {
  if (!error) return { tipo: "enviado", texto: MSG_LINK_ENVIADO };
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return { tipo: "limite", texto: MSG_LIMITE_ENVIO };
  }
  return { tipo: "erro", texto: MSG_ERRO_ENVIO };
}

/** Traduz o erro de `updateUser({ password })` em /redefinir-senha. */
export function mensagemErroNovaSenha(error: ErroAuth): string {
  if (error?.code === "same_password") return MSG_MESMA_SENHA;
  return MSG_ERRO_SALVAR;
}

/** URL para onde o link do e-mail volta (passada como `redirectTo`). */
export function urlRetornoRecuperacao(origin: string): string {
  return `${origin}/auth/confirm?next=${DESTINO_REDEFINIR}`;
}

/**
 * Aceita só caminho relativo do próprio site ("/x"); qualquer outra coisa
 * (URL absoluta, "//host", "/\host", "/<TAB>/host"…) cai no destino padrão.
 * Evita open redirect via `?next=` em /auth/confirm. Resolve com o mesmo
 * parser de URL do navegador (que descarta TAB/CR/LF e trata "\" como "/")
 * e exige que a origem não mude.
 */
export function destinoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DESTINO_REDEFINIR;
  const base = "http://destino.invalid";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return DESTINO_REDEFINIR;
  }
  if (url.origin !== base) return DESTINO_REDEFINIR;
  return url.pathname + url.search + url.hash;
}
