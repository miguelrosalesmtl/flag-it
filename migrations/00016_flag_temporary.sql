-- +goose Up
-- Flag lifecycle: mark a flag as temporary (short-lived, e.g. a release toggle
-- meant to be removed once launched) vs permanent. Combined with evaluation
-- activity, this drives stale-flag detection.
ALTER TABLE flags ADD COLUMN temporary boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE flags DROP COLUMN temporary;
