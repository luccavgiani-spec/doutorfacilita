// mevo-reabrir-prescricao — "terminar mais tarde": reabre uma prescrição
// já iniciada gerando uma nova sessão/URL de iframe.
//
// Body: { prescricao_id: string }   ← id LOCAL (prescricoes_mevo.id)
// Auth: Bearer JWT do médico.
//
// Chama POST {MEVO_BASE_URL}/api/prescricao/{mevo_id_prescricao}/sessao
// e devolve { modal_url }.

import { createClient } from "npm:@supabase/supabase-js@2";
import { json, preflight, resolveDoctor } from "../_shared/http.ts";
import { pick } from "../_shared/mevo-utils.ts";
import type { MevoRespostaIniciar } from "../_shared/mevo-types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

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
  if (!baseUrl.trim()) return json({ error: "mevo_base_url_missing" }, 500);

  let body: { prescricao_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const prescricaoId = body.prescricao_id;
  if (!prescricaoId || typeof prescricaoId !== "string") {
    return json({ error: "missing_prescricao_id" }, 400);
  }

  const resolved = await resolveDoctor(req, createClient);
  if ("error" in resolved) return resolved.error;
  const { doctor, admin } = resolved;

  const { data: presc, error: prescErr } = await admin
    .from("prescricoes_mevo")
    .select("id, doctor_id, mevo_id_prescricao, status")
    .eq("id", prescricaoId)
    .maybeSingle();

  if (prescErr) {
    return json(
      { error: "prescricao_lookup_failed", detail: prescErr.message },
      500,
    );
  }
  if (!presc) return json({ error: "prescricao_not_found" }, 404);
  if (presc.doctor_id !== doctor.id) {
    return json({ error: "not_your_prescricao" }, 403);
  }
  if (!presc.mevo_id_prescricao) {
    return json({ error: "prescricao_sem_id_mevo" }, 409);
  }

  let mevoResp: Response;
  try {
    mevoResp = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/api/prescricao/${
        encodeURIComponent(presc.mevo_id_prescricao)
      }/sessao`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authB64}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: "{}",
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (e) {
    return json(
      { error: "mevo_unreachable", detail: e instanceof Error ? e.message : String(e) },
      502,
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

  const modalUrl = pick(resposta as unknown as Record<string, unknown>, "ModalURL", "modalUrl", "url", "link");
  if (!modalUrl) console.error("[mevo-reabrir] resposta sem ModalURL. Chaves recebidas:", Object.keys(resposta ?? {}));
  if (!modalUrl) {
    return json(
      { error: "mevo_sem_url", message: "Mevo não retornou URL da sessão." },
      502,
    );
  }

  return json({ modal_url: modalUrl, prescricao_id: presc.id });
});
