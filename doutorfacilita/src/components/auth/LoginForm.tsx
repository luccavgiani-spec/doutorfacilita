"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// TODO(fase-1): substituir por auth completa com signup, recovery, magic link, etc.

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou senha inválidos");
      setLoading(false);
      return;
    }

    router.push("/login/redirect");
    router.refresh();
  }

  return (
    <div
      style={{
        maxWidth: 360,
        margin: "80px auto",
        padding: 24,
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 24, fontWeight: 600 }}>Entrar (DEV)</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        ⚠️ Página temporária de teste. Auth completa vem na Fase 1.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        {error && <div style={{ color: "#d33", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            background: "#4285F4",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <details style={{ marginTop: 24, fontSize: 12, color: "#888" }}>
        <summary style={{ cursor: "pointer" }}>Credenciais de teste</summary>
        <div style={{ marginTop: 8, lineHeight: 1.6 }}>
          <strong>Médico:</strong> medico-teste@doutorfacilita.test / Test1234!
          <br />
          <strong>Paciente:</strong> paciente-teste@doutorfacilita.test / Test1234!
        </div>
      </details>
    </div>
  );
}
