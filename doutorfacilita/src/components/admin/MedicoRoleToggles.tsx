"use client";

import { useState, useTransition } from "react";
import {
  type AdminRole,
  grantRole,
  revokeRole,
} from "@/app/admin/medicos/actions";

const ROLES: { role: AdminRole; label: string; stub?: boolean }[] = [
  { role: "admin", label: "Admin" },
  { role: "carteira", label: "Carteira", stub: true },
  { role: "agendamento", label: "Agendamento", stub: true },
];

/**
 * Cada papel vira um switch verde/cinza. Papéis "stub" ficam desabilitados
 * visualmente até a feature existir (e.g. carteira/agendamento).
 */
export default function MedicoRoleToggles({
  targetUserId,
  active,
}: {
  targetUserId: string | null;
  active: Record<AdminRole, boolean>;
}) {
  const [state, setState] = useState(active);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!targetUserId) {
    return <span className="text-xs text-txt-3">médico sem usuário vinculado</span>;
  }

  function toggle(role: AdminRole, stub?: boolean) {
    if (stub) return; // bloqueia carteira/agendamento até a feature existir
    const next = !state[role];
    setState((s) => ({ ...s, [role]: next })); // otimista
    setErr(null);
    startTransition(async () => {
      const res = next
        ? await grantRole(targetUserId!, role)
        : await revokeRole(targetUserId!, role);
      if (!res.ok) {
        setState((s) => ({ ...s, [role]: !next }));
        setErr(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {ROLES.map(({ role, label, stub }) => {
          const on = !!state[role];
          return (
            <span key={role} className="admin-toggle-wrap">
              <button
                type="button"
                onClick={() => toggle(role, stub)}
                disabled={pending || !!stub}
                aria-pressed={on}
                aria-label={`Ativar ${label}`}
                className={`admin-toggle ${on ? "is-on" : ""}`}
              />
              <span className={`admin-toggle-label ${on ? "" : "is-off"}`}>
                {label}
                {stub ? <small>(em breve)</small> : null}
              </span>
            </span>
          );
        })}
      </div>
      {err && <span className="text-xs text-red">{err}</span>}
    </div>
  );
}
