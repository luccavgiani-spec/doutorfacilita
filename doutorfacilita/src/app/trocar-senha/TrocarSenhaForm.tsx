"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword } from "@/lib/forms/validators";
import PasswordChecklist from "@/components/cadastro/PasswordChecklist";

/**
 * Troca de senha obrigatória no primeiro login (contas criadas pelo admin com
 * senha temporária + user_metadata.must_change_password = true). Ao concluir,
 * limpa a flag e devolve o usuário ao funil pós-login (/login/redirect).
 */
export default function TrocarSenhaForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(senha)) {
      setError("A senha não atende aos requisitos.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({
      password: senha,
      data: { must_change_password: false },
    });
    if (updErr) {
      setLoading(false);
      setError(updErr.message || "Não foi possível alterar a senha.");
      return;
    }
    router.push("/login/redirect");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <main className="auth-main">
        <div className="auth-card">
          <span className="auth-eyebrow">primeiro acesso</span>
          <h1 className="auth-h1">crie uma nova senha</h1>
          <p className="auth-sub">
            Sua conta foi criada com uma senha temporária. Defina uma senha
            pessoal para continuar.
          </p>

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label">Nova senha*</label>
              <input
                className="auth-input"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
              />
              <PasswordChecklist password={senha} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirmar nova senha*</label>
              <input
                className="auth-input"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <div role="alert" className="auth-alert">{error}</div>}

            <div className="auth-actions">
              <button
                type="submit"
                disabled={loading}
                className="auth-button auth-button--success auth-button--block"
              >
                {loading ? "Salvando…" : "Salvar e continuar"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
