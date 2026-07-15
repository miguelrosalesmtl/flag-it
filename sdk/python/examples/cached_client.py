"""Cached client: opens one stream, keeps a snapshot in memory, and serves
synchronous local reads with zero network per read. Use this for a long-lived
process. Run with:  FLAG_IT_SDK_KEY=sdk-… python cached_client.py
"""

import os
import signal

import flagit

client = flagit.CachedClient(
    base_url=os.environ.get("FLAG_IT_URL", "http://localhost:8080"),
    sdk_key=os.environ["FLAG_IT_SDK_KEY"],
    context=flagit.context("user", "u-123", {"plan": "pro"}),
)

# Blocks until the first snapshot has streamed in.
client.wait_for_initialization(timeout=5)
print("initialized:", client.is_initialized())


def on_change() -> None:
    # Fired when a change is pushed over the stream — no reload, no polling.
    print("flags changed → new-dashboard:", client.variation("new-dashboard", False))


unsubscribe = client.on_change(on_change)

# Synchronous local reads — no network:
print("new-dashboard:", client.variation("new-dashboard", False))
print("tier:", client.string_variation("pricing-tier", "free"))  # typed convenience

# Block, reacting to live changes; Ctrl-C to stop.
try:
    signal.pause()
except KeyboardInterrupt:
    pass
finally:
    unsubscribe()
    client.close()  # stops the stream and flushes a final batch of usage events
