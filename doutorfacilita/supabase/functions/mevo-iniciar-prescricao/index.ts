// mevo-iniciar-prescricao — médico clica "Emitir prescrição" no Cockpit.
//
// Fluxo:
//   1. valida JWT → resolve doctors (doctors.user_id = auth.uid())
//   2. carrega consultation; exige doctor_id == doctor.id e status 'in_progress'
//   3. carrega patient via consultation.patient_id
//   4. valida campos obrigatórios da Mevo (lista os faltantes se houver)
//   5. monta payload e chama POST {MEVO_BASE_URL}/api/prescricao/iniciar
//   6. trata 412 (array de erros de validação) de forma legível
//   7. salva linha em prescricoes_mevo
//   8. devolve { modal_url, prescricao_id }
//
// Guard: se MEVO_AUTH_B64 estiver vazia → 503 (UI mostra "aguardando credenciais").
//
// Secrets necessários (documentados em docs/INTEGRACAO_MEVO.md):
//   MEVO_BASE_URL, MEVO_AUTH_B64, MEVO_SUBPARCEIRO,
//   MEVO_LOGO_URL, MEVO_COR_PRIMARIA, MEVO_COR_SECUNDARIA
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto)
//
// Body: { consultation_id: string }
// Auth: Bearer JWT do médico.

import { createClient } from "npm:@supabase/supabase-js@2";
import { json, preflight, resolveDoctor } from "../_shared/http.ts";
import { pick } from "../_shared/mevo-utils.ts";
import type {
  MevoErroValidacao,
  MevoRespostaIniciar,
} from "../_shared/mevo-types.ts";

import { montarPayloadMevo, validarPayloadMevo } from "../_shared/mevo-payload.ts";
import type { MevoIniciarPayload } from "../_shared/mevo-types.ts";

const onlyDigits = (v: string | null | undefined) =>
  (v ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // ─── Guard: integração ainda não configurada ────────────────────
  const baseUrl = Deno.env.get("MEVO_BASE_URL") ?? "";
  const authB64 = Deno.env.get("MEVO_AUTH_B64") ?? "";
  if (!authB64.trim()) {
    return json(
      {
        error: "mevo_nao_configurada",
        message:
          "Integração Mevo ainda não configurada. Aguardando credenciais.",
      },
      503,
    );
  }
  if (!baseUrl.trim()) {
    return json({ error: "mevo_base_url_missing" }, 500);
  }

  const ambiente = baseUrl.includes("homolog") ? "homologacao" : "producao";

  let body: { consultation_id?: string; check?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // ─── Probe de configuração (sem efeito colateral) ───────────────
  // O card chama com { check: true } só para saber se a credencial está
  // configurada e qual ambiente. Se MEVO_AUTH_B64 estiver vazia, o guard
  // 503 acima já respondeu antes de chegar aqui.
  if (body.check === true) {
    return json({ configured: true, ambiente });
  }

  const consultationId = body.consultation_id;
  if (!consultationId || typeof consultationId !== "string") {
    return json({ error: "missing_consultation_id" }, 400);
  }

  const resolved = await resolveDoctor(req, createClient);
  if ("error" in resolved) return resolved.error;
  const { doctor, authEmail, admin } = resolved;

  // ─── Consulta + ownership + estado ──────────────────────────────
  const { data: consultation, error: consultErr } = await admin
    .from("consultations")
    .select("id, patient_id, doctor_id, status")
    .eq("id", consultationId)
    .maybeSingle();

  if (consultErr) {
    return json(
      { error: "consultation_lookup_failed", detail: consultErr.message },
      500,
    );
  }
  if (!consultation) return json({ error: "consultation_not_found" }, 404);
  if (consultation.doctor_id !== doctor.id) {
    return json({ error: "not_your_consultation" }, 403);
  }
  if (consultation.status !== "in_progress") {
    return json(
      { error: "consultation_not_in_progress", status: consultation.status },
      409,
    );
  }

  const { data: patient, error: patientErr } = await admin
    .from("patients")
    .select(
      "id, full_name, cpf, birth_date, celular, phone, email, endereco_completo, alergias, allergies, gender, social_name, address_number, address_line, address_complement, neighborhood, city, state, postal_code",
    )
    .eq("id", consultation.patient_id)
    .maybeSingle();

  if (patientErr) {
    return json(
      { error: "patient_lookup_failed", detail: patientErr.message },
      500,
    );
  }
  if (!patient) return json({ error: "patient_not_found" }, 404);

  // ─── Validação de campos obrigatórios da Mevo ───────────────────
  const faltantes: string[] = [];
  if (!doctor.full_name) faltantes.push("médico: nome");
  if (!onlyDigits(doctor.cpf)) faltantes.push("médico: CPF");
  if (!doctor.council_number) faltantes.push("médico: número do conselho (CRM)");
  if (!doctor.council_state) faltantes.push("médico: UF do conselho");
  if (!doctor.email && !authEmail) faltantes.push("médico: e-mail");
  if (!patient.full_name) faltantes.push("paciente: nome");
  if (!onlyDigits(patient.cpf)) faltantes.push("paciente: CPF");

  if (faltantes.length > 0) {
    return json(
      {
        error: "dados_incompletos",
        message:
          "Preencha os campos abaixo antes de emitir a prescrição: " +
          faltantes.join(", "),
        faltantes,
      },
      422,
    );
  }

  // ─── Monta payload ──────────────────────────────────────────────
  const { data: configRow, error: configError } = await admin.from("integration_configs").select("config").eq("id", "mevo").maybeSingle();
  if (configError) return json({ error: "mevo_config_lookup_failed" }, 500);
  const payload = montarPayloadMevo(doctor, patient, consultationId, authEmail, {
    subparceiro: Deno.env.get("MEVO_SUBPARCEIRO"),
    logo_url: Deno.env.get("MEVO_LOGO_URL"),
    cor_primaria: Deno.env.get("MEVO_COR_PRIMARIA"),
    cor_secundaria: Deno.env.get("MEVO_COR_SECUNDARIA"),
    ...(configRow?.config ?? {}),
  });

  const missing = validarPayloadMevo(payload);
  if (missing.length) return json({ error: "dados_incompletos", message: "Complete o endereço profissional no Perfil e os dados do estabelecimento em Admin > Mevo: " + missing.join(", "), faltantes: missing }, 422);

  // ─── Chama a Mevo ───────────────────────────────────────────────
  const url = `${baseUrl.replace(/\/+$/, "")}/api/prescricao/iniciar`;
  const chamarMevo = (p: MevoIniciarPayload) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authB64}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(p),
      signal: AbortSignal.timeout(30_000),
    });

  const parseErros = async (r: Response): Promise<MevoErroValidacao[]> => {
    try {
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  };

  let mevoResp: Response;
  try {
    mevoResp = await chamarMevo(payload);
  } catch (e) {
    return json(
      { error: "mevo_unreachable", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }

  // Não descartar dados demográficos para contornar uma validação Mevo.
  const erros412 = mevoResp.status === 412 ? await parseErros(mevoResp) : [];
  if (mevoResp.status === 412) {
    const legivel = erros412
      .map((e) => [e.Entidade, e.Campo, e.Descricao].filter(Boolean).join(" · "))
      .filter(Boolean);
    return json(
      {
        error: "mevo_validacao",
        message: legivel.length
          ? "A Mevo recusou os dados: " + legivel.join("; ")
          : "A Mevo recusou os dados enviados (412).",
        erros: erros412,
      },
      422,
    );
  }

  if (!mevoResp.ok) {
    const detail = await mevoResp.text().catch(() => "");
    return json(
      { error: "mevo_erro", status: mevoResp.status, detail: detail.slice(0, 1000) },
      502,
    );
  }

  let resposta: MevoRespostaIniciar;
  try {
    resposta = await mevoResp.json();
  } catch {
    return json({ error: "mevo_resposta_invalida" }, 502);
  }

  // Normaliza nomes de campo (PascalCase / camelCase / snake_case), case-insensitive.
  const r = resposta as unknown as Record<string, unknown>;
  const mevoId   = pick(r, "idPrescricao", "IdPrescricao", "id", "prescricaoId");
  const modalUrl = pick(r, "ModalURL", "modalUrl", "url", "link");
  const token    = pick(r, "token", "Token");
  const qrcode   = pick(r, "QRCodeURL", "qrCodeUrl", "qrcode_url", "QrCodeUrl");
  const codigo   = pick(r, "CodigoValidacao", "codigoValidacao", "codigo_validacao");

  if (!modalUrl) console.error("[mevo-iniciar] resposta sem ModalURL. Chaves recebidas:", Object.keys(r));
  if (!modalUrl) {
    return json(
      { error: "mevo_sem_url", message: "Mevo não retornou URL da prescrição." },
      502,
    );
  }

  const { data: inserted, error: insertErr } = await admin
    .from("prescricoes_mevo")
    .insert({
      consultation_id: consultationId,
      doctor_id: doctor.id,
      patient_id: patient.id,
      mevo_id_prescricao: mevoId,
      mevo_token: token,
      qrcode_url: qrcode,
      codigo_validacao: codigo,
      status: "iniciada",
      ambiente,
    })
    .select("id")
    .single();

  if (insertErr) {
    return json(
      { error: "prescricao_persist_failed", detail: insertErr.message },
      500,
    );
  }

  return json({
    modal_url: modalUrl,
    prescricao_id: inserted.id,
    mevo_id_prescricao: mevoId,
    mevo_token: token,
  });
});
