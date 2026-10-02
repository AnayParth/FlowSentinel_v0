"""Authoritative Application State & Operating Mode Management for ChuteGuard AI."""
from __future__ import annotations
from typing import Literal, Optional, List, Callable, Dict, Any
import threading

AppMode = Literal["simulation", "hardware", "manual"]


class AppStateManager:
    """Single Source of Truth for system operating mode and state synchronization."""
    def __init__(self):
        self._lock = threading.Lock()
        self._mode: AppMode = "simulation"
        self._fallback_to_simulation: bool = False
        self._listeners: List[Callable[[AppMode], None]] = []

    @property
    def mode(self) -> AppMode:
        with self._lock:
            return self._mode

    @property
    def fallback_to_simulation(self) -> bool:
        with self._lock:
            return self._fallback_to_simulation

    def set_mode(self, new_mode: AppMode) -> AppMode:
        with self._lock:
            if new_mode in ("simulation", "hardware", "manual"):
                prev = self._mode
                self._mode = new_mode
                if prev != new_mode:
                    print(f"[AppStateManager] Operating mode changed: {prev} -> {new_mode}")
                    for listener in list(self._listeners):
                        try:
                            listener(new_mode)
                        except Exception as e:
                            print(f"[AppStateManager] Listener error: {e}")
            return self._mode

    def set_fallback(self, enable: bool):
        with self._lock:
            self._fallback_to_simulation = bool(enable)

    def subscribe(self, listener: Callable[[AppMode], None]):
        if listener not in self._listeners:
            self._listeners.append(listener)

    def unsubscribe(self, listener: Callable[[AppMode], None]):
        if listener in self._listeners:
            self._listeners.remove(listener)


_app_state: Optional[AppStateManager] = None


def get_app_state() -> AppStateManager:
    global _app_state
    if _app_state is None:
        _app_state = AppStateManager()
    return _app_state
