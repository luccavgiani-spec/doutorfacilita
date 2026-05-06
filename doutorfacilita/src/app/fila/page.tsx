import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FilaScreen from "@/components/FilaScreen";
import FilaScreenDesktop from "@/components/FilaScreenDesktop";

// TODO(fase-1): substituir guard por middleware unificado.

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultation?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { consultation } = await searchParams;
  return (
    <>
      <div className="lg:hidden">
        <FilaScreen consultationId={consultation} />
      </div>
      <div className="hidden lg:block">
        <FilaScreenDesktop consultationId={consultation} />
      </div>
    </>
  );
}
