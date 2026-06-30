"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FilaScreen from "@/components/FilaScreen";
import FilaScreenDesktop from "@/components/FilaScreenDesktop";
import ConsultaLive from "@/components/consulta/ConsultaLive";

interface Props {
  consultationId: string;
  displayName: string;
}

export default function FilaShell({ consultationId, displayName }: Props) {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);

  if (inCall) {
    return (
      <ConsultaLive
        consultationId={consultationId}
        role="patient"
        displayName={displayName}
        // Ao desligar, paciente vai pra tela de pós-consulta (whatsapp/resumo/upsell)
        onDisconnect={() => router.push("/posconsulta")}
      />
    );
  }

  return (
    <>
      <div className="lg:hidden">
        <FilaScreen
          consultationId={consultationId}
          displayName={displayName}
          onEnterCall={() => setInCall(true)}
        />
      </div>
      <div className="hidden lg:block">
        <FilaScreenDesktop
          consultationId={consultationId}
          displayName={displayName}
          onEnterCall={() => setInCall(true)}
        />
      </div>
    </>
  );
}
