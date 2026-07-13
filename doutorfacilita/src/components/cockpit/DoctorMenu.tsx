"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Menu "Área do Médico" — substitui o antigo LogoutButton fixo e o bloco
 * estático .doc-user no canto superior direito do Cockpit.
 *
 * Opções: Perfil · Relatórios · Sair.
 */
export default function DoctorMenu({
  nome,
  sub,
  avatarUrl,
}: {
  nome: string;
  sub: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function iniciais(n: string): string {
    const parts = n.replace(/^Dr[a]?\.?\s*/i, "").trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "DR";
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Sem env vars o cliente nem cria — ainda assim voltamos pra /login.
    }
    window.location.href = "/login";
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="doc-user"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: 10,
          fontFamily: "inherit",
          color: "inherit",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="doc-user-av"
            src={avatarUrl}
            alt={nome}
            style={{ objectFit: "cover", padding: 0 }}
          />
        ) : (
          <div className="doc-user-av">{iniciais(nome)}</div>
        )}
        <div className="doc-user-info" style={{ textAlign: "left" }}>
          <b>{nome}</b>
          <span style={{ color: "var(--txt2)" }}>{sub}</span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: "var(--txt2)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 220,
            background: "white",
            border: "1px solid var(--hborder)",
            borderRadius: 12,
            boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
            padding: 6,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "8px 12px 6px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--txt3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Área do médico
          </div>

          <MenuItem
            label="Perfil"
            onClick={() => router.push("/area-do-medico/perfil")}
            icon={
              <>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </>
            }
          />
          <MenuItem
            label="Relatórios"
            onClick={() => router.push("/area-do-medico/relatorios")}
            icon={
              <>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </>
            }
          />
          <div
            style={{
              height: 1,
              background: "var(--hborder)",
              margin: "6px 4px",
            }}
          />
          <MenuItem
            label="Sair"
            danger
            onClick={handleSignOut}
            icon={
              <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </>
            }
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 12px",
        background: "none",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "inherit",
        color: danger ? "var(--red)" : "var(--txt)",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "var(--red-l)"
          : "var(--bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
      }}
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
      >
        {icon}
      </svg>
      {label}
    </button>
  );
}
