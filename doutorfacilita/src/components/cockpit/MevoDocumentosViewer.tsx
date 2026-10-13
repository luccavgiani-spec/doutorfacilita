"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nomeArquivo, rotuloDocumento, urlDocumento } from "@/lib/mevo/documentos";
import type { DocumentoArquivado } from "@/lib/mevo/types";

/**
 * Visualizador dos PDFs arquivados no prontuário (bucket privado, signed URL
 * de 1h). Abre dentro da página — evita o bloqueio de pop-up de abrir vários
 * PDFs em abas — com lista lateral quando a prescrição tem mais de um
 * documento e botão de download.
 */
export default function MevoDocumentosViewer({
  titulo,
  subtitulo,
  documentos,
  idPrescricao,
  inicial = 0,
  onClose,
}: {
  titulo: string;
  subtitulo?: string;
  documentos: DocumentoArquivado[];
  idPrescricao: string | null;
  inicial?: number;
  onClose: () => void;
}) {
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!sbRef.current) sbRef.current = createClient();
  const [atual, setAtual] = useState(Math.min(inicial, Math.max(documentos.length - 1, 0)));
  const [urls, setUrls] = useState<{ ver: string | null; baixar: string | null } | null>(null);

  const doc = documentos[atual];
  // Chaves primitivas: um refetch da lista no pai não recarrega o PDF aberto.
  const docId = doc?.id;
  const path = doc?.storage_path;
  const tipo = doc?.tipo_documento;

  useEffect(() => {
    if (!docId || !path || !tipo) return;
    let vivo = true;
    setUrls(null);
    const sb = sbRef.current!;
    Promise.all([
      urlDocumento(sb, path),
      urlDocumento(sb, path, nomeArquivo({ id: docId, tipo_documento: tipo }, idPrescricao)),
    ]).then(([ver, baixar]) => {
      if (vivo) setUrls({ ver, baixar });
    });
    return () => {
      vivo = false;
    };
  }, [docId, path, tipo, idPrescricao]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mevo-viewer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="mevo-viewer-box" onClick={(e) => e.stopPropagation()}>
        <div className="mevo-viewer-head">
          <div>
            <div className="mevo-viewer-title">{titulo}</div>
            {subtitulo && <div className="mevo-viewer-sub">{subtitulo}</div>}
          </div>
          <div className="mevo-viewer-actions">
            {urls?.baixar && (
              <a className="mevo-viewer-btn" href={urls.baixar}>
                Baixar PDF
              </a>
            )}
            <button type="button" className="mevo-viewer-btn" onClick={onClose} aria-label="Fechar">
              Fechar ✕
            </button>
          </div>
        </div>
        <div className="mevo-viewer-body">
          {documentos.length > 1 && (
            <div className="mevo-viewer-list">
              {documentos.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  className={`mevo-viewer-item${i === atual ? " active" : ""}`}
                  onClick={() => setAtual(i)}
                >
                  📄 {rotuloDocumento(d)}
                </button>
              ))}
            </div>
          )}
          <div className="mevo-viewer-frame">
            {!doc ? (
              <div className="mevo-viewer-empty">Nenhum documento arquivado.</div>
            ) : urls?.ver ? (
              <iframe key={urls.ver} src={urls.ver} title={rotuloDocumento(doc)} />
            ) : (
              <div className="mevo-viewer-empty">
                {urls ? "Não foi possível gerar o link do documento." : "Carregando documento…"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
