"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// TODO(fase-1): validar CPF/CRM e mascarar inputs quando a auth completa entrar.

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export interface PerfilData {
  nome_completo: string;
  crm: string;
  crm_estado: string;
  especialidade: string;
  cpf: string;
  telefone: string;
  endereco: string;
  bio: string;
}

export const PERFIL_VAZIO: PerfilData = {
  nome_completo: "",
  crm: "",
  crm_estado: "SP",
  especialidade: "",
  cpf: "",
  telefone: "",
  endereco: "",
  bio: "",
};

type Toast = { tipo: "ok" | "erro"; msg: string } | null;

export default function PerfilForm({
  userId,
  email,
  inicial,
}: {
  userId: string;
  email: string;
  inicial: PerfilData;
}) {
  const [perfil, setPerfil] = useState<PerfilData>(inicial);
  const [loginEmail, setLoginEmail] = useState(email);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  function set<K extends keyof PerfilData>(k: K, v: PerfilData[K]) {
    setPerfil((p) => ({ ...p, [k]: v }));
  }

  function flash(t: Toast) {
    setToast(t);
    if (t) window.setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const supabase = createClient();

      // Fonte única: public.doctors (medico_profiles foi mergeada — migration 017).
      // A linha em doctors é criada no cadastro/seed; aqui só atualizamos.
      const { error: upsertError } = await supabase
        .from("doctors")
        .update({
          full_name: perfil.nome_completo,
          council_number: perfil.crm,
          council_state: perfil.crm_estado,
          primary_specialty: perfil.especialidade,
          cpf: perfil.cpf,
          phone: perfil.telefone,
          endereco: perfil.endereco,
          bio: perfil.bio,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (upsertError) throw upsertError;

      const credUpdate: { email?: string; password?: string } = {};
      if (loginEmail && loginEmail !== email) credUpdate.email = loginEmail;
      if (novaSenha) credUpdate.password = novaSenha;
      if (Object.keys(credUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(credUpdate);
        if (authError) throw authError;
      }

      setNovaSenha("");
      flash({
        tipo: "ok",
        msg: credUpdate.email
          ? "Salvo. Confirme a troca de e-mail pelo link enviado."
          : "Alterações salvas com sucesso.",
      });
    } catch (err) {
      flash({
        tipo: "erro",
        msg:
          err instanceof Error
            ? `Erro ao salvar: ${err.message}`
            : "Erro ao salvar alterações.",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-txt">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">Perfil do médico</h1>
          <p className="text-xs text-txt-2">Área do médico · dados cadastrais e credenciais</p>
        </div>
        <Link
          href="/cockpit"
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
        >
          ← Voltar ao cockpit
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <Secao titulo="Dados profissionais">
              <Campo label="Nome completo">
                <input
                  className={inputCls}
                  value={perfil.nome_completo}
                  onChange={(e) => set("nome_completo", e.target.value)}
                  required
                />
              </Campo>
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <Campo label="CRM">
                  <input
                    className={inputCls}
                    value={perfil.crm}
                    onChange={(e) => set("crm", e.target.value)}
                    placeholder="345678"
                  />
                </Campo>
                <Campo label="UF">
                  <select
                    className={inputCls}
                    value={perfil.crm_estado}
                    onChange={(e) => set("crm_estado", e.target.value)}
                  >
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
              <Campo label="Especialidade">
                <input
                  className={inputCls}
                  value={perfil.especialidade}
                  onChange={(e) => set("especialidade", e.target.value)}
                  placeholder="Clínica médica"
                />
              </Campo>
              <Campo label="Bio curta">
                <textarea
                  className={`${inputCls} min-h-[80px] resize-y`}
                  value={perfil.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Apresentação breve exibida ao paciente."
                />
              </Campo>
            </Secao>

            <Secao titulo="Dados pessoais e contato">
              <Campo label="CPF">
                <input
                  className={inputCls}
                  value={perfil.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </Campo>
              <Campo label="Telefone">
                <input
                  className={inputCls}
                  value={perfil.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  placeholder="(11) 90000-0000"
                />
              </Campo>
              <Campo label="Endereço de atendimento">
                <input
                  className={inputCls}
                  value={perfil.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                  placeholder="Rua, número, cidade/UF"
                />
              </Campo>
            </Secao>

            <Secao titulo="Credenciais de acesso">
              <Campo label="E-mail de login">
                <input
                  type="email"
                  className={inputCls}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="username"
                />
              </Campo>
              <Campo label="Nova senha">
                <input
                  type="password"
                  className={inputCls}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                  autoComplete="new-password"
                  minLength={6}
                />
              </Campo>
            </Secao>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-dark disabled:cursor-wait disabled:opacity-70"
              >
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
              {toast && (
                <span
                  className={`text-sm font-medium ${
                    toast.tipo === "ok" ? "text-green" : "text-red"
                  }`}
                >
                  {toast.msg}
                </span>
              )}
            </div>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-txt outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-txt-2">
        {titulo}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      {children}
    </label>
  );
}
