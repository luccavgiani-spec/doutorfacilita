/**
 * Faixa horizontal de 3px com as 4 cores da paleta Google.
 * Usada como detalhe decorativo da identidade da nó.
 */
export function Bar4({ className = "" }: { className?: string }) {
  return (
    <div className={`bar4 ${className}`}>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
