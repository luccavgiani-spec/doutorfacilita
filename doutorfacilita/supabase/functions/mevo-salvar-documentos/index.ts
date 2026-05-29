// mevo-salvar-documentos — A FUNÇÃO MAIS CRÍTICA.
//
// Os PDFs que a Mevo devolve são URLs S3 assinadas que EXPIRAM EM 10 MIN.
// PDF perdido = problema de compliance de prontuário (CFM 1.821/2007).
// Por isso: download imediato, retry 2x por arquivo, timeout 30s, e a
// prescrição NUNCA fica sem registro do que falhou.
//
// Body: { prescricao_id: string,
//          documentos: Array<{TipoDocumento,Categoria,URL,Assinado,ContentType}> }
// Auth: Bearer JWT do médico.
//
// Caminho no bucket: {doctor_id}/{prescricao_id}/{tipo}-{uuid}.pdf
// Upload com service_role (ignora RLS); leitura depois via signed URL.

import { createClient } from "npm:@supabase/supabase-js@2";
import { json, preflight, resolveDoctor } from "../_shared/http.ts";
import type { DocumentoMevo } from "../_shared/mevo-types.ts";

const BUCKET = "prescricoes-pdfs";

async function baixarComRetry(
  url: string,
  tentativas = 2,
): Promise<{ ok: true; bytes: Uint8Array; contentType: string } | {
  ok: false;
  erro: string;
}> {
  let ultimoErro = "desconhecido";
  for (let i = 0; i <= tentativas; i++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        ultimoErro = `HTTP ${resp.status}`;
        continue;
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength === 0) {
        ultimoErro = "arquivo vazio";
        continue;
      }
      const ct = resp.headers.get("content-type") ?? "application/pdf";
      return { ok: true, bytes: buf, contentType: ct };
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, erro: ultimoErro };
}

const slug = (s: string) =>
  (s || "DOC").toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 24);

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
    .select("id, doctor_id")
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

  const falhas: Array<{ tipo: string; erro: string }> = [];
  let salvos = 0;

  for (const doc of documentos) {
    const tipo = doc?.TipoDocumento ?? "DOC";
    if (!doc?.URL) {
      falhas.push({ tipo, erro: "documento sem URL" });
      continue;
    }

    const baixado = await baixarComRetry(doc.URL, 2);
    if (!baixado.ok) {
      falhas.push({ tipo, erro: `download falhou: ${baixado.erro}` });
      continue;
    }

    const storagePath =
      `${doctor.id}/${prescricaoId}/${slug(tipo)}-${crypto.randomUUID()}.pdf`;
    const contentType = doc.ContentType || baixado.contentType ||
      "application/pdf";

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, baixado.bytes, {
        contentType,
        upsert: false,
      });

    if (upErr) {
      falhas.push({ tipo, erro: `upload falhou: ${upErr.message}` });
      continue;
    }

    const { error: docInsErr } = await admin
      .from("prescricoes_documentos")
      .insert({
        prescricao_id: prescricaoId,
        tipo_documento: tipo,
        categoria: doc.Categoria ?? null,
        storage_path: storagePath,
        assinado: doc.Assinado ?? false,
        content_type: contentType,
      });

    if (docInsErr) {
      // Arquivo está salvo no storage mas a linha falhou — registra como falha
      // parcial para reprocessamento manual (não conta como sucesso).
      falhas.push({
        tipo,
        erro: `registro falhou (arquivo em ${storagePath}): ${docInsErr.message}`,
      });
      continue;
    }

    salvos++;
  }

  const novoStatus = falhas.length === 0
    ? "finalizada"
    : "finalizada_com_erro";

  await admin
    .from("prescricoes_mevo")
    .update({ status: novoStatus, finalizada_em: new Date().toISOString() })
    .eq("id", prescricaoId);

  if (falhas.length > 0) {
    console.error(
      `[mevo-salvar-documentos] prescricao=${prescricaoId} salvos=${salvos} falhas=`,
      falhas,
    );
  }

  return json({
    sucesso: falhas.length === 0,
    documentos_salvos: salvos,
    falhas,
    status: novoStatus,
  });
});
