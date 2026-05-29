/**
 * Helpers de séries temporais para os gráficos do /admin.
 *
 * Os endpoints PostgREST não fazem GROUP BY data → fazemos client/server-side
 * em JS: recebemos as linhas brutas (consultations.created_at, patients.created_at, etc.)
 * e bucket por dia local pra plotar.
 */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Gera array de dias do passado (inclusive hoje) — ex.: 30 dias atrás → hoje. */
function dayRange(days: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

/** Agrupa rows por dia somando o valor de `pickValue`. */
export function bucketDailyValue<T>(
  rows: T[],
  pickDate: (r: T) => string | Date | null | undefined,
  pickValue: (r: T) => number,
  days: number,
): { dia: string; total: number }[] {
  const range = dayRange(days);
  const map = new Map<string, number>();
  range.forEach((d) => map.set(ymd(d), 0));

  for (const r of rows) {
    const raw = pickDate(r);
    if (!raw) continue;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = ymd(d);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + pickValue(r));
  }
  return range.map((d) => ({ dia: shortDay(d), total: map.get(ymd(d)) ?? 0 }));
}

/** Conta rows por dia. */
export function bucketDailyCount<T>(
  rows: T[],
  pickDate: (r: T) => string | Date | null | undefined,
  days: number,
): { dia: string; total: number }[] {
  return bucketDailyValue(rows, pickDate, () => 1, days);
}

/** Calcula faixa "since" em ISO pra filtros do supabase. */
export function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
