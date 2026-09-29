import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AuthCardShell from "@/components/auth/AuthCardShell";
import { MSG_LINK_INVALIDO } from "@/lib/auth/recuperacaoSenha";
import RedefinirSenhaForm from "./RedefinirSenhaForm";

export const metadata: Metadata = { title: "Redefinir senha" };

/**
 * Chega aqui pelo /auth/confirm com a sessão de recuperação já em cookie.
 * Sem sessão, ou com `?erro=link` (link expirado/usado/inválido), mostra o
 * estado de link inválido com saída para pedir outro.
 */
export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (erro || !user) {
    return (
      <AuthCardShell>
        <span className="auth-eyebrow">recuperar acesso</span>
        <h1 className="auth-h1">{MSG_LINK_INVALIDO}</h1>
        <p className="auth-sub">
          O link de redefinição expirou, já foi usado ou não é válido. Peça um
          novo link para criar sua senha.
        </p>
        <Link
          href="/esqueci-senha"
          className="auth-button auth-button--primary auth-button--block"
          style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
        >
          Pedir novo link
        </Link>
      </AuthCardShell>
    );
  }

  return <RedefinirSenhaForm />;
}
