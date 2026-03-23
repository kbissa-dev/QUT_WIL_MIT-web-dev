"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAppDispatch, useAppSelector } from "../lib/hooks";
import { addNotice } from "../lib/slices/toastsSlice";
import { setAlert } from "../lib/slices/alertsSlice"; // NEW
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { UserIcon } from "../components/ui/icons";

interface ActivityMessage {
  predicted_class?: number;
  predicted_action: string;
  confidence: number;
  member: { id: string; name: string } | null;
  timestamp?: string;
}

function dotColor(connected: boolean): string {
  return connected ? "bg-green-500" : "bg-red-500";
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

function UnsuspendedActivityPage() {
  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state: any) => state.tokens.access_token);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}/api/v1/activity/ws?token=${accessToken}`;

    const connectWebSocket = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          dispatch(addNotice({ title: "Connected", content: "WebSocket connection established" }));
        };

        ws.onmessage = (event) => {
          try {
            const data: ActivityMessage = JSON.parse(event.data);
            const timestamped = { ...data, timestamp: new Date().toISOString() };
            setMessages((prev) => [timestamped, ...prev]);

            // NEW: dispatch alert on fall
            if (data.predicted_action === "fall" && data.member) {
              dispatch(setAlert({
                memberName: data.member.name,
                timestamp: timestamped.timestamp,
                confidence: data.confidence,
              }));
            }
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        };

        ws.onerror = () => {
          dispatch(addNotice({ title: "Error", content: "WebSocket connection error", icon: "error" }));
        };

        ws.onclose = () => {
          setIsConnected(false);
          dispatch(addNotice({ title: "Disconnected", content: "WebSocket connection closed", icon: "error" }));
          setTimeout(() => connectWebSocket(), 3000);
        };
      } catch (e) {
        console.error("Failed to create WebSocket:", e);
      }
    };

    connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [accessToken]);

  const clearMessages = () => setMessages([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Monitor</h1>
            <p className="mt-2 text-gray-500">Real-time fall detection monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor(isConnected)}`} />
              <span className="ml-2 text-sm font-medium text-gray-700">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <Button onClick={clearMessages} variant="outline" className="bg-white">Clear</Button>
          </div>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="rounded-lg bg-blue-50 p-3">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="rounded-lg bg-green-50 p-3">
                <div className={`h-3 w-3 rounded-full ${dotColor(isConnected)}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connection Status</p>
                <p className="text-2xl font-bold text-gray-900">{isConnected ? "Active" : "Inactive"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Activity Feed</h2>
              <p className="text-sm text-gray-500">Live stream of detected activities</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Detection Result</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        No activities detected yet. Waiting for real-time data...
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "-"}
                        </TableCell>
                        <TableCell>{message.member?.name || "Unknown"}</TableCell>
                        <TableCell>
                          {message.predicted_action === "fall" ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                              FALL DETECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                              NO FALL
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full ${confidenceBarColor(message.confidence)}`}
                                style={{ width: `${message.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {(message.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <UnsuspendedActivityPage />
    </Suspense>
  );
}