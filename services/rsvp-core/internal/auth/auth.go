// Package auth issues and verifies signed session tokens and hashes passwords.
// Tokens are HMAC-SHA256 signed JSON, avoiding a JWT dependency for a single-service session.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/eventflow/rsvp-core/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidToken = errors.New("invalid or expired session token")

// TokenTTL is a var (not const) so tests can shrink it to exercise expiry.
var TokenTTL = 7 * 24 * time.Hour

type Claims struct {
	UserID string          `json:"sub"`
	Email  string          `json:"email"`
	Name   string          `json:"name"`
	Role   domain.UserRole `json:"role"`
	Exp    int64           `json:"exp"`
}

type Signer struct {
	secret []byte
}

func NewSigner(secret string) *Signer {
	return &Signer{secret: []byte(secret)}
}

func (s *Signer) Issue(user *domain.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Role:   user.Role,
		Exp:    time.Now().Add(TokenTTL).Unix(),
	}
	body, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(body)
	return payload + "." + s.sign(payload), nil
}

func (s *Signer) sign(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// Verify checks the signature and expiry, returning the embedded claims only if both hold.
func (s *Signer) Verify(token string) (*Claims, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, ErrInvalidToken
	}
	if !hmac.Equal([]byte(s.sign(parts[0])), []byte(parts[1])) {
		return nil, ErrInvalidToken
	}
	body, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(body, &claims); err != nil {
		return nil, ErrInvalidToken
	}
	if time.Now().Unix() > claims.Exp {
		return nil, ErrInvalidToken
	}
	return &claims, nil
}

func HashPassword(plaintext string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, plaintext string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)) == nil
}
