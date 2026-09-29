import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Moldura das telas curtas de autenticação (esqueci/redefinir senha): mesmo
 * topo + card `auth-*` da tela de sucesso do /cadastrar.
 */
export default function AuthCardShell({
  children,
  success = false,
}: {
  children: React.ReactNode;
  success?: boolean;
}) {
  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={30} />
          </Link>
          <Link href="/login" className="auth-top-link">
            Voltar para o <b>login</b>
          </Link>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>
      <main className="auth-main">
        <div className={`auth-card${success ? " auth-success" : ""}`}>{children}</div>
      </main>
    </div>
  );
}
