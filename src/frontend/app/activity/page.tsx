"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAppDispatch } from "../lib/hooks";
import { addNotice } from "../lib/slices/toastsSlice";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { UserIcon } from "../components/ui/icons";

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
      // Prevent multiple connections
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        console.log("WebSocket already connected or connecting");
        return;
      }

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
  }, []); // Empty dependency array - only run once on mount

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Monitor</h1>
            <p className="mt-2 text-gray-500">Real-time activity predictions and monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="ml-2 text-sm font-medium text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button
              onClick={clearMessages}
              variant="outline"
              className="bg-white"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
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
                <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connection Status</p>
                <p className="text-2xl font-bold text-gray-900">{isConnected ? 'Active' : 'Inactive'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Table Card */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Activity Feed</h2>
              <p className="text-sm text-gray-500">Live stream of detected activities</p>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Member Name</TableHead>
                    {/* <TableHead>Member ID</TableHead> */}
                    <TableHead>Predicted Action</TableHead>
                    {/* <TableHead>Class</TableHead> */}
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No activities detected yet. Waiting for real-time data...
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '-'}
                        </TableCell>
                        <TableCell>{message.member?.name || 'Unknown'}</TableCell>
                        {/* <TableCell>
                          {message.member?.id ? (
                            <Badge variant="secondary">{message.member.id}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell> */}
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {message.predicted_action}
                          </Badge>
                        </TableCell>
                        {/* <TableCell>
                          <Badge variant="secondary">Class {message.predicted_class}</Badge>
                        </TableCell> */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full ${
                                  message.confidence >= 0.8
                                    ? 'bg-green-500'
                                    : message.confidence >= 0.5
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
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
