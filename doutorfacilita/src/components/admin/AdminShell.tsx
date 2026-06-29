"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Shell do /admin: sidebar fixa (5 seções) + topbar. Reusa tokens CSS. */

const NAV = [
  { href: "/admin", label: "Home", exact: true, icon: HomeIcon },
  { href: "/admin/medicos", label: "Médicos", icon: StethoIcon },
  { href: "/admin/pacientes", label: "Pacientes", icon: UsersIcon },
  { href: "/admin/mevo", label: "Mevo", icon: RxIcon },
  { href: "/admin/templates", label: "Templates", icon: DocIcon },
  { href: "/admin/integracoes", label: "Integrações", icon: PlugIcon },
];

export default function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      /* sem env vars o client nem cria */
    }
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-bg font-sans text-txt">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-bold">Plantão Digital</p>
          <p className="text-xs text-txt-2">Painel administrativo</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-l text-blue"
                    : "text-txt-2 hover:bg-bg-3 hover:text-txt"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href="/cockpit"
            className="block rounded-lg px-3 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
          >
            ← Voltar ao cockpit
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-txt-3">
            Admin
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-txt-2">{userEmail}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-txt-2 hover:bg-bg-3"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/* ── ícones (stroke currentColor, 18px) ─────────────────────────── */
function Svg({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </svg>
  );
}
function HomeIcon() {
  return (
    <Svg>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}
function UsersIcon() {
  return (
    <Svg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}
function RxIcon() {
  return (
    <Svg>
      <path d="M6 3h6a3 3 0 0 1 0 6H6zM6 9v12M6 9l9 12" />
    </Svg>
  );
}
function DocIcon() {
  return (
    <Svg>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </Svg>
  );
}
function StethoIcon() {
  return (
    <Svg>
      <path d="M4 3v5a6 6 0 0 0 12 0V3" />
      <circle cx="19" cy="15" r="2" />
      <path d="M10 14v2a7 7 0 0 0 7 7" />
    </Svg>
  );
}
function PlugIcon() {
  return (
    <Svg>
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8z" />
      <path d="M12 17v5" />
    </Svg>
  );
}
