import LPScreen from "@/components/LPScreen";
import LPScreenDesktop from "@/components/LPScreenDesktop";

export default function Page() {
  return (
    <>
      <div className="lg:hidden">
        <LPScreen />
      </div>
      <div className="hidden lg:block">
        <LPScreenDesktop />
      </div>
    </>
  );
}
