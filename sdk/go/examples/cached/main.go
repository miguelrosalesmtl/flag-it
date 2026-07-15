// Cached client: opens one stream, keeps a snapshot in memory, and serves
// synchronous local reads with zero network per read. Use this for a
// long-lived service. Run with:
//
//	FLAG_IT_SDK_KEY=sdk-… go run ./examples/cached
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	flagit "github.com/miguelrosalesmtl/flag-it/sdk/go"
)

func main() {
	client := flagit.NewCachedClient(flagit.CachedOptions{
		BaseURL: envOr("FLAG_IT_URL", "http://localhost:8080"),
		SDKKey:  os.Getenv("FLAG_IT_SDK_KEY"),
		Context: flagit.Context("user", "u-123", map[string]any{"plan": "pro"}),
	})
	defer client.Close()

	if err := client.WaitForInitialization(context.Background()); err != nil {
		log.Fatal(err)
	}

	// React to live changes pushed over the stream — no reload, no polling.
	unsubscribe := client.OnChange(func() {
		fmt.Println("flags changed → new-dashboard:", client.BoolVariation("new-dashboard", false))
	})
	defer unsubscribe()

	// Synchronous local reads — no network:
	fmt.Println("new-dashboard:", client.BoolVariation("new-dashboard", false))
	fmt.Println("tier:", client.StringVariation("pricing-tier", "free"))

	// Block until Ctrl-C, reacting to live changes in the meantime.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
