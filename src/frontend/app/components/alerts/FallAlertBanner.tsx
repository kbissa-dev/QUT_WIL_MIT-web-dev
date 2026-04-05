"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/hooks";
import { addNotice } from "../../lib/slices/toastsSlice";
import { setAlert, clearAlert } from "../../lib/slices/alertsSlice";

type FallWsMessage = {
  alert_id?: string;
  predicted_action?: string;
  confidence?: number;
  timestamp?: string;
  should_trigger_alert?: boolean;
  member?: {
    id?: string;
    name?: string;
  };
};

const stopSoundRef = { current: false };

function playAlertSound() {
  stopSoundRef.current = false;
  let count = 0;

  const beep = async () => {
    if (stopSoundRef.current || count >= 10) return;

    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioCtx = new AudioCtx();

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 1
      );

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1);

      count += 1;

      if (!stopSoundRef.current && count < 10) {
        setTimeout(beep, 3000);
      }
    } catch (error) {
      console.error("Audio failed:", error);
    }
  };

  beep();
}

function stopAlertSound() {
  stopSoundRef.current = true;
}

export default function FallAlertBanner() {
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();

  const accessToken = useAppSelector((state: any) => state.tokens.access_token);
  const alert = useAppSelector((state: any) => state.alerts);

  const [isAcknowledging, setIsAcknowledging] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}/api/v1/activity/ws?token=${accessToken}`;

    const connect = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data: FallWsMessage = JSON.parse(event.data);

          if (data.should_trigger_alert && data.alert_id) {
            if (!data.alert_id) {
              console.warn(
                "Impossible state: backend said trigger alert, but  alert_id is missing. Banner ack cannot persist."
              );
            }

            dispatch(
              setAlert({
                alertId: data.alert_id || "",
                memberName: data.member?.name || "Unknown Patient",
                timestamp: data.timestamp || new Date().toISOString(),
                confidence: data.confidence ?? 0,
              })
            );

            playAlertSound();

            dispatch(
              addNotice({
                title: "FALL DETECTED",
                content: `${data.member?.name || "Unknown"} - ${(
                  (data.confidence ?? 0) * 100
                ).toFixed(1)}% confidence`,
                icon: "error",
              })
            );
          }
        } catch (error) {
          console.error("Failed to parse alert:", error);
        }
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      stopAlertSound();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [accessToken, dispatch]);

  const handleAcknowledge = async () => {
    if (!alert.alertId) {
      dispatch(
        addNotice({
          title: "Acknowledge failed",
          content: "Missing alert id. Could not persist acknowledgement.",
          icon: "error",
        })
      );
      return;
    }

    if (!accessToken) {
      dispatch(
        addNotice({
          title: "Acknowledge failed",
          content: "Missing access token.",
          icon: "error",
        })
      );
      return;
    }

    try {
      setIsAcknowledging(true);

      const response = await fetch(
        `http://localhost/api/v1/alerts/${alert.alertId}/acknowledge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Acknowledge failed with status ${response.status}`);
      }

      stopAlertSound();
      dispatch(clearAlert());

      dispatch(
        addNotice({
          title: "Alert acknowledged",
          content: `${alert.memberName} alert marked as acknowledged`,
          icon: "success",
        })
      );
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);

      dispatch(
        addNotice({
          title: "Acknowledge failed",
          content: "Could not save acknowledgement. Please try again.",
          icon: "error",
        })
      );
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (!alert.hasActiveAlert) return null;

  return (
    <div className="bg-red-600 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>

          <div>
            <p className="text-lg font-bold">FALL DETECTED</p>
            <p className="text-sm text-red-100">
              {alert.memberName} ·{" "}
              {alert.timestamp
                ? new Date(alert.timestamp).toLocaleTimeString()
                : "Unknown time"}{" "}
              · {(alert.confidence * 100).toFixed(1)}% confidence
            </p>
          </div>
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={isAcknowledging}
          className="rounded-md bg-white px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAcknowledging ? "Acknowledging..." : "Acknowledge"}
        </button>
      </div>
    </div>
  );
}