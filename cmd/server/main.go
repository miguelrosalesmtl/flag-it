// Command server is the feature-flag service entrypoint.
//
// It is designed to run as many identical replicas behind a load balancer in
// Kubernetes. Postgres is the source of truth; each replica keeps an in-memory
// cache of all flags for fast evaluation and stays consistent with its siblings
// via a Redis pub/sub bus.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/miguelrosalesmtl/flag-it/internal/analytics"
	"github.com/miguelrosalesmtl/flag-it/internal/audit"
	"github.com/miguelrosalesmtl/flag-it/internal/auth"
	"github.com/miguelrosalesmtl/flag-it/internal/authz"
	"github.com/miguelrosalesmtl/flag-it/internal/catalog"
	"github.com/miguelrosalesmtl/flag-it/internal/database"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/logger"
	"github.com/miguelrosalesmtl/flag-it/internal/pubsub"
	"github.com/miguelrosalesmtl/flag-it/internal/server"
	"github.com/miguelrosalesmtl/flag-it/internal/settings"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

func main() {
	// Subcommands. `server migrate [up|down|status|reset]` runs migrations and
	// exits; with no subcommand the HTTP server starts.
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := runMigrate(os.Args[2:]); err != nil {
			os.Stderr.WriteString("migrate: " + err.Error() + "\n")
			os.Exit(1)
		}
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "createsuperuser" {
		if err := runCreateSuperuser(os.Args[2:]); err != nil {
			os.Stderr.WriteString("createsuperuser: " + err.Error() + "\n")
			os.Exit(1)
		}
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "openapi" {
		if err := runOpenAPI(); err != nil {
			os.Stderr.WriteString("openapi: " + err.Error() + "\n")
			os.Exit(1)
		}
		return
	}

	if err := run(); err != nil {
		// Logger may not exist yet if settings failed; fall back to stderr.
		os.Stderr.WriteString("fatal: " + err.Error() + "\n")
		os.Exit(1)
	}
}

// runMigrate handles the `migrate` subcommand. Direction defaults to "up".
func runMigrate(args []string) error {
	direction := "up"
	if len(args) > 0 {
		direction = args[0]
	}

	cfg, err := settings.Load()
	if err != nil {
		return err
	}
	log := logger.New(cfg)
	return database.Migrate(cfg.Postgres, direction, log)
}

// runCreateSuperuser bootstraps a platform superuser, like Django's
// createsuperuser. Usage: server createsuperuser <email> <password> [full name].
func runCreateSuperuser(args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("usage: server createsuperuser <email> <password> [full name]")
	}
	email, password := args[0], args[1]
	fullName := "Superuser"
	if len(args) > 2 {
		fullName = strings.Join(args[2:], " ")
	}

	cfg, err := settings.Load()
	if err != nil {
		return err
	}
	log := logger.New(cfg)

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.Postgres)
	if err != nil {
		return err
	}
	defer pool.Close()

	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	user, err := store.New(pool).CreateUser(ctx, email, hash, fullName, true)
	if err != nil {
		return err
	}
	log.Info("superuser created", "id", user.ID, "email", user.Email)
	return nil
}

// runOpenAPI prints the generated OpenAPI spec to stdout (no DB needed — routes
// are registered without connecting). Usage: server openapi > docs/openapi.yaml
func runOpenAPI() error {
	cfg, err := settings.Load()
	if err != nil {
		return err
	}
	log := logger.New(cfg)
	st := store.New(nil)
	authSvc := auth.New(st, cfg.JWT.Secret, cfg.JWT.TTL)
	authzSvc := authz.New(st)
	catalogSvc := catalog.New(st)
	auditSvc := audit.New(st, log)
	analyticsRec := analytics.New(st, 0, log)
	flagSvc := flags.NewService(st, nil, log)
	srv := server.New(cfg.Server, flagSvc, catalogSvc, auditSvc, authSvc, authzSvc, analyticsRec, nil, log)

	spec, err := srv.OpenAPIYAML()
	if err != nil {
		return err
	}
	_, err = os.Stdout.Write(spec)
	return err
}

func run() error {
	cfg, err := settings.Load()
	if err != nil {
		return err
	}

	log := logger.New(cfg)
	log.Info("starting feature-flag service", "environment", cfg.App.Environment)

	// Root context cancelled on SIGINT/SIGTERM (sent by Kubernetes on pod stop).
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Postgres — source of truth.
	pool, err := database.NewPool(ctx, cfg.Postgres)
	if err != nil {
		return err
	}
	defer pool.Close()
	log.Info("connected to postgres")

	// Redis — pub/sub bus for cross-replica cache consistency.
	bus, err := pubsub.NewBus(ctx, cfg.Redis, cfg.App.InstanceID, log)
	if err != nil {
		return err
	}
	defer bus.Close()
	log.Info("connected to redis")

	// Data-access layer. Handlers never see it — services wrap it.
	st := store.New(pool)
	authSvc := auth.New(st, cfg.JWT.Secret, cfg.JWT.TTL)
	authzSvc := authz.New(st)
	catalogSvc := catalog.New(st)
	auditSvc := audit.New(st, log)

	// Analytics — buffers evaluation counts, flushes rollups on an interval.
	analyticsRec := analytics.New(st, cfg.Server.AnalyticsFlushInterval, log)
	go analyticsRec.Start(ctx)

	// Flag service — cache + evaluation. Start warms the cache and consumes
	// change events in the background until the context is cancelled.
	flagService := flags.NewService(st, bus, log)
	go func() {
		if err := flagService.Start(ctx); err != nil && !errors.Is(err, context.Canceled) {
			log.Error("flag service stopped", "error", err)
			stop() // trigger shutdown of the whole process
		}
	}()

	// HTTP server.
	srv := server.New(cfg.Server, flagService, catalogSvc, auditSvc, authSvc, authzSvc, analyticsRec, bus, log)
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- srv.Start()
	}()

	// Block until the server dies or we receive a shutdown signal.
	select {
	case err := <-serverErr:
		return err
	case <-ctx.Done():
		log.Info("shutdown signal received")
	}

	// Graceful shutdown with a bounded deadline.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("graceful shutdown failed", "error", err)
		return err
	}
	log.Info("shutdown complete")
	return nil
}
