-- +goose Up
-- Phase 1 targeting: give flags a stable bucketing salt, and restructure the
-- per-environment config to store rich targeting (individual targets, ordered
-- rules of clauses, and a fallthrough variation-or-rollout) as JSONB.

ALTER TABLE flags ADD COLUMN salt text NOT NULL DEFAULT '';

-- Old simple config: default_variation + a single rollout weight array.
ALTER TABLE flag_environments DROP COLUMN default_variation;
ALTER TABLE flag_environments DROP COLUMN rollout;

-- targets was a {key: variation} map; it is now an array of Target objects.
UPDATE flag_environments SET targets = '[]'::jsonb;
ALTER TABLE flag_environments ALTER COLUMN targets SET DEFAULT '[]'::jsonb;

-- Ordered targeting rules (array of {clauses[], variation|rollout}).
ALTER TABLE flag_environments ADD COLUMN rules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Served when targeting is on but nothing matches (variation or rollout).
ALTER TABLE flag_environments ADD COLUMN fallthrough jsonb NOT NULL DEFAULT '{"variation":0}'::jsonb;

-- +goose Down
ALTER TABLE flag_environments DROP COLUMN fallthrough;
ALTER TABLE flag_environments DROP COLUMN rules;

UPDATE flag_environments SET targets = '{}'::jsonb;
ALTER TABLE flag_environments ALTER COLUMN targets SET DEFAULT '{}'::jsonb;

ALTER TABLE flag_environments ADD COLUMN rollout jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE flag_environments ADD COLUMN default_variation integer NOT NULL DEFAULT 0;

ALTER TABLE flags DROP COLUMN salt;
