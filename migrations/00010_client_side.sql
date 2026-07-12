-- +goose Up
-- Whether client-kind SDK keys (public) may see/evaluate a flag. Default false =
-- server-side only, matching LaunchDarkly's default.
ALTER TABLE flags ADD COLUMN client_side_available boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE flags DROP COLUMN client_side_available;
