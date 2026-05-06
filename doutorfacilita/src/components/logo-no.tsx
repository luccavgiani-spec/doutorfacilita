/**
 * Logo da nó — 4 pontos coloridos (paleta Google) + "nó" em Caveat
 * Aceita um sufixo opcional (ex: "telemed") em DM Sans regular
 */
export function LogoNo({
  suffix,
  className = "",
}: {
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={`logo-no ${className}`}>
      <span className="dots">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="no-word">nó</span>
      {suffix && <>&nbsp;{suffix}</>}
    </span>
  );
}
