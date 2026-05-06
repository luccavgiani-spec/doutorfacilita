import ConsultaScreen from "@/components/ConsultaScreen";
import ConsultaScreenDesktop from "@/components/ConsultaScreenDesktop";

export default function Page() {
  return (
    <>
      <div className="lg:hidden">
        <ConsultaScreen />
      </div>
      <div className="hidden lg:block">
        <ConsultaScreenDesktop />
      </div>
    </>
  );
}
