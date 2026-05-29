import { onlyDigits } from "./masks";

export interface ViaCepResult {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function fetchCep(cep: string): Promise<ViaCepResult | null> {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data: {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    } = await res.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
