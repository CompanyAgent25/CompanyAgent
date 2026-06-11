from __future__ import annotations

import importlib
from typing import Any

import httpx
import structlog
from jsonschema import ValidationError, validate

log = structlog.get_logger()


class SkillExecutor:
    """Executes skills based on their handler configuration."""

    async def execute(self, skill: dict, input_data: dict) -> dict:
        """Execute a skill and return the result.

        Args:
            skill: Skill definition from DB (handler_type, handler_config, input_schema, etc.)
            input_data: The input data to pass to the skill

        Returns:
            dict with execution result
        """
        # Validate input against schema
        input_schema = skill.get("input_schema", {})
        if input_schema:
            try:
                validate(instance=input_data, schema=input_schema)
            except ValidationError as e:
                return {"error": f"Input validation failed: {e.message}", "success": False}

        handler_type = skill["handler_type"]
        handler_config = skill.get("handler_config", {})

        try:
            if handler_type == "python":
                return await self._execute_python(handler_config, input_data)
            elif handler_type == "http":
                return await self._execute_http(handler_config, input_data)
            elif handler_type == "mcp_tool":
                return await self._execute_mcp_tool(handler_config, input_data)
            else:
                return {"error": f"Unknown handler type: {handler_type}", "success": False}
        except Exception as e:
            log.error("Skill execution failed", skill=skill.get("slug"), error=str(e))
            return {"error": str(e), "success": False}

    async def _execute_python(self, config: dict, input_data: dict) -> dict:
        """Execute a Python skill handler."""
        module_path = config.get("module", "")
        function_name = config.get("function", "execute")

        try:
            module = importlib.import_module(module_path)
            handler = getattr(module, function_name)

            # Support both sync and async handlers
            import asyncio
            if asyncio.iscoroutinefunction(handler):
                result = await handler(input_data)
            else:
                result = handler(input_data)

            return {"result": result, "success": True}
        except ImportError:
            return {"error": f"Module not found: {module_path}", "success": False}
        except AttributeError:
            return {"error": f"Function not found: {function_name} in {module_path}", "success": False}

    async def _execute_http(self, config: dict, input_data: dict) -> dict:
        """Execute an HTTP skill handler (call an external API)."""
        url = config.get("url", "")
        method = config.get("method", "POST").upper()
        headers = config.get("headers", {})
        timeout = config.get("timeout", 30)

        async with httpx.AsyncClient(timeout=timeout) as client:
            if method == "GET":
                response = await client.get(url, params=input_data, headers=headers)
            elif method == "POST":
                response = await client.post(url, json=input_data, headers=headers)
            elif method == "PUT":
                response = await client.put(url, json=input_data, headers=headers)
            elif method == "DELETE":
                response = await client.delete(url, params=input_data, headers=headers)
            else:
                return {"error": f"Unsupported HTTP method: {method}", "success": False}

            response.raise_for_status()
            return {"result": response.json(), "success": True, "status_code": response.status_code}

    async def _execute_mcp_tool(self, config: dict, input_data: dict) -> dict:
        """Execute an MCP tool via the MCP manager."""
        from app.services.mcp_manager import mcp_manager

        server_id = config.get("server_id")
        tool_name = config.get("tool_name")

        if not server_id or not tool_name:
            return {"error": "mcp_tool handler requires server_id and tool_name", "success": False}

        return await mcp_manager.call_tool(server_id, tool_name, input_data)


skill_executor = SkillExecutor()
