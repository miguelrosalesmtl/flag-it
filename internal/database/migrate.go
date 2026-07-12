package database

import (
	"database/sql"
	"fmt"
	"log/slog"

	// pgx's database/sql driver, required by goose (goose uses database/sql).
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/miguelrosalesmtl/flag-it/internal/settings"
	"github.com/miguelrosalesmtl/flag-it/migrations"
)

// Migrate runs the embedded goose migrations against Postgres. direction is one
// of "up", "down" (one step), "status", or "reset" (roll everything back).
//
// It opens its own short-lived database/sql connection rather than reusing the
// app's pgxpool, because goose is built on database/sql.
func Migrate(cfg settings.Postgres, direction string, log *slog.Logger) error {
	db, err := sql.Open("pgx", cfg.DSN())
	if err != nil {
		return fmt.Errorf("database: open migration connection: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("database: ping for migration: %w", err)
	}

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("database: set goose dialect: %w", err)
	}

	log.Info("applying migrations", slog.String("direction", direction))

	switch direction {
	case "up":
		return goose.Up(db, ".")
	case "down":
		return goose.Down(db, ".")
	case "status":
		return goose.Status(db, ".")
	case "reset":
		return goose.Reset(db, ".")
	default:
		return fmt.Errorf("database: unknown migrate direction %q (want up|down|status|reset)", direction)
	}
}
