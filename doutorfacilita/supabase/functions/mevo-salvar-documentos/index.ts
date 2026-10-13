// mevo-salvar-documentos — redundância do webhook EMISSION.
//
// Quando a modal Mevo emite o postMessage `prescricao`, o card do Cockpit
// repassa os documentos para cá. Normalmente o webhook já arquivou os mesmos
// PDFs segundos antes: o arquivamento compartilhado reconhece o objeto pela
// URL sem assinatura e não duplica. Se o webhook falhou ou atrasou, este
// caminho garante o PDF no prontuário (CFM 1.821/2007).
//
// Body: { prescricao_id: string,
//          documentos: Array<{TipoDocumento,Categoria,URL,Assinado,ContentType}> }
// Auth: Bearer JWT do médico.

import { createClient } from "npm:@supabase/supabase-js@2";
import { json, preflight, resolveDoctor } from "../_shared/http.ts";
import type { DocumentoMevo } from "../_shared/mevo-types.ts";
import { registrarEvento } from "../_shared/mevo-eventos.ts";
import { arquivarDocumentos } from "../_shared/mevo-arquivo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { prescricao_id?: string; documentos?: DocumentoMevo[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const prescricaoId = body.prescricao_id;
  const documentos = body.documentos;
  if (!prescricaoId || typeof prescricaoId !== "string") {
    return json({ error: "missing_prescricao_id" }, 400);
  }
  if (!Array.isArray(documentos) || documentos.length === 0) {
    return json({ error: "missing_documentos" }, 400);
  }

  const resolved = await resolveDoctor(req, createClient);
  if ("error" in resolved) return resolved.error;
  const { doctor, admin } = resolved;

  const { data: presc, error: prescErr } = await admin
    .from("prescricoes_mevo")
    .select("id, doctor_id, consultation_id, mevo_id_prescricao, finalizada_em, webhook_recebido_em")
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

  await registrarEvento(admin, {
    origem: "iframe",
    evento: "postMessage prescricao",
    mevo_id_prescricao: presc.mevo_id_prescricao,
    prescricao_id: presc.id,
    consultation_id: presc.consultation_id,
    doctor_id: presc.doctor_id,
    resumo: `Modal Mevo fechou ao finalizar · ${documentos.length} documento(s) recebidos no navegador`,
    detalhe: { Documentos: documentos },
  });

  const r = await arquivarDocumentos(admin, presc, documentos, "postmessage");

  return json({
    sucesso: r.falhas.length === 0,
    documentos_salvos: r.salvos,
    ja_arquivados: r.jaArquivados,
    falhas: r.falhas,
    status: r.status,
    webhook_recebido_em: presc.webhook_recebido_em,
  });
});
