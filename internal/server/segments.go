package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Segments reuse the flag read/write permissions (project-level targeting config).

type listSegmentsInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Search           string `query:"search" doc:"filter by segment name, key, or description"`
}

type listSegmentsOutput struct {
	Body struct {
		Segments []models.Segment `json:"segments"`
	}
}

type saveSegmentInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	SegKey           string `path:"segKey"`
	Body             struct {
		Name             string                 `json:"name,omitempty"`
		Description      string                 `json:"description,omitempty"`
		Included         []string               `json:"included,omitempty"`
		Excluded         []string               `json:"excluded,omitempty"`
		IncludedContexts []models.SegmentTarget `json:"included_contexts,omitempty"`
		ExcludedContexts []models.SegmentTarget `json:"excluded_contexts,omitempty"`
		Rules            []models.SegmentRule   `json:"rules,omitempty"`
	}
}

type segmentOutput struct {
	Body models.Segment
}

type segmentPath struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	SegKey           string `path:"segKey"`
}

func (s *Server) registerSegments() {
	base := "/api/v1/organizations/{organizationSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "list-segments", Method: http.MethodGet, Path: base + "/segments",
		Summary: "List a project's segments (requires flag.read)", Tags: []string{"Segments"}, Security: bearer,
	}, func(ctx context.Context, in *listSegmentsInput) (*listSegmentsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		segs, err := s.flags.ListSegments(ctx, project.ID, in.Search)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listSegmentsOutput{}
		out.Body.Segments = segs
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-segment", Method: http.MethodGet, Path: base + "/segments/{segKey}",
		Summary: "Get a segment (requires flag.read)", Tags: []string{"Segments"}, Security: bearer,
	}, func(ctx context.Context, in *segmentPath) (*segmentOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		seg, err := s.flags.GetSegment(ctx, project.ID, in.SegKey)
		if err != nil {
			return nil, storeError(err, "segment not found")
		}
		return &segmentOutput{Body: seg}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "save-segment", Method: http.MethodPut, Path: base + "/segments/{segKey}",
		Summary: "Create or update a segment (requires flag.write)", Tags: []string{"Segments"}, Security: bearer,
	}, func(ctx context.Context, in *saveSegmentInput) (*segmentOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		saved, err := s.flags.SaveSegment(ctx, models.Segment{
			ProjectID:        project.ID,
			Key:              in.SegKey,
			Name:             in.Body.Name,
			Description:      in.Body.Description,
			Included:         in.Body.Included,
			Excluded:         in.Body.Excluded,
			IncludedContexts: in.Body.IncludedContexts,
			ExcludedContexts: in.Body.ExcludedContexts,
			Rules:            in.Body.Rules,
		})
		if err != nil {
			return nil, flagError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "segment.saved", ResourceType: "segment", ResourceKey: in.SegKey})
		return &segmentOutput{Body: saved}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-segment", Method: http.MethodDelete, Path: base + "/segments/{segKey}",
		Summary: "Delete a segment (requires flag.write)", Tags: []string{"Segments"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *segmentPath) (*noContent, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if err := s.flags.DeleteSegment(ctx, project.ID, in.SegKey); err != nil {
			return nil, storeError(err, "segment not found")
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "segment.deleted", ResourceType: "segment", ResourceKey: in.SegKey})
		return &noContent{}, nil
	})
}
