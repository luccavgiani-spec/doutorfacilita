"use client";

import { ReactNode } from "react";

/**
 * Moldura de celular pra preview no desktop. Em viewport mobile real,
 * vira fullscreen automático via CSS media query.
 *
 * - statusTime: hora exibida no status bar (default "9:47")
 * - statusVariant: 'light' (texto preto) ou 'dark' (texto branco — pra tela de consulta)
 */
export function MobileFrame({
  children,
  statusTime = "9:47",
  statusVariant = "light",
  contentClassName = "",
}: {
  children: ReactNode;
  statusTime?: string;
  statusVariant?: "light" | "dark";
  contentClassName?: string;
}) {
  return (
    <div className="mobile-frame-wrap">
      <div className="mobile-frame">
        <div
          className="mobile-status"
          style={{ color: statusVariant === "dark" ? "white" : undefined }}
        >
          <span>{statusTime}</span>
          <div className="mobile-status-icons">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 17h2v3H2v-3zm3.5-3h2v6h-2v-6zm3.5-3h2v9H9v-9zm3.5-3h2v12h-2V8zm3.5-3h2v15h-2V5z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
          </div>
        </div>
        <div className={`mobile-content ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
