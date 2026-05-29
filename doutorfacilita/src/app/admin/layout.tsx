import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Guard do /admin — dupla camada:
 *  (1) aqui: resolve has_role('admin') server-side e redireciona;
 *  (2) RLS no banco (has_role('admin') em cada tabela) — defesa real.
 *
 * Fonte única de role: RBAC `user_roles` + função `has_role`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin, error: rpcError } = await supabase.rpc("has_role", {
    check_role: "admin",
  });

  if (rpcError || !isAdmin) redirect("/cockpit");

  return (
    <AdminShell userEmail={user.email ?? ""}>{children}</AdminShell>
  );
}
