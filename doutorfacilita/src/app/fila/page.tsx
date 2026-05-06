import FilaScreen from "@/components/FilaScreen";
import FilaScreenDesktop from "@/components/FilaScreenDesktop";

export default function Page() {
  return (
    <>
      <div className="lg:hidden">
        <FilaScreen />
      </div>
      <div className="hidden lg:block">
        <FilaScreenDesktop />
      </div>
    </>
  );
}
