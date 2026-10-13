import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentoArquivado } from "@/lib/mevo/types";

export const BUCKET_PRESCRICOES = "prescricoes-pdfs";

/** Eventos de janela que pedem refresh das listas de documentos Mevo. */
export const EVENTO_DOCUMENTOS_ATUALIZADOS = "mevo:documentos-atualizados";

export function avisarDocumentosAtualizados() {
  window.dispatchEvent(new Event(EVENTO_DOCUMENTOS_ATUALIZADOS));
}

/** PDFs efetivamente arquivados (linhas de falha ficam de fora). */
export async function listarDocumentosArquivados(
  sb: SupabaseClient,
  prescricaoIds: string[],
): Promise<DocumentoArquivado[]> {
  if (prescricaoIds.length === 0) return [];
  const { data } = await sb
    .from("prescricoes_documentos")
    .select("id, prescricao_id, tipo_documento, categoria, storage_path, origem, download_succeeded_at")
    .in("prescricao_id", prescricaoIds)
    .not("storage_path", "is", null)
    .order("created_at", { ascending: true });
  return (data as DocumentoArquivado[] | null) ?? [];
}

/** Signed URL (1h). Com `download`, o navegador baixa com esse nome de arquivo. */
export async function urlDocumento(
  sb: SupabaseClient,
  storagePath: string,
  download?: string,
): Promise<string | null> {
  const { data } = await sb.storage
    .from(BUCKET_PRESCRICOES)
    .createSignedUrl(storagePath, 3600, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

export function rotuloDocumento(d: Pick<DocumentoArquivado, "tipo_documento" | "categoria">): string {
  return d.categoria && d.categoria !== d.tipo_documento
    ? `${d.tipo_documento} · ${d.categoria}`
    : d.tipo_documento;
}

export function nomeArquivo(
  d: Pick<DocumentoArquivado, "tipo_documento" | "id">,
  idPrescricao: string | null,
): string {
  const tipo = d.tipo_documento.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${tipo}-${idPrescricao ?? d.id.slice(0, 8)}.pdf`;
}

export function fmtHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
