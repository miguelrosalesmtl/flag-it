// Per-account targeting.
//
// The flag `new-dashboard` is configured on the SERVER with a rule like
// "serve true when organization.key == acme". This program does NOT evaluate
// that rule — it only asserts *who* the user is and *which account* they're on
// (a multi-kind context). The server matches the rule and returns just the
// value. A different account gets a different answer from the same code.
//
// Run with:  FLAG_IT_SDK_KEY=sdk-… go run ./examples/accounttargeting
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	flagit "github.com/miguelrosalesmtl/flag-it/sdk/go"
)

func main() {
	client := flagit.NewCachedClient(flagit.CachedOptions{
		BaseURL: envOr("FLAG_IT_URL", "http://localhost:8080"),
		SDKKey:  os.Getenv("FLAG_IT_SDK_KEY"),
		Context: flagit.MultiContext(
			flagit.ContextPart{Kind: "user", Key: "u-123", Attributes: map[string]any{"plan": "pro"}},
			flagit.ContextPart{Kind: "organization", Key: "acme"}, // the account being targeted
		),
	})
	defer client.Close()

	if err := client.WaitForInitialization(context.Background()); err != nil {
		log.Fatal(err)
	}
	fmt.Println("new-dashboard for acme:", client.BoolVariation("new-dashboard", false)) // → true

	// Same code, different identity → different answer. No rules ever left the server.
	if err := client.Identify(context.Background(), flagit.MultiContext(
		flagit.ContextPart{Kind: "user", Key: "u-999"},
		flagit.ContextPart{Kind: "organization", Key: "beta"},
	)); err != nil {
		log.Fatal(err)
	}
	fmt.Println("new-dashboard for beta:", client.BoolVariation("new-dashboard", false)) // → false
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
