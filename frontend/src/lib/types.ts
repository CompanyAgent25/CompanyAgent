export interface User {
  id: string;
  team_id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  avatar_url: string | null;
}

export interface Agent {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  execution_mode: "chat" | "autonomous";
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  skills?: Skill[];
  mcp_servers?: McpServer[];
}

export interface Skill {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  handler_type: "python" | "http" | "mcp_tool";
  handler_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface McpServer {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  description: string | null;
  transport: "stdio" | "sse";
  command: string | null;
  args: string[] | null;
  url: string | null;
  is_active: boolean;
  health_status: "healthy" | "unhealthy" | "unknown";
  last_health_check: string | null;
  discovered_tools: unknown[];
  discovered_resources: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  team_id: string;
  user_id: string;
  agent_id: string;
  title: string | null;
  status: "active" | "archived" | "deleted";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  token_count: number | null;
  model_used: string | null;
  cost_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Task {
  id: string;
  team_id: string;
  conversation_id: string | null;
  agent_id: string;
  skill_id: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
