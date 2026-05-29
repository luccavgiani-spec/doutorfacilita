import type { ReactNode } from "react";

/**
 * Tabela genérica do /admin. Presentacional (sem estado) → funciona em
 * Server Components. Busca/paginação ficam por página via searchParams.
 * Não existia DataTable no projeto; esta é a base (regra 5, seção 12).
 */

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render da célula. Default: String(row[key]). */
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nenhum registro.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-txt-2">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 font-semibold ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-txt-3"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className="border-b border-border/60 last:border-0 hover:bg-bg-3/50"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {c.render
                      ? c.render(row)
                      : String((row as Record<string, unknown>)[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Paginação server-side via querystring (?page=N). */
export function Pagination({
  basePath,
  page,
  hasNext,
  query,
}: {
  basePath: string;
  page: number;
  hasNext: boolean;
  query?: Record<string, string | undefined>;
}) {
  const mk = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v) sp.set(k, v);
    }
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-txt-2">
      <span>Página {page}</span>
      <div className="flex gap-2">
        <PageLink href={mk(page - 1)} disabled={page <= 1}>
          ← Anterior
        </PageLink>
        <PageLink href={mk(page + 1)} disabled={!hasNext}>
          Próxima →
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-txt-3 opacity-50">
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="rounded-lg border border-border px-3 py-1.5 font-semibold text-txt-2 hover:bg-bg-3"
    >
      {children}
    </a>
  );
}

/** Badge de status reaproveitável. */
export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "yellow" | "blue" | "neutral";
}) {
  const cls = {
    green: "bg-green-l text-green-d",
    red: "bg-red-l text-red",
    yellow: "bg-yellow-l text-yellow",
    blue: "bg-blue-l text-blue",
    neutral: "bg-bg-3 text-txt-2",
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
