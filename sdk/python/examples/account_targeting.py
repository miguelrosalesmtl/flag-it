"""Per-account targeting.

The flag `new-dashboard` is configured on the SERVER with a rule like
"serve true when organization.key == acme". This program does NOT evaluate that
rule — it only asserts *who* the user is and *which account* they're on (a
multi-kind context). The server matches the rule and returns just the value. A
different account gets a different answer from the same code.

Run with:  FLAG_IT_SDK_KEY=sdk-… python account_targeting.py
"""

import os

import flagit

client = flagit.CachedClient(
    base_url=os.environ.get("FLAG_IT_URL", "http://localhost:8080"),
    sdk_key=os.environ["FLAG_IT_SDK_KEY"],
    context=flagit.multi_context(
        {"kind": "user", "key": "u-123", "attributes": {"plan": "pro"}},
        {"kind": "organization", "key": "acme"},  # the account being targeted
    ),
)
client.wait_for_initialization(timeout=5)
print("new-dashboard for acme:", client.variation("new-dashboard", False))  # -> True

# Same code, different identity → different answer. No rules ever left the server.
client.identify(
    flagit.multi_context(
        {"kind": "user", "key": "u-999"},
        {"kind": "organization", "key": "beta"},
    ),
    timeout=5,
)
print("new-dashboard for beta:", client.variation("new-dashboard", False))  # -> False

client.close()
