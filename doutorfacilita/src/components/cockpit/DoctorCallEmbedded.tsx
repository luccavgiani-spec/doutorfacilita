"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";

interface Props {
  token: string;
  url: string;
  onDisconnect: () => void;
}

/** Visor da telechamada embedded no cockpit. Usa o VideoConference do LiveKit
 *  (mesmo do lado do paciente): layout WhatsApp-style 1:1 — um participante
 *  grande na área principal + thumbnail swappable do outro no canto. Preenche
 *  toda a área de chamada disponível (h-full); não mais travado num strip
 *  landscape estreito de 240px. */
export default function DoctorCallEmbedded({ token, url, onDisconnect }: Props) {
  return (
    <div className="doc-call-embedded">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect
        video
        audio
        data-lk-theme="default"
        onDisconnected={onDisconnect}
        style={{ height: "100%", width: "100%" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
