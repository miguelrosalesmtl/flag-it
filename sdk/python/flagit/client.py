"""The per-call client, context helpers, and streaming."""

from __future__ import annotations

import json
import threading
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

EvalContext = Dict[str, Any]


@dataclass
class Evaluation:
    """The result of evaluating one flag. ``value`` is the served JSON value."""

    flag_key: str
    value: Any
    variation: int
    reason: str

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Evaluation":
        return cls(
            flag_key=d.get("flag_key", ""),
            value=d.get("value"),
            variation=d.get("variation", 0),
            reason=d.get("reason", ""),
        )


@dataclass
class EvaluationDetail:
    """The value plus explanation returned by ``variation_detail`` (mirrors the
    LaunchDarkly ``EvaluationDetail``). ``variation_index`` is ``None`` when the
    default was returned because of an error."""

    value: Any
    variation_index: Optional[int]
    reason: Any

    def is_default_value(self) -> bool:
        return self.variation_index is None


class FlagsState:
    """A snapshot of every flag's evaluation, returned by ``all_flags_state``
    (mirrors the LaunchDarkly ``FeatureFlagsState``)."""

    def __init__(self, evaluations: Dict[str, "Evaluation"]) -> None:
        self._evaluations = evaluations

    def to_values_dict(self) -> Dict[str, Any]:
        """A plain ``{flag_key: value}`` map — handy for bootstrapping a page."""
        return {k: e.value for k, e in self._evaluations.items()}

    def get(self, flag_key: str) -> Optional["Evaluation"]:
        """The full evaluation for one flag, or ``None`` if absent."""
        return self._evaluations.get(flag_key)

    def keys(self):
        return self._evaluations.keys()

    def __iter__(self):
        return iter(self._evaluations)

    def __contains__(self, flag_key: str) -> bool:
        return flag_key in self._evaluations


class FlagItError(Exception):
    """Raised for a non-2xx API response."""

    def __init__(self, status: int, path: str) -> None:
        super().__init__(f"flag-it: {path} failed with status {status}")
        self.status = status
        self.path = path


def context(kind: str, key: str, attributes: Optional[Dict[str, Any]] = None) -> EvalContext:
    """Build a single-kind context, e.g. ``context("user", "u1", {"plan": "pro"})``."""
    ctx: EvalContext = {"kind": kind, "key": key}
    if attributes:
        ctx.update(attributes)
    return ctx


def multi_context(*parts: Dict[str, Any]) -> EvalContext:
    """Build a multi-kind context.

    Each part is a dict with ``kind``, ``key``, and optional ``attributes``, e.g.
    ``multi_context({"kind": "user", "key": "u1"}, {"kind": "organization", "key": "acme"})``.
    """
    ctx: EvalContext = {"kind": "multi"}
    for p in parts:
        entry = {"key": p["key"]}
        entry.update(p.get("attributes") or {})
        ctx[p["kind"]] = entry
    return ctx


class Stream:
    """A live stream. Call ``close()`` to stop it and cancel reconnects."""

    def __init__(self, thread: threading.Thread, stop: threading.Event) -> None:
        self._thread = thread
        self._stop = stop

    def close(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)


class Client:
    """A per-call client: every read hits the server.

    For a long-lived app that reads flags frequently, prefer ``CachedClient``.
    Instances are safe to share across threads.
    """

    def __init__(self, base_url: str, sdk_key: str, timeout: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._sdk_key = sdk_key
        self._timeout = timeout

    def _request(self, method: str, path: str, body: Optional[Any] = None) -> Any:
        data = None
        headers = {"X-SDK-Key": self._sdk_key}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self._base_url + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as res:
                if res.status in (202, 204):
                    return None
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise FlagItError(e.code, path) from None

    def evaluate(self, flag_key: str, ctx: EvalContext) -> Evaluation:
        """Evaluate one flag for a context. Raises on a network/HTTP error."""
        out = self._request("POST", "/api/v1/eval", {"flag_key": flag_key, "context": ctx})
        return Evaluation.from_dict(out)

    def all_flags_state(self, ctx: EvalContext) -> FlagsState:
        """Evaluate every flag visible to this key in one round-trip. Returns a
        ``FlagsState``; call ``.to_values_dict()`` for a plain value map."""
        out = self._request("POST", "/api/v1/eval/all", {"context": ctx}) or {}
        flags = out.get("flags") or {}
        return FlagsState({k: Evaluation.from_dict(v) for k, v in flags.items()})

    def _safe_value(self, flag_key: str, ctx: EvalContext) -> Any:
        try:
            return self.evaluate(flag_key, ctx).value
        except Exception:
            return None

    def bool_variation(self, flag_key: str, ctx: EvalContext, fallback: bool) -> bool:
        """Boolean value, or ``fallback`` if unavailable / not a bool. Never raises."""
        v = self._safe_value(flag_key, ctx)
        return v if isinstance(v, bool) else fallback

    def string_variation(self, flag_key: str, ctx: EvalContext, fallback: str) -> str:
        """String value, or ``fallback``. Never raises."""
        v = self._safe_value(flag_key, ctx)
        return v if isinstance(v, str) else fallback

    def number_variation(self, flag_key: str, ctx: EvalContext, fallback: float) -> float:
        """Numeric value, or ``fallback``. Never raises. (bool is not treated as a number.)"""
        v = self._safe_value(flag_key, ctx)
        return v if isinstance(v, (int, float)) and not isinstance(v, bool) else fallback

    def variation(self, flag_key: str, ctx: EvalContext, default: Any) -> Any:
        """The flag's value, or ``default`` if unavailable. Never raises.

        This is the canonical read (matching LaunchDarkly's ``variation``); the
        typed helpers above are thin conveniences over it."""
        v = self._safe_value(flag_key, ctx)
        return default if v is None else v

    def variation_detail(self, flag_key: str, ctx: EvalContext, default: Any) -> EvaluationDetail:
        """Like ``variation`` but also returns the variation index and reason
        (matching LaunchDarkly's ``variation_detail``). Never raises."""
        try:
            ev = self.evaluate(flag_key, ctx)
        except Exception as err:  # noqa: BLE001 - reported via reason, not raised
            return EvaluationDetail(value=default, variation_index=None, reason={"kind": "ERROR", "error": str(err)})
        return EvaluationDetail(value=ev.value, variation_index=ev.variation, reason=ev.reason)

    def send_events(self, summary: Dict[str, Any]) -> None:
        """Report rolled-up evaluation counts (for clients that read from a local cache)."""
        self._request("POST", "/api/v1/events", summary)

    def stream(
        self,
        ctx: EvalContext,
        on_update: Callable[[Dict[str, Evaluation]], None],
        on_error: Optional[Callable[[BaseException], None]] = None,
    ) -> Stream:
        """Open a live stream on a background thread.

        ``on_update`` fires with the full flag map on the initial snapshot and on
        every change. Auto-reconnects with backoff until ``close()``.
        """
        stop = threading.Event()
        thread = threading.Thread(
            target=self._run_stream, args=(ctx, on_update, on_error, stop), daemon=True
        )
        thread.start()
        return Stream(thread, stop)

    def _run_stream(self, ctx, on_update, on_error, stop) -> None:
        backoff = 1.0
        while not stop.is_set():
            try:
                self._read_stream_once(ctx, on_update, stop)
                backoff = 1.0
            except Exception as err:  # noqa: BLE001 - reported to caller, then retried
                if stop.is_set():
                    return
                if on_error:
                    on_error(err)
            if stop.wait(backoff):
                return
            backoff = min(backoff * 2, 30.0)

    def _read_stream_once(self, ctx, on_update, stop) -> None:
        query = urllib.parse.urlencode({"context": json.dumps(ctx)})
        url = f"{self._base_url}/api/v1/eval/stream?{query}"
        req = urllib.request.Request(
            url, headers={"X-SDK-Key": self._sdk_key, "Accept": "text/event-stream"}
        )
        with urllib.request.urlopen(req) as res:
            if res.status < 200 or res.status >= 300:
                raise FlagItError(res.status, "/api/v1/eval/stream")
            data_lines = []
            for raw in res:
                if stop.is_set():
                    return
                line = raw.decode("utf-8").rstrip("\n").rstrip("\r")
                if line == "":
                    if data_lines:
                        _dispatch("\n".join(data_lines), on_update)
                        data_lines = []
                    continue
                if line.startswith("data:"):
                    data_lines.append(line[5:].lstrip(" "))


def _dispatch(data: str, on_update: Callable[[Dict[str, Evaluation]], None]) -> None:
    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        return
    flags = payload.get("flags")
    if flags:
        on_update({k: Evaluation.from_dict(v) for k, v in flags.items()})
