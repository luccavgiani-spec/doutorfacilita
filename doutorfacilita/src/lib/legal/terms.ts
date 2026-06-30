import { createHash } from "node:crypto";

/**
 * Texto canônico do consentimento LGPD (dados de saúde) — CFM 2.314/2022 art. 6º
 * e LGPD art. 11. Registrado em `public.consents` no momento do cadastro.
 *
 * IMPORTANTE: ao mudar o texto, suba a versão. O hash do texto é gravado junto
 * (terms_content_hash) pra provar QUE texto o titular aceitou, mesmo que a
 * versão evolua depois (consents é imutável — só revogável).
 */
export const LGPD_TERMS_VERSION = "lgpd-dados-saude-v1-2026-06";

export const LGPD_TERMS_TEXT = `Autorizo a Doutor Facilita a coletar, armazenar e tratar meus dados pessoais e dados pessoais sensíveis de saúde, exclusivamente para a finalidade de prestação de teleconsulta e emissão de documentos médicos (receitas, atestados, exames e encaminhamentos), nos termos da Lei 13.709/2018 (LGPD), em especial o art. 11, e da Resolução CFM 2.314/2022. Estou ciente de que posso revogar este consentimento a qualquer momento e dos meus direitos como titular dos dados.`;

/** SHA-256 (hex) do texto do termo. Usado em consents.terms_content_hash. */
export function lgpdTermsHash(): string {
  return createHash("sha256").update(LGPD_TERMS_TEXT, "utf8").digest("hex");
}
