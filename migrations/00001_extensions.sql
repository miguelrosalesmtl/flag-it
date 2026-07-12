-- +goose Up
-- citext gives us case-insensitive emails. uuidv7() is built into Postgres 18+,
-- so no extension is needed for UUID generation.
CREATE EXTENSION IF NOT EXISTS citext;

-- +goose Down
DROP EXTENSION IF EXISTS citext;
