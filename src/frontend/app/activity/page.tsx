"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAppDispatch } from "../lib/hooks";
import { addNotice } from "../lib/slices/toastsSlice";

interface ActivityMessage {
  predicted_class: number;
  predicted_action: string;
  confidence: number;
  member: {
    id: string;
    name: string;
  } | null;
  timestamp?: string;
}

function UnsuspendedActivityPage() {
  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}/api/v1/activity/ws`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          dispatch(addNotice({
            title: "Connected",
            content: "WebSocket connection established"
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data: ActivityMessage = JSON.parse(event.data);
            console.log("Received message:", data);
            // Add timestamp to message
            const messageWithTimestamp = {
              ...data,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [messageWithTimestamp, ...prev]);
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          dispatch(addNotice({
            title: "Error",
            content: "WebSocket connection error",
            icon: "error"
          }));
        };

        ws.onclose = () => {
          setIsConnected(false);
          dispatch(addNotice({
            title: "Disconnected",
            content: "WebSocket connection closed",
            icon: "error"
          }));
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [dispatch]);

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Activity Monitor</h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time activity predictions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-4">
          <div className="flex items-center">
            <span className={`inline-block h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="ml-2 text-sm text-gray-700">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={clearMessages}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Member Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Predicted Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No activities detected yet
                      </td>
                    </tr>
                  ) : (
                    messages.map((message, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {message.member?.name || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {message.predicted_action}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {(message.confidence * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
