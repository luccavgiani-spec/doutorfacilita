"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

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

      <main className="auth-main">
        <div className="auth-card">
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

          <details className="auth-details">
            <summary>Credenciais de teste (dev)</summary>
            <div className="auth-details-body">
              <strong>Médico:</strong> medico-teste@doutorfacilita.test / Test1234!
              <br />
              <strong>Paciente:</strong> paciente-teste@doutorfacilita.test / Test1234!
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
