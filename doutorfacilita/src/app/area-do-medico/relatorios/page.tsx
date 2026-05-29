import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import RelatoriosDashboard from "@/components/area-do-medico/RelatoriosDashboard";

// TODO(fase-1): substituir guard por middleware unificado.

export default async function Page() {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return <RelatoriosDashboard />;
}
