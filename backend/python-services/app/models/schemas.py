from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: UUID
    agent_id: UUID
    message: str


class ChatResponse(BaseModel):
    reply: str
    token_count: int | None = None
    model: str | None = None
    skills_used: list[str] = []


class ExecuteTaskRequest(BaseModel):
    task_id: UUID


class TaskResult(BaseModel):
    task_id: UUID
    status: str
    output: Any | None = None
    error: str | None = None


class McpHealthCheckRequest(BaseModel):
    server_id: UUID
    transport: str
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None


class McpDiscoverRequest(BaseModel):
    server_id: UUID
    transport: str
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None


class SkillExecutionRequest(BaseModel):
    skill_id: UUID
    input_data: dict[str, Any]
    agent_id: UUID
    team_id: UUID
