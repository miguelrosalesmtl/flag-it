// Package auth handles password hashing and JWT issuance/verification.
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// ErrInvalidCredentials is returned for a failed login (unknown user, wrong
// password, or inactive account) — deliberately indistinguishable.
var ErrInvalidCredentials = errors.New("invalid credentials")

// ErrInvalidToken is returned when a token is missing, malformed, or expired.
var ErrInvalidToken = errors.New("invalid token")

// ErrSetupComplete is returned by Bootstrap when a superuser already exists, so
// first-run setup can never be replayed to self-promote.
var ErrSetupComplete = errors.New("setup already complete")

// Service issues and verifies auth tokens for users.
type Service struct {
	store  *store.Store
	secret []byte
	ttl    time.Duration
}

// New returns an auth Service.
func New(st *store.Store, secret string, ttl time.Duration) *Service {
	return &Service{store: st, secret: []byte(secret), ttl: ttl}
}

// HashPassword hashes a plaintext password with bcrypt.
func HashPassword(plain string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("auth: hash password: %w", err)
	}
	return string(h), nil
}

// CreateUser hashes the password and persists a new user. The handler never
// sees a hash — password handling stays inside this service.
func (s *Service) CreateUser(ctx context.Context, email, password, fullName string, isSuperuser bool) (models.User, error) {
	hash, err := HashPassword(password)
	if err != nil {
		return models.User{}, err
	}
	return s.store.CreateUser(ctx, email, hash, fullName, isSuperuser)
}

// ListUsers returns all users (superuser view).
func (s *Service) ListUsers(ctx context.Context) ([]models.User, error) {
	return s.store.ListUsers(ctx)
}

// GetUser looks a user up by id.
func (s *Service) GetUser(ctx context.Context, id string) (models.User, error) {
	return s.store.GetUserByID(ctx, id)
}

// UpdateUser applies the given optional changes (nil means leave unchanged),
// reading the current row first so a partial patch is well-defined.
func (s *Service) UpdateUser(ctx context.Context, id string, fullName *string, isActive *bool) (models.User, error) {
	current, err := s.store.GetUserByID(ctx, id)
	if err != nil {
		return models.User{}, err
	}
	name, active := current.FullName, current.IsActive
	if fullName != nil {
		name = *fullName
	}
	if isActive != nil {
		active = *isActive
	}
	return s.store.UpdateUser(ctx, id, name, active)
}

// DeleteUser removes a user.
func (s *Service) DeleteUser(ctx context.Context, id string) error {
	return s.store.DeleteUser(ctx, id)
}

// NeedsSetup reports whether the install still needs first-run setup (no
// superuser exists yet).
func (s *Service) NeedsSetup(ctx context.Context) (bool, error) {
	n, err := s.store.CountSuperusers(ctx)
	if err != nil {
		return false, err
	}
	return n == 0, nil
}

// BootstrapInput is the payload for first-run setup. Organization fields are optional
// but must be provided together.
type BootstrapInput struct {
	Email            string
	Password         string
	FullName         string
	OrganizationSlug string
	OrganizationName string
}

// BootstrapResult is the outcome of first-run setup: the created superuser, the
// optional first organization, and a token so the caller lands signed in.
type BootstrapResult struct {
	User         models.User
	Organization *models.Organization
	Token        string
}

// Bootstrap runs first-run setup: it creates the first superuser (and optional
// first organization) atomically, then issues a token. It returns ErrSetupComplete if
// a superuser already exists, so the flow can never be replayed.
func (s *Service) Bootstrap(ctx context.Context, in BootstrapInput) (BootstrapResult, error) {
	n, err := s.store.CountSuperusers(ctx)
	if err != nil {
		return BootstrapResult{}, err
	}
	if n > 0 {
		return BootstrapResult{}, ErrSetupComplete
	}
	hash, err := HashPassword(in.Password)
	if err != nil {
		return BootstrapResult{}, err
	}
	user, organization, err := s.store.Bootstrap(ctx, in.Email, hash, in.FullName, in.OrganizationSlug, in.OrganizationName)
	if err != nil {
		return BootstrapResult{}, err
	}
	token, err := s.issueToken(user.ID)
	if err != nil {
		return BootstrapResult{}, err
	}
	return BootstrapResult{User: user, Organization: organization, Token: token}, nil
}

// Login verifies credentials and, on success, returns a signed token and the user.
func (s *Service) Login(ctx context.Context, email, password string) (string, models.User, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return "", models.User{}, ErrInvalidCredentials
	}
	if err != nil {
		return "", models.User{}, err
	}
	if !user.IsActive || user.PasswordHash == "" {
		return "", models.User{}, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return "", models.User{}, ErrInvalidCredentials
	}

	token, err := s.issueToken(user.ID)
	if err != nil {
		return "", models.User{}, err
	}
	return token, user, nil
}

// IssueToken signs a token for an already-authenticated user id. Used by flows
// that establish identity by means other than password (e.g. first-run setup).
func (s *Service) IssueToken(userID string) (string, error) {
	return s.issueToken(userID)
}

// issueToken signs a short-lived HS256 token whose subject is the user id.
func (s *Service) issueToken(userID string) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(s.secret)
	if err != nil {
		return "", fmt.Errorf("auth: sign token: %w", err)
	}
	return signed, nil
}

// ParseToken verifies a token and returns the user id (subject).
func (s *Service) ParseToken(tokenStr string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	tok, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("auth: unexpected signing method %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil || !tok.Valid || claims.Subject == "" {
		return "", ErrInvalidToken
	}
	return claims.Subject, nil
}
