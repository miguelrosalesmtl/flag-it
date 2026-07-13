// Package server wires the HTTP API using huma: typed operations that generate
// the OpenAPI spec and validate requests. Routes are registered per domain.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/miguelrosalesmtl/flag-it/internal/analytics"
	"github.com/miguelrosalesmtl/flag-it/internal/audit"
	"github.com/miguelrosalesmtl/flag-it/internal/auth"
	"github.com/miguelrosalesmtl/flag-it/internal/authz"
	"github.com/miguelrosalesmtl/flag-it/internal/catalog"
	"github.com/miguelrosalesmtl/flag-it/internal/contexts"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/governance"
	"github.com/miguelrosalesmtl/flag-it/internal/pubsub"
	"github.com/miguelrosalesmtl/flag-it/internal/settings"
)

// Server holds the HTTP server, the huma API, and dependencies.
type Server struct {
	http       *http.Server
	api        huma.API
	flags      *flags.Service
	catalog    *catalog.Service
	auditSvc   *audit.Service
	auth       *auth.Service // issues tokens (login)
	verifier   tokenVerifier // verifies tokens (OIDC seam; defaults to auth)
	authz      *authz.Service
	governance *governance.Service
	analytics  *analytics.Recorder
	contexts   *contexts.Recorder
	bus        *pubsub.Bus
	log        *slog.Logger
	config     settings.Server
	sdkCache   *sdkKeyCache
}

// New builds a Server with all routes registered on a huma API over chi. It is
// given services, never the store: handlers reach data only through a service.
func New(
	cfg settings.Server,
	flagService *flags.Service,
	catalogSvc *catalog.Service,
	auditSvc *audit.Service,
	authSvc *auth.Service,
	authzSvc *authz.Service,
	governanceSvc *governance.Service,
	analyticsRec *analytics.Recorder,
	contextsRec *contexts.Recorder,
	bus *pubsub.Bus,
	log *slog.Logger,
) *Server {
	s := &Server{
		flags:      flagService,
		catalog:    catalogSvc,
		auditSvc:   auditSvc,
		auth:       authSvc,
		verifier:   authSvc,
		authz:      authzSvc,
		governance: governanceSvc,
		analytics:  analyticsRec,
		contexts:   contextsRec,
		bus:        bus,
		log:        log,
		config:     cfg,
		sdkCache:   newSDKKeyCache(cfg.SDKKeyCacheTTL),
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(requestLogger(log))
	// CORS for the browser UI. Handles preflight; auth is via header (no cookies).
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-SDK-Key"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	config := huma.DefaultConfig("Feature-Flag Platform API", "0.1.0")
	config.Info.Description = "Multi-tenant feature-flag service (LaunchDarkly-style, server-side evaluation)."
	config.Servers = []*huma.Server{{URL: "http://localhost:" + strconv.Itoa(cfg.Port)}}
	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearerAuth": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
		"sdkKeyAuth": {Type: "apiKey", In: "header", Name: "X-SDK-Key"},
	}
	api := humachi.New(r, config)
	api.UseMiddleware(s.authMiddleware)
	s.api = api

	// SSE stream is a raw handler (not a typed huma op); see stream.go.
	r.Get("/api/v1/eval/stream", s.handleEvalStream)

	s.registerHealth()
	s.registerSetup()
	s.registerAuth()
	s.registerUsers()
	s.registerTenants()
	s.registerRoles()
	s.registerProjects()
	s.registerSDKKeys()
	s.registerSegments()
	s.registerFlags()
	s.registerChanges()
	s.registerAudit()
	s.registerEval()
	s.registerAnalytics()
	s.registerContexts()

	s.http = &http.Server{
		Addr:         cfg.Addr(),
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}
	return s
}

// OpenAPIYAML returns the generated OpenAPI document (for `server openapi`).
func (s *Server) OpenAPIYAML() ([]byte, error) {
	return s.api.OpenAPI().YAML()
}

// Start begins serving HTTP. It blocks until the server stops.
func (s *Server) Start() error {
	s.log.Info("http server listening", slog.String("addr", s.config.Addr()),
		slog.String("docs", "/docs"), slog.String("openapi", "/openapi.yaml"))
	if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

// Shutdown gracefully drains in-flight requests.
func (s *Server) Shutdown(ctx context.Context) error {
	s.log.Info("http server shutting down")
	return s.http.Shutdown(ctx)
}

// --- Health (public) ---

type healthOutput struct {
	Body struct {
		Status string `json:"status"`
	}
}

func (s *Server) registerHealth() {
	huma.Register(s.api, huma.Operation{
		OperationID: "healthz", Method: http.MethodGet, Path: "/healthz",
		Summary: "Liveness probe", Tags: []string{"Health"},
	}, func(ctx context.Context, _ *struct{}) (*healthOutput, error) {
		out := &healthOutput{}
		out.Body.Status = "ok"
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "readyz", Method: http.MethodGet, Path: "/readyz",
		Summary: "Readiness probe (pings Postgres + Redis)", Tags: []string{"Health"},
	}, func(ctx context.Context, _ *struct{}) (*healthOutput, error) {
		if err := s.catalog.Ping(ctx); err != nil {
			return nil, huma.Error503ServiceUnavailable("postgres unavailable")
		}
		if err := s.bus.Ping(ctx); err != nil {
			return nil, huma.Error503ServiceUnavailable("redis unavailable")
		}
		out := &healthOutput{}
		out.Body.Status = "ready"
		return out, nil
	})
}
