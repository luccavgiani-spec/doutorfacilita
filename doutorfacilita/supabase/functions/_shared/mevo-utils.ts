// Utilitários compartilhados da integração Mevo.
//
// A resposta da Mevo vem em PascalCase (ModalURL, QRCodeURL, CodigoValidacao,
// idPrescricao), mas variantes camelCase/snake_case aparecem na doc. `pick`
// lê o primeiro valor não-vazio dentre os nomes candidatos, case-insensitive.

export function pick(
  obj: Record<string, unknown> | null | undefined,
  ...names: string[]
): string | null {
  if (!obj || typeof obj !== "object") return null;
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = (obj as Record<string, unknown>)[k];
  for (const n of names) {
    const v = lower[n.toLowerCase()];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return null;
}

/**
 * Normaliza um celular brasileiro para o formato que a Mevo espera (DDD +
 * número, só dígitos). Remove não-dígitos; se vier com DDI "55" (12–13
 * dígitos), descarta-o. Retorna 10 ou 11 dígitos, ou `undefined` se inválido.
 *
 * Ex.: "+55 (11) 98765-4321" → "11987654321"; "1187654321" → "1187654321".
 */
export function normalizarCelularBR(
  v: string | null | undefined,
): string | undefined {
  let d = (v ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }
  return d.length === 10 || d.length === 11 ? d : undefined;
}
