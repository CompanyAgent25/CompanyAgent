from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import structlog

from app.services.llm import llm_service
from app.services.skill_executor import skill_executor

log = structlog.get_logger()

MAX_TOOL_ROUNDS = 10


class Orchestrator:
    """Orchestrates agent execution: LLM calls, skill execution, multi-turn tool use."""

    async def run_chat(self, db_pool, agent_id: UUID, conversation_id: UUID, user_message: str) -> dict:
        """Process a chat message through an agent with tool use loop.

        1. Load agent config + skills + conversation history
        2. Call LLM with tools
        3. If LLM requests tool use → execute skill → feed result back → loop
        4. Return final text response
        """
        # Load agent
        agent = await db_pool.fetchrow(
            "SELECT * FROM agents WHERE id = $1",
            agent_id,
        )
        if not agent:
            return {"reply": "Error: Agent not found", "token_count": 0, "model": None, "skills_used": []}

        # Load agent's skills
        skills = await db_pool.fetch(
            """SELECT s.* FROM skills s
               JOIN agent_skills ags ON s.id = ags.skill_id
               WHERE ags.agent_id = $1 AND s.is_active = true
               ORDER BY ags.priority""",
            agent_id,
        )

        # Load conversation history (last 50 messages for context window management)
        history = await db_pool.fetch(
            """SELECT role, content FROM messages
               WHERE conversation_id = $1
               ORDER BY created_at DESC LIMIT 50""",
            conversation_id,
        )
        history = list(reversed(history))

        # Build messages for LLM
        messages = []
        for msg in history:
            role = msg["role"]
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": msg["content"]})

        # Rust stores the user message before dispatching this service. Avoid
        # duplicating it when the freshly persisted message is already in history.
        if not messages or messages[-1] != {"role": "user", "content": user_message}:
            messages.append({"role": "user", "content": user_message})

        # Build tools from skills
        skills_dicts = [dict(s) for s in skills]
        tools = llm_service.build_tools_from_skills(skills_dicts) if skills_dicts else None

        # Tool use loop
        skills_used: list[str] = []
        total_tokens = 0
        model_used = None

        for round_num in range(MAX_TOOL_ROUNDS):
            result = await llm_service.chat(
                system_prompt=agent["system_prompt"],
                messages=messages,
                tools=tools,
                temperature=agent["temperature"],
                max_tokens=agent["max_tokens"],
            )

            total_tokens += result.get("token_count", 0)
            model_used = result.get("model")

            # If no tool calls, we're done
            if not result.get("tool_calls"):
                return {
                    "reply": result["content"],
                    "token_count": total_tokens,
                    "model": model_used,
                    "skills_used": skills_used,
                }

            # Process tool calls
            # Add assistant response with tool use to messages
            assistant_content = []
            if result["content"]:
                assistant_content.append({"type": "text", "text": result["content"]})

            for tc in result["tool_calls"]:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["input"],
                })

            messages.append({"role": "assistant", "content": assistant_content})

            # Execute each tool and add results
            tool_results = []
            for tc in result["tool_calls"]:
                skill_name = tc["name"]
                skill_input = tc["input"]
                skills_used.append(skill_name)

                # Find matching skill
                matching_skill = next(
                    (s for s in skills_dicts if s["slug"] == skill_name),
                    None,
                )

                if matching_skill:
                    log.info("Executing skill", skill=skill_name, round=round_num)
                    exec_result = await skill_executor.execute(matching_skill, skill_input)
                    tool_result_content = str(exec_result.get("result", exec_result.get("error", "No result")))
                else:
                    tool_result_content = f"Error: Skill '{skill_name}' not found"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": tool_result_content,
                })

            messages.append({"role": "user", "content": tool_results})

            log.info("Tool round completed", round=round_num, tools_called=[tc["name"] for tc in result["tool_calls"]])

        # Max rounds reached
        return {
            "reply": "I've reached the maximum number of tool execution steps. Here's what I've done so far with the available information.",
            "token_count": total_tokens,
            "model": model_used,
            "skills_used": skills_used,
        }

    async def execute_task(self, db_pool, task_id: UUID) -> dict:
        """Execute a standalone task (non-conversational).

        Loads the task, runs the agent, updates task status.
        """
        task = await db_pool.fetchrow("SELECT * FROM tasks WHERE id = $1", task_id)
        if not task:
            return {"error": "Task not found"}

        # Mark as running
        await db_pool.execute(
            "UPDATE tasks SET status = 'running', started_at = NOW() WHERE id = $1",
            task_id,
        )

        try:
            agent = await db_pool.fetchrow("SELECT * FROM agents WHERE id = $1", task["agent_id"])
            if not agent:
                raise ValueError("Agent not found")

            # Load skills
            skills = await db_pool.fetch(
                """SELECT s.* FROM skills s
                   JOIN agent_skills ags ON s.id = ags.skill_id
                   WHERE ags.agent_id = $1 AND s.is_active = true""",
                task["agent_id"],
            )

            skills_dicts = [dict(s) for s in skills]
            tools = llm_service.build_tools_from_skills(skills_dicts) if skills_dicts else None

            # Build task prompt from input. Depending on the asyncpg/jsonb codec,
            # this value can arrive as either a dict or a JSON string.
            task_input = task["input"]
            if isinstance(task_input, str):
                task_input = json.loads(task_input)
            prompt = task_input.get("prompt", str(task_input))

            messages = [{"role": "user", "content": prompt}]

            # Single LLM call for tasks (or multi-turn with tools)
            result = await llm_service.chat(
                system_prompt=agent["system_prompt"],
                messages=messages,
                tools=tools,
                temperature=agent["temperature"],
            )

            output = {
                "content": result["content"],
                "model": result.get("model"),
                "token_count": result.get("token_count"),
            }

            # Calculate duration
            await db_pool.execute(
                """UPDATE tasks
                   SET status = 'completed',
                       output = $1::jsonb,
                       completed_at = NOW(),
                       duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000
                   WHERE id = $2""",
                json.dumps(output),
                task_id,
            )

            return {"status": "completed", "output": output}

        except Exception as e:
            log.error("Task execution failed", task_id=str(task_id), error=str(e))
            await db_pool.execute(
                """UPDATE tasks
                   SET status = 'failed', error = $1, completed_at = NOW(),
                       duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000
                   WHERE id = $2""",
                str(e),
                task_id,
            )
            return {"status": "failed", "error": str(e)}


orchestrator = Orchestrator()
