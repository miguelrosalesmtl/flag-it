package server

import (
	"sync"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// sdkMaxCacheEntries bounds memory (guards against negative-caching floods of
// random keys). At the cap the cache resets; legitimate key counts are far below.
const sdkMaxCacheEntries = 100_000

// sdkKeyCache is a small TTL cache of SDK-key lookups (positive and negative),
// so evaluation doesn't hit Postgres on every request. Safe for concurrent use.
type sdkKeyCache struct {
	ttl time.Duration
	mu  sync.RWMutex
	m   map[string]sdkCacheEntry
}

type sdkCacheEntry struct {
	sk      models.SdkKey
	found   bool
	expires time.Time
}

func newSDKKeyCache(ttl time.Duration) *sdkKeyCache {
	return &sdkKeyCache{ttl: ttl, m: make(map[string]sdkCacheEntry)}
}

// get returns (sdkKey, found, hit): hit=false means the caller must consult the
// store. found distinguishes a cached positive from a cached negative.
func (c *sdkKeyCache) get(key string) (models.SdkKey, bool, bool) {
	if c.ttl <= 0 {
		return models.SdkKey{}, false, false
	}
	c.mu.RLock()
	e, ok := c.m[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(e.expires) {
		return models.SdkKey{}, false, false
	}
	return e.sk, e.found, true
}

func (c *sdkKeyCache) put(key string, sk models.SdkKey, found bool) {
	if c.ttl <= 0 {
		return
	}
	c.mu.Lock()
	if len(c.m) >= sdkMaxCacheEntries {
		c.m = make(map[string]sdkCacheEntry)
	}
	c.m[key] = sdkCacheEntry{sk: sk, found: found, expires: time.Now().Add(c.ttl)}
	c.mu.Unlock()
}

// flush clears the cache (called after a revoke for immediate local consistency).
func (c *sdkKeyCache) flush() {
	c.mu.Lock()
	c.m = make(map[string]sdkCacheEntry)
	c.mu.Unlock()
}
