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
