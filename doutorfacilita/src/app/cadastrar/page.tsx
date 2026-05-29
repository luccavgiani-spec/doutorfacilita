import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CadastroWizard from "@/components/cadastro/CadastroWizard";

export default async function CadastrarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/login/redirect");

  return <CadastroWizard />;
}
