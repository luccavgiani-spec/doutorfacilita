// Arquivamento dos PDFs emitidos pela Mevo no prontuário (bucket privado
// prescricoes-pdfs), compartilhado pelos dois canais que trazem documentos:
//   - mevo-webhook          (EMISSION, server-to-server — caminho principal)
//   - mevo-salvar-documentos (postMessage `prescricao` da iframe — redundância)
//
// Os links da Mevo valem 24 h, então o download acontece no recebimento.
// Os dois canais entregam o mesmo objeto S3 com assinaturas diferentes: a
// chave de idempotência é a URL sem query string (mevo_object_key), com
// índice único parcial no banco cobrindo a corrida entre os canais.
//
// Toda tentativa deixa linha em prescricoes_documentos (sucesso com
// storage_path; falha com download_error, monitorada por
// v_failed_pdf_downloads) e um evento em mevo_eventos.
//
// Caminho no bucket: {doctor_id}/{prescricao_id}/{tipo}-{uuid}.pdf

import type { DocumentoMevo } from "./mevo-types.ts";
import { registrarEvento, semAssinatura } from "./mevo-eventos.ts";

const BUCKET = "prescricoes-pdfs";

export type CanalDocumentos = "webhook" | "postmessage";

export interface PrescricaoAlvo {
  id: string;
  doctor_id: string;
  consultation_id: string | null;
  mevo_id_prescricao: string | null;
  finalizada_em: string | null;
}

export interface ResultadoArquivo {
  salvos: number;
  jaArquivados: number;
  falhas: Array<{ tipo: string; erro: string }>;
  status: "finalizada" | "finalizada_com_erro";
}

async function baixarComRetry(
  url: string,
  tentativas = 2,
): Promise<
  { ok: true; bytes: Uint8Array; contentType: string } | { ok: false; erro: string }
> {
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

// Allowlist de host dos PDFs (defesa contra URL arbitrária / SSRF). CSV em
// MEVO_PDF_ALLOWED_HOSTS; default cobre o S3 da AWS e o domínio da Nexodata.
function hostPermitido(urlStr: string): boolean {
  const allowed = (Deno.env.get("MEVO_PDF_ALLOWED_HOSTS") ??
    ".amazonaws.com,.nexodata.com.br")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  let host: string;
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowed.some((suf) => {
    const s = suf.startsWith(".") ? suf : "." + suf;
    return host === suf.replace(/^\./, "") || host.endsWith(s);
  });
}

export async function arquivarDocumentos(
  // deno-lint-ignore no-explicit-any
  admin: any,
  presc: PrescricaoAlvo,
  documentos: DocumentoMevo[],
  canal: CanalDocumentos,
): Promise<ResultadoArquivo> {
  const ctx = {
    mevo_id_prescricao: presc.mevo_id_prescricao,
    prescricao_id: presc.id,
    consultation_id: presc.consultation_id,
    doctor_id: presc.doctor_id,
  };
  const viaCanal = canal === "webhook" ? "via webhook" : "via postMessage";

  const { data: existentes } = await admin
    .from("prescricoes_documentos")
    .select("mevo_object_key")
    .eq("prescricao_id", presc.id)
    .not("download_succeeded_at", "is", null);
  const arquivados = new Set<string>(
    // deno-lint-ignore no-explicit-any
    (existentes ?? []).map((r: any) => r.mevo_object_key).filter(Boolean),
  );

  const registrar = async (
    tipo: string,
    doc: DocumentoMevo | undefined,
    objectKey: string | null,
    storagePath: string | null,
    contentType: string,
    erro: string | null,
  ) => {
    const agora = new Date().toISOString();
    return await admin.from("prescricoes_documentos").insert({
      prescricao_id: presc.id,
      tipo_documento: tipo,
      categoria: doc?.Categoria ?? null,
      storage_path: storagePath,
      assinado: doc?.Assinado ?? false,
      content_type: contentType,
      mevo_original_url: doc?.URL ?? null,
      mevo_object_key: objectKey,
      origem: canal,
      download_attempted_at: agora,
      download_succeeded_at: erro ? null : agora,
      download_error: erro,
    });
  };

  const falhas: ResultadoArquivo["falhas"] = [];
  let salvos = 0;
  let jaArquivados = 0;

  const falhar = async (
    tipo: string,
    doc: DocumentoMevo | undefined,
    objectKey: string | null,
    contentType: string,
    motivo: string,
  ) => {
    await registrar(tipo, doc, objectKey, null, contentType, motivo);
    falhas.push({ tipo, erro: motivo });
    await registrarEvento(admin, {
      ...ctx,
      origem: "storage",
      evento: "Falha ao arquivar PDF",
      resumo: `${tipo} · ${motivo} · ${viaCanal}`,
    });
  };

  for (const doc of documentos) {
    const tipo = doc?.TipoDocumento ?? "DOC";
    const rotulo = doc?.Categoria && doc.Categoria !== tipo ? `${tipo} · ${doc.Categoria}` : tipo;
    const ctFallback = doc?.ContentType || "application/pdf";
    const objectKey = doc?.URL ? semAssinatura(doc.URL) : null;

    if (objectKey && arquivados.has(objectKey)) {
      jaArquivados++;
      await registrarEvento(admin, {
        ...ctx,
        origem: "storage",
        evento: "PDF já no prontuário",
        resumo: `${rotulo} · cópia ${viaCanal} ignorada (mesmo arquivo já arquivado)`,
      });
      continue;
    }
    if (!doc?.URL) {
      await falhar(tipo, doc, null, ctFallback, "documento sem URL");
      continue;
    }
    if (!hostPermitido(doc.URL)) {
      let host = "";
      try {
        host = new URL(doc.URL).hostname;
      } catch { /* url inválida */ }
      await falhar(tipo, doc, objectKey, ctFallback, `host não permitido: ${host || "URL inválida"}`);
      continue;
    }

    const t0 = Date.now();
    const baixado = await baixarComRetry(doc.URL, 2);
    if (!baixado.ok) {
      await falhar(tipo, doc, objectKey, ctFallback, `download falhou: ${baixado.erro}`);
      continue;
    }

    const storagePath = `${presc.doctor_id}/${presc.id}/${slug(tipo)}-${crypto.randomUUID()}.pdf`;
    const contentType = doc.ContentType || baixado.contentType || "application/pdf";
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, baixado.bytes, { contentType, upsert: false });
    if (upErr) {
      await falhar(tipo, doc, objectKey, contentType, `upload falhou: ${upErr.message}`);
      continue;
    }

    const { error: insErr } = await registrar(tipo, doc, objectKey, storagePath, contentType, null);
    if (insErr?.code === "23505") {
      // O outro canal arquivou o mesmo objeto enquanto este baixava.
      await admin.storage.from(BUCKET).remove([storagePath]);
      jaArquivados++;
      if (objectKey) arquivados.add(objectKey);
      await registrarEvento(admin, {
        ...ctx,
        origem: "storage",
        evento: "PDF já no prontuário",
        resumo: `${rotulo} · cópia ${viaCanal} descartada (arquivada em paralelo pelo outro canal)`,
      });
      continue;
    }
    if (insErr) {
      // Arquivo no storage mas a linha falhou — falha durável com o caminho
      // no erro, para reprocessamento manual.
      await falhar(tipo, doc, objectKey, contentType, `registro falhou (arquivo em ${storagePath}): ${insErr.message}`);
      continue;
    }

    salvos++;
    if (objectKey) arquivados.add(objectKey);
    await registrarEvento(admin, {
      ...ctx,
      origem: "storage",
      evento: "PDF arquivado no prontuário",
      duracao_ms: Date.now() - t0,
      resumo: `${rotulo} · ${Math.round(baixado.bytes.byteLength / 1024)} KB · ${viaCanal}`,
      detalhe: { tipo: doc.TipoDocumento, categoria: doc.Categoria, assinado: doc.Assinado, origem: doc.URL, bucket: BUCKET },
    });
  }

  const status = falhas.length === 0 ? "finalizada" : "finalizada_com_erro";
  await admin
    .from("prescricoes_mevo")
    .update({ status, finalizada_em: presc.finalizada_em ?? new Date().toISOString() })
    .eq("id", presc.id);

  if (falhas.length > 0) {
    console.error(
      `[mevo-arquivo] prescricao=${presc.id} canal=${canal} salvos=${salvos} ja=${jaArquivados} falhas=`,
      falhas,
    );
  }

  return { salvos, jaArquivados, falhas, status };
}
