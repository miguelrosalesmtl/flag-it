package flags_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/database"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/logger"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/pubsub"
	"github.com/miguelrosalesmtl/flag-it/internal/settings"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// TestCrossReplicaPropagation proves the horizontal-scaling guarantee: a flag
// change written on one replica reaches a second replica's in-memory cache via
// the Redis pub/sub bus. Skipped automatically when Postgres or Redis is
// unreachable.
func TestCrossReplicaPropagation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := settings.Load()
	if err != nil {
		t.Skipf("settings unavailable: %v", err)
	}
	pool, err := database.NewPool(ctx, cfg.Postgres)
	if err != nil {
		t.Skipf("no database: %v", err)
	}
	defer pool.Close()

	log := logger.New(cfg)
	st := store.New(pool)

	// Two independent replicas: separate buses (own Redis clients + instance ids),
	// same Postgres and same Redis channel.
	busA, err := pubsub.NewBus(ctx, cfg.Redis, "replica-A", log)
	if err != nil {
		t.Skipf("no redis: %v", err)
	}
	defer busA.Close()
	busB, err := pubsub.NewBus(ctx, cfg.Redis, "replica-B", log)
	if err != nil {
		t.Skipf("no redis: %v", err)
	}
	defer busB.Close()

	replicaA := flags.NewService(st, busA, log)
	replicaB := flags.NewService(st, busB, log)

	// --- Seed a tenant, project (auto envs), and a boolean flag. ---
	suffix := time.Now().UnixNano()
	tenant, err := st.CreateTenant(ctx, fmt.Sprintf("prop-%d", suffix), "Prop")
	if err != nil {
		t.Fatalf("create tenant: %v", err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM tenants WHERE id = $1`, tenant.ID)

	_, envs, err := st.CreateProject(ctx, tenant.ID, "app", "App")
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	var prodID string
	for _, e := range envs {
		if e.Key == "production" {
			prodID = e.ID
		}
	}
	if prodID == "" {
		t.Fatal("no production environment seeded")
	}

	variations := []json.RawMessage{json.RawMessage(`true`), json.RawMessage(`false`)}
	flag, err := replicaA.SaveFlag(ctx, envs[0].ProjectID, "prop-flag", "Prop Flag", "", false, false, variations)
	if err != nil {
		t.Fatalf("save flag: %v", err)
	}

	// Seed an explicit initial config in production: off, off = variation 1
	// (false), so the pre-change value is unambiguously false.
	zero := 0
	if _, err := replicaA.SaveFlagConfig(ctx, flag.ID, prodID, models.FlagConfig{
		On:           false,
		OffVariation: 1, // false
		Fallthrough:  models.VariationOrRollout{Variation: &zero},
	}); err != nil {
		t.Fatalf("seed initial config: %v", err)
	}

	// Start both replicas (warm cache + subscribe to the bus) in the background.
	go func() { _ = replicaA.Start(ctx) }()
	go func() { _ = replicaB.Start(ctx) }()

	evalCtx := models.NewSingleContext("user", "user-1", nil)

	// Wait until replica B has warmed and knows the flag (initially off, so it
	// serves the off variation = false).
	waitFor(t, 5*time.Second, "replica B warms flag", func() bool {
		ev, err := replicaB.Evaluate(prodID, "prop-flag", evalCtx, false)
		return err == nil && ev.Value == false
	})

	// --- Mutate on replica A: turn the flag on in production (fallthrough → true). ---
	_, err = replicaA.SaveFlagConfig(ctx, flag.ID, prodID, models.FlagConfig{
		On:           true,
		OffVariation: 1,                                           // false
		Fallthrough:  models.VariationOrRollout{Variation: &zero}, // true
	})
	if err != nil {
		t.Fatalf("save flag config: %v", err)
	}

	// --- Replica B must converge to the new value via pub/sub, without any
	// direct call to it. ---
	waitFor(t, 5*time.Second, "replica B sees enable via pub/sub", func() bool {
		ev, err := replicaB.Evaluate(prodID, "prop-flag", evalCtx, false)
		return err == nil && ev.Value == true && ev.Reason == "FALLTHROUGH"
	})

	// Sanity: replica A also reflects it.
	ev, err := replicaA.Evaluate(prodID, "prop-flag", evalCtx, false)
	if err != nil || ev.Value != true {
		t.Fatalf("replica A value = %v (err %v), want true", ev.Value, err)
	}
}

// waitFor polls cond until true or the timeout elapses, failing the test on timeout.
func waitFor(t *testing.T, timeout time.Duration, desc string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for: %s", desc)
}
