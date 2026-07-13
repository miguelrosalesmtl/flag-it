// Package settings loads and holds all application configuration.
//
// It works like Django's settings module: a single, typed, immutable object
// that is populated once at startup from environment variables (optionally
// seeded from a .env file) and then passed explicitly to the components that
// need it. Nothing else in the codebase should read os.Getenv directly.
package settings

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Settings is the fully-resolved configuration for a single process.
type Settings struct {
	App      App
	Server   Server
	Postgres Postgres
	Redis    Redis
	JWT      JWT
}

// JWT holds settings for signing and verifying auth tokens.
type JWT struct {
	// Secret is the HMAC signing key. Must be overridden in production.
	Secret string `env:"JWT_SECRET" envDefault:"dev-insecure-secret-change-me"`
	// TTL is how long an issued token stays valid.
	TTL time.Duration `env:"JWT_TTL" envDefault:"24h"`
}

const devJWTSecret = "dev-insecure-secret-change-me"

// App holds top-level, environment-wide options.
type App struct {
	// Environment is one of "development", "staging", "production".
	Environment string `env:"APP_ENV" envDefault:"development"`
	// Debug enables verbose logging and developer-friendly error output.
	Debug bool `env:"APP_DEBUG" envDefault:"true"`
	// LogLevel is one of "debug", "info", "warn", "error".
	LogLevel string `env:"LOG_LEVEL" envDefault:"info"`
	// InstanceID uniquely identifies this pod/replica. In Kubernetes this is
	// typically injected from metadata.name via the downward API. It is used to
	// tag pub/sub messages so a pod can ignore its own broadcasts.
	InstanceID string `env:"INSTANCE_ID" envDefault:""`
}

// Server holds HTTP server configuration.
type Server struct {
	Host            string        `env:"SERVER_HOST" envDefault:"0.0.0.0"`
	Port            int           `env:"SERVER_PORT" envDefault:"8080"`
	ReadTimeout     time.Duration `env:"SERVER_READ_TIMEOUT" envDefault:"10s"`
	WriteTimeout    time.Duration `env:"SERVER_WRITE_TIMEOUT" envDefault:"10s"`
	IdleTimeout     time.Duration `env:"SERVER_IDLE_TIMEOUT" envDefault:"60s"`
	ShutdownTimeout time.Duration `env:"SERVER_SHUTDOWN_TIMEOUT" envDefault:"15s"`
	// APIKey, when set, is required in the X-API-Key header for write endpoints.
	APIKey string `env:"API_KEY" envDefault:""`
	// SDKKeyCacheTTL caches SDK-key → environment lookups to avoid a Postgres
	// hit on every evaluation. Revokes flush the local cache immediately; other
	// replicas converge within this TTL. Set to 0 to disable caching.
	SDKKeyCacheTTL time.Duration `env:"SDK_KEY_CACHE_TTL" envDefault:"30s"`
	// AnalyticsFlushInterval is how often buffered evaluation counts are flushed
	// to the rollup table.
	AnalyticsFlushInterval time.Duration `env:"ANALYTICS_FLUSH_INTERVAL" envDefault:"30s"`
	// ScheduledChangeInterval is how often the scheduler wakes to apply
	// scheduled flag changes whose time has come.
	ScheduledChangeInterval time.Duration `env:"SCHEDULED_CHANGE_INTERVAL" envDefault:"15s"`
	// CORSAllowedOrigins lists browser origins allowed to call the API (comma
	// separated). "*" allows any (fine for dev; restrict in production). Auth is
	// via the Authorization header, not cookies, so credentials are not shared.
	CORSAllowedOrigins []string `env:"CORS_ALLOWED_ORIGINS" envSeparator:"," envDefault:"*"`
}

// Addr returns the host:port the HTTP server should bind to.
func (s Server) Addr() string {
	return fmt.Sprintf("%s:%d", s.Host, s.Port)
}

// Postgres holds the connection settings for the source-of-truth database.
type Postgres struct {
	Host            string        `env:"POSTGRES_HOST" envDefault:"localhost"`
	Port            int           `env:"POSTGRES_PORT" envDefault:"5432"`
	User            string        `env:"POSTGRES_USER" envDefault:"postgres"`
	Password        string        `env:"POSTGRES_PASSWORD" envDefault:"postgres"`
	Database        string        `env:"POSTGRES_DB" envDefault:"postgres"`
	SSLMode         string        `env:"POSTGRES_SSLMODE" envDefault:"disable"`
	MaxConns        int32         `env:"POSTGRES_MAX_CONNS" envDefault:"10"`
	MinConns        int32         `env:"POSTGRES_MIN_CONNS" envDefault:"2"`
	MaxConnLifetime time.Duration `env:"POSTGRES_MAX_CONN_LIFETIME" envDefault:"1h"`
	MaxConnIdleTime time.Duration `env:"POSTGRES_MAX_CONN_IDLE_TIME" envDefault:"30m"`
}

// DSN returns a libpq-style connection string.
func (p Postgres) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		p.Host, p.Port, p.User, p.Password, p.Database, p.SSLMode,
	)
}

// Redis holds connection settings for the pub/sub bus used to keep every
// replica's in-memory flag cache consistent.
type Redis struct {
	Host     string `env:"REDIS_HOST" envDefault:"localhost"`
	Port     int    `env:"REDIS_PORT" envDefault:"6379"`
	Password string `env:"REDIS_PASSWORD" envDefault:""`
	DB       int    `env:"REDIS_DB" envDefault:"0"`
	// Channel is the pub/sub channel used to broadcast flag change events.
	Channel string `env:"REDIS_CHANNEL" envDefault:"featureflag:changes"`
}

// Addr returns the host:port for the Redis client.
func (r Redis) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

// Load reads the .env file (if present) and parses environment variables into
// a Settings value. A missing .env file is not an error — in Kubernetes the
// configuration comes from real environment variables and ConfigMaps/Secrets.
func Load() (*Settings, error) {
	// Best-effort: load .env if it exists. Real env vars always win because
	// godotenv does not overwrite variables that are already set.
	_ = godotenv.Load()

	var s Settings
	if err := env.Parse(&s); err != nil {
		return nil, fmt.Errorf("settings: parse environment: %w", err)
	}

	if err := s.validate(); err != nil {
		return nil, err
	}
	return &s, nil
}

// IsProduction reports whether the app is running in a production environment.
func (s *Settings) IsProduction() bool {
	return s.App.Environment == "production"
}

func (s *Settings) validate() error {
	if s.Server.Port <= 0 || s.Server.Port > 65535 {
		return fmt.Errorf("settings: invalid SERVER_PORT %d", s.Server.Port)
	}
	if s.IsProduction() && (s.JWT.Secret == "" || s.JWT.Secret == devJWTSecret) {
		return fmt.Errorf("settings: JWT_SECRET must be set to a non-default value in production")
	}
	return nil
}
