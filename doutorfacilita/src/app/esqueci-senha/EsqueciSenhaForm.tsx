"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCardShell from "@/components/auth/AuthCardShell";
import {
  mensagemEnvioRecuperacao,
  urlRetornoRecuperacao,
  type ResultadoEnvio,
} from "@/lib/auth/recuperacaoSenha";

export default function EsqueciSenhaForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: urlRetornoRecuperacao(window.location.origin) },
    );
    setResultado(mensagemEnvioRecuperacao(error));
    setLoading(false);
  }

  if (resultado?.tipo === "enviado") {
    return (
      <AuthCardShell success>
        <span className="auth-eyebrow">recuperar acesso</span>
        <h1 className="auth-h1">confira seu e-mail</h1>
        <p className="auth-sub" role="status">{resultado.texto}</p>
        <Link
          href="/login"
          className="auth-button auth-button--primary auth-button--block"
          style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
        >
          Ir para o login
        </Link>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell>
      <span className="auth-eyebrow">recuperar acesso</span>
      <h1 className="auth-h1">esqueci minha senha</h1>
      <p className="auth-sub">
        Informe o e-mail da sua conta. Vamos enviar um link para você criar uma
        nova senha.
      </p>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">E-mail</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
        </div>

        {resultado && (
          <div role="alert" className="auth-alert">{resultado.texto}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="auth-button auth-button--primary auth-button--block"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>
    </AuthCardShell>
  );
}
