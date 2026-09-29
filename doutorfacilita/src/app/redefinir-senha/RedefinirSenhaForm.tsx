"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import AuthCardShell from "@/components/auth/AuthCardShell";
import PasswordChecklist from "@/components/cadastro/PasswordChecklist";
import { novaSenhaSchema, type NovaSenhaForm } from "@/lib/forms/cadastroSchema";
import { mensagemErroNovaSenha } from "@/lib/auth/recuperacaoSenha";

function fieldClass(hasError: boolean) {
  return `auth-input${hasError ? " auth-input--error" : ""}`;
}

export default function RedefinirSenhaForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NovaSenhaForm>({
    resolver: zodResolver(novaSenhaSchema),
    defaultValues: { senha: "", confirmar_senha: "" },
  });

  async function onSubmit(data: NovaSenhaForm) {
    setSubmitError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.senha,
      // Quem redefine escolheu a própria senha: encerra a troca obrigatória
      // de contas criadas pelo admin, senão /login/redirect pediria outra.
      data: { must_change_password: false },
    });
    if (error) {
      setSubmitError(mensagemErroNovaSenha(error));
      return;
    }
    router.push("/login/redirect");
    router.refresh();
  }

  const senha = watch("senha");

  return (
    <AuthCardShell>
      <span className="auth-eyebrow">recuperar acesso</span>
      <h1 className="auth-h1">crie uma nova senha</h1>
      <p className="auth-sub">Defina a nova senha da sua conta.</p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="senha">Nova senha</label>
          <input
            id="senha"
            className={fieldClass(!!errors.senha)}
            type="password"
            autoComplete="new-password"
            {...register("senha")}
          />
          {errors.senha && <div className="auth-error">{errors.senha.message}</div>}
          <PasswordChecklist password={senha ?? ""} />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="confirmar_senha">Confirmar senha</label>
          <input
            id="confirmar_senha"
            className={fieldClass(!!errors.confirmar_senha)}
            type="password"
            autoComplete="new-password"
            {...register("confirmar_senha")}
          />
          {errors.confirmar_senha && (
            <div className="auth-error">{errors.confirmar_senha.message}</div>
          )}
        </div>

        {submitError && <div role="alert" className="auth-alert">{submitError}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-button auth-button--success auth-button--block"
        >
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </AuthCardShell>
  );
}
