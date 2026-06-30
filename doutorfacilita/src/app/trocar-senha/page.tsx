import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrocarSenhaForm from "./TrocarSenhaForm";

export default async function TrocarSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão → login. Já trocou a senha → segue pro funil normal.
  if (!user) redirect("/login");
  if (user.user_metadata?.must_change_password !== true) {
    redirect("/login/redirect");
  }

  return <TrocarSenhaForm />;
}
