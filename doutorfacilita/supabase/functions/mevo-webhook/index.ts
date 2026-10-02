// mevo-webhook — recebe eventos server-to-server da Mevo.
//   EMISSION  -> baixa e arquiva os PDFs (caminho ROBUSTO, sem depender do
//                browser/postMessage). Janela de 10 min: baixa na hora.
//   CANCEL    -> marca a prescricao como cancelada.
//   CANCELLED_DOCUMENT -> log duravel (refinamento futuro).
//
// Auth: postKey no header Authorization (valor exato combinado com a Mevo),
// guardada no secret MEVO_WEBHOOK_POSTKEY. verify_jwt=false (a Mevo nao manda
// JWT do Supabase).
//
// IMPORTANTE: responde HTTP 201 em sucesso. Se responder != 201 a Mevo
// re-tenta de hora em hora — e ai os PDFs ja expiraram (10 min). Por isso
// SEMPRE 201 depois de registrar a tentativa de forma duravel.
//
// Discriminacao por formato do payload:
//   Documentos: Array  -> EMISSION
//   Documentos: Object -> CANCELLED_DOCUMENT
//   so idPrescricao    -> CANCEL
//
// Caminho no bucket (igual ao mevo-salvar-documentos):
//   {doctor_id}/{prescricao_id}/{tipo}-{uuid}.pdf

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "prescricoes-pdfs";

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

// comparacao de tempo constante para a postKey
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

const slug = (s: string) =>
  (s || "DOC").toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 24);

async function baixarComRetry(url: string, tentativas = 2) {
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
      return { ok: true as const, bytes: buf, contentType: ct };
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false as const, erro: ultimoErro };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // --- auth via postKey ---
  const expected = Deno.env.get("MEVO_WEBHOOK_POSTKEY");
  if (!expected) {
    console.error("[mevo-webhook] MEVO_WEBHOOK_POSTKEY ausente");
    return json({ error: "webhook_nao_configurado" }, 503);
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!safeEqual(auth, expected)) return json({ error: "unauthorized" }, 401);

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

    const idPrescricao = body?.idPrescricao != null
      ? String(body.idPrescricao)
      : null;
    if (!idPrescricao) {
      console.warn("[mevo-webhook] payload sem idPrescricao");
      return json({ recebido: true, aviso: "sem idPrescricao" }, 201);
    }

    // localizar a prescricao pelo id da Mevo
    const { data: presc } = await admin
      .from("prescricoes_mevo")
      .select("id, doctor_id, status")
      .eq("mevo_id_prescricao", idPrescricao)
      .maybeSingle();

    const docs = body?.Documentos;
    const isEmission = Array.isArray(docs);
    const isCancelledDoc = docs && typeof docs === "object" &&
      !Array.isArray(docs);

    // --- CANCEL (so idPrescricao) ---
    if (!isEmission && !isCancelledDoc) {
      if (presc) {
        await admin.from("prescricoes_mevo")
          .update({ status: "cancelada" })
          .eq("id", presc.id);
      }
      console.log(
        `[mevo-webhook] CANCEL idPrescricao=${idPrescricao} presc=${
          presc?.id ?? "n/a"
        }`,
      );
      return json({ recebido: true, evento: "CANCEL" }, 201);
    }

    // --- CANCELLED_DOCUMENT (Documentos = objeto por tipo) ---
    if (isCancelledDoc) {
      console.log(
        `[mevo-webhook] CANCELLED_DOCUMENT idPrescricao=${idPrescricao} presc=${
          presc?.id ?? "n/a"
        } docs=${JSON.stringify(docs)}`,
      );
      return json({ recebido: true, evento: "CANCELLED_DOCUMENT" }, 201);
    }

    // --- EMISSION ---
    if (!presc) {
      console.warn(
        `[mevo-webhook] EMISSION sem prescricao local idPrescricao=${idPrescricao}`,
      );
      return json(
        {
          recebido: true,
          evento: "EMISSION",
          aviso: "prescricao_local_nao_encontrada",
        },
        201,
      );
    }

    // idempotencia vs mevo-salvar-documentos: pula tipos/categorias ja salvos
    const { data: jaSalvos } = await admin
      .from("prescricoes_documentos")
      .select("tipo_documento, categoria")
      .eq("prescricao_id", presc.id)
      .not("download_succeeded_at", "is", null);
    const capturado = new Set(
      // deno-lint-ignore no-explicit-any
      (jaSalvos ?? []).map((d: any) =>
        `${d.tipo_documento}|${d.categoria ?? ""}`
      ),
    );

    const allowedHosts = (Deno.env.get("MEVO_PDF_ALLOWED_HOSTS") ??
      ".amazonaws.com,.nexodata.com.br")
      .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
    const hostPermitido = (urlStr: string): boolean => {
      let host: string;
      try {
        host = new URL(urlStr).hostname.toLowerCase();
      } catch {
        return false;
      }
      return allowedHosts.some((suf) => {
        const s = suf.startsWith(".") ? suf : "." + suf;
        return host === suf.replace(/^\./, "") || host.endsWith(s);
      });
    };

    // deno-lint-ignore no-explicit-any
    const registrar = async (
      tipo: string,
      // deno-lint-ignore no-explicit-any
      doc: any,
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
        download_attempted_at: agora,
        download_succeeded_at: erro ? null : agora,
        download_error: erro,
      });
    };

    const falhas: Array<{ tipo: string; erro: string }> = [];
    let salvos = 0;
    let pulados = 0;

    for (const doc of docs) {
      const tipo = doc?.TipoDocumento ?? "DOC";
      const ctFallback = doc?.ContentType || "application/pdf";
      const chave = `${tipo}|${doc?.Categoria ?? ""}`;

      if (capturado.has(chave)) {
        pulados++;
        continue;
      }
      if (!doc?.URL) {
        await registrar(tipo, doc, null, ctFallback, "documento sem URL");
        falhas.push({ tipo, erro: "documento sem URL" });
        continue;
      }
      if (!hostPermitido(doc.URL)) {
        let host = "";
        try {
          host = new URL(doc.URL).hostname;
        } catch { /* url invalida */ }
        const motivo = `host nao permitido: ${host || doc.URL}`;
        await registrar(tipo, doc, null, ctFallback, motivo);
        falhas.push({ tipo, erro: motivo });
        continue;
      }
      const baixado = await baixarComRetry(doc.URL, 2);
      if (!baixado.ok) {
        const motivo = `download falhou: ${baixado.erro}`;
        await registrar(tipo, doc, null, ctFallback, motivo);
        falhas.push({ tipo, erro: motivo });
        continue;
      }
      const storagePath = `${presc.doctor_id}/${presc.id}/${
        slug(tipo)
      }-${crypto.randomUUID()}.pdf`;
      const contentType = doc.ContentType || baixado.contentType ||
        "application/pdf";
      const { error: upErr } = await admin.storage.from(BUCKET)
        .upload(storagePath, baixado.bytes, { contentType, upsert: false });
      if (upErr) {
        const motivo = `upload falhou: ${upErr.message}`;
        await registrar(tipo, doc, null, contentType, motivo);
        falhas.push({ tipo, erro: motivo });
        continue;
      }
      const { error: insErr } = await registrar(
        tipo,
        doc,
        storagePath,
        contentType,
        null,
      );
      if (insErr) {
        const motivo =
          `registro falhou (arquivo em ${storagePath}): ${insErr.message}`;
        await registrar(tipo, doc, null, contentType, motivo);
        falhas.push({ tipo, erro: motivo });
        continue;
      }
      salvos++;
    }

    const novoStatus = falhas.length === 0
      ? "finalizada"
      : "finalizada_com_erro";
    await admin.from("prescricoes_mevo")
      .update({ status: novoStatus, finalizada_em: new Date().toISOString() })
      .eq("id", presc.id);

    if (falhas.length > 0) {
      console.error(
        `[mevo-webhook] EMISSION presc=${presc.id} salvos=${salvos} pulados=${pulados} falhas=`,
        falhas,
      );
    }

    // SEMPRE 201 apos registrar — retry da Mevo (1h) nao recupera URL expirada
    return json({
      recebido: true,
      evento: "EMISSION",
      documentos_salvos: salvos,
      ja_capturados: pulados,
      falhas,
      status: novoStatus,
    }, 201);
  } catch (e) {
    console.error("[mevo-webhook] erro inesperado", e);
    return json(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
