/**
 * Skeleton instantâneo de qualquer aba do /admin.
 *
 * Cria a fronteira de Suspense ao redor do conteúdo (children do layout). Sem
 * isto, a navegação entre abas trava na página antiga até o Server Component
 * novo terminar TODAS as queries (e, em dev, compilar) — dando a sensação de
 * lentidão. Com isto, a troca de aba é instantânea: a sidebar permanece e o
 * conteúdo mostra um esqueleto enquanto os dados chegam.
 */
export default function AdminLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Carregando…">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 rounded bg-bg-3" />
          <div className="h-3 w-64 rounded bg-bg-3" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-bg-3" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5">
            <div className="h-3 w-24 rounded bg-bg-3" />
            <div className="mt-3 h-7 w-20 rounded bg-bg-3" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="h-4 w-40 rounded bg-bg-3" />
        <div className="mt-2 h-3 w-56 rounded bg-bg-3" />
        <div className="mt-6 h-48 w-full rounded-lg bg-bg-3" />
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 py-3 last:border-0">
            <div className="h-3 flex-1 rounded bg-bg-3" />
            <div className="h-3 w-24 rounded bg-bg-3" />
            <div className="h-3 w-16 rounded bg-bg-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
