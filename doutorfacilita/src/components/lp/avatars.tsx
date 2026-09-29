"use client";

import { useState } from "react";

/* Avatares de perfil GENÉRICOS — ilustração flat (não são fotos de pessoas
   reais). Estilo determinístico pelo nome → estável no loop do marquee. */
type AvatarStyle = {
  bg: string;
  skin: string;
  hair: string;
  clothes: string;
  kind: "short" | "round" | "long" | "bun";
};

const AVATAR_STYLES: AvatarStyle[] = [
  { bg: "#DCE9FF", skin: "#F3CBA6", hair: "#2B2320", clothes: "#3B5BA5", kind: "short" },
  { bg: "#ECE6FF", skin: "#C68A5E", hair: "#12100E", clothes: "#8C5B9E", kind: "long" },
  { bg: "#D8F1E8", skin: "#DDA579", hair: "#5C3A22", clothes: "#2F8F6B", kind: "bun" },
  { bg: "#FFE8DA", skin: "#F3CBA6", hair: "#7A5230", clothes: "#C46A6A", kind: "long" },
  { bg: "#E2F0FF", skin: "#9C6B45", hair: "#12100E", clothes: "#4A6FA5", kind: "short" },
  { bg: "#FCE1EC", skin: "#DDA579", hair: "#2B2320", clothes: "#5B6B8C", kind: "bun" },
  { bg: "#E8ECF5", skin: "#C68A5E", hair: "#5C3A22", clothes: "#3B5BA5", kind: "round" },
  { bg: "#DDEEFF", skin: "#7A4E30", hair: "#12100E", clothes: "#2F8F6B", kind: "long" },
];

function avatarStyle(name: string): AvatarStyle {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % 997;
  return AVATAR_STYLES[h % AVATAR_STYLES.length];
}

export function PersonAvatar({ name }: { name: string }) {
  const s = avatarStyle(name);
  const hairR = s.kind === "short" ? 12.4 : 13;
  const hairCy = s.kind === "short" ? 26.5 : 27;
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <rect width="64" height="64" fill={s.bg} />
      {s.kind === "long" && (
        <g fill={s.hair}>
          <rect x="17.5" y="26" width="6" height="18" rx="3" />
          <rect x="40.5" y="26" width="6" height="18" rx="3" />
        </g>
      )}
      <path d="M8 64C8 47 20 45 32 45s24 2 24 19Z" fill={s.clothes} />
      <circle cx="32" cy={hairCy} r={hairR} fill={s.hair} />
      <circle cx="32" cy="31" r="11.6" fill={s.skin} />
      {s.kind === "bun" && <circle cx="32" cy="12.5" r="4.5" fill={s.hair} />}
    </svg>
  );
}

/* Fotos dos depoimentos — fornecidas pelo Lucca (2026-09-29), recortadas em
   160×160 webp em public/assets/depoimentos. Se a imagem não carregar, cai no
   avatar ilustrado <PersonAvatar />. */
export const PHOTO_BY_NAME: Record<string, string> = {
  "Marina T.": "/assets/depoimentos/marina-t.webp",
  "Rafael Andrade": "/assets/depoimentos/rafael-andrade.webp",
  "Cláudia Nogueira": "/assets/depoimentos/claudia-nogueira.webp",
  "Patrícia L.": "/assets/depoimentos/patricia-l.webp",
  "Diego Farias": "/assets/depoimentos/diego-farias.webp",
  "Henrique B.": "/assets/depoimentos/henrique-b.webp",
  "Aline Souza": "/assets/depoimentos/aline-souza.webp",
  "Vinícius M.": "/assets/depoimentos/vinicius-m.webp",
};

export function AvatarPhoto({ name, className = "h-11 w-11" }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = PHOTO_BY_NAME[name];
  return (
    <span className={`${className} shrink-0 overflow-hidden rounded-full ring-1 ring-[#E6ECF8]`}>
      {photo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <PersonAvatar name={name} />
      )}
    </span>
  );
}
