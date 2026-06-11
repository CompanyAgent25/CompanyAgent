"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";

export default function AdminPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const t = await api.getTasks();
        setTasks(t);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const avgDuration = tasks
    .filter((t) => t.duration_ms)
    .reduce((sum, t) => sum + (t.duration_ms || 0), 0) / (tasks.filter((t) => t.duration_ms).length || 1);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 mt-1">System monitoring and management</p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <p className="text-sm text-gray-500">Total Tasks</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{tasks.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{statusCounts["completed"] || 0}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{statusCounts["failed"] || 0}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Avg Duration</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{(avgDuration / 1000).toFixed(1)}s</p>
          </div>
        </div>

        {/* Audit Log / Task History */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Task History</h2>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-surface-2 rounded" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-gray-400">No tasks recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-surface-3">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Duration</th>
                    <th className="pb-3 font-medium">Error</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-3">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="py-3 font-mono text-xs">{task.id.slice(0, 8)}</td>
                      <td className="py-3">
                        <span
                          className={
                            task.status === "completed" ? "badge-green"
                            : task.status === "failed" ? "badge-red"
                            : task.status === "running" ? "badge-blue"
                            : task.status === "cancelled" ? "badge-yellow"
                            : "badge-gray"
                          }
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs">{task.agent_id.slice(0, 8)}</td>
                      <td className="py-3 text-gray-500">
                        {task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : "-"}
                      </td>
                      <td className="py-3 text-red-500 text-xs max-w-xs truncate">{task.error || "-"}</td>
                      <td className="py-3 text-gray-500">{new Date(task.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
