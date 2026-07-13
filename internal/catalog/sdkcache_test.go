package catalog

import (
	"testing"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

func TestSDKKeyCache(t *testing.T) {
	c := newSDKKeyCache(time.Minute)

	// miss on empty cache
	if _, _, hit := c.get("k"); hit {
		t.Fatal("expected miss on empty cache")
	}

	// positive entry
	c.put("k", models.SdkKey{EnvironmentID: "env-1", Kind: "server"}, true)
	sk, found, hit := c.get("k")
	if !hit || !found || sk.EnvironmentID != "env-1" {
		t.Fatalf("positive: hit=%v found=%v env=%q", hit, found, sk.EnvironmentID)
	}

	// negative entry (cached "not found")
	c.put("bad", models.SdkKey{}, false)
	if _, found, hit := c.get("bad"); !hit || found {
		t.Fatalf("negative: hit=%v found=%v (want hit=true found=false)", hit, found)
	}

	// flush clears everything
	c.flush()
	if _, _, hit := c.get("k"); hit {
		t.Fatal("expected miss after flush")
	}
}

func TestSDKKeyCache_Expiry(t *testing.T) {
	c := newSDKKeyCache(15 * time.Millisecond)
	c.put("k", models.SdkKey{EnvironmentID: "e"}, true)
	if _, _, hit := c.get("k"); !hit {
		t.Fatal("expected hit before expiry")
	}
	time.Sleep(25 * time.Millisecond)
	if _, _, hit := c.get("k"); hit {
		t.Fatal("expected miss after TTL expiry")
	}
}

func TestSDKKeyCache_Disabled(t *testing.T) {
	c := newSDKKeyCache(0) // disabled
	c.put("k", models.SdkKey{EnvironmentID: "e"}, true)
	if _, _, hit := c.get("k"); hit {
		t.Fatal("disabled cache must never hit")
	}
}
