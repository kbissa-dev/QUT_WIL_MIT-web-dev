"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "../lib/hooks";

// Matches the shape returned by GET /api/v1/alerts
// which serialises MongoDB fall_events documents
type AlertItem = {
  id: string;
  member_id: string;
  member_name?: string | null;
  timestamp: string;
  prediction: string;
  confidence: number;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get JWT token from Redux store - same pattern as activity/page.tsx
  // Do not use localStorage/sessionStorage - token lives in Redux only
  const accessToken = useAppSelector((state: any) => state.tokens.access_token);

  // Calls GET /api/v1/alerts - returns all fall_events from MongoDB
  // sorted by timestamp descending (newest first)
  // Requires JWT auth - will fail if not logged in
  const loadAlerts = async () => {
    try {
      setError("");
      const res = await fetch("/api/v1/alerts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch alerts");

      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      setError("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when token becomes available after login
  useEffect(() => {
    if (accessToken) loadAlerts();
  }, [accessToken]);

  // Calls POST /api/v1/alerts/{id}/acknowledge
  // Backend sets acknowledged=true, acknowledged_at, acknowledged_by
  // UI updates locally without refetching the whole list
  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/alerts/${id}/acknowledge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to acknowledge alert");

      const data = await res.json();

      // Update just the acknowledged alert in local state
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                acknowledged: true,
                acknowledged_at: data.alert.acknowledged_at,
                acknowledged_by: data.alert.acknowledged_by,
              }
            : a
        )
      );
    } catch {
      setError("Failed to acknowledge alert");
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-2">Alerts</h1>
      <p className="text-gray-600 mb-6">All recorded fall alerts</p>

      {/* Error message shown if fetch or acknowledge fails */}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {/* Loading state while fetching from backend */}
      {loading && <div>Loading alerts...</div>}

      {!loading && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Patient</th>
                <th className="text-left p-4">Time</th>
                <th className="text-left p-4">Confidence</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                // Unacknowledged rows highlighted red
                <tr
                  key={alert.id}
                  className={alert.acknowledged ? "bg-white" : "bg-red-50"}
                >
                  {/* Show name if available, fall back to member UUID */}
                  <td className="p-4">
                    {alert.member_name || alert.member_id}
                  </td>

                  <td className="p-4">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>

                  <td className="p-4">
                    {(alert.confidence * 100).toFixed(1)}%
                  </td>

                  <td className="p-4">
                    {alert.acknowledged ? (
                      <span className="text-green-600 font-medium">Acknowledged</span>
                    ) : (
                      <span className="text-red-600 font-medium">Unacknowledged</span>
                    )}
                  </td>

                  {/* Acknowledge button only shown for unacknowledged alerts */}
                  <td className="p-4">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-2 rounded bg-black text-white hover:bg-gray-800 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {alerts.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    No alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}