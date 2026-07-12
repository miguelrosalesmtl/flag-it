#!/bin/sh
set -eu

# Generate the runtime config from the container's environment.
#
# This is the whole point of the build-once model: the image is immutable and
# environment-agnostic, and THIS script is what makes a given container a
# staging container or a production one. The bundle never changes.
#
# Everything written here is served to the browser in plain text. It is public.
# Do not pass secrets in these variables.

: "${APP_API_URL:?APP_API_URL must be set}"
: "${APP_ENVIRONMENT:?APP_ENVIRONMENT must be set (development|staging|production)}"

CONFIG_PATH=/usr/share/nginx/html/config.json

# Mocking is hard-coded false: a deployed container must never serve fixtures.
cat > "$CONFIG_PATH" <<EOF
{
  "apiUrl": "${APP_API_URL}",
  "environment": "${APP_ENVIRONMENT}",
  "enableMocking": false
}
EOF

echo "Wrote ${CONFIG_PATH}:"
cat "$CONFIG_PATH"

exec "$@"
