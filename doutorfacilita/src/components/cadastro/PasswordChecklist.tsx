"use client";

import { checkPassword } from "@/lib/forms/validators";

const ITENS: Array<{ key: keyof ReturnType<typeof checkPassword>; label: string }> = [
  { key: "length", label: "Mínimo de 8 caracteres" },
  { key: "upper", label: "Uma letra maiúscula" },
  { key: "lower", label: "Uma letra minúscula" },
  { key: "digit", label: "Um número" },
  { key: "special", label: "Um caractere especial" },
];

export default function PasswordChecklist({ password }: { password: string }) {
  const checks = checkPassword(password);
  return (
    <ul className="auth-checklist" aria-live="polite">
      {ITENS.map((it) => {
        const ok = checks[it.key];
        return (
          <li key={it.key} className={ok ? "ok" : ""}>
            <span aria-hidden className="auth-check-dot">
              {ok ? "✓" : ""}
            </span>
            {it.label}
          </li>
        );
      })}
    </ul>
  );
}
