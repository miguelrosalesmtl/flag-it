package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/auth"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type listUsersOutput struct {
	Body struct {
		Users []models.User `json:"users"`
	}
}

type createUserInput struct {
	Body struct {
		Email       string `json:"email" format:"email"`
		Password    string `json:"password"`
		FullName    string `json:"full_name,omitempty"`
		IsSuperuser bool   `json:"is_superuser,omitempty"`
	}
}

type userIDPath struct {
	UserID string `path:"userID"`
}

type updateUserInput struct {
	UserID string `path:"userID"`
	Body   struct {
		FullName *string `json:"full_name,omitempty"`
		IsActive *bool   `json:"is_active,omitempty"`
	}
}

func (s *Server) registerUsers() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-users", Method: http.MethodGet, Path: "/api/v1/users",
		Summary: "List users (superuser only)", Tags: []string{"Users"}, Security: bearer,
	}, func(ctx context.Context, _ *struct{}) (*listUsersOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		users, err := s.store.ListUsers(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listUsersOutput{}
		out.Body.Users = users
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-user", Method: http.MethodPost, Path: "/api/v1/users",
		Summary: "Create a user (superuser only)", Tags: []string{"Users"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createUserInput) (*userOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		if in.Body.Email == "" || in.Body.Password == "" {
			return nil, huma.Error400BadRequest("email and password are required")
		}
		hash, err := auth.HashPassword(in.Body.Password)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		user, err := s.store.CreateUser(ctx, in.Body.Email, hash, in.Body.FullName, in.Body.IsSuperuser)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{Action: "user.created", ResourceType: "user", ResourceKey: user.Email,
			Data: jsonData(map[string]any{"is_superuser": in.Body.IsSuperuser})})
		return &userOutput{Body: user}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "update-user", Method: http.MethodPatch, Path: "/api/v1/users/{userID}",
		Summary: "Update a user (superuser only)", Tags: []string{"Users"}, Security: bearer,
	}, func(ctx context.Context, in *updateUserInput) (*userOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		current, err := s.store.GetUserByID(ctx, in.UserID)
		if err != nil {
			return nil, storeError(err, "user not found")
		}
		fullName, active := current.FullName, current.IsActive
		if in.Body.FullName != nil {
			fullName = *in.Body.FullName
		}
		if in.Body.IsActive != nil {
			active = *in.Body.IsActive
		}
		user, err := s.store.UpdateUser(ctx, in.UserID, fullName, active)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		return &userOutput{Body: user}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-user", Method: http.MethodDelete, Path: "/api/v1/users/{userID}",
		Summary: "Delete a user (superuser only)", Tags: []string{"Users"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *userIDPath) (*noContent, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		if err := s.store.DeleteUser(ctx, in.UserID); err != nil {
			return nil, storeError(err, "user not found")
		}
		s.audit(ctx, models.AuditEntry{Action: "user.deleted", ResourceType: "user", ResourceKey: in.UserID})
		return &noContent{}, nil
	})
}
