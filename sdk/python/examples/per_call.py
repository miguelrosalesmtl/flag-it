"""Per-call client: every read is one request to the server. Good for scripts,
jobs, and serverless. Run with:  FLAG_IT_SDK_KEY=sdk-… python per_call.py
"""

import os

import flagit

client = flagit.Client(
    base_url=os.environ.get("FLAG_IT_URL", "http://localhost:8080"),
    sdk_key=os.environ["FLAG_IT_SDK_KEY"],
)
user = flagit.context("user", "u-123", {"plan": "pro"})

# Canonical read (like LaunchDarkly) — never raises, returns the default on error:
print("new-dashboard:", client.variation("new-dashboard", user, False))

# With explanation — value + variation index + reason:
detail = client.variation_detail("new-dashboard", user, False)
print("detail:", detail.value, detail.variation_index, detail.reason)

# Everything at once — one round-trip, good for bootstrapping:
state = client.all_flags_state(user)
print("all flags:", list(state.keys()))
print("values:", state.to_values_dict())
