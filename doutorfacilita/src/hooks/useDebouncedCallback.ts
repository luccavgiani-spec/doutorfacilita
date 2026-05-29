import { useCallback, useEffect, useRef } from "react";

/**
 * Retorna uma versão debounced de `fn`. Cancela timer pendente ao desmontar.
 * O callback debounced é estável entre renders (não muda a identidade da função).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void fnRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
