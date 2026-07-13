// Package catalog is the service for the org-structure hierarchy: tenants,
// projects, environments, and SDK keys. Handlers call this; only this package
// (through the store) touches their persistence.
package catalog

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// ErrInvalidSDKKeyKind is returned when an SDK key kind is neither server nor client.
var ErrInvalidSDKKeyKind = errors.New("catalog: sdk key kind must be 'server' or 'client'")

// Service owns tenant/project/environment/sdk-key operations, including the
// SDK-key lookup cache used on the evaluation hot path.
type Service struct {
	store    *store.Store
	sdkCache *sdkKeyCache
}

// New returns a catalog Service backed by the store. sdkKeyCacheTTL caches
// SDK-key → record lookups (0 disables); revokes flush it locally.
func New(st *store.Store, sdkKeyCacheTTL time.Duration) *Service {
	return &Service{store: st, sdkCache: newSDKKeyCache(sdkKeyCacheTTL)}
}

// Ping checks backing-store connectivity (readiness probe).
func (s *Service) Ping(ctx context.Context) error {
	return s.store.Ping(ctx)
}

// --- Tenants ---

func (s *Service) CreateTenant(ctx context.Context, slug, name string) (models.Tenant, error) {
	return s.store.CreateTenant(ctx, slug, name)
}

func (s *Service) ListTenants(ctx context.Context) ([]models.Tenant, error) {
	return s.store.ListTenants(ctx)
}

func (s *Service) TenantBySlug(ctx context.Context, slug string) (models.Tenant, error) {
	return s.store.GetTenantBySlug(ctx, slug)
}

func (s *Service) UpdateTenant(ctx context.Context, id, name string) (models.Tenant, error) {
	return s.store.UpdateTenant(ctx, id, name)
}

func (s *Service) DeleteTenant(ctx context.Context, id string) error {
	return s.store.DeleteTenant(ctx, id)
}

// --- Projects ---

func (s *Service) CreateProject(ctx context.Context, tenantID, key, name string) (models.Project, []models.Environment, error) {
	return s.store.CreateProject(ctx, tenantID, key, name)
}

func (s *Service) ProjectByKey(ctx context.Context, tenantID, key string) (models.Project, error) {
	return s.store.GetProjectByKey(ctx, tenantID, key)
}

// ProjectByID looks a project up by id.
func (s *Service) ProjectByID(ctx context.Context, id string) (models.Project, error) {
	return s.store.GetProjectByID(ctx, id)
}

func (s *Service) UpdateProject(ctx context.Context, id, name string) (models.Project, error) {
	return s.store.UpdateProject(ctx, id, name)
}

func (s *Service) DeleteProject(ctx context.Context, id string) error {
	return s.store.DeleteProject(ctx, id)
}

// ListReadableProjects lists a tenant's projects and filters them to those the
// subject may read. tenantWide is true when a tenant-level grant (or superuser)
// makes an empty result legitimate rather than a permission failure.
func (s *Service) ListReadableProjects(ctx context.Context, subject models.Subject, tenantID string) (visible []models.Project, tenantWide bool, err error) {
	projects, err := s.store.ListProjectsByTenant(ctx, tenantID)
	if err != nil {
		return nil, false, err
	}
	visible, tenantWide = subject.ReadableProjects(tenantID, projects)
	return visible, tenantWide, nil
}

// --- Environments ---

func (s *Service) ListEnvironments(ctx context.Context, projectID, search string) ([]models.Environment, error) {
	return s.store.ListEnvironmentsByProject(ctx, projectID, search)
}

func (s *Service) CreateEnvironment(ctx context.Context, projectID, key, name string) (models.Environment, error) {
	return s.store.CreateEnvironment(ctx, projectID, key, name)
}

func (s *Service) EnvByKey(ctx context.Context, projectID, key string) (models.Environment, error) {
	return s.store.GetEnvironmentByKey(ctx, projectID, key)
}

// --- SDK keys ---

// CreateSdkKey mints a random key of the given kind and persists it. The secret
// key value is generated here, in the service, not in the handler.
func (s *Service) CreateSdkKey(ctx context.Context, environmentID, kind, name string) (models.SdkKey, error) {
	if kind != "server" && kind != "client" {
		return models.SdkKey{}, ErrInvalidSDKKeyKind
	}
	key, err := generateSDKKey(kind)
	if err != nil {
		return models.SdkKey{}, err
	}
	return s.store.CreateSdkKey(ctx, environmentID, key, kind, name)
}

func (s *Service) ListSdkKeys(ctx context.Context, environmentID string) ([]models.SdkKey, error) {
	return s.store.ListSdkKeysByEnvironment(ctx, environmentID)
}

func (s *Service) RevokeSdkKey(ctx context.Context, id, environmentID string) error {
	if err := s.store.RevokeSdkKey(ctx, id, environmentID); err != nil {
		return err
	}
	s.sdkCache.flush() // drop cached lookups so the revoke takes effect now
	return nil
}

// ActiveSdkKey resolves a raw key string to its active record, served from a TTL
// cache (positive and negative) to keep the evaluation hot path off Postgres.
func (s *Service) ActiveSdkKey(ctx context.Context, key string) (models.SdkKey, error) {
	if sk, found, hit := s.sdkCache.get(key); hit {
		if !found {
			return models.SdkKey{}, store.ErrNotFound
		}
		return sk, nil
	}
	sk, err := s.store.GetActiveSdkKey(ctx, key)
	if errors.Is(err, store.ErrNotFound) {
		s.sdkCache.put(key, models.SdkKey{}, false) // negative cache
		return models.SdkKey{}, store.ErrNotFound
	}
	if err != nil {
		return models.SdkKey{}, err
	}
	s.sdkCache.put(key, sk, true)
	return sk, nil
}

// generateSDKKey mints a random bearer key. Server keys are secret; client keys
// are public (client-side ID) and get a distinct prefix.
func generateSDKKey(kind string) (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	prefix := "sdk-"
	if kind == "client" {
		prefix = "client-"
	}
	return prefix + hex.EncodeToString(b), nil
}
