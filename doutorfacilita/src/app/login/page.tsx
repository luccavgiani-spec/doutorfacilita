import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";
import LoginForm from "@/components/auth/LoginForm";

// TODO(fase-1): substituir por auth completa.

export default async function LoginPage() {
  const { role, consultationId } = await getUserRole();

  if (role === "doctor") {
    redirect(consultationId ? `/cockpit?consultation=${consultationId}` : "/cockpit");
  }
  if (role === "patient") {
    redirect(consultationId ? `/fila?consultation=${consultationId}` : "/fila");
  }

  return <LoginForm />;
}
