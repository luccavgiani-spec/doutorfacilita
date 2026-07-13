"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  type Variants,
} from "framer-motion";
import ShapeGrid from "./ShapeGrid";
import { Logo } from "./Logo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ────────────────────────────────────────────────────────────
   Paleta local da LP (azul + branco + destaque âmbar)
   brand-deep  #123FBF   brand  #1E5AE8   brand-sky #2FA4F2
   ink #0B1B3A   muted #55647E   accent #F59E0B   ok #10B981
   ──────────────────────────────────────────────────────────── */

/* setinha dos CTAs */
function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function Check({ className = "text-[#10B981]" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* número animado das métricas */
function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current)
          ref.current.textContent =
            prefix +
            v.toLocaleString("pt-BR", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }) +
            suffix;
      },
    });
    return () => controls.stop();
  }, [inView, to, prefix, suffix, decimals]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

/* animação padrão de entrada das seções */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ──────────────────────────── NAV ──────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[#E6ECF8] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-5">
        <Link href="/" aria-label="Plantão Digital">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-[14.5px] font-medium text-[#3B4A66] md:flex">
          <a href="#como-funciona" className="transition hover:text-[#1E5AE8]">Como funciona</a>
          <a href="#preco" className="transition hover:text-[#1E5AE8]">Preço</a>
          <a href="#duvidas" className="transition hover:text-[#1E5AE8]">Dúvidas</a>
          <Link href="/login" className="transition hover:text-[#1E5AE8]">Entrar</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-full bg-[#1E5AE8] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(30,90,232,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1748C9] hover:shadow-[0_6px_20px_rgba(30,90,232,0.45)] md:inline-flex"
          >
            Iniciar consulta <Arrow />
          </Link>
          <button
            aria-label="Abrir menu"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6ECF8] text-[#0B1B3A] md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-[#E6ECF8] bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4 text-[15px] font-medium text-[#3B4A66]">
              <a href="#como-funciona" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-[#F2F6FF]">Como funciona</a>
              <a href="#preco" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-[#F2F6FF]">Preço</a>
              <a href="#duvidas" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-[#F2F6FF]">Dúvidas</a>
              <Link href="/login" className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#1E5AE8] px-5 py-3 font-semibold text-white">
                Iniciar consulta — R$ 39,90 <Arrow />
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */

/* fotos placeholder (randomuser.me) — trocar por fotos licenciadas antes do go-live */
const PHOTOS = {
  juliana: "https://randomuser.me/api/portraits/women/44.jpg",
  carlos: "https://randomuser.me/api/portraits/men/54.jpg",
  fernanda: "https://randomuser.me/api/portraits/women/26.jpg",
};

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#EEF4FF] via-white to-white">
      {/* grid animado de fundo */}
      <div className="absolute inset-0 -z-10">
        <ShapeGrid
          direction="diagonal"
          speed={0.45}
          squareSize={46}
          borderColor="rgba(30,90,232,0.14)"
          hoverFillColor="rgba(30,90,232,0.10)"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>

      {/* overlays de legibilidade: clareia o centro (texto nítido) e desvanece as bordas */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(62%_55%_at_50%_42%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.7)_48%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-white" />

      {/* textura suave (brilho superior) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,164,242,0.14),transparent)]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-68px)] max-w-[1120px] flex-col items-center justify-center px-5 pb-24 pt-16 lg:pb-28 lg:pt-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto flex max-w-[760px] flex-col items-center text-center"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-[#D6E3FB] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E5AE8] shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            </span>
            Médicos online agora
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0B1B3A] sm:text-[54px] lg:text-[62px]"
          >
            Consulta médica{" "}
            <span className="font-serif italic text-[#1E5AE8]">em minutos</span>,
            <br className="hidden sm:block" /> sem sair de casa.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-[560px] text-[17px] leading-relaxed text-[#55647E]"
          >
            Pague <strong className="font-semibold text-[#0B1B3A]">R$ 39,90</strong>, entre na
            fila virtual e fale por vídeo com um médico de CRM ativo. Receita digital, atestado
            e pedido de exames chegam direto no seu celular.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#1E5AE8] px-7 py-4 text-[15.5px] font-semibold text-white shadow-[0_8px_24px_rgba(30,90,232,0.4)] transition hover:-translate-y-0.5 hover:bg-[#1748C9] hover:shadow-[0_12px_32px_rgba(30,90,232,0.5)]"
            >
              Iniciar consulta — R$ 39,90
              <span className="transition-transform group-hover:translate-x-1">
                <Arrow />
              </span>
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-full border border-[#D6E3FB] bg-white px-6 py-4 text-[15px] font-semibold text-[#0B1B3A] transition hover:border-[#1E5AE8] hover:text-[#1E5AE8]"
            >
              Como funciona
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-2.5">
            {["CRM ativo", "Receita digital válida", "LGPD · CFM"].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#3B4A66] shadow-[0_1px_3px_rgba(11,27,58,0.08)] ring-1 ring-[#E6ECF8]"
              >
                <Check className="text-[#1E5AE8]" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────── MÉTRICAS ────────────────────────── */
function Stats() {
  const stats = [
    { value: <CountUp to={12400} prefix="+" />, label: "consultas realizadas" },
    { value: <CountUp to={8} suffix=" min" />, label: "tempo médio até o atendimento" },
    { value: <CountUp to={4.9} decimals={1} suffix="/5" />, label: "nota média dos pacientes" },
    { value: "7h–23h", label: "atendimento todos os dias" },
  ];
  return (
    <section className="border-y border-[#E6ECF8] bg-white">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto grid max-w-[1120px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-14 lg:grid-cols-4"
      >
        {stats.map((s, i) => (
          <motion.div key={i} variants={fadeUp} className="text-center">
            <div className="text-[34px] font-bold tracking-tight text-[#1E5AE8] sm:text-[40px]">
              {s.value}
            </div>
            <div className="mt-1 text-[13.5px] font-medium text-[#55647E]">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ──────────────────────── COMO FUNCIONA ──────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Entre e pague R$ 39,90",
      desc: "Crie sua conta em 2 minutos e pague com PIX ou cartão. Sem mensalidade, sem fidelidade.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" />
        </svg>
      ),
    },
    {
      n: "2",
      title: "Aguarde na fila virtual",
      desc: "Acompanhe sua posição em tempo real pelo celular. O tempo médio de espera é de 8 minutos.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
        </svg>
      ),
    },
    {
      n: "3",
      title: "Consulte por vídeo",
      desc: "Fale com o médico, tire dúvidas e receba receita digital, atestado ou pedido de exames na hora.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="14" height="12" rx="3" /><path d="M16 10l6-3v10l-6-3" />
        </svg>
      ),
    },
  ];
  return (
    <section id="como-funciona" className="bg-[#F7F9FD] py-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-[560px] text-center"
        >
          <motion.span variants={fadeUp} className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1E5AE8]">
            Como funciona
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Do login à receita em{" "}
            <span className="font-serif italic text-[#1E5AE8]">três passos</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {steps.map((s) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="relative rounded-3xl border border-[#E6ECF8] bg-white p-8 shadow-[0_2px_8px_rgba(11,27,58,0.04)] transition-shadow hover:shadow-[0_20px_44px_-12px_rgba(11,27,58,0.14)]"
            >
              <span className="absolute right-7 top-7 font-serif text-[44px] italic leading-none text-[#E6ECF8]">
                {s.n}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F6FF] text-[#1E5AE8]">
                {s.icon}
              </span>
              <h3 className="mt-6 text-[19px] font-bold text-[#0B1B3A]">{s.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#55647E]">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── PREÇO ─────────────────────────── */
function Pricing() {
  const items = [
    "Consulta por vídeo com médico de CRM ativo",
    "Receita digital válida em todo o Brasil",
    "Atestado e pedido de exames, se necessário",
    "Fila virtual com posição em tempo real",
    "Pagamento por PIX ou cartão",
    "Sem mensalidade e sem fidelidade",
  ];
  return (
    <section id="preco" className="bg-white py-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-[560px] text-center"
        >
          <motion.span variants={fadeUp} className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1E5AE8]">
            Preço único
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Um serviço, um preço.{" "}
            <span className="font-serif italic text-[#1E5AE8]">Sem surpresa.</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mx-auto mt-14 max-w-[820px] overflow-hidden rounded-[32px] border border-[#D6E3FB] bg-gradient-to-br from-[#F2F6FF] to-white p-8 shadow-[0_28px_64px_-16px_rgba(30,90,232,0.22)] sm:p-12"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#2FA4F2]/10 blur-2xl" />

          <div className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex rounded-full bg-[#FEF3C7] px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide text-[#B45309]">
                Pronto atendimento
              </span>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-[18px] font-semibold text-[#55647E]">R$</span>
                <span className="text-[64px] font-bold leading-none tracking-tight text-[#0B1B3A]">
                  39,90
                </span>
                <span className="mb-1.5 text-[15px] font-medium text-[#55647E]">/ consulta</span>
              </div>
              <p className="mt-4 max-w-[380px] text-[15px] leading-relaxed text-[#55647E]">
                Você paga apenas quando precisa. Nada de plano, assinatura ou carência.
              </p>

              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px] font-medium text-[#3B4A66]">
                    <span className="mt-0.5 shrink-0">
                      <Check />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:w-[220px]">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#1E5AE8] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(30,90,232,0.4)] transition hover:-translate-y-0.5 hover:bg-[#1748C9]"
              >
                Iniciar consulta
                <span className="transition-transform group-hover:translate-x-1">
                  <Arrow />
                </span>
              </Link>
              <span className="text-center text-[12.5px] text-[#8B97AD]">
                PIX aprovado na hora
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── BENEFÍCIOS ───────────────────────── */
function Benefits() {
  const items = [
    {
      title: "Sem agendamento",
      desc: "Nada de esperar dias por um horário. Entrou na fila, foi atendido no mesmo dia.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L4.5 12.5H11l-1 9.5L18.5 11H12l1-9z" />
        </svg>
      ),
    },
    {
      title: "Médicos verificados",
      desc: "Todos os profissionais têm CRM ativo e são verificados antes de atender na plataforma.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z" /><path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Receita aceita na farmácia",
      desc: "Receita digital com assinatura eletrônica válida em qualquer farmácia do Brasil.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M9 15h6M12 12v6" />
        </svg>
      ),
    },
    {
      title: "Dados protegidos",
      desc: "Consulta criptografada e prontuário seguro, em conformidade com LGPD e normas do CFM.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" />
        </svg>
      ),
    },
  ];
  return (
    <section className="bg-[#F7F9FD] py-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-[600px] text-center"
        >
          <motion.span variants={fadeUp} className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1E5AE8]">
            Por que o Plantão Digital
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Saúde{" "}
            <span className="font-serif italic text-[#1E5AE8]">descomplicada</span>, do jeito
            que deveria ser
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {items.map((b) => (
            <motion.div
              key={b.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-[#E6ECF8] bg-white p-7 shadow-[0_2px_8px_rgba(11,27,58,0.04)] transition-shadow hover:shadow-[0_20px_44px_-12px_rgba(11,27,58,0.14)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F6FF] text-[#1E5AE8]">
                {b.icon}
              </span>
              <h3 className="mt-5 text-[17px] font-bold text-[#0B1B3A]">{b.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#55647E]">{b.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── DEPOIMENTOS ──────────────────────── */
function Testimonials() {
  const items = [
    {
      quote:
        "Meu filho acordou com febre num domingo. Em 12 minutos eu já estava falando com a médica e saí com a receita no celular.",
      name: "Juliana R.",
      info: "São Paulo · SP",
      photo: PHOTOS.juliana,
    },
    {
      quote:
        "Precisava de atestado e não podia faltar mais um dia de trabalho pra ir ao posto. Resolvi tudo no intervalo do almoço.",
      name: "Carlos M.",
      info: "Belo Horizonte · MG",
      photo: PHOTOS.carlos,
    },
    {
      quote:
        "Achei que por R$ 39,90 seria um atendimento corrido. A médica me ouviu com calma e explicou tudo. Virou meu plano B de saúde.",
      name: "Fernanda T.",
      info: "Curitiba · PR",
      photo: PHOTOS.fernanda,
    },
  ];
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-[560px] text-center"
        >
          <motion.span variants={fadeUp} className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1E5AE8]">
            Depoimentos
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Quem usou,{" "}
            <span className="font-serif italic text-[#1E5AE8]">recomenda</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {items.map((t) => (
            <motion.figure
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="flex flex-col rounded-3xl border border-[#E6ECF8] bg-white p-8 shadow-[0_2px_8px_rgba(11,27,58,0.04)] transition-shadow hover:shadow-[0_20px_44px_-12px_rgba(11,27,58,0.14)]"
            >
              <div className="flex gap-1 text-[#F59E0B]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-[#3B4A66]">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.photo}
                  alt={t.name}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-[#E6ECF8]"
                />
                <span>
                  <span className="block text-[14px] font-bold text-[#0B1B3A]">{t.name}</span>
                  <span className="block text-[12.5px] text-[#8B97AD]">{t.info}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
function Faq() {
  const items = [
    {
      q: "É uma consulta de verdade, com médico?",
      a: "Sim. Você é atendido por vídeo por um médico com CRM ativo, que avalia seu caso, orienta o tratamento e emite os documentos necessários — como faria num consultório.",
    },
    {
      q: "A receita digital vale na farmácia?",
      a: "Vale. A receita tem assinatura eletrônica certificada e é aceita em qualquer farmácia do Brasil. Ela chega no seu celular logo após a consulta.",
    },
    {
      q: "Quanto custa? Tem mensalidade?",
      a: "R$ 39,90 por consulta, e só. Não existe plano, assinatura, taxa de adesão ou fidelidade. Você paga apenas quando usa.",
    },
    {
      q: "Quanto tempo até ser atendido?",
      a: "O tempo médio é de 8 minutos. Após o pagamento você entra na fila virtual e acompanha sua posição em tempo real pelo celular.",
    },
    {
      q: "Quais formas de pagamento vocês aceitam?",
      a: "PIX (aprovação na hora) e cartão de crédito. O pagamento é processado com segurança pelo Mercado Pago.",
    },
    {
      q: "O que o pronto atendimento não cobre?",
      a: "Emergências com risco de vida (dor no peito intensa, falta de ar grave, acidentes) devem ser atendidas presencialmente — ligue 192 (SAMU). Para os demais casos do dia a dia, estamos aqui.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="duvidas" className="bg-[#F7F9FD] py-24">
      <div className="mx-auto max-w-[760px] px-5">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <motion.span variants={fadeUp} className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1E5AE8]">
            Dúvidas frequentes
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Antes de{" "}
            <span className="font-serif italic text-[#1E5AE8]">começar</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 space-y-3"
        >
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                  isOpen ? "border-[#BFD4FF]" : "border-[#E6ECF8]"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15.5px] font-semibold text-[#0B1B3A]">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] font-medium ${
                      isOpen ? "bg-[#1E5AE8] text-white" : "bg-[#F2F6FF] text-[#1E5AE8]"
                    }`}
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      <p className="px-6 pb-6 text-[14.5px] leading-relaxed text-[#55647E]">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── CTA FINAL ──────────────────────── */
function FinalCta() {
  return (
    <section className="bg-white px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[36px] bg-gradient-to-br from-[#123FBF] via-[#1E5AE8] to-[#2FA4F2] px-8 py-16 text-center sm:px-16 sm:py-20"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

        <h2 className="relative mx-auto max-w-[620px] text-[32px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[44px]">
          Seu médico está a{" "}
          <span className="font-serif italic">poucos cliques</span> de distância
        </h2>
        <p className="relative mx-auto mt-5 max-w-[440px] text-[16px] leading-relaxed text-white/85">
          Sem agendamento, sem deslocamento, sem mensalidade. R$ 39,90 e você é atendido hoje.
        </p>
        <div className="relative mt-9">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-[15.5px] font-bold text-[#1E5AE8] shadow-[0_12px_32px_rgba(11,27,58,0.3)] transition hover:-translate-y-0.5"
          >
            Iniciar consulta — R$ 39,90
            <span className="transition-transform group-hover:translate-x-1">
              <Arrow />
            </span>
          </Link>
        </div>
        <p className="relative mt-5 text-[12.5px] text-white/70">
          Atendimento todos os dias, das 7h às 23h
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[#E6ECF8] bg-[#F7F9FD]">
      <div className="mx-auto max-w-[1120px] px-5 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[320px]">
            <Logo />
            <p className="mt-4 text-[13.5px] leading-relaxed text-[#55647E]">
              Pronto atendimento médico por vídeo, sem agendamento e sem mensalidade. Médicos com
              CRM ativo, receita digital válida em todo o Brasil.
            </p>
          </div>
          <div className="flex gap-16">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8B97AD]">
                Navegação
              </div>
              <ul className="mt-4 space-y-2.5 text-[14px] font-medium text-[#3B4A66]">
                <li><a href="#como-funciona" className="hover:text-[#1E5AE8]">Como funciona</a></li>
                <li><a href="#preco" className="hover:text-[#1E5AE8]">Preço</a></li>
                <li><a href="#duvidas" className="hover:text-[#1E5AE8]">Dúvidas</a></li>
              </ul>
            </div>
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8B97AD]">
                Conta
              </div>
              <ul className="mt-4 space-y-2.5 text-[14px] font-medium text-[#3B4A66]">
                <li><Link href="/login" className="hover:text-[#1E5AE8]">Entrar</Link></li>
                <li><Link href="/cadastrar" className="hover:text-[#1E5AE8]">Criar conta</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E6ECF8] pt-6 text-[12.5px] leading-relaxed text-[#8B97AD]">
          <p>
            Em situações de emergência com risco de vida, ligue 192 (SAMU) ou procure o
            pronto-socorro mais próximo. O Plantão Digital segue as normas de telemedicina do CFM
            e a LGPD.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Plantão Digital. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── PÁGINA ─────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased [font-family:var(--font-dm-sans),'Helvetica_Neue',system-ui,sans-serif]">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Pricing />
        <Benefits />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
