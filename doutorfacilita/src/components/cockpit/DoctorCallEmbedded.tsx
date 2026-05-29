"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface Props {
  token: string;
  url: string;
  onDisconnect: () => void;
}

/** Layout compacto embedded no cockpit: tiles de vídeo + control bar minimal.
 *  Ocupa o doc-video-strip (240px). */
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
        <RoomAudioRenderer />
        <CallStage />
        <div className="doc-call-bar">
          <ControlBar
            variation="minimal"
            controls={{ microphone: true, camera: true, screenShare: false, leave: true }}
          />
        </div>
      </LiveKitRoom>
    </div>
  );
}

function CallStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: "calc(100% - 56px)" }}>
      <ParticipantTile />
    </GridLayout>
  );
}
