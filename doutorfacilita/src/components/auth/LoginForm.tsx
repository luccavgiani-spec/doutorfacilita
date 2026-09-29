"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { AvatarPhoto } from "@/components/lp/avatars";

/* /login — coluna de marketing (só ≥ 1024 px) + card de acesso.
   Estilo em Tailwind local: as classes `auth-*` de globals.css seguem
   intactas para /cadastrar e /trocar-senha (só a barra superior é
   compartilhada, sem alteração). */

/* ⚠️ Prova social fictícia (Unresolved 1 da task C — bloqueia go-live):
   mesmo número da LP e avatares no padrão da LP. */
const PROOF_AVATARS = ["Rafael Andrade", "Marina T.", "Diego Farias", "Cláudia Nogueira"];

function Icon({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const IconMail = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);
const IconLock = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
  </Icon>
);
const IconEye = () => (
  <Icon>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
const IconEyeOff = () => (
  <Icon>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.4-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);
const IconArrow = () => (
  <Icon size={18}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </Icon>
);
const IconUserPlus = () => (
  <Icon>
    <circle cx="10" cy="8" r="3.6" />
    <path d="M3.5 20v-.8A5.2 5.2 0 0 1 8.7 14h2.6a5.2 5.2 0 0 1 3.3 1.2" />
    <path d="M18 14v6M15 17h6" />
  </Icon>
);
const IconClock = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
const IconShield = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 3 5 5.8v5.4c0 4.4 3 8.1 7 9.8 4-1.7 7-5.4 7-9.8V5.8z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);
const IconDoc = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 16.5h4" />
  </Icon>
);

const FEATURES = [
  { title: "Atendimento rápido", sub: "Consultas em até 10 minutos", icon: <IconClock size={22} /> },
  { title: "Médicos verificados", sub: "Com registro ativo e seguro", icon: <IconShield size={22} /> },
  { title: "Receita digital", sub: "Enviada na hora, direto no seu celular", icon: <IconDoc size={22} /> },
  { title: "Seus dados protegidos", sub: "Totalmente seguros e em conformidade com a LGPD", icon: <IconLock size={22} /> },
];

const SEALS = [
  { label: "Seus dados protegidos", icon: <IconShield size={22} /> },
  { label: "Atendimento rápido", icon: <IconClock size={22} /> },
  { label: "Receita digital válida", icon: <IconDoc size={22} /> },
];

function PlusShape({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden>
      <path d="M15 4h10v11h11v10H25v11H15V25H4V15h11z" fill="currentColor" />
    </svg>
  );
}

function MarketingColumn() {
  return (
    <section data-login-marketing className="relative hidden min-h-[660px] lg:block">
      {/* foto da médica (quadro do vídeo da hero) sobre círculo azul */}
      <div data-login-photo className="pointer-events-none absolute right-[-40px] top-[236px] h-[240px] w-[240px] xl:right-[-64px] xl:top-[150px] xl:h-[350px] xl:w-[350px]">
        <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2FA4F2] via-[#1E5AE8] to-[#123FBF]" />
        <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(47,164,242,0.22),transparent)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/login-medica.webp"
          alt="Médica do Plantão Digital sorrindo"
          className="absolute inset-[10px] h-[calc(100%-20px)] w-[calc(100%-20px)] rounded-full object-cover object-[50%_20%] ring-4 ring-white/80 xl:inset-[14px] xl:h-[calc(100%-28px)] xl:w-[calc(100%-28px)]"
        />
        <PlusShape className="absolute -left-4 top-2 h-8 w-8 text-[#BBD2FA]" />
        <PlusShape className="absolute -bottom-6 right-16 h-12 w-12 text-[#D6E4FC] xl:right-24" />
        <p className="absolute -top-[74px] left-[28px] -rotate-[14deg] whitespace-nowrap font-accent text-[26px] leading-[1.05] text-[#1E5AE8] xl:left-[48px] xl:text-[28px]">
          Sua saúde <br />
          em boas mãos
          <svg aria-hidden className="ml-8 mt-0.5 block h-2.5 w-28" viewBox="0 0 112 10" fill="none">
            <path d="M2 8C30 3 70 1 110 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </p>
      </div>

      <div className="relative z-10 max-w-[280px] pt-8 xl:max-w-[320px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#55647E]">
          SAÚDE SEM COMPLICAÇÃO
        </p>
        <p className="mt-3 text-[36px] font-bold leading-[1.02] tracking-[-0.03em] text-[#0B1B3A] xl:text-[42px]">
          <span className="block">Cuidado médico</span>
          <span className="block font-accent text-[44px] font-bold leading-[1] tracking-normal text-[#1E5AE8] xl:text-[50px]">
            quando você
          </span>
          <span className="block">mais precisa.</span>
        </p>
        <p className="mt-4 text-[16.5px] leading-relaxed text-[#55647E]">
          Consultas online com médicos de verdade, na hora que você precisar, de onde estiver.
        </p>

        <ul data-login-features className="mt-7 space-y-5">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-[#1E5AE8]">
                {f.icon}
              </span>
              <span className="pt-0.5">
                <span className="block text-[14.5px] font-semibold text-[#0B1B3A]">{f.title}</span>
                <span className="block text-[13.5px] leading-snug text-[#55647E]">{f.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        data-login-proof
        className="relative z-10 mt-9 flex max-w-[430px] items-center gap-4 rounded-2xl border border-[#EDF2FB] bg-white/90 px-5 py-4 shadow-[0_14px_34px_-18px_rgba(11,27,58,0.25)] backdrop-blur"
      >
        <div className="flex shrink-0 -space-x-3">
          {PROOF_AVATARS.map((n) => (
            <span key={n} data-login-avatar className="block rounded-full ring-2 ring-white">
              <AvatarPhoto name={n} className="block h-10 w-10" />
            </span>
          ))}
        </div>
        <div>
          <div data-login-stars className="flex gap-0.5 text-[#F59E0B]" role="img" aria-label="5 de 5 estrelas">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
              </svg>
            ))}
          </div>
          <p className="mt-1 text-[13px] font-medium leading-snug text-[#123FBF]">
            +12.400 consultas realizadas com qualidade e segurança.
          </p>
        </div>
      </div>
    </section>
  );
}

const inputBase =
  "h-[50px] w-full rounded-xl border bg-white pl-11 text-[15px] text-[#0B1B3A] outline-none transition placeholder:text-[#8B97AD] focus:ring-4";
const inputOk = "border-[#DCE4F2] focus:border-[#1E5AE8] focus:ring-[#1E5AE8]/10";
const inputErr = "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Referência 2 no mobile: só o card (com logo e "Criar conta") — a barra
          superior repetiria o logo, então só aparece a partir de lg. */}
      <div className="hidden lg:block">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Plantão Digital — página inicial">
            <Logo size={30} />
          </Link>
          <Link href="/cadastrar" className="auth-top-link">
            Não tem conta? <b>Cadastre-se</b>
          </Link>
        </div>
      </header>
      </div>

      <main className="relative flex-1 overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-6 px-4 py-6 sm:px-6 sm:py-12 lg:grid-cols-[1fr_456px] lg:py-12">
          <MarketingColumn />

          <div
            data-login-card
            className="relative z-10 mx-auto w-full max-w-[456px] rounded-[24px] border border-[#E6ECF8] bg-white px-5 py-8 shadow-[0_24px_60px_-24px_rgba(11,27,58,0.22)] sm:px-9 sm:py-10"
          >
            <Link href="/" className="flex justify-center" style={{ textDecoration: "none" }} aria-label="Plantão Digital — página inicial">
              <Logo size={32} />
            </Link>
            <h1 className="mt-6 text-center text-[26px] font-bold tracking-[-0.02em] text-[#0B1B3A]">
              Acesse sua conta
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-[14.5px] leading-relaxed text-[#55647E] sm:max-w-none">
              Entre para iniciar sua consulta e cuidar da sua saúde.
            </p>

            <nav data-login-segment aria-label="Entrar ou criar conta" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#F1F5FD] p-1">
              <span
                aria-current="page"
                className="rounded-lg bg-[#1E5AE8] py-2.5 text-center text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(30,90,232,0.3)]"
              >
                Entrar
              </span>
              <Link
                href="/cadastrar"
                className="rounded-lg py-2.5 text-center text-[15px] font-semibold text-[#1E5AE8] transition hover:bg-white"
              >
                Criar conta
              </Link>
            </nav>

            <form className="mt-6" onSubmit={handleSubmit} noValidate>
              <label className="block text-[14px] font-semibold text-[#0B1B3A]" htmlFor="email">
                E-mail
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#55647E]">
                  <IconMail />
                </span>
                <input
                  id="email"
                  name="email"
                  className={`${inputBase} pr-4 ${error ? inputErr : inputOk}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  inputMode="email"
                  placeholder="seu@email.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>

              <label className="mt-5 block text-[14px] font-semibold text-[#0B1B3A]" htmlFor="password">
                Senha
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#55647E]">
                  <IconLock />
                </span>
                <input
                  id="password"
                  name="password"
                  className={`${inputBase} pr-12 ${error ? inputErr : inputOk}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  data-login-toggle-password
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#55647E] transition hover:bg-[#F1F5FD] hover:text-[#1E5AE8]"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              <div className="mt-2.5 flex justify-end">
                <Link href="/esqueci-senha" className="text-[13.5px] font-semibold text-[#1E5AE8] hover:underline">
                  Esqueci minha senha?
                </Link>
              </div>

              {error && (
                <div
                  id="login-error"
                  role="alert"
                  className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#B91C1C]"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                data-login-submit
                disabled={loading}
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#1E5AE8] text-[16px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(30,90,232,0.55)] transition hover:bg-[#1748C9] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  "Entrando..."
                ) : (
                  <>
                    Entrar <IconArrow />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3 text-[13.5px] text-[#55647E]">
              <span className="h-px flex-1 bg-[#E6ECF8]" />
              Primeira vez por aqui?
              <span className="h-px flex-1 bg-[#E6ECF8]" />
            </div>

            <Link
              href="/cadastrar"
              data-login-create
              className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#1E5AE8] text-[15.5px] font-semibold text-[#1E5AE8] transition hover:bg-[#F5F8FF]"
            >
              <IconUserPlus /> Criar minha conta
            </Link>

            <ul data-login-seals className="mt-7 grid grid-cols-3 rounded-xl bg-[#F5F8FE] py-3">
              {SEALS.map((s, i) => (
                <li
                  key={s.label}
                  className={`flex flex-col items-center gap-1.5 px-2 text-center text-[11.5px] leading-tight text-[#55647E] sm:flex-row sm:text-left ${
                    i > 0 ? "border-l border-[#E3EBFA]" : ""
                  }`}
                >
                  <span className="shrink-0 text-[#1E5AE8]">{s.icon}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
