"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/lib/supabase/client";
import {
  maskCpf,
  maskPhone,
  maskCep,
  maskDate,
  onlyDigits,
  normalizarCelularBR,
  brDateToIso,
} from "@/lib/forms/masks";
import { fetchCep } from "@/lib/forms/viacep";
import {
  cadastroSchema,
  UF_LIST,
  type CadastroForm,
  type CadastroFormInput,
} from "@/lib/forms/cadastroSchema";
import PasswordChecklist from "./PasswordChecklist";

const STEPS = [
  { key: "dados", label: "Dados Pessoais" },
  { key: "endereco", label: "Endereço" },
  { key: "documentos", label: "Documentos" },
  { key: "seguranca", label: "Segurança" },
] as const;

const FIELDS_BY_STEP: Array<FieldPath<CadastroFormInput>[]> = [
  ["nome", "sobrenome", "email", "telefone", "data_nascimento", "genero"],
  ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"],
  ["cpf", "alergias"],
  [
    "senha",
    "confirmar_senha",
    "emergency_contact_name",
    "emergency_contact_phone",
    "accepts_terms",
    "accepts_communications",
  ],
];

function fieldClass(hasError: boolean) {
  return `auth-input${hasError ? " auth-input--error" : ""}`;
}
function selectClass(hasError: boolean) {
  return `auth-select${hasError ? " auth-input--error" : ""}`;
}

export default function CadastroWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [alergiaInput, setAlergiaInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const form = useForm<CadastroFormInput, unknown, CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    mode: "onBlur",
    defaultValues: {
      nome: "",
      sobrenome: "",
      email: "",
      telefone: "",
      data_nascimento: "",
      genero: "F",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "SP",
      cpf: "",
      alergias: [],
      senha: "",
      confirmar_senha: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      accepts_terms: false as unknown as true,
      accepts_communications: false,
    } satisfies CadastroFormInput,
  });

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
  } = form;

  async function handleNext() {
    setSubmitError(null);
    const fields = FIELDS_BY_STEP[step];
    const ok = await trigger(fields, { shouldFocus: true });
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleCepBlur() {
    const cep = onlyDigits(getValues("cep"));
    if (cep.length !== 8) return;
    setCepLoading(true);
    const res = await fetchCep(cep);
    setCepLoading(false);
    if (res) {
      if (res.logradouro) setValue("logradouro", res.logradouro, { shouldValidate: true });
      if (res.bairro) setValue("bairro", res.bairro, { shouldValidate: true });
      if (res.cidade) setValue("cidade", res.cidade, { shouldValidate: true });
      if (res.uf) {
        const ufList = UF_LIST as readonly string[];
        if (ufList.includes(res.uf)) {
          setValue("uf", res.uf as CadastroFormInput["uf"], { shouldValidate: true });
        }
      }
    }
  }

  function addAlergia() {
    const v = alergiaInput.trim();
    if (!v) return;
    const atuais = getValues("alergias") ?? [];
    if (atuais.includes(v)) {
      setAlergiaInput("");
      return;
    }
    setValue("alergias", [...atuais, v], { shouldValidate: true });
    setAlergiaInput("");
  }

  function removeAlergia(item: string) {
    const atuais = getValues("alergias") ?? [];
    setValue(
      "alergias",
      atuais.filter((a) => a !== item),
      { shouldValidate: true },
    );
  }

  async function onSubmit(data: CadastroForm) {
    setSubmitError(null);
    const supabase = createClient();

    const enderecoCompleto = [
      `${data.logradouro}, ${data.numero}`,
      data.complemento ? `${data.complemento}` : null,
      `${data.bairro}`,
      `${data.cidade}/${data.uf}`,
      `CEP ${maskCep(data.cep)}`,
    ]
      .filter(Boolean)
      .join(" - ");

    const fullName = `${data.nome.trim()} ${data.sobrenome.trim()}`.trim();

    // address_line = logradouro puro; o número vai em address_number (coluna
    // discreta) — o Mercado Pago exige street_name e street_number separados.
    const addressLine = data.logradouro.trim();

    const { data: out, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: {
        data: {
          role: "patient",
          full_name: fullName,
          cpf: onlyDigits(data.cpf),
          birth_date: brDateToIso(data.data_nascimento),
          gender: data.genero,
          celular: normalizarCelularBR(data.telefone) ?? onlyDigits(data.telefone),
          endereco_completo: enderecoCompleto,
          alergias: data.alergias,
          // Endereço estruturado (trigger handle_new_user popula nas colunas dedicadas)
          address_line: addressLine,
          address_number: data.numero.trim(),
          address_complement: data.complemento?.trim() || null,
          neighborhood: data.bairro.trim(),
          city: data.cidade.trim(),
          state: data.uf,
          postal_code: onlyDigits(data.cep),
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: onlyDigits(data.emergency_contact_phone),
          accepts_communications: data.accepts_communications,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setSubmitError(error.message || "Não foi possível criar sua conta.");
      return;
    }

    if (out.session) {
      router.push("/login/redirect");
      router.refresh();
      return;
    }

    setEmailSent(data.email);
  }

  const password = watch("senha");
  const alergias = watch("alergias") ?? [];

  if (emailSent) {
    return (
      <div className="auth-shell">
        <header className="auth-top">
          <div className="auth-top-inner">
            <Link href="/" className="logo-no" style={{ textDecoration: "none" }}>
              <span className="dots">
                <span></span><span></span><span></span><span></span>
              </span>
              <span className="no-word">nó</span> telemed
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
          <div className="auth-card auth-success">
            <span className="auth-eyebrow">tudo certo</span>
            <h1 className="auth-h1">confirme seu email</h1>
            <p className="auth-sub">
              Enviamos um link para <b>{emailSent}</b>. Clique nele para ativar
              sua conta — depois é só entrar com sua senha.
            </p>
            <Link
              href="/login"
              className="auth-button auth-button--primary auth-button--block"
              style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
            >
              Ir para o login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const progressoConcluido = step;
  const progressoPct = (progressoConcluido / STEPS.length) * 100;

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" className="logo-no" style={{ textDecoration: "none" }}>
            <span className="dots">
              <span></span><span></span><span></span><span></span>
            </span>
            <span className="no-word">nó</span> telemed
          </Link>
          <Link href="/login" className="auth-top-link">
            Já tem conta? <b>Entrar</b>
          </Link>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-card auth-card--wide">
          <span className="auth-eyebrow">novo cadastro</span>
          <h1 className="auth-h1">criar conta</h1>
          <p className="auth-sub">
            Em menos de 2 minutos você termina e já entra na fila.
          </p>

          <div className="auth-progress-wrap" aria-hidden>
            <div className="auth-progress-fill" style={{ width: `${progressoPct}%` }} />
          </div>
          <div className="auth-progress-count">
            {progressoConcluido} de {STEPS.length} etapas concluídas
          </div>

          <ol className="auth-stepper">
            {STEPS.map((s, i) => {
              const cls =
                i === step ? "auth-step auth-step--current"
                : i < step ? "auth-step auth-step--done"
                : "auth-step";
              return (
                <li key={s.key} className={cls}>
                  {i + 1}. {s.label}
                </li>
              );
            })}
          </ol>

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 0 && (
              <>
                <div className="auth-row-2">
                  <div className="auth-field">
                    <label className="auth-label">Nome*</label>
                    <input
                      className={fieldClass(!!errors.nome)}
                      {...register("nome")}
                      autoComplete="given-name"
                    />
                    {errors.nome && <div className="auth-error">{errors.nome.message}</div>}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Sobrenome*</label>
                    <input
                      className={fieldClass(!!errors.sobrenome)}
                      {...register("sobrenome")}
                      autoComplete="family-name"
                    />
                    {errors.sobrenome && <div className="auth-error">{errors.sobrenome.message}</div>}
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email*</label>
                  <input
                    className={fieldClass(!!errors.email)}
                    type="email"
                    {...register("email")}
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                  />
                  {errors.email && <div className="auth-error">{errors.email.message}</div>}
                </div>

                <div className="auth-row-2">
                  <div className="auth-field">
                    <label className="auth-label">Celular*</label>
                    <Controller
                      control={control}
                      name="telefone"
                      render={({ field }) => (
                        <input
                          className={fieldClass(!!errors.telefone)}
                          value={field.value}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="(11) 99999-9999"
                        />
                      )}
                    />
                    {errors.telefone && <div className="auth-error">{errors.telefone.message}</div>}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Data de Nascimento*</label>
                    <Controller
                      control={control}
                      name="data_nascimento"
                      render={({ field }) => (
                        <input
                          className={fieldClass(!!errors.data_nascimento)}
                          value={field.value}
                          onChange={(e) => field.onChange(maskDate(e.target.value))}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          placeholder="DD/MM/AAAA"
                          autoComplete="bday"
                        />
                      )}
                    />
                    {errors.data_nascimento && (
                      <div className="auth-error">{errors.data_nascimento.message}</div>
                    )}
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Gênero*</label>
                  <select className={selectClass(!!errors.genero)} {...register("genero")}>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="O">Outro</option>
                    <option value="N">Prefiro não informar</option>
                  </select>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="auth-row-cep">
                  <div className="auth-field">
                    <label className="auth-label">CEP*</label>
                    <Controller
                      control={control}
                      name="cep"
                      render={({ field }) => (
                        <input
                          className={fieldClass(!!errors.cep)}
                          value={field.value}
                          onChange={(e) => field.onChange(maskCep(e.target.value))}
                          onBlur={() => {
                            field.onBlur();
                            void handleCepBlur();
                          }}
                          inputMode="numeric"
                          placeholder="00000-000"
                          autoComplete="postal-code"
                        />
                      )}
                    />
                    {errors.cep && <div className="auth-error">{errors.cep.message}</div>}
                    {cepLoading && <div className="auth-helper">Buscando…</div>}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Logradouro*</label>
                    <input
                      className={fieldClass(!!errors.logradouro)}
                      {...register("logradouro")}
                      autoComplete="address-line1"
                    />
                    {errors.logradouro && <div className="auth-error">{errors.logradouro.message}</div>}
                  </div>
                </div>

                <div className="auth-row-num">
                  <div className="auth-field">
                    <label className="auth-label">Número*</label>
                    <input className={fieldClass(!!errors.numero)} {...register("numero")} />
                    {errors.numero && <div className="auth-error">{errors.numero.message}</div>}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Complemento</label>
                    <input
                      className={fieldClass(false)}
                      {...register("complemento")}
                      autoComplete="address-line2"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Bairro*</label>
                  <input className={fieldClass(!!errors.bairro)} {...register("bairro")} />
                  {errors.bairro && <div className="auth-error">{errors.bairro.message}</div>}
                </div>

                <div className="auth-row-uf">
                  <div className="auth-field">
                    <label className="auth-label">Cidade*</label>
                    <input
                      className={fieldClass(!!errors.cidade)}
                      {...register("cidade")}
                      autoComplete="address-level2"
                    />
                    {errors.cidade && <div className="auth-error">{errors.cidade.message}</div>}
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">UF*</label>
                    <select className={selectClass(!!errors.uf)} {...register("uf")}>
                      {UF_LIST.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {errors.uf && <div className="auth-error">{errors.uf.message}</div>}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="auth-field">
                  <label className="auth-label">CPF*</label>
                  <Controller
                    control={control}
                    name="cpf"
                    render={({ field }) => (
                      <input
                        className={fieldClass(!!errors.cpf)}
                        value={field.value}
                        onChange={(e) => field.onChange(maskCpf(e.target.value))}
                        onBlur={field.onBlur}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                      />
                    )}
                  />
                  {errors.cpf && <div className="auth-error">{errors.cpf.message}</div>}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Alergias (opcional)</label>
                  <div className="auth-chip-input">
                    <input
                      className="auth-input"
                      value={alergiaInput}
                      onChange={(e) => setAlergiaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAlergia();
                        }
                      }}
                      placeholder="Ex: dipirona"
                    />
                    <button
                      type="button"
                      onClick={addAlergia}
                      className="auth-button auth-button--ghost"
                    >
                      Adicionar
                    </button>
                  </div>
                  {alergias.length > 0 && (
                    <div className="auth-chips">
                      {alergias.map((a) => (
                        <span key={a} className="auth-chip">
                          {a}
                          <button
                            type="button"
                            onClick={() => removeAlergia(a)}
                            aria-label={`Remover ${a}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="auth-field">
                  <label className="auth-label">Senha*</label>
                  <input
                    className={fieldClass(!!errors.senha)}
                    type="password"
                    {...register("senha")}
                    autoComplete="new-password"
                  />
                  {errors.senha && <div className="auth-error">{errors.senha.message}</div>}
                  <PasswordChecklist password={password ?? ""} />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirmar Senha*</label>
                  <input
                    className={fieldClass(!!errors.confirmar_senha)}
                    type="password"
                    {...register("confirmar_senha")}
                    autoComplete="new-password"
                  />
                  {errors.confirmar_senha && (
                    <div className="auth-error">{errors.confirmar_senha.message}</div>
                  )}
                </div>

                <fieldset className="auth-fieldset">
                  <legend>Contato de emergência</legend>
                  <div className="auth-fieldset-grid">
                    <div className="auth-field">
                      <label className="auth-label">Nome*</label>
                      <input
                        className={fieldClass(!!errors.emergency_contact_name)}
                        {...register("emergency_contact_name")}
                      />
                      {errors.emergency_contact_name && (
                        <div className="auth-error">{errors.emergency_contact_name.message}</div>
                      )}
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Telefone*</label>
                      <Controller
                        control={control}
                        name="emergency_contact_phone"
                        render={({ field }) => (
                          <input
                            className={fieldClass(!!errors.emergency_contact_phone)}
                            value={field.value}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            onBlur={field.onBlur}
                            inputMode="numeric"
                            placeholder="(11) 99999-9999"
                          />
                        )}
                      />
                      {errors.emergency_contact_phone && (
                        <div className="auth-error">{errors.emergency_contact_phone.message}</div>
                      )}
                    </div>
                  </div>
                </fieldset>

                <label className="auth-checkbox">
                  <input type="checkbox" {...register("accepts_terms")} />
                  <span>
                    Aceito os <a href="/termos">termos de uso</a> e a{" "}
                    <a href="/privacidade">política de privacidade</a>.*
                  </span>
                </label>
                {errors.accepts_terms && (
                  <div className="auth-error">{errors.accepts_terms.message}</div>
                )}

                <label className="auth-checkbox">
                  <input type="checkbox" {...register("accepts_communications")} />
                  <span>Desejo receber comunicações por email.</span>
                </label>
              </>
            )}

            {submitError && (
              <div role="alert" className="auth-alert">{submitError}</div>
            )}

            <div className="auth-actions">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                  className="auth-button auth-button--ghost"
                >
                  Voltar
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="auth-button auth-button--primary"
                  style={{ marginLeft: "auto" }}
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-button auth-button--success"
                  style={{ marginLeft: "auto" }}
                >
                  {isSubmitting ? "Criando conta..." : "Criar conta"}
                </button>
              )}
            </div>
          </form>

          <p className="auth-foot">
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
