import type { Agent, AuthResponse, Conversation, McpServer, Message, Skill, Task } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(teamName: string, email: string, password: string, name: string): Promise<AuthResponse> {
    return this.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ team_name: teamName, email, password, name }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return this.request("/api/v1/agents");
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request(`/api/v1/agents/${id}`);
  }

  async createAgent(data: Partial<Agent> & { skill_ids?: string[]; mcp_server_ids?: string[] }): Promise<Agent> {
    return this.request("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    return this.request(`/api/v1/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(id: string): Promise<void> {
    return this.request(`/api/v1/agents/${id}`, { method: "DELETE" });
  }

  // Skills
  async getSkills(): Promise<Skill[]> {
    return this.request("/api/v1/skills");
  }

  async createSkill(data: Partial<Skill>): Promise<Skill> {
    return this.request("/api/v1/skills", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteSkill(id: string): Promise<void> {
    return this.request(`/api/v1/skills/${id}`, { method: "DELETE" });
  }

  // MCP Servers
  async getMcpServers(): Promise<McpServer[]> {
    return this.request("/api/v1/mcp-servers");
  }

  async createMcpServer(data: Partial<McpServer>): Promise<McpServer> {
    return this.request("/api/v1/mcp-servers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async checkMcpHealth(id: string): Promise<{ status: string }> {
    return this.request(`/api/v1/mcp-servers/${id}/health`, { method: "POST" });
  }

  async discoverMcpTools(id: string): Promise<{ tools: unknown[]; resources: unknown[] }> {
    return this.request(`/api/v1/mcp-servers/${id}/discover`, { method: "POST" });
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return this.request("/api/v1/conversations");
  }

  async getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
    return this.request(`/api/v1/conversations/${id}`);
  }

  async createConversation(agentId: string, title?: string): Promise<Conversation> {
    return this.request("/api/v1/conversations", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, title }),
    });
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    return this.request(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request(`/api/v1/conversations/${conversationId}/messages`);
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return this.request("/api/v1/tasks");
  }

  async createTask(agentId: string, input: Record<string, unknown>): Promise<Task> {
    return this.request("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, input }),
    });
  }

  async cancelTask(id: string): Promise<Task> {
    return this.request(`/api/v1/tasks/${id}/cancel`, { method: "POST" });
  }
}

export const api = new ApiClient();
