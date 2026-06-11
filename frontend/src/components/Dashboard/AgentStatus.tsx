"use client";

import type { Agent } from "@/lib/types";

interface AgentStatusProps {
  agents: Agent[];
}

export function AgentStatus({ agents }: AgentStatusProps) {
  const active = agents.filter((a) => a.is_active);
  const inactive = agents.filter((a) => !a.is_active);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Status</h3>
      <div className="space-y-3">
        {agents.length === 0 && (
          <p className="text-sm text-gray-400">No agents configured</p>
        )}
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  agent.is_active ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.execution_mode}</p>
              </div>
            </div>
            <span
              className={agent.is_active ? "badge-green" : "badge-gray"}
            >
              {agent.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
      {agents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-3 flex gap-4 text-xs text-gray-500">
          <span>{active.length} active</span>
          <span>{inactive.length} inactive</span>
        </div>
      )}
    </div>
  );
}
