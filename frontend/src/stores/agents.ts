import { create } from "zustand";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

interface AgentState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  createAgent: (data: Partial<Agent> & { skill_ids?: string[]; mcp_server_ids?: string[] }) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await api.getAgents();
      set({ agents, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createAgent: async (data) => {
    const agent = await api.createAgent(data);
    set({ agents: [agent, ...get().agents] });
    return agent;
  },

  deleteAgent: async (id) => {
    await api.deleteAgent(id);
    set({ agents: get().agents.filter((a) => a.id !== id) });
  },
}));
