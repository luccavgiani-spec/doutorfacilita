/* Logo da marca Plantão Digital (cruz + pessoa) — fonte única compartilhada.
   Reutilizado pela LP e por todas as telas do sistema (auth, cadastro,
   checkout, cockpit, fila, posconsulta). */

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="pd-grad" x1="60" y1="380" x2="452" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1230A8" />
          <stop offset="0.55" stopColor="#1E5AE8" />
          <stop offset="1" stopColor="#2FA4F2" />
        </linearGradient>
      </defs>
      {/* braço esquerdo */}
      <path
        d="M118 190h64c8 0 14 6 14 14v104c0 8-6 14-14 14h-64c-17 0-30-13-30-30v-72c0-17 13-30 30-30z"
        fill="url(#pd-grad)"
      />
      {/* braço superior = pessoa (cabeça vazada) */}
      <path
        d="M226 88h60c17 0 30 13 30 30v122c0 40-27 62-60 62s-60-22-60-62V118c0-17 13-30 30-30z"
        fill="url(#pd-grad)"
      />
      <circle cx="256" cy="238" r="34" fill="#fff" />
      {/* braço direito + braço inferior em curva contínua */}
      <path
        d="M346 190h48c17 0 30 13 30 30v72c0 17-13 30-30 30h-44c-20 0-34 14-34 34v38c0 17-13 30-30 30h-60c-17 0-30-13-30-30v-52c0-8 6-14 14-14h32c50 0 74-30 74-78v-46c0-8 6-14 14-14h16z"
        fill="url(#pd-grad)"
      />
    </svg>
  );
}

export function Logo({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span
        className={`text-[19px] font-bold tracking-tight ${
          light ? "text-white" : "text-[#0B1B3A]"
        }`}
      >
        Plantão<span className="text-[#1E5AE8]">Digital</span>
      </span>
    </span>
  );
}
