import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getRelatoriosData } from "@/lib/relatorios/getRelatoriosData";
import RelatoriosDashboard from "@/components/area-do-medico/RelatoriosDashboard";

// TODO(fase-1): substituir guard por middleware unificado.

export default async function Page() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // Dados reais escopados ao médico logado. null = usuário não é médico.
  const data = await getRelatoriosData(user.id);
  if (!data) redirect("/login/redirect");

  return <RelatoriosDashboard data={data} />;
}
