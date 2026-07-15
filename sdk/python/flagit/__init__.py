"""flag-it — a thin Python client for the flag-it feature-flag service.

Evaluation happens on the server: this client sends a context to the eval
endpoints and gets back values. It holds no rules and no engine. Standard
library only; no dependencies.
"""

from .client import (
    Client,
    Evaluation,
    EvaluationDetail,
    FlagItError,
    FlagsState,
    Stream,
    context,
    multi_context,
)
from .cached import CachedClient

__all__ = [
    "Client",
    "CachedClient",
    "Evaluation",
    "EvaluationDetail",
    "FlagsState",
    "FlagItError",
    "Stream",
    "context",
    "multi_context",
]

__version__ = "0.1.0"
