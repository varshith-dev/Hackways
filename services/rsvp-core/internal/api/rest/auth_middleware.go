package rest

import (
	"context"
	"net/http"
	"strings"

	"github.com/eventflow/rsvp-core/internal/auth"
	"github.com/eventflow/rsvp-core/internal/domain"
)

type contextKey string

const claimsContextKey contextKey = "claims"

// bearerToken pulls the session token from the Authorization header (server-to-server
// calls from the Next.js proxy) or, failing that, a same-origin cookie (direct browser/dev use).
func bearerToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	if c, err := r.Cookie("hackways_session"); err == nil {
		return c.Value
	}
	return ""
}

// requireAuth verifies the session token and attaches its claims to the request context.
func (h *Handler) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			h.writeError(w, http.StatusUnauthorized, "Authentication required", nil)
			return
		}
		claims, err := h.authSigner.Verify(token)
		if err != nil {
			h.writeError(w, http.StatusUnauthorized, "Invalid or expired session", err)
			return
		}
		ctx := context.WithValue(r.Context(), claimsContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// requireRole builds on requireAuth and additionally rejects callers whose role
// is not in the allowed set, so e.g. attendees can't call organizer-only endpoints.
func (h *Handler) requireRole(roles ...domain.UserRole) func(http.HandlerFunc) http.HandlerFunc {
	allowed := make(map[domain.UserRole]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.HandlerFunc) http.HandlerFunc {
		return h.requireAuth(func(w http.ResponseWriter, r *http.Request) {
			claims, _ := claimsFromContext(r.Context())
			if claims == nil || !allowed[claims.Role] {
				h.writeError(w, http.StatusForbidden, "You don't have permission to do that", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func claimsFromContext(ctx context.Context) (*auth.Claims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*auth.Claims)
	return claims, ok
}

// optionalClaims verifies the session token if one is present but, unlike
// requireAuth, never rejects the request for a missing/invalid one — for
// endpoints (like reading or cancelling an RSVP) that anonymous attendees who
// registered without an account must still be able to reach via other proof.
func (h *Handler) optionalClaims(r *http.Request) *auth.Claims {
	token := bearerToken(r)
	if token == "" {
		return nil
	}
	claims, err := h.authSigner.Verify(token)
	if err != nil {
		return nil
	}
	return claims
}
