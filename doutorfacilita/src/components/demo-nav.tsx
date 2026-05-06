"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nav fixa no rodapé pra alternar entre as 4 telas durante desenvolvimento.
 * Não aparece em produção (controlado em layout.tsx via NODE_ENV).
 */
export function DemoNav() {
  const pathname = usePathname();

  const buttonClass = (active: boolean) =>
    `font-sans text-xs font-medium px-3.5 py-2 rounded-full cursor-pointer flex items-center gap-1.5 transition-all duration-150 ${
      active
        ? "bg-blue text-white"
        : "text-txt2 hover:bg-bg-3 hover:text-txt bg-transparent"
    }`;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] bg-white rounded-full p-1.5 flex gap-1 items-center"
      style={{
        border: "1px solid var(--hborder2)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <span className="text-[10px] text-txt3 uppercase tracking-wider px-1.5 self-center font-semibold">
        paciente · mobile
      </span>
      <Link href="/" className={buttonClass(pathname === "/")}>
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${
            pathname === "/" ? "opacity-100" : "opacity-50"
          }`}
        ></span>
        LP
      </Link>
      <Link href="/fila" className={buttonClass(pathname === "/fila")}>
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${
            pathname === "/fila" ? "opacity-100" : "opacity-50"
          }`}
        ></span>
        Fila
      </Link>
      <Link
        href="/consulta"
        className={buttonClass(pathname.startsWith("/consulta"))}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${
            pathname.startsWith("/consulta") ? "opacity-100" : "opacity-50"
          }`}
        ></span>
        Consulta
      </Link>

      <span
        className="w-px h-5 self-center mx-1"
        style={{ background: "var(--hborder)" }}
      ></span>

      <span className="text-[10px] text-txt3 uppercase tracking-wider px-1.5 self-center font-semibold">
        médico · desktop
      </span>
      <Link href="/cockpit" className={buttonClass(pathname === "/cockpit")}>
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${
            pathname === "/cockpit" ? "opacity-100" : "opacity-50"
          }`}
        ></span>
        Cockpit
      </Link>
    </div>
  );
}
