"use client";

import { useEffect, useState } from "react";
import { checkCpfExists, type CpfCheckResult } from "@/app/admin/actions";

/**
 * Verifica em tempo real (debounce 500ms) se o CPF digitado já existe na
 * base de pacientes ou médicos. Retorna o status do check pra UI bloquear
 * submit + mostrar mensagem.
 */
export function useCpfCheck(cpfRaw: string) {
  const cpf = (cpfRaw ?? "").replace(/\D/g, "");
  const [state, setState] = useState<{ loading: boolean; result: CpfCheckResult | null }>({
    loading: false,
    result: null,
  });

  useEffect(() => {
    if (cpf.length !== 11) {
      setState({ loading: false, result: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    let cancelled = false;
    const id = window.setTimeout(async () => {
      const r = await checkCpfExists(cpf);
      if (!cancelled) setState({ loading: false, result: r });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [cpf]);

  return state;
}
