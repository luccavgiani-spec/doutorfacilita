"use client";

import { createClient } from "@/lib/supabase/client";

// TODO(fase-1): substituir por menu de usuário completo (perfil, configurações, sair).

export default function LogoutButton() {
  async function handleClick() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Sem env vars o cliente nem cria — ainda assim queremos voltar pra /login.
    }
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        fontSize: 11,
        color: "#888",
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 100,
        padding: "4px 10px",
        cursor: "pointer",
        zIndex: 1000,
        backdropFilter: "blur(8px)",
      }}
    >
      Sair
    </button>
  );
}
