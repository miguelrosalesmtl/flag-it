# flag-it Python SDK

A thin Python client for the [flag-it](../../README.md) feature-flag service.
**Evaluation happens on the server** — this client sends a context to the eval
endpoints and gets back values. It holds no rules and no engine.

- **Standard library only** — zero dependencies.
- **Thread-safe** — share one client across threads.
- **Streaming** with automatic reconnect.
- Python **3.8+**.

## Install

```bash
cd sdk/python
pip install .
```

## Usage (per-call client)

Every read hits the server. Good for scripts, jobs, and serverless.

```python
import os
import flagit

client = flagit.Client(
    base_url="https://flags.example.com",
    sdk_key=os.environ["FLAG_IT_SDK_KEY"],
)

user = flagit.context("user", "u-123", {"plan": "pro"})

# Canonical reads (like LaunchDarkly) — never raise, return the default on error:
if client.variation("dark-mode", user, False):
    ...
detail = client.variation_detail("pricing-tier", user, "free")
print(detail.value, detail.variation_index, detail.reason)

# Typed conveniences over variation() (return the fallback on type mismatch):
dark = client.bool_variation("dark-mode", user, False)
tier = client.string_variation("pricing-tier", user, "free")
limit = client.number_variation("rate-limit", user, 100)

# Everything at once (one round-trip — good for bootstrapping):
state = client.all_flags_state(user)
values = state.to_values_dict()  # {flag_key: value}

# Multi-kind context (e.g. bucket by organization):
ctx = flagit.multi_context(
    {"kind": "user", "key": "u-123"},
    {"kind": "organization", "key": "acme"},
)
```

## Cached client (recommended for high read volume)

`Client` hits the server on every read, which does not scale on a hot path.
`CachedClient` mirrors how the LaunchDarkly SDKs work: it opens **one** stream,
keeps a full flag snapshot in memory, serves **synchronous local reads with zero
network per read**, and reports usage as **batched summary events** (default
every 5s).

```python
import flagit

client = flagit.CachedClient(
    base_url="https://flags.example.com",
    sdk_key=os.environ["FLAG_IT_SDK_KEY"],
    context=flagit.context("user", "u-123", {"plan": "pro"}),
)
client.wait_for_initialization(timeout=5)
client.is_initialized()  # True once the first snapshot arrives

# Synchronous — no network:
if client.variation("dark-mode", False):
    ...
tier = client.string_variation("pricing-tier", "free")  # typed convenience
values = client.all_flags_state().to_values_dict()

# React to live changes pushed over the stream:
unsubscribe = client.on_change(lambda: rerender())

# Re-point at a different context (e.g. after login):
client.identify(flagit.context("user", "u-456"))

client.flush()  # force-send buffered usage now
client.close()  # stop the stream and flush a final batch
```

Options: `flush_interval` (seconds; default 5, `0` disables the background
flush), `send_events` (default `True`), `on_error`.

## Streaming directly

```python
def on_update(flags):
    # full snapshot on connect and on every change
    ...

stream = client.stream(user, on_update, on_error=lambda e: print(e))
# later:
stream.close()
```

## Examples

Runnable examples live in [`examples/`](./examples):

| File | Shows |
| --- | --- |
| [`per_call.py`](./examples/per_call.py) | one-off reads: `variation`, `variation_detail`, `all_flags_state` |
| [`cached_client.py`](./examples/cached_client.py) | streaming cache, synchronous reads, `on_change`, graceful `close` |
| [`account_targeting.py`](./examples/account_targeting.py) | per-account targeting via a multi-kind context — the server matches the rule, the client only asserts identity |

```bash
FLAG_IT_SDK_KEY=sdk-… python examples/per_call.py
```

## Server vs client SDK keys

Use a **server** SDK key from a backend. Client keys only see flags marked
client-side-available; never ship a server key to an untrusted client.
