"use client";

import { useEffect, useRef } from "react";

/**
 * Modal acessível baseado em <dialog>. Sem dependência externa.
 * - Fecha em ESC (nativo do <dialog>)
 * - Fecha clicando no backdrop
 * - Foco vai automaticamente pra dentro (nativo)
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 560,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={handleClick}
      className="modal-shell"
      style={{ maxWidth, width: "calc(100% - 32px)" }}
    >
      <div className="modal-head">
        <div>
          <h2 className="modal-title">{title}</h2>
          {subtitle && <p className="modal-sub">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="modal-close"
        >
          ×
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
