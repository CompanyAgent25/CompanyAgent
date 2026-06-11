from __future__ import annotations

import json

import httpx
import structlog
from anthropic import AsyncAnthropic

from app.config import settings

log = structlog.get_logger()

OPENAI_COMPATIBLE_PROVIDERS = {
    "openai",
    "openai-compatible",
    "deepseek",
    "qwen",
    "ollama",
    "vllm",
    "lmstudio",
}


class LLMService:
    """Handles LLM interactions through Anthropic or OpenAI-compatible APIs."""

    def __init__(self):
        self.provider = settings.llm_provider.lower().strip() or "anthropic"
        self.client = None
        if self.provider == "anthropic":
            self.client = AsyncAnthropic(api_key=settings.anthropic_api_key or settings.llm_api_key)
        self.model = settings.llm_model
        self.max_tokens = settings.llm_max_tokens

    async def chat(
        self,
        system_prompt: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> dict:
        """Send a chat completion request to the LLM.

        Returns dict with keys: content, token_count, model, tool_calls
        """
        if self.provider == "anthropic":
            return await self._chat_anthropic(
                system_prompt=system_prompt,
                messages=messages,
                tools=tools,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        if self.provider in OPENAI_COMPATIBLE_PROVIDERS:
            return await self._chat_openai_compatible(
                system_prompt=system_prompt,
                messages=messages,
                tools=tools,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        raise ValueError(f"Unsupported LLM_PROVIDER: {self.provider}")

    async def _chat_anthropic(
        self,
        system_prompt: str,
        messages: list[dict],
        tools: list[dict] | None,
        temperature: float,
        max_tokens: int | None,
    ) -> dict:
        if not self.client:
            raise RuntimeError("Anthropic client is not initialized")

        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "system": system_prompt,
            "messages": messages,
            "temperature": temperature,
        }

        if tools:
            kwargs["tools"] = tools

        try:
            response = await self.client.messages.create(**kwargs)

            content = ""
            tool_calls = []

            for block in response.content:
                if block.type == "text":
                    content += block.text
                elif block.type == "tool_use":
                    tool_calls.append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            return {
                "content": content,
                "token_count": response.usage.input_tokens + response.usage.output_tokens,
                "model": response.model,
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason,
            }
        except Exception as e:
            log.error("LLM request failed", error=str(e))
            raise

    async def _chat_openai_compatible(
        self,
        system_prompt: str,
        messages: list[dict],
        tools: list[dict] | None,
        temperature: float,
        max_tokens: int | None,
    ) -> dict:
        payload: dict = {
            "model": self.model,
            "messages": self._to_openai_messages(system_prompt, messages),
            "temperature": temperature,
            "max_tokens": max_tokens or self.max_tokens,
            "stream": False,
        }

        if tools and settings.llm_enable_tools:
            payload["tools"] = self._to_openai_tools(tools)

        headers = {"Content-Type": "application/json"}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"

        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                response = await client.post(self._chat_completions_url(), json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()
        except Exception as e:
            log.error("OpenAI-compatible LLM request failed", provider=self.provider, error=str(e))
            raise

        choice = body.get("choices", [{}])[0]
        message = choice.get("message", {})
        usage = body.get("usage", {})

        tool_calls = []
        for call in message.get("tool_calls") or []:
            function = call.get("function", {})
            raw_args = function.get("arguments") or "{}"
            try:
                parsed_args = json.loads(raw_args)
            except json.JSONDecodeError:
                parsed_args = {"raw": raw_args}

            tool_calls.append({
                "id": call.get("id"),
                "name": function.get("name"),
                "input": parsed_args,
            })

        token_count = (usage.get("prompt_tokens") or 0) + (usage.get("completion_tokens") or 0)

        return {
            "content": message.get("content") or "",
            "token_count": token_count,
            "model": body.get("model") or self.model,
            "tool_calls": tool_calls,
            "stop_reason": choice.get("finish_reason"),
        }

    def build_tools_from_skills(self, skills: list[dict]) -> list[dict]:
        """Convert skill definitions to the canonical internal tool format."""
        tools = []
        for skill in skills:
            tools.append({
                "name": skill["slug"],
                "description": skill.get("description", ""),
                "input_schema": skill.get("input_schema", {"type": "object", "properties": {}}),
            })
        return tools

    def _chat_completions_url(self) -> str:
        base_url = settings.llm_base_url.strip().rstrip("/")
        if not base_url:
            defaults = {
                "openai": "https://api.openai.com/v1",
                "deepseek": "https://api.deepseek.com/v1",
                "ollama": "http://localhost:11434/v1",
                "lmstudio": "http://localhost:1234/v1",
                "vllm": "http://localhost:8001/v1",
            }
            base_url = defaults.get(self.provider, "")

        if not base_url:
            raise ValueError("LLM_BASE_URL is required for this provider")

        if base_url.endswith("/chat/completions"):
            return base_url

        return f"{base_url}/chat/completions"

    def _to_openai_tools(self, tools: list[dict]) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {"type": "object", "properties": {}}),
                },
            }
            for tool in tools
        ]

    def _to_openai_messages(self, system_prompt: str, messages: list[dict]) -> list[dict]:
        converted: list[dict] = [{"role": "system", "content": system_prompt}]

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if isinstance(content, str):
                converted.append({"role": role, "content": content})
                continue

            if role == "assistant" and isinstance(content, list):
                text_parts: list[str] = []
                tool_calls: list[dict] = []
                for block in content:
                    if block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                    elif block.get("type") == "tool_use":
                        tool_calls.append({
                            "id": block.get("id"),
                            "type": "function",
                            "function": {
                                "name": block.get("name"),
                                "arguments": json.dumps(block.get("input", {})),
                            },
                        })

                converted.append({
                    "role": "assistant",
                    "content": "\n".join(text_parts),
                    "tool_calls": tool_calls,
                })
                continue

            if role == "user" and isinstance(content, list):
                for block in content:
                    if block.get("type") == "tool_result":
                        converted.append({
                            "role": "tool",
                            "tool_call_id": block.get("tool_use_id"),
                            "content": str(block.get("content", "")),
                        })
                    elif block.get("type") == "text":
                        converted.append({"role": "user", "content": block.get("text", "")})

        return converted


llm_service = LLMService()
