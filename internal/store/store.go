// Package store holds the pgx-backed repositories for every persisted entity.
// All methods hang off a single Store so callers share one connection pool.
package store

import (
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a lookup matches no row.
var ErrNotFound = errors.New("store: not found")

// Store is the data-access layer over Postgres.
type Store struct {
	pool *pgxpool.Pool
}

// New returns a Store backed by the given pool.
func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// Pool exposes the underlying pool for health checks and advanced callers.
func (s *Store) Pool() *pgxpool.Pool {
	return s.pool
}
