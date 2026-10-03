package auth

import (
	"testing"
	"time"

	"github.com/eventflow/rsvp-core/internal/domain"
)

func TestTokenRoundTrip(t *testing.T) {
	s := NewSigner("test-secret")
	user := &domain.User{ID: "u1", Email: "a@b.com", Name: "A", Role: domain.RoleOrganizer}

	tok, err := s.Issue(user)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}

	claims, err := s.Verify(tok)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.UserID != user.ID || claims.Role != domain.RoleOrganizer {
		t.Fatalf("claims mismatch: %+v", claims)
	}
}

func TestTokenRejectsTamperedPayload(t *testing.T) {
	s := NewSigner("test-secret")
	user := &domain.User{ID: "u1", Email: "a@b.com", Name: "A", Role: domain.RoleAttendee}
	tok, _ := s.Issue(user)

	// Flip the role by re-signing with a different secret (simulates a forged cookie).
	forged, _ := NewSigner("attacker-secret").Issue(&domain.User{ID: "u1", Role: domain.RoleAdmin})
	if _, err := s.Verify(forged); err != ErrInvalidToken {
		t.Fatalf("expected forged token to be rejected, got err=%v", err)
	}

	// A token signed by a different secret must never verify against this signer.
	if _, err := NewSigner("other-secret").Verify(tok); err != ErrInvalidToken {
		t.Fatalf("expected cross-secret verify to fail, got err=%v", err)
	}
}

func TestTokenRejectsExpired(t *testing.T) {
	old := TokenTTL
	TokenTTL = -1 * time.Hour
	defer func() { TokenTTL = old }()

	s := NewSigner("test-secret")
	tok, _ := s.Issue(&domain.User{ID: "u1", Role: domain.RoleAttendee})
	if _, err := s.Verify(tok); err != ErrInvalidToken {
		t.Fatalf("expected expired token to be rejected, got err=%v", err)
	}
}

func TestPasswordHashing(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !CheckPassword(hash, "correct horse battery staple") {
		t.Fatal("expected matching password to verify")
	}
	if CheckPassword(hash, "wrong password") {
		t.Fatal("expected wrong password to fail verification")
	}
}
