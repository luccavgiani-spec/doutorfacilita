import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";
import { createClient } from "@/lib/supabase/server";

// Cérebro do funil pós-login.
//   doctor  → /cockpit (com consulta ativa se houver)
//   patient → consulta ATIVA (in_queue|in_progress)? → /fila?consultation=<id>
//             senão (incl. só consultas concluídas)   → /checkout
//   sem perfil → tela explicativa abaixo (fallback)
//
// getUserRole já resolve consultationId como a consulta ATIVA do papel
// (in_queue|in_progress) — é a fonte única usada aqui para os dois papéis.
export default async function LoginRedirectPage() {
  // Contas criadas pelo admin com senha temporária: força troca antes de tudo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.user_metadata?.must_change_password === true) {
    redirect("/trocar-senha");
  }

  const { role, consultationId } = await getUserRole();

  if (role === "doctor") {
    redirect(consultationId ? `/cockpit?consultation=${consultationId}` : "/cockpit");
  }
  if (role === "patient") {
    if (consultationId) redirect(`/fila?consultation=${consultationId}`);
    redirect("/checkout");
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
