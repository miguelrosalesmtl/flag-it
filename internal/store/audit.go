package store

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const auditColumns = `id, tenant_id, project_id, actor_id, actor_email, action, resource_type, resource_key, comment, data, created_at`

// CreateAuditEntry appends an audit record.
func (s *Store) CreateAuditEntry(ctx context.Context, e models.AuditEntry) error {
	data := e.Data
	if len(data) == 0 {
		data = []byte("{}")
	}
	const q = `
		INSERT INTO audit_log (tenant_id, project_id, actor_id, actor_email, action, resource_type, resource_key, comment, data)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := s.pool.Exec(ctx, q,
		nullIfEmpty(e.TenantID), nullIfEmpty(e.ProjectID), nullIfEmpty(e.ActorID),
		e.ActorEmail, e.Action, e.ResourceType, e.ResourceKey, e.Comment, data)
	if err != nil {
		return fmt.Errorf("store: create audit entry: %w", err)
	}
	return nil
}

// AuditFilter narrows an audit query within a tenant.
type AuditFilter struct {
	ProjectID    string
	ResourceType string
	ResourceKey  string
	Before       string // id cursor: return entries older than this id
	Limit        int
}

// ListAuditEntries returns a tenant's audit entries, newest first (uuidv7 ids
// sort by time), filtered and paginated.
func (s *Store) ListAuditEntries(ctx context.Context, tenantID string, f AuditFilter) ([]models.AuditEntry, error) {
	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	add := func(expr string, val any) {
		args = append(args, val)
		conds = append(conds, fmt.Sprintf(expr, len(args)))
	}
	if f.ProjectID != "" {
		add("project_id = $%d", f.ProjectID)
	}
	if f.ResourceType != "" {
		add("resource_type = $%d", f.ResourceType)
	}
	if f.ResourceKey != "" {
		add("resource_key = $%d", f.ResourceKey)
	}
	if f.Before != "" {
		add("id < $%d", f.Before)
	}
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	q := `SELECT ` + auditColumns + ` FROM audit_log WHERE ` +
		strings.Join(conds, " AND ") + ` ORDER BY id DESC LIMIT ` + strconv.Itoa(limit)

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: list audit: %w", err)
	}
	defer rows.Close()

	out := make([]models.AuditEntry, 0)
	for rows.Next() {
		e, err := scanAuditEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func scanAuditEntry(row pgx.Row) (models.AuditEntry, error) {
	var (
		e             models.AuditEntry
		tid, pid, aid *string
		data          []byte
	)
	if err := row.Scan(&e.ID, &tid, &pid, &aid, &e.ActorEmail, &e.Action,
		&e.ResourceType, &e.ResourceKey, &e.Comment, &data, &e.CreatedAt); err != nil {
		return models.AuditEntry{}, err
	}
	e.TenantID = deref(tid)
	e.ProjectID = deref(pid)
	e.ActorID = deref(aid)
	e.Data = data
	return e, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
