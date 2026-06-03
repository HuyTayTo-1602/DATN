from typing import Dict, List
from fastapi import WebSocket


class NotificationHub:
    """Manages active WebSocket connections keyed by user_id."""

    def __init__(self) -> None:
        self._connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._connections.pop(user_id, None)

    async def push(self, user_id: int, payload: dict) -> None:
        """Push JSON to every active socket of a user. Dead sockets are silently removed."""
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)

    def connection_count(self, user_id: int) -> int:
        return len(self._connections.get(user_id, []))


hub = NotificationHub()
