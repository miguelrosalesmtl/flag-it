-- +goose Up
-- Rolled-up evaluation counts (per flag, variation, environment, time window).
-- Written by the periodic flush of in-memory counters — never one row per eval.
CREATE TABLE flag_eval_stats (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    flag_key       text NOT NULL, -- text (not FK): stats survive flag deletion
    variation      integer NOT NULL,
    window_start   timestamptz NOT NULL,
    count          bigint NOT NULL DEFAULT 0,
    UNIQUE (environment_id, flag_key, variation, window_start)
);

CREATE INDEX flag_eval_stats_lookup_idx ON flag_eval_stats (environment_id, flag_key, window_start);

-- +goose Down
DROP TABLE flag_eval_stats;
