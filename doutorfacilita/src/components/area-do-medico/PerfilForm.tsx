"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatarFoto } from "@/app/area-do-medico/actions";

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
  avatarInicial,
}: {
  userId: string;
  email: string;
  inicial: PerfilData;
  avatarInicial: string | null;
}) {
  const [perfil, setPerfil] = useState<PerfilData>(inicial);
  const [loginEmail, setLoginEmail] = useState(email);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarInicial);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [fotoToast, setFotoToast] = useState<Toast>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const iniciais =
    (perfil.nome_completo || email)
      .replace(/^Dr[a]?\.?\s*/i, "")
      .trim()
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  async function onSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoFoto(true);
    setFotoToast(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAvatarFoto(fd);
      if ("error" in res) {
        setFotoToast({ tipo: "erro", msg: res.error });
      } else {
        setAvatarUrl(res.url);
        setFotoToast({ tipo: "ok", msg: "Foto atualizada." });
        router.refresh(); // navbar do shell e cockpit refletem na hora
      }
    } catch {
      setFotoToast({ tipo: "erro", msg: "Falha ao enviar a foto." });
    } finally {
      setEnviandoFoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Perfil do médico</h1>
        <p className="text-sm text-txt-2">Dados cadastrais e credenciais</p>
      </div>

      {/* Cabeçalho do perfil — foto grande sobre faixa de marca */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-[#123FBF] via-[#1E5AE8] to-[#2FA4F2]" />
        <div className="px-6 pb-7 sm:px-8">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onSelecionarFoto}
          />
          <div className="relative -mt-14 w-fit">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="h-32 w-32 rounded-full object-cover shadow-md ring-4 ring-white"
              />
            ) : (
              <div className="grid h-32 w-32 place-items-center rounded-full bg-blue text-3xl font-bold text-white shadow-md ring-4 ring-white">
                {iniciais}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={enviandoFoto}
              aria-label={enviandoFoto ? "Enviando foto" : "Alterar foto"}
              className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full bg-blue text-white ring-4 ring-white transition hover:bg-blue-dark disabled:cursor-wait disabled:opacity-70"
            >
              {enviandoFoto ? (
                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-4">
            <h2 className="text-2xl font-bold leading-tight text-txt">
              {perfil.nome_completo || "Seu nome"}
            </h2>
            <p className="mt-1 text-sm font-medium text-txt-2">
              {perfil.especialidade || "Médico(a)"}
              {perfil.crm ? ` · CRM ${perfil.crm_estado} ${perfil.crm}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-txt-3">{email}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-txt-2">
              Clique na câmera para {avatarUrl ? "trocar" : "adicionar"} a foto · JPG, PNG ou WebP · até 5 MB
            </span>
            {fotoToast && (
              <span
                className={`text-sm font-medium ${
                  fotoToast.tipo === "ok" ? "text-green" : "text-red"
                }`}
              >
                {fotoToast.msg}
              </span>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
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

            <div className="lg:col-span-2">
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
            </div>

            <div className="lg:col-span-2 flex items-center gap-4">
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
