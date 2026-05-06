import FilaScreen from "@/components/FilaScreen";
import FilaScreenDesktop from "@/components/FilaScreenDesktop";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultation?: string }>;
}) {
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
