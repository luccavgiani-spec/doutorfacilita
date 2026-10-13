// Tipos Mevo usados no frontend. Espelha supabase/functions/_shared/mevo-types.ts
// (não dá pra importar dali — código Deno, fora de src/). Mantenha em sincronia.

export type MevoEventoTipo = "prescricao" | "cancel" | "excluded";

export interface DocumentoMevo {
  TipoDocumento: string;
  Categoria?: string;
  URL: string;
  Assinado?: boolean;
  ContentType?: string;
}

export interface EventoMevo {
  type: MevoEventoTipo;
  idPrescricao?: string;
  Documentos?: DocumentoMevo[];
}

export type PrescricaoStatus =
  | "iniciada"
  | "finalizada"
  | "finalizada_com_erro"
  | "cancelada"
  | "excluida";

export interface PrescricaoMevo {
  id: string;
  consultation_id: string;
  mevo_id_prescricao: string | null;
  qrcode_url: string | null;
  codigo_validacao: string | null;
  status: PrescricaoStatus;
  ambiente: "homologacao" | "producao";
  created_at: string;
  finalizada_em: string | null;
  webhook_recebido_em: string | null;
}

/** PDF arquivado no bucket prescricoes-pdfs (prescricoes_documentos com storage_path). */
export interface DocumentoArquivado {
  id: string;
  prescricao_id: string;
  tipo_documento: string;
  categoria: string | null;
  storage_path: string;
  origem: "webhook" | "postmessage" | null;
  download_succeeded_at: string | null;
}

export interface IniciarResposta {
  modal_url: string;
  prescricao_id: string;
  mevo_id_prescricao: string | null;
  codigo_validacao: string | null;
}

/** Linha de public.mevo_eventos (detalhe já sanitizado na Edge Function). */
export interface EventoIntegracaoMevo {
  id: number;
  criado_em: string;
  origem: "backend" | "webhook" | "iframe" | "storage";
  evento: string;
  http_status: number | null;
  duracao_ms: number | null;
  mevo_id_prescricao: string | null;
  prescricao_id: string | null;
  consultation_id: string | null;
  resumo: string | null;
  detalhe: unknown;
}
