"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/hooks";
import { addNotice } from "../../lib/slices/toastsSlice";
import { setAlert, clearAlert } from "../../lib/slices/alertsSlice";

const stopSoundRef = { current: false };

function playAlertSound() {
  stopSoundRef.current = false;
  let count = 0;
  const beep = () => {
    if (stopSoundRef.current || count >= 10) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1);
      count++;
      if (count < 10) setTimeout(beep, 3000);
    } catch (e) {
      console.error("Audio failed:", e);
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

  useEffect(() => {
    if (!accessToken) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}/api/v1/activity/ws?token=${accessToken}`;

    const connect = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.predicted_action === "fall") {
            dispatch(setAlert({
              memberName: data.member?.name || "Unknown Patient",
              timestamp: new Date().toISOString(),
              confidence: data.confidence,
            }));
            playAlertSound();
            dispatch(addNotice({
              title: "FALL DETECTED",
              content: `${data.member?.name || "Unknown"} - ${(data.confidence * 100).toFixed(1)}% confidence`,
              icon: "error",
            }));
          }
        } catch (e) {
          console.error("Failed to parse alert:", e);
        }
      };

      ws.onclose = () => setTimeout(connect, 3000);
    };

    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [accessToken]);

  if (!alert.hasActiveAlert) return null;

  return (
    <div className="bg-red-600 px-4 py-3 text-white">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-bold text-lg">FALL DETECTED</p>
            <p className="text-sm text-red-100">
              {alert.memberName} · {new Date(alert.timestamp).toLocaleTimeString()} · {(alert.confidence * 100).toFixed(1)}% confidence
            </p>
          </div>
        </div>
        <button
          onClick={() => { stopAlertSound(); dispatch(clearAlert()); }}
          className="rounded-md bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}