import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";

// TODO(fase-1): substituir por auth completa.

export default async function LoginRedirectPage() {
  const { role, consultationId } = await getUserRole();

  if (role === "doctor") {
    redirect(consultationId ? `/cockpit?consultation=${consultationId}` : "/cockpit");
  }
  if (role === "patient") {
    redirect(consultationId ? `/fila?consultation=${consultationId}` : "/fila");
  }

  return (
    <div
      style={{
        maxWidth: 360,
        margin: "80px auto",
        padding: 24,
        textAlign: "center",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 12, fontWeight: 600 }}>
        Usuário sem perfil cadastrado
      </h1>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
        Sua conta autenticou com sucesso, mas não há registro em <code>doctors</code>{" "}
        nem <code>patients</code>.
      </p>
      <a
        href="/login"
        style={{ color: "#4285F4", fontSize: 14, fontWeight: 600 }}
      >
        Voltar ao login
      </a>
    </div>
  );
}
