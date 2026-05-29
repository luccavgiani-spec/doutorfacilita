"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DocumentoMevo,
  IniciarResposta,
  PrescricaoMevo,
} from "@/lib/mevo/types";

const BUCKET = "prescricoes-pdfs";

/** Erro estruturado vindo de uma Edge Function (corpo JSON do response). */
export interface MevoFuncError {
  error: string;
  message?: string;
  faltantes?: string[];
  naoConfigurada: boolean; // true quando 503 mevo_nao_configurada
  status: number;
}

/**
 * Lê o corpo de erro de uma invocação de Edge Function.
 * supabase-js v2: em não-2xx, `error` é FunctionsHttpError e `error.context`
 * é o Response — onde está o JSON real (503, 422, etc).
 */
async function parseFuncError(error: unknown): Promise<MevoFuncError> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.clone().json();
      return {
        error: body.error ?? "erro_desconhecido",
        message: body.message,
        faltantes: body.faltantes,
        naoConfigurada:
          ctx.status === 503 || body.error === "mevo_nao_configurada",
        status: ctx.status,
      };
    } catch {
      /* corpo não-JSON */
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { error: "erro_rede", message: msg, naoConfigurada: false, status: 0 };
}

export function useMevoPrescricao(consultationId?: string) {
  const [carregando, setCarregando] = useState(false);

  const iniciarPrescricao = useCallback(async (): Promise<
    { ok: true; data: IniciarResposta } | { ok: false; erro: MevoFuncError }
  > => {
    if (!consultationId) {
      return {
        ok: false,
        erro: {
          error: "sem_consulta",
          message: "Nenhuma consulta ativa para emitir prescrição.",
          naoConfigurada: false,
          status: 0,
        },
      };
    }
    setCarregando(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "mevo-iniciar-prescricao",
        { body: { consultation_id: consultationId } },
      );
      if (error) return { ok: false, erro: await parseFuncError(error) };
      return { ok: true, data: data as IniciarResposta };
    } finally {
      setCarregando(false);
    }
  }, [consultationId]);

  /**
   * Pergunta à Edge Function se a credencial Mevo está configurada (sem
   * efeito colateral — não inicia prescrição). Reaproveita o mesmo guard
   * 503 `mevo_nao_configurada`. Retorna o ambiente real (derivado da
   * MEVO_BASE_URL no servidor) quando configurada.
   */
  const verificarConfiguracao = useCallback(async (): Promise<
    | { configured: true; ambiente: "homologacao" | "producao" }
    | { configured: false }
  > => {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke(
      "mevo-iniciar-prescricao",
      { body: { check: true } },
    );
    if (error) {
      // 503 → não configurada; qualquer outro erro → trata como não pronta.
      return { configured: false };
    }
    const d = data as { configured?: boolean; ambiente?: string };
    if (d?.configured) {
      return {
        configured: true,
        ambiente: d.ambiente === "producao" ? "producao" : "homologacao",
      };
    }
    return { configured: false };
  }, []);

  const reabrirPrescricao = useCallback(
    async (
      prescricaoId: string,
    ): Promise<
      { ok: true; modal_url: string } | { ok: false; erro: MevoFuncError }
    > => {
      setCarregando(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke(
          "mevo-reabrir-prescricao",
          { body: { prescricao_id: prescricaoId } },
        );
        if (error) return { ok: false, erro: await parseFuncError(error) };
        return { ok: true, modal_url: (data as { modal_url: string }).modal_url };
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  const salvarDocumentos = useCallback(
    async (
      prescricaoId: string,
      documentos: DocumentoMevo[],
    ): Promise<
      | {
          ok: true;
          documentos_salvos: number;
          falhas: Array<{ tipo: string; erro: string }>;
        }
      | { ok: false; erro: MevoFuncError }
    > => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "mevo-salvar-documentos",
        { body: { prescricao_id: prescricaoId, documentos } },
      );
      if (error) return { ok: false, erro: await parseFuncError(error) };
      const d = data as {
        documentos_salvos: number;
        falhas: Array<{ tipo: string; erro: string }>;
      };
      return { ok: true, documentos_salvos: d.documentos_salvos, falhas: d.falhas };
    },
    [],
  );

  const listarPrescricoesDaConsulta = useCallback(async (): Promise<
    PrescricaoMevo[]
  > => {
    if (!consultationId) return [];
    const supabase = createClient();
    const { data } = await supabase
      .from("prescricoes_mevo")
      .select(
        "id, consultation_id, mevo_id_prescricao, mevo_token, qrcode_url, codigo_validacao, status, ambiente, created_at, finalizada_em",
      )
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false });
    return (data as PrescricaoMevo[] | null) ?? [];
  }, [consultationId]);

  /** Gera signed URLs (1h) dos PDFs de uma prescrição para download. */
  const listarDocumentos = useCallback(
    async (
      prescricaoId: string,
    ): Promise<Array<{ tipo: string; url: string | null }>> => {
      const supabase = createClient();
      const { data: docs } = await supabase
        .from("prescricoes_documentos")
        .select("tipo_documento, storage_path")
        .eq("prescricao_id", prescricaoId)
        .order("created_at", { ascending: true });

      const linhas = (docs as
        | Array<{ tipo_documento: string; storage_path: string }>
        | null) ?? [];

      const out: Array<{ tipo: string; url: string | null }> = [];
      for (const l of linhas) {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(l.storage_path, 3600);
        out.push({ tipo: l.tipo_documento, url: signed?.signedUrl ?? null });
      }
      return out;
    },
    [],
  );

  /** Conta documentos arquivados por prescrição (para o label "Baixar N PDFs"). */
  const contarDocumentos = useCallback(
    async (prescricaoIds: string[]): Promise<Record<string, number>> => {
      if (prescricaoIds.length === 0) return {};
      const supabase = createClient();
      const { data } = await supabase
        .from("prescricoes_documentos")
        .select("prescricao_id")
        .in("prescricao_id", prescricaoIds);
      const out: Record<string, number> = {};
      for (const row of (data as { prescricao_id: string }[] | null) ?? []) {
        out[row.prescricao_id] = (out[row.prescricao_id] ?? 0) + 1;
      }
      return out;
    },
    [],
  );

  return {
    carregando,
    verificarConfiguracao,
    iniciarPrescricao,
    reabrirPrescricao,
    salvarDocumentos,
    listarPrescricoesDaConsulta,
    listarDocumentos,
    contarDocumentos,
  };
}
