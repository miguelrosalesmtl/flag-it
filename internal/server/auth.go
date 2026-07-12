package server

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/auth"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type ctxKey int

const userIDKey ctxKey = iota

// tokenVerifier turns a bearer token into a user id. Our JWT auth.Service
// implements it; this is the OIDC seam — an external verifier can be dropped in
// without changing the middleware or authz.
type tokenVerifier interface {
	ParseToken(token string) (userID string, err error)
}

// authMiddleware verifies the Bearer token for operations that declare the
// bearerAuth security scheme, storing the user id on the context. Operations
// without bearerAuth (login, eval, health) pass through.
func (s *Server) authMiddleware(ctx huma.Context, next func(huma.Context)) {
	if !requiresBearer(ctx.Operation()) {
		next(ctx)
		return
	}
	token, ok := strings.CutPrefix(ctx.Header("Authorization"), "Bearer ")
	if !ok || token == "" {
		_ = huma.WriteErr(s.api, ctx, http.StatusUnauthorized, "missing bearer token")
		return
	}
	userID, err := s.verifier.ParseToken(token)
	if err != nil {
		_ = huma.WriteErr(s.api, ctx, http.StatusUnauthorized, "invalid or expired token")
		return
	}
	next(huma.WithValue(ctx, userIDKey, userID))
}

func requiresBearer(op *huma.Operation) bool {
	for _, req := range op.Security {
		if _, ok := req["bearerAuth"]; ok {
			return true
		}
	}
	return false
}

// bearer is the security requirement for authenticated operations.
var bearer = []map[string][]string{{"bearerAuth": {}}}

// userID reads the authenticated user id from the context.
func userID(ctx context.Context) string {
	id, _ := ctx.Value(userIDKey).(string)
	return id
}

// authorize builds the caller's Subject and checks a permission, returning a
// huma error (403) when not allowed and nil when allowed.
func (s *Server) authorize(ctx context.Context, perm models.Permission, res models.Resource) error {
	subject, err := s.authz.Subject(ctx, userID(ctx))
	if err != nil {
		return huma.Error500InternalServerError("authorization failed")
	}
	if !subject.Can(perm, res) {
		return huma.Error403Forbidden("forbidden")
	}
	return nil
}

// requireSuperuser gates platform-level actions.
func (s *Server) requireSuperuser(ctx context.Context) error {
	subject, err := s.authz.Subject(ctx, userID(ctx))
	if err != nil {
		return huma.Error500InternalServerError("authorization failed")
	}
	if !subject.IsSuperuser {
		return huma.Error403Forbidden("superuser required")
	}
	return nil
}

// --- Auth operations ---

type loginInput struct {
	Body struct {
		Email    string `json:"email" format:"email"`
		Password string `json:"password"`
	}
}

type loginOutput struct {
	Body struct {
		Token string      `json:"token"`
		User  models.User `json:"user"`
	}
}

type userOutput struct {
	Body models.User
}

func (s *Server) registerAuth() {
	huma.Register(s.api, huma.Operation{
		OperationID: "login", Method: http.MethodPost, Path: "/api/v1/auth/login",
		Summary: "Exchange credentials for a JWT", Tags: []string{"Auth"},
	}, func(ctx context.Context, in *loginInput) (*loginOutput, error) {
		token, user, err := s.auth.Login(ctx, in.Body.Email, in.Body.Password)
		if errors.Is(err, auth.ErrInvalidCredentials) {
			return nil, huma.Error401Unauthorized("invalid credentials")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &loginOutput{}
		out.Body.Token = token
		out.Body.User = user
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "me", Method: http.MethodGet, Path: "/api/v1/me",
		Summary: "Current authenticated user", Tags: []string{"Auth"}, Security: bearer,
	}, func(ctx context.Context, _ *struct{}) (*userOutput, error) {
		user, err := s.auth.GetUser(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		return &userOutput{Body: user}, nil
	})
}
