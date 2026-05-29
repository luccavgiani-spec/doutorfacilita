"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="lp-m-menu-btn"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.32)",
              zIndex: 40,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "78%",
              maxWidth: 320,
              background: "#fff",
              padding: "20px 18px",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              style={{
                alignSelf: "flex-end",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "var(--bg)",
                color: "var(--txt)",
                cursor: "pointer",
                marginBottom: 6,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <Link
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                padding: "14px 12px",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--txt)",
                textDecoration: "none",
                borderRadius: 10,
              }}
            >
              Entrar
            </Link>
            <Link
              href="/cadastrar"
              onClick={() => setOpen(false)}
              style={{
                padding: "14px 12px",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--blue)",
                color: "#fff",
                textDecoration: "none",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              Criar conta
            </Link>
          </div>
        </>
      )}
    </>
  );
}
