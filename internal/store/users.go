package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const userColumns = `id, email, COALESCE(password_hash, ''), full_name,
	is_superuser, is_active, created_at, updated_at`

// CreateUser inserts a user and returns it with server-populated fields.
func (s *Store) CreateUser(ctx context.Context, email, passwordHash, fullName string, isSuperuser bool) (models.User, error) {
	return insertUser(ctx, s.pool, email, passwordHash, fullName, isSuperuser)
}

// insertUser is the querier-based body of CreateUser, so it can run inside a
// larger transaction (e.g. first-run bootstrap).
func insertUser(ctx context.Context, q querier, email, passwordHash, fullName string, isSuperuser bool) (models.User, error) {
	const sql = `
		INSERT INTO users (email, password_hash, full_name, is_superuser)
		VALUES ($1, $2, $3, $4)
		RETURNING ` + userColumns
	return scanUser(q.QueryRow(ctx, sql, email, passwordHash, fullName, isSuperuser))
}

// GetUserByEmail looks a user up by (case-insensitive) email.
func (s *Store) GetUserByEmail(ctx context.Context, email string) (models.User, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE email = $1`, email)
	return userOrNotFound(scanUser(row))
}

// GetUserByID looks a user up by id.
func (s *Store) GetUserByID(ctx context.Context, id string) (models.User, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	return userOrNotFound(scanUser(row))
}

// CountSuperusers returns how many platform superusers exist (0 = fresh install
// needing setup).
func (s *Store) CountSuperusers(ctx context.Context) (int, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE is_superuser = true`).Scan(&n); err != nil {
		return 0, fmt.Errorf("store: count superusers: %w", err)
	}
	return n, nil
}

// ListUsers returns all users ordered by email (superuser view).
func (s *Store) ListUsers(ctx context.Context) ([]models.User, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+userColumns+` FROM users ORDER BY email`)
	if err != nil {
		return nil, fmt.Errorf("store: list users: %w", err)
	}
	defer rows.Close()
	out := make([]models.User, 0)
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// UpdateUser updates a user's display name and active flag.
func (s *Store) UpdateUser(ctx context.Context, id, fullName string, isActive bool) (models.User, error) {
	const q = `UPDATE users SET full_name = $2, is_active = $3, updated_at = now() WHERE id = $1 RETURNING ` + userColumns
	return userOrNotFound(scanUser(s.pool.QueryRow(ctx, q, id, fullName, isActive)))
}

// DeleteUser removes a user.
func (s *Store) DeleteUser(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanUser(row pgx.Row) (models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName,
		&u.IsSuperuser, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return models.User{}, err
	}
	return u, nil
}

func userOrNotFound(u models.User, err error) (models.User, error) {
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("store: get user: %w", err)
	}
	return u, nil
}
