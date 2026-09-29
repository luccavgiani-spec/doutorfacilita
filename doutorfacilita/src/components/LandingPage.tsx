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
import { Logo, LogoMark } from "./Logo";
import { AvatarPhoto } from "./lp/avatars";
import InstallBar from "./lp/InstallBar";

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

/* cadeado genérico (usado no selo de pagamento seguro) */
function LockIcon() {
  return (
    <svg className="text-[#2FA4F2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

/* ──────────────────────── PARCEIROS OFICIAIS ────────────────────────
   Selos discretos: Mevo (logo oficial no repo) + Mercado Pago.
   OBS.: não há asset oficial do Mercado Pago no repositório, então o
   nome usa um tratamento tipográfico sóbrio (wordmark). Para trocar por
   um PNG oficial, basta adicionar o arquivo em /public/assets/ e
   substituir o wordmark por um <img>.
   ──────────────────────────────────────────────────────────────────── */
function PartnerBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B97AD]">
        Parceiros oficiais
      </span>

      {/* Mevo — logo oficial (asset presente no repo) */}
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[#55647E]">
        Receita digital via
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/mevo-logo.png" alt="Mevo" className="h-[15px] w-auto" />
      </span>

      {/* Mercado Pago — wordmark tipográfico (sem asset oficial no repo) */}
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[#55647E]">
        Pagamento seguro via
        <span className="inline-flex items-center gap-1 rounded-md bg-[#F2F6FF] px-2 py-1 ring-1 ring-[#E6ECF8]">
          <LockIcon />
          <span className="text-[12.5px] font-bold tracking-tight text-[#123FBF]">
            Mercado&nbsp;Pago
          </span>
        </span>
      </span>
    </div>
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

/* ícones de traço da hero (mesma família dos demais ícones da LP) */
function StrokeIcon({ size = 24, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const IconVideoCam = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="2" y="6" width="13" height="12" rx="3" />
    <path d="M16.5 10.2 21 7.5v9l-4.5-2.7z" />
  </svg>
);
const IconLock = () => (
  <StrokeIcon size={18}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
  </StrokeIcon>
);
const IconRecipe = () => (
  <StrokeIcon size={30}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
    <path d="M14 3v4a1 1 0 0 0 1 1h4v3" />
    <path d="M8.5 11h6M8.5 14.5h3.5" />
    <circle cx="17.5" cy="17.5" r="4" fill="#10B981" stroke="#10B981" />
    <path d="m15.8 17.6 1.2 1.2 2.3-2.4" stroke="#fff" />
  </StrokeIcon>
);
const IconShieldCheck = ({ size = 30 }: { size?: number }) => (
  <StrokeIcon size={size}>
    <path d="M12 3 5 5.8v5.4c0 4.4 3 8.1 7 9.8 4-1.7 7-5.4 7-9.8V5.8z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </StrokeIcon>
);
const IconFlask = () => (
  <StrokeIcon size={30}>
    <path d="M9.5 3h5M10.5 3v6.2L5.2 18.4A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.6-2.6L13.5 9.2V3" />
    <path d="M7.6 15h8.8" />
  </StrokeIcon>
);
const IconClock = () => (
  <StrokeIcon size={26}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </StrokeIcon>
);
const IconTeam = () => (
  <StrokeIcon size={26}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M6 20v-1.2A4.8 4.8 0 0 1 10.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <circle cx="5" cy="10" r="2.2" />
    <circle cx="19" cy="10" r="2.2" />
    <path d="M2 18.5v-.6a3 3 0 0 1 3-3M22 18.5v-.6a3 3 0 0 0-3-3" />
  </StrokeIcon>
);

const HERO_CARDS = [
  { title: "Receita digital", sub: "enviada na hora", icon: <IconRecipe /> },
  { title: "Atestado", sub: "válido e seguro", icon: <IconShieldCheck /> },
  { title: "Pedido de exames", sub: "sem papel", icon: <IconFlask /> },
];

const HERO_STRIP = [
  { title: "Atendimento 7h–23h", sub: "todos os dias", icon: <IconClock /> },
  { title: "CRM ativo", sub: "e atendimento seguro", icon: <IconShieldCheck size={26} /> },
  { title: "Equipe médica qualificada", sub: "e em constante avaliação", icon: <IconTeam /> },
];

/* Vídeo da médica dentro do mockup: autoplay mudo em loop, sem nenhum
   controle para o usuário (sem controls, sem PiP, sem menu de contexto,
   sem clique). O React não serializa `muted` no HTML do SSR, então o
   efeito garante o mudo antes de pedir o play — requisito de autoplay
   no Chrome Android e no Safari iOS. Se o play for bloqueado (ex.: modo
   de economia do iOS), o poster continua na tela. */
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p) p.catch(() => {});
    };
    tryPlay();
    // o navegador pode pausar o vídeo com a aba em segundo plano; retoma ao voltar
    const onVisible = () => {
      if (document.visibilityState === "visible" && v.paused) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return (
    <video
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      src="/assets/hero-medica.mp4"
      poster="/assets/hero-medica-poster.webp"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={-1}
      aria-label="Médica atendendo por vídeo no Plantão Digital"
    />
  );
}

/* Mockup de celular com a "chamada" (cabeçalho com a logo e controles
   desenhados — puramente decorativos). */
function PhoneMockup() {
  return (
    <div data-hero-phone className="relative mx-auto w-[240px] rotate-[4deg] sm:w-[262px] lg:w-[272px]">
      <span aria-hidden className="absolute -left-[3px] top-[96px] h-9 w-[3px] rounded-l bg-[#1B2440]" />
      <span aria-hidden className="absolute -left-[3px] top-[142px] h-9 w-[3px] rounded-l bg-[#1B2440]" />
      <span aria-hidden className="absolute -right-[3px] top-[118px] h-14 w-[3px] rounded-r bg-[#1B2440]" />
      <div className="relative aspect-[9/19] rounded-[42px] bg-[#111a2e] p-[9px] shadow-[0_40px_70px_-22px_rgba(11,27,58,0.55),0_14px_30px_-12px_rgba(30,90,232,0.35)] ring-1 ring-[#2A3350]">
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#DCE6F5]">
          <HeroVideo />

          {/* dynamic island */}
          <div aria-hidden className="absolute left-1/2 top-[9px] z-10 h-[20px] w-[84px] -translate-x-1/2 rounded-full bg-[#111a2e]" />

          {/* cabeçalho da chamada com a logo */}
          <div data-hero-phone-header className="absolute inset-x-0 top-0 bg-gradient-to-b from-white via-white/80 to-transparent px-4 pb-9 pt-9">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LogoMark size={20} />
                <span className="text-[13px] font-bold tracking-tight text-[#0B1B3A]">
                  Plantão<span className="text-[#1E5AE8]">Digital</span>
                </span>
              </span>
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(11,27,58,0.12)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#55647E"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
              </span>
            </div>
          </div>

          {/* controles da chamada (desenhados, não clicáveis) */}
          <div data-hero-phone-controls aria-hidden className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/40 to-transparent pb-6 pt-12">
            <span data-control="mic" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
            </span>
            <span data-control="encerrar" className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#EF4444] text-white shadow-[0_6px_16px_rgba(239,68,68,0.5)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-2.6 0-5 .5-7.2 1.5-.7.3-1.1 1-1.1 1.8v2.4c0 .8.8 1.4 1.6 1.2l2.9-.8c.6-.2 1-.7 1-1.3v-1.6c1.8-.5 3.8-.5 5.6 0v1.6c0 .6.4 1.1 1 1.3l2.9.8c.8.2 1.6-.4 1.6-1.2v-2.4c0-.8-.4-1.5-1.1-1.8C17 9.5 14.6 9 12 9z" /></svg>
            </span>
            <span data-control="camera" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-md">
              <IconVideoCam size={20} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section data-hero className="relative isolate overflow-hidden bg-gradient-to-b from-[#EEF4FF] via-white to-white">
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

      {/* overlays de legibilidade: clareiam atrás do texto e desvanecem a base */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_55%_at_28%_42%,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.65)_55%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-white" />

      {/* O contêiner deixa o hover passar para o grid; só os blocos de
          conteúdo capturam o ponteiro. */}
      <div className="pointer-events-none relative mx-auto max-w-[1180px] px-5 pb-14 pt-10 sm:pt-14 lg:pb-16 lg:pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-4">
          <motion.div
            data-hero-copy
            variants={stagger}
            initial="hidden"
            animate="show"
            className="pointer-events-auto flex flex-col items-start"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#E3EBFA] bg-white px-4 py-2 text-[14px] font-semibold text-[#1E5AE8] shadow-[0_4px_14px_rgba(11,27,58,0.06)]"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              </span>
              Médicos online agora
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[40px] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[56px] lg:text-[50px] xl:text-[64px]"
            >
              <span className="block text-[#0B1B3A]">Seu médico,</span>
              <span className="block text-[#1E5AE8]">onde você estiver.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#55647E] sm:text-[19px]">
              Consulta online por vídeo, com médicos de CRM ativo.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 w-full sm:w-auto">
              <Link
                href="/login"
                data-hero-cta
                className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1E5AE8] px-4 py-[17px] text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(30,90,232,0.42)] transition hover:-translate-y-0.5 hover:bg-[#1748C9] hover:shadow-[0_16px_36px_rgba(30,90,232,0.5)] sm:inline-flex sm:w-auto sm:gap-3 sm:px-8 sm:py-[19px] sm:text-[18px]"
              >
                <IconVideoCam size={22} />
                <span>
                  Iniciar consulta agora — <span className="whitespace-nowrap">R$ 39,90</span>
                </span>
                <span className="transition-transform group-hover:translate-x-1">
                  <Arrow />
                </span>
              </Link>
              <p className="mt-4 flex items-center justify-center gap-2 text-[13.5px] text-[#55647E] sm:justify-start sm:pl-10">
                <span className="text-[#55647E]"><IconLock /></span>
                Pagamento seguro e protegido
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            data-hero-visual
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[560px] lg:max-w-none"
          >
            {/* círculo azul claro atrás do celular */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[260px] -z-10 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,164,242,0.20),rgba(30,90,232,0.07)_72%,transparent)] lg:left-[40%] lg:top-1/2 lg:h-[540px] lg:w-[540px]"
            />

            <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-7">
              <div className="pointer-events-auto">
                <PhoneMockup />
              </div>

              <ul data-hero-cards className="pointer-events-auto grid w-full gap-3 sm:grid-cols-3 lg:w-[236px] lg:grid-cols-1 lg:gap-4">
                {HERO_CARDS.map((c) => (
                  <li
                    key={c.title}
                    data-hero-card
                    className="flex items-center gap-4 rounded-2xl border border-[#EDF2FB] bg-white/95 px-5 py-4 shadow-[0_14px_34px_-14px_rgba(11,27,58,0.22)] backdrop-blur"
                  >
                    <span className="shrink-0 text-[#1E5AE8]">{c.icon}</span>
                    <span>
                      <span className="block text-[15px] font-bold text-[#0B1B3A]">{c.title}</span>
                      <span className="block text-[13.5px] text-[#55647E]">{c.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p
              data-hero-handwritten
              className="pointer-events-auto mt-6 text-center font-accent text-[30px] leading-[1.05] text-[#1E5AE8] lg:absolute lg:-bottom-8 lg:right-0 lg:mt-0 lg:-rotate-[16deg] lg:text-left lg:text-[34px]"
            >
              Cuidando <br className="hidden lg:block" />de você, <br className="hidden lg:block" />sempre.
              <svg aria-hidden className="mx-auto mt-1 block h-3 w-40 lg:ml-6" viewBox="0 0 160 12" fill="none">
                <path d="M2 9C40 3 100 1 158 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </p>
          </motion.div>
        </div>

        <motion.ul
          data-hero-strip
          variants={stagger}
          initial="hidden"
          animate="show"
          className="pointer-events-auto mt-14 grid gap-6 sm:grid-cols-3 sm:gap-0 lg:mt-16"
        >
          {HERO_STRIP.map((s, i) => (
            <motion.li
              key={s.title}
              variants={fadeUp}
              className={`flex items-center gap-4 sm:justify-center sm:px-4 ${i > 0 ? "sm:border-l sm:border-[#E3EBFA]" : ""}`}
            >
              <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#EAF1FF] text-[#1E5AE8]">
                {s.icon}
              </span>
              <span>
                <span className="block text-[15.5px] font-bold text-[#0B1B3A]">{s.title}</span>
                <span className="block text-[13.5px] text-[#55647E]">{s.sub}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
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

          {/* selos discretos de parceiros oficiais */}
          <PartnerBadges className="relative mt-8 border-t border-[#E6ECF8] pt-6" />
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

/* ──────────────────────── DEPOIMENTOS ────────────────────────
   ⚠️ Depoimentos de DEMONSTRAÇÃO — conteúdo 100% fictício e original,
   criado como placeholder da LP do Plantão Digital. Substituir por
   depoimentos reais (com consentimento dos pacientes) antes do
   lançamento. Fotos: public/assets/depoimentos (ver PHOTO_BY_NAME).
   Layout inspirado em marquee de
   colunas (inspiração de alto nível, sem código/texto de terceiros).
   ──────────────────────────────────────────────────────────────── */
type Testimonial = {
  quote: string;
  name: string;
  info: string;
  rating: number; // nota plausível de demonstração: 4.5 – 5.0
  color: string; // cor do avatar de iniciais
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Acordei com dor de garganta e febre num sábado. Entrei na fila e em poucos minutos já estava com a médica. Saí com a receita no celular.",
    name: "Marina T.",
    info: "Paciente · Recife/PE",
    rating: 5,
    color: "#1E5AE8",
  },
  {
    quote:
      "Precisava de atestado e não queria perder o dia no posto. Resolvi tudo no intervalo do almoço, por R$ 39,90.",
    name: "Rafael Andrade",
    info: "Paciente · Campinas/SP",
    rating: 4.5,
    color: "#123FBF",
  },
  {
    quote:
      "Achei que por esse preço seria corrido, mas o médico me ouviu com calma e explicou o tratamento direitinho.",
    name: "Cláudia Nogueira",
    info: "Paciente · Salvador/BA",
    rating: 5,
    color: "#2FA4F2",
  },
  {
    quote:
      "Meu filho passou mal de madrugada. Consegui uma orientação médica na hora, sem sair de casa. Muito alívio.",
    name: "Patrícia L.",
    info: "Paciente · Curitiba/PR",
    rating: 5,
    color: "#0B1B3A",
  },
  {
    quote:
      "A receita digital foi aceita na farmácia sem nenhum problema. Simples do começo ao fim.",
    name: "Diego Farias",
    info: "Paciente · Fortaleza/CE",
    rating: 4.5,
    color: "#1748C9",
  },
  {
    quote:
      "Viajo muito a trabalho e nunca tenho tempo pra marcar consulta. Aqui fui atendido no mesmo dia, pelo celular.",
    name: "Henrique B.",
    info: "Paciente · Porto Alegre/RS",
    rating: 5,
    color: "#1E5AE8",
  },
  {
    quote:
      "O tempo de espera foi bem menor do que eu imaginava. Em cerca de 10 minutos já estava conversando com o médico.",
    name: "Aline Souza",
    info: "Paciente · Belém/PA",
    rating: 5,
    color: "#2FA4F2",
  },
  {
    quote:
      "Pagar só quando preciso, sem mensalidade, faz toda diferença pro meu orçamento. Recomendo pra família toda.",
    name: "Vinícius M.",
    info: "Paciente · Goiânia/GO",
    rating: 4.5,
    color: "#123FBF",
  },
];

/* nota em estrelas com suporte a meia-estrela (via overlay recortado) */
function Stars({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const Row = ({ className }: { className: string }) => (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </div>
  );
  return (
    <div className="relative inline-flex" role="img" aria-label={`${value.toFixed(1)} de 5`}>
      <Row className="text-[#E2E8F5]" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <Row className="text-[#F59E0B]" />
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="rounded-3xl border border-[#E6ECF8] bg-white p-6 shadow-[0_2px_8px_rgba(11,27,58,0.04)]">
      <div className="flex items-center justify-between">
        <Stars value={t.rating} />
        <span className="text-[12px] font-bold text-[#8B97AD]">{t.rating.toFixed(1)}</span>
      </div>
      <blockquote className="mt-4 text-[14.5px] leading-relaxed text-[#3B4A66]">
        “{t.quote}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <AvatarPhoto name={t.name} />
        <span>
          <span className="block text-[14px] font-bold text-[#0B1B3A]">{t.name}</span>
          <span className="block text-[12.5px] text-[#8B97AD]">{t.info}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/* coluna com rolagem vertical infinita (marquee) — duplica os itens e
   desloca metade da altura pra criar loop contínuo e sem emenda */
function TestimonialColumn({
  items,
  duration,
  className = "",
}: {
  items: Testimonial[];
  duration: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <motion.div
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
        className="flex flex-col gap-6"
      >
        {[...items, ...items].map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </motion.div>
    </div>
  );
}

function Testimonials() {
  const col1 = TESTIMONIALS.slice(0, 3);
  const col2 = TESTIMONIALS.slice(3, 6);
  const col3 = TESTIMONIALS.slice(6, 8);
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
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#D6E3FB] bg-[#F2F6FF] px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#1E5AE8]">
            <Check className="text-[#1E5AE8]" /> Depoimentos
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0B1B3A] sm:text-[40px]">
            Quem usou,{" "}
            <span className="font-serif italic text-[#1E5AE8]">recomenda</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-[15.5px] leading-relaxed text-[#55647E]">
            Histórias de quem resolveu a saúde do dia a dia em minutos, sem sair de casa.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mt-14 h-[560px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TestimonialColumn items={col1} duration={30} />
            <TestimonialColumn items={col2} duration={38} className="hidden md:block" />
            <TestimonialColumn items={col3} duration={34} className="hidden lg:block" />
          </div>
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

        {/* selo discreto de parceiros (reforça o pagamento seguro citado acima) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-10 flex justify-center"
        >
          <PartnerBadges className="justify-center rounded-2xl border border-[#E6ECF8] bg-white px-6 py-4" />
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
      <InstallBar />
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
