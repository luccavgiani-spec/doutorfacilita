"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo, LogoMark } from "@/components/Logo";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou senha inválidos");
      setLoading(false);
      return;
    }

    router.push("/login/redirect");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={30} />
          </Link>
          <Link href="/cadastrar" className="auth-top-link">
            Não tem conta? <b>Cadastre-se</b>
          </Link>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>

      <main className="auth-main auth-main--split">
        <div className="auth-split">
          <aside className="auth-split-brand">
            <div className="auth-split-badge">
              <span className="auth-split-badge-mark">
                <LogoMark size={30} />
              </span>
              <span className="auth-split-wordmark">Plantão Digital</span>
            </div>
            <h2 className="auth-split-title">
              Cuidado médico sem sair de casa.
            </h2>
            <p className="auth-split-text">
              Consulta por vídeo com médicos de verdade, na hora que você
              precisar.
            </p>
            <ul className="auth-split-list">
              <li>
                <span className="auth-split-check" aria-hidden>✓</span>
                Consulta a partir de R$ 39,90
              </li>
              <li>
                <span className="auth-split-check" aria-hidden>✓</span>
                Atendimento em até 10 minutos
              </li>
              <li>
                <span className="auth-split-check" aria-hidden>✓</span>
                Médicos com registro ativo
              </li>
            </ul>
          </aside>

          <div className="auth-split-form">
            <span className="auth-eyebrow">acesso</span>
            <h1 className="auth-h1">entrar</h1>
            <p className="auth-sub">
              Bom te ver de volta. Entre com seu email e senha para continuar sua
              consulta.
            </p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                className={`auth-input ${error ? "auth-input--error" : ""}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Senha</label>
              <input
                id="password"
                className={`auth-input ${error ? "auth-input--error" : ""}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="auth-alert" role="alert">{error}</div>
            )}

            <button
              type="submit"
              className="auth-button auth-button--primary auth-button--block"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            </form>

            <p className="auth-foot">
              Ainda não tem conta? <Link href="/cadastrar">Criar conta</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
