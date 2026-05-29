"use client";

import { useState, useTransition } from "react";
import { toggleTemplateAtivo } from "@/app/admin/templates/actions";

export default function TemplateAtivoToggle({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
  const [on, setOn] = useState(ativo);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const r = await toggleTemplateAtivo(id, next);
          if (!r.ok) setOn(!next);
        });
      }}
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-txt-2 hover:bg-bg-3 disabled:opacity-50"
    >
      {on ? "Desativar" : "Ativar"}
    </button>
  );
}
