// Trilha de eventos da integração Mevo (tabela public.mevo_eventos).
//
// Cada chamada à API Mevo, webhook recebido, postMessage repassado pelo
// navegador e PDF arquivado vira uma linha — é o que o monitor ao vivo do
// admin e o prontuário escutam via Realtime. Também sai uma linha no log da
// Edge Function.
//
// Tudo que vai para `detalhe` passa por sanitizar(): token, credencial e URL
// da modal ficam ocultos, URLs perdem a assinatura (query string) e dados
// pessoais (CPF, telefone, e-mail) ficam mascarados.

export type OrigemEvento = "backend" | "webhook" | "iframe" | "storage";

export interface EventoMevoLog {
  origem: OrigemEvento;
  evento: string;
  http_status?: number | null;
  duracao_ms?: number | null;
  mevo_id_prescricao?: string | null;
  prescricao_id?: string | null;
  consultation_id?: string | null;
  doctor_id?: string | null;
  resumo?: string | null;
  detalhe?: unknown;
}

const CHAVE_SECRETA = /token|authorization|senha|password|postkey|secret|modalurl/i;
const CHAVE_PESSOAL = /^(documento|cpf|cns|telefone\w*|celular|email)$/i;

/** URL sem query string — a assinatura S3 fica de fora; serve de chave do objeto. */
export function semAssinatura(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}

function mascarar(v: string): string {
  if (v.includes("@")) {
    const [user, dominio] = v.split("@");
    return `${user.slice(0, 1)}***@${dominio}`;
  }
  const d = v.replace(/\D/g, "");
  return d.length > 4 ? `***${d.slice(-2)}` : "***";
}

export function sanitizar(v: unknown, chave = ""): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    if (CHAVE_SECRETA.test(chave)) return v ? `[oculto · ${v.length} caracteres]` : "";
    if (CHAVE_PESSOAL.test(chave)) return v ? mascarar(v) : "";
    if (/^https?:\/\//i.test(v)) return semAssinatura(v);
    return v.length > 500 ? `${v.slice(0, 500)}…` : v;
  }
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => sanitizar(x, chave));
  if (typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, sanitizar(x, k)]),
    );
  }
  return v;
}

// deno-lint-ignore no-explicit-any
export async function registrarEvento(admin: any, e: EventoMevoLog): Promise<void> {
  console.log(
    `[mevo] ${e.origem} ${e.evento}` +
      (e.http_status ? ` → ${e.http_status}` : "") +
      (e.mevo_id_prescricao ? ` idPrescricao=${e.mevo_id_prescricao}` : "") +
      (e.duracao_ms != null ? ` (${e.duracao_ms}ms)` : "") +
      (e.resumo ? ` · ${e.resumo}` : ""),
  );
  try {
    const { error } = await admin.from("mevo_eventos").insert({
      ...e,
      detalhe: e.detalhe === undefined ? null : sanitizar(e.detalhe),
    });
    if (error) console.error("[mevo-eventos] insert falhou:", error.message);
  } catch (err) {
    console.error("[mevo-eventos] insert falhou:", err);
  }
}
