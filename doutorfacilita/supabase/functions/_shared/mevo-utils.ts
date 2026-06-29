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
