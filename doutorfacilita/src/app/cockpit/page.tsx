import CockpitScreen from "@/components/CockpitScreen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultation?: string }>;
}) {
  const { consultation } = await searchParams;
  return <CockpitScreen consultationId={consultation} />;
}
