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
  mevo_token: string | null;
  qrcode_url: string | null;
  codigo_validacao: string | null;
  status: PrescricaoStatus;
  ambiente: "homologacao" | "producao";
  created_at: string;
  finalizada_em: string | null;
}

export interface IniciarResposta {
  modal_url: string;
  prescricao_id: string;
  mevo_id_prescricao: string | null;
  mevo_token: string | null;
}
