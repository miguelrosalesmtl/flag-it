// Per-call client: every read is one request to the server. Good for jobs,
// CLIs, and serverless. Run with:
//
//	FLAG_IT_SDK_KEY=sdk-… go run ./examples/percall
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	flagit "github.com/miguelrosalesmtl/flag-it/sdk/go"
)

func main() {
	client := flagit.New(flagit.Options{
		BaseURL: envOr("FLAG_IT_URL", "http://localhost:8080"),
		SDKKey:  os.Getenv("FLAG_IT_SDK_KEY"),
	})
	ctx := context.Background()
	user := flagit.Context("user", "u-123", map[string]any{"plan": "pro"})

	// Typed read — never errors, returns the fallback on failure / type mismatch:
	fmt.Println("new-dashboard:", client.BoolVariation(ctx, "new-dashboard", user, false))

	// Full evaluation — value + variation index + reason (errors on a network failure):
	ev, err := client.Evaluate(ctx, "new-dashboard", user)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("detail:", ev.Value, ev.Variation, ev.Reason)

	// Everything at once — one round-trip, good for bootstrapping:
	all, err := client.AllFlags(ctx, user)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("flag count:", len(all))
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
