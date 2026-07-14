// Package authz turns a user id into an authorization Subject by loading their
// role assignments (as permission grants) and answers permission checks.
package authz

import (
	"context"
	"fmt"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// Service resolves and evaluates permissions.
type Service struct {
	store *store.Store
}

// New returns an authz Service backed by the store.
func New(st *store.Store) *Service {
	return &Service{store: st}
}

// Subject builds the authorization profile for a user: superuser status plus the
// permissions they hold at each organization and project scope. Call once per request
// and reuse for many checks.
func (s *Service) Subject(ctx context.Context, userID string) (models.Subject, error) {
	user, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return models.Subject{}, fmt.Errorf("authz: load user: %w", err)
	}

	subject := models.Subject{
		UserID:            user.ID,
		IsSuperuser:       user.IsSuperuser,
		OrganizationPerms: map[string]map[models.Permission]bool{},
		ProjectPerms:      map[string]map[models.Permission]bool{},
	}

	grants, err := s.store.ListPermissionGrantsByUser(ctx, userID)
	if err != nil {
		return models.Subject{}, fmt.Errorf("authz: load grants: %w", err)
	}
	for _, g := range grants {
		switch g.ScopeType {
		case models.ScopeOrganization:
			addPerm(subject.OrganizationPerms, g.OrganizationID, g.Permission)
		case models.ScopeProject:
			addPerm(subject.ProjectPerms, g.ProjectID, g.Permission)
		}
	}
	return subject, nil
}

// Can is a convenience that builds the subject and evaluates a single check.
// Prefer building a Subject once when performing several checks in a request.
func (s *Service) Can(ctx context.Context, userID string, perm models.Permission, res models.Resource) (bool, error) {
	subject, err := s.Subject(ctx, userID)
	if err != nil {
		return false, err
	}
	return subject.Can(perm, res), nil
}

func addPerm(m map[string]map[models.Permission]bool, scopeID string, perm models.Permission) {
	if scopeID == "" {
		return
	}
	set := m[scopeID]
	if set == nil {
		set = map[models.Permission]bool{}
		m[scopeID] = set
	}
	set[perm] = true
}
