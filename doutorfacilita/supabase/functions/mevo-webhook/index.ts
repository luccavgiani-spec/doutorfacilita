// mevo-webhook — recebe eventos server-to-server da Mevo.
//   EMISSION           -> baixa e arquiva os PDFs no prontuário na hora
//                         (links da Mevo valem 24 h; caminho principal, não
//                         depende do navegador do médico).
//   CANCEL             -> marca a prescrição como cancelada.
//   CANCELLED_DOCUMENT -> registra o evento com o payload sanitizado.
//
// Auth: postKey no header Authorization (valor exato combinado com a Mevo),
// guardada no secret MEVO_WEBHOOK_POSTKEY. verify_jwt=false (a Mevo não manda
// JWT do Supabase).
//
// Responde HTTP 201 depois de registrar o evento de forma durável. Resposta
// diferente faz a Mevo re-tentar de hora em hora.
//
// O evento vem declarado no payload quando a Mevo manda o campo; senão é
// deduzido do formato:
//   Documentos: Array  -> EMISSION
//   Documentos: Object -> CANCELLED_DOCUMENT
//   só idPrescricao    -> CANCEL

import { createClient } from "npm:@supabase/supabase-js@2";
import { pick } from "../_shared/mevo-utils.ts";
import { registrarEvento } from "../_shared/mevo-eventos.ts";
import { arquivarDocumentos } from "../_shared/mevo-arquivo.ts";

const EVENTOS = ["EMISSION", "CANCEL", "CANCELLED_DOCUMENT"] as const;
type EventoWebhook = (typeof EVENTOS)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// comparação de tempo constante para a postKey
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

// deno-lint-ignore no-explicit-any
function identificarEvento(body: any): EventoWebhook {
  const declarado = pick(body, "Evento", "TipoEvento", "event", "type")?.toUpperCase();
  if (declarado && (EVENTOS as readonly string[]).includes(declarado)) {
    return declarado as EventoWebhook;
  }
  const docs = body?.Documentos;
  if (Array.isArray(docs)) return "EMISSION";
  if (docs && typeof docs === "object") return "CANCELLED_DOCUMENT";
  return "CANCEL";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("MEVO_WEBHOOK_POSTKEY");
  if (!expected) {
    console.error("[mevo-webhook] MEVO_WEBHOOK_POSTKEY ausente");
    return json({ error: "webhook_nao_configurado" }, 503);
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!safeEqual(auth, expected)) {
    console.warn("[mevo-webhook] postKey inválida — requisição recusada");
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "supabase_env_missing" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // deno-lint-ignore no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const evento = identificarEvento(body);
    const idPrescricao = body?.idPrescricao != null ? String(body.idPrescricao) : null;
    if (!idPrescricao) {
      await registrarEvento(admin, {
        origem: "webhook",
        evento,
        http_status: 201,
        resumo: "Payload sem idPrescricao — registrado e ignorado",
        detalhe: body,
      });
      return json({ recebido: true, aviso: "sem idPrescricao" }, 201);
    }

    const { data: presc } = await admin
      .from("prescricoes_mevo")
      .select("id, doctor_id, consultation_id, mevo_id_prescricao, finalizada_em, webhook_recebido_em")
      .eq("mevo_id_prescricao", idPrescricao)
      .maybeSingle();

    const ctx = {
      mevo_id_prescricao: idPrescricao,
      prescricao_id: presc?.id ?? null,
      consultation_id: presc?.consultation_id ?? null,
      doctor_id: presc?.doctor_id ?? null,
    };
    const docs = Array.isArray(body?.Documentos) ? body.Documentos : [];

    const resumo = !presc
      ? "Prescrição não encontrada no sistema — registrado"
      : evento === "EMISSION"
        ? `Receita finalizada · ${docs.length} documento(s) para arquivar`
        : evento === "CANCEL"
          ? "Prescrição cancelada na Mevo"
          : "Documento cancelado na Mevo";
    await registrarEvento(admin, {
      ...ctx,
      origem: "webhook",
      evento,
      http_status: 201,
      resumo,
      detalhe: body,
    });

    if (!presc) {
      return json({ recebido: true, evento, aviso: "prescricao_local_nao_encontrada" }, 201);
    }

    if (evento === "CANCEL") {
      await admin.from("prescricoes_mevo").update({ status: "cancelada" }).eq("id", presc.id);
      return json({ recebido: true, evento }, 201);
    }

    if (evento === "CANCELLED_DOCUMENT") {
      return json({ recebido: true, evento }, 201);
    }

    if (!presc.webhook_recebido_em) {
      await admin
        .from("prescricoes_mevo")
        .update({ webhook_recebido_em: new Date().toISOString() })
        .eq("id", presc.id);
    }

    const r = await arquivarDocumentos(admin, presc, docs, "webhook");

    // SEMPRE 201 após registrar — o retry da Mevo é de hora em hora.
    return json({
      recebido: true,
      evento,
      documentos_salvos: r.salvos,
      ja_capturados: r.jaArquivados,
      falhas: r.falhas,
      status: r.status,
    }, 201);
  } catch (e) {
    console.error("[mevo-webhook] erro inesperado", e);
    return json(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
