-- +goose Up
-- Prerequisites: flags this flag depends on. Per-environment config (a flag may
-- require different prerequisites in staging vs production). Array of
-- {key, variation}; the prerequisite passes only if that flag is on and
-- evaluates to the given variation.
ALTER TABLE flag_environments ADD COLUMN prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb;

-- +goose Down
ALTER TABLE flag_environments DROP COLUMN prerequisites;
