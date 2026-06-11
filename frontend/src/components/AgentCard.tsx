"use client";

import Link from "next/link";
import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
  onDelete?: (id: string) => void;
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/agents/${agent.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-brand-600"
            >
              {agent.name}
            </Link>
            <span
              className={agent.is_active ? "badge-green" : "badge-gray"}
            >
              {agent.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{agent.description || "No description"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="badge-blue">{agent.execution_mode}</span>
        <span className="badge-gray">{agent.model}</span>
        <span className="badge-gray">temp: {agent.temperature}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-surface-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            href={`/agents/${agent.id}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Configure
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href={`/conversations?agent=${agent.id}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Chat
          </Link>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(agent.id)}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
