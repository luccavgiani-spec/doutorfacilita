"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

/**
 * Shell da Área do Médico — navbar da marca Plantão Digital compartilhada por
 * /area-do-medico/relatorios e /area-do-medico/perfil. Traz o logo à vista,
 * abas de navegação (com estado ativo), identidade do médico e Sair.
 */

const TABS = [
  {
    href: "/area-do-medico/relatorios",
    label: "Relatórios",
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    href: "/area-do-medico/perfil",
    label: "Perfil",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
];

function iniciais(n: string): string {
  const parts = n.replace(/^Dr[a]?\.?\s*/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "DR";
}

export default function MedicoShell({
  nome,
  sub,
  avatarUrl,
  children,
}: {
  nome: string;
  sub: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function sair() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Sem env vars o cliente nem cria — ainda assim voltamos pro /login.
    }
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-txt">
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "linear-gradient(180deg, #DCE9FF 0%, #C2D8FF 100%)",
          borderColor: "#AECCFF",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 sm:gap-6">
          <Link href="/cockpit" className="shrink-0" aria-label="Plantão Digital">
            <Logo size={28} />
          </Link>

          <nav className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                    active
                      ? "bg-blue text-white shadow-sm"
                      : "text-[#123FBF] hover:bg-white/60"
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="hidden sm:block"
                  >
                    {t.icon}
                  </svg>
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/cockpit"
              className="hidden text-xs font-semibold text-[#123FBF] hover:opacity-75 md:block"
            >
              ← Cockpit
            </Link>
            <div className="flex items-center gap-2.5">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={nome}
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-blue text-xs font-bold text-white shadow-sm">
                  {iniciais(nome)}
                </div>
              )}
              <div className="hidden leading-tight sm:block">
                <p className="max-w-[160px] truncate text-sm font-semibold text-txt">{nome}</p>
                <p className="text-[11px] text-txt-2">{sub}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={sair}
              className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#123FBF] hover:bg-white"
            >
              Sair
            </button>
          </div>
        </div>
        {/* Acento de marca (eco do .bar4 das telas de auth) */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#123FBF] via-[#1E5AE8] to-[#2FA4F2]" />
      </header>

      {children}
    </div>
  );
}
