"""The cached client: stream once, read locally, batch usage events."""

from __future__ import annotations

import threading
from typing import Any, Callable, Dict, Optional

from .client import Client, EvalContext, Evaluation, EvaluationDetail, FlagsState, Stream


class CachedClient:
    """Streams flag values into an in-memory store once, then serves synchronous
    local reads with ZERO network per read, reporting usage as batched summary
    events. Mirrors the LaunchDarkly-style pattern.

    Use this for a long-lived app; use ``Client`` for one-off calls. All methods
    are safe for concurrent use.
    """

    def __init__(
        self,
        base_url: str,
        sdk_key: str,
        context: EvalContext,
        flush_interval: float = 5.0,
        send_events: bool = True,
        on_error: Optional[Callable[[BaseException], None]] = None,
    ) -> None:
        self._base = Client(base_url, sdk_key)
        self._track = send_events
        self._on_error = on_error or (lambda _e: None)

        self._lock = threading.RLock()
        self._store: Dict[str, Evaluation] = {}
        self._ready = threading.Event()
        self._context = context
        self._stream: Optional[Stream] = None
        self._listeners: Dict[int, Callable[[], None]] = {}
        self._next_id = 0
        self._counts: Dict[str, Dict[int, int]] = {}
        self._closed = threading.Event()

        self._start_stream()

        self._timer: Optional[threading.Thread] = None
        if flush_interval > 0 and self._track:
            self._flush_interval = flush_interval
            self._timer = threading.Thread(target=self._flush_loop, daemon=True)
            self._timer.start()

    # -- streaming -----------------------------------------------------------

    def _start_stream(self) -> None:
        self._stream = self._base.stream(self._context, self._on_update, self._on_error)

    def _on_update(self, flags: Dict[str, Evaluation]) -> None:
        with self._lock:
            self._store = flags
            listeners = list(self._listeners.values())
        self._ready.set()
        for listener in listeners:
            listener()

    def _flush_loop(self) -> None:
        while not self._closed.wait(self._flush_interval):
            self.flush()

    # -- lifecycle -----------------------------------------------------------

    def wait_for_initialization(self, timeout: Optional[float] = None) -> bool:
        """Block until the initial snapshot arrives. Returns True if it did."""
        return self._ready.wait(timeout)

    def is_initialized(self) -> bool:
        """Whether the initial snapshot has loaded (matches LaunchDarkly's
        ``is_initialized``)."""
        return self._ready.is_set()

    def on_change(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Subscribe to store updates; returns an unsubscribe function."""
        with self._lock:
            listener_id = self._next_id
            self._next_id += 1
            self._listeners[listener_id] = listener

        def unsubscribe() -> None:
            with self._lock:
                self._listeners.pop(listener_id, None)

        return unsubscribe

    # -- reads ---------------------------------------------------------------

    def _read(self, flag_key: str) -> Optional[Evaluation]:
        with self._lock:
            ev = self._store.get(flag_key)
            if ev is not None and self._track:
                by_var = self._counts.setdefault(flag_key, {})
                by_var[ev.variation] = by_var.get(ev.variation, 0) + 1
        return ev

    def bool_variation(self, flag_key: str, fallback: bool) -> bool:
        """Synchronous local read — no network. ``fallback`` before init / on mismatch."""
        ev = self._read(flag_key)
        return ev.value if ev is not None and isinstance(ev.value, bool) else fallback

    def string_variation(self, flag_key: str, fallback: str) -> str:
        ev = self._read(flag_key)
        return ev.value if ev is not None and isinstance(ev.value, str) else fallback

    def number_variation(self, flag_key: str, fallback: float) -> float:
        ev = self._read(flag_key)
        if ev is not None and isinstance(ev.value, (int, float)) and not isinstance(ev.value, bool):
            return ev.value
        return fallback

    def variation(self, flag_key: str, default: Any) -> Any:
        """The flag's value from the local store, or ``default``. The canonical
        read (matching LaunchDarkly's ``variation``); the typed helpers above are
        thin conveniences over it."""
        ev = self._read(flag_key)
        return ev.value if ev is not None else default

    def variation_detail(self, flag_key: str, default: Any) -> EvaluationDetail:
        """Like ``variation`` but also returns the variation index and reason
        (matching LaunchDarkly's ``variation_detail``)."""
        ev = self._read(flag_key)
        if ev is None:
            return EvaluationDetail(value=default, variation_index=None, reason={"kind": "FLAG_NOT_FOUND"})
        return EvaluationDetail(value=ev.value, variation_index=ev.variation, reason=ev.reason)

    def all_flags_state(self) -> FlagsState:
        """A snapshot of all cached evaluations. Returns a ``FlagsState``; call
        ``.to_values_dict()`` for a plain value map."""
        with self._lock:
            return FlagsState(dict(self._store))

    # -- usage events --------------------------------------------------------

    def flush(self) -> None:
        """Send buffered usage events now."""
        with self._lock:
            if not self._counts:
                return
            summary = {
                "flags": {
                    flag_key: {
                        "counters": [
                            {"variation": variation, "count": count}
                            for variation, count in by_var.items()
                        ]
                    }
                    for flag_key, by_var in self._counts.items()
                }
            }
            self._counts = {}
        try:
            self._base.send_events(summary)
        except Exception as err:  # noqa: BLE001 - surfaced via on_error
            self._on_error(err)

    def identify(self, context: EvalContext, timeout: Optional[float] = None) -> bool:
        """Switch to a new context: flush, reconnect, block for the new snapshot."""
        self.flush()
        if self._stream is not None:
            self._stream.close()
        with self._lock:
            self._store = {}
            self._context = context
        self._ready.clear()
        self._start_stream()
        return self.wait_for_initialization(timeout)

    def close(self) -> None:
        """Stop streaming and flush a final time."""
        self._closed.set()
        if self._stream is not None:
            self._stream.close()
        self.flush()
