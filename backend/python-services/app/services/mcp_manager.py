from __future__ import annotations

import asyncio
import json
from typing import Any
from uuid import UUID

import structlog

log = structlog.get_logger()


class McpServerConnection:
    """Represents an active connection to an MCP server."""

    def __init__(self, server_id: UUID, transport: str, process: asyncio.subprocess.Process | None = None):
        self.server_id = server_id
        self.transport = transport
        self.process = process
        self._request_id = 0

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    async def send_request(self, method: str, params: dict | None = None) -> dict:
        """Send a JSON-RPC request to the MCP server."""
        if self.transport == "stdio" and self.process:
            return await self._send_stdio(method, params)
        elif self.transport == "sse":
            return await self._send_sse(method, params)
        else:
            raise RuntimeError(f"No active connection for transport: {self.transport}")

    async def _send_stdio(self, method: str, params: dict | None) -> dict:
        """Send request over stdio transport."""
        if not self.process or not self.process.stdin or not self.process.stdout:
            raise RuntimeError("MCP process not running")

        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params:
            request["params"] = params

        payload = json.dumps(request) + "\n"
        self.process.stdin.write(payload.encode())
        await self.process.stdin.drain()

        # Read response line
        response_line = await asyncio.wait_for(
            self.process.stdout.readline(),
            timeout=30.0,
        )

        if not response_line:
            raise RuntimeError("MCP server closed connection")

        response = json.loads(response_line.decode())

        if "error" in response:
            raise RuntimeError(f"MCP error: {response['error']}")

        return response.get("result", {})

    async def _send_sse(self, method: str, params: dict | None) -> dict:
        """Send request over SSE transport (HTTP-based)."""
        import httpx

        # SSE MCP uses HTTP POST for requests
        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params:
            request["params"] = params

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.server_id}",  # URL stored as server_id for SSE
                json=request,
            )
            resp.raise_for_status()
            response = resp.json()

            if "error" in response:
                raise RuntimeError(f"MCP error: {response['error']}")

            return response.get("result", {})

    async def close(self):
        """Close the connection."""
        if self.process:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.process.kill()


class McpManager:
    """Manages MCP server connections and tool execution."""

    def __init__(self):
        self._connections: dict[str, McpServerConnection] = {}

    async def connect_stdio(self, server_id: UUID, command: str, args: list[str] | None = None, env: dict | None = None) -> McpServerConnection:
        """Start and connect to a stdio-based MCP server."""
        key = str(server_id)

        if key in self._connections:
            return self._connections[key]

        cmd_args = args or []
        process = await asyncio.create_subprocess_exec(
            command,
            *cmd_args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        conn = McpServerConnection(server_id, "stdio", process)

        # Initialize the MCP connection
        try:
            await conn.send_request("initialize", {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "CompanyAgent", "version": "0.1.0"},
            })
            await conn.send_request("notifications/initialized")
        except Exception as e:
            await conn.close()
            raise RuntimeError(f"Failed to initialize MCP server: {e}")

        self._connections[key] = conn
        log.info("MCP server connected", server_id=key, transport="stdio")
        return conn

    async def list_tools(self, server_id: UUID) -> list[dict]:
        """List available tools from an MCP server."""
        key = str(server_id)
        conn = self._connections.get(key)
        if not conn:
            raise RuntimeError(f"No connection for server {server_id}")

        result = await conn.send_request("tools/list")
        return result.get("tools", [])

    async def list_resources(self, server_id: UUID) -> list[dict]:
        """List available resources from an MCP server."""
        key = str(server_id)
        conn = self._connections.get(key)
        if not conn:
            raise RuntimeError(f"No connection for server {server_id}")

        result = await conn.send_request("resources/list")
        return result.get("resources", [])

    async def call_tool(self, server_id: UUID | str, tool_name: str, arguments: dict) -> dict:
        """Call a tool on an MCP server."""
        key = str(server_id)
        conn = self._connections.get(key)
        if not conn:
            return {"error": f"No connection for server {server_id}", "success": False}

        try:
            result = await conn.send_request("tools/call", {
                "name": tool_name,
                "arguments": arguments,
            })

            content = result.get("content", [])
            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]

            return {"result": "\n".join(text_parts), "success": True}
        except Exception as e:
            log.error("MCP tool call failed", server_id=key, tool=tool_name, error=str(e))
            return {"error": str(e), "success": False}

    async def health_check(self, server_id: UUID) -> bool:
        """Check if an MCP server is responding."""
        key = str(server_id)
        conn = self._connections.get(key)
        if not conn:
            return False

        try:
            await conn.send_request("ping")
            return True
        except Exception:
            return False

    async def disconnect(self, server_id: UUID):
        """Disconnect from an MCP server."""
        key = str(server_id)
        conn = self._connections.pop(key, None)
        if conn:
            await conn.close()
            log.info("MCP server disconnected", server_id=key)

    async def disconnect_all(self):
        """Disconnect from all MCP servers."""
        for key in list(self._connections.keys()):
            await self.disconnect(UUID(key))


mcp_manager = McpManager()
