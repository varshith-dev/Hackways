package rest

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/eventflow/rsvp-core/internal/auth"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/google/uuid"
)

func (h *Handler) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		h.writeError(w, http.StatusBadRequest, "A valid email is required", nil)
		return
	}
	if len(req.Password) < 8 {
		h.writeError(w, http.StatusBadRequest, "Password must be at least 8 characters", nil)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	// Self-signup may only grant attendee or organizer; admin must be provisioned separately —
	// except for the seed admin allowlist in config, which always lands as admin.
	role := domain.RoleAttendee
	if req.Role == string(domain.RoleOrganizer) {
		role = domain.RoleOrganizer
	}
	if h.isSeedAdmin(email) {
		role = domain.RoleAdmin
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to secure password", err)
		return
	}

	user := &domain.User{
		ID:           uuid.NewString(),
		Email:        email,
		Name:         name,
		PasswordHash: hash,
		Role:         role,
		CreatedAt:    time.Now().UTC(),
	}

	if err := h.repo.CreateUser(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrEmailTaken) {
			h.writeError(w, http.StatusConflict, "An account with this email already exists", err)
			return
		}
		h.writeError(w, http.StatusInternalServerError, "Failed to create account", err)
		return
	}

	token, err := h.authSigner.Issue(user)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start session", err)
		return
	}

	h.writeJSON(w, http.StatusCreated, map[string]interface{}{"user": user, "token": token})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), strings.TrimSpace(req.Email))
	if err != nil || !auth.CheckPassword(user.PasswordHash, req.Password) {
		// Same message whether the email is unknown or the password is wrong,
		// so the response never reveals which accounts exist.
		h.writeError(w, http.StatusUnauthorized, "Invalid email or password", domain.ErrInvalidCredentials)
		return
	}

	// Self-heals an existing account into admin if its email is on the seed allowlist,
	// so promoting someone doesn't require deleting and recreating their account.
	if h.isSeedAdmin(user.Email) {
		user.Role = domain.RoleAdmin
	}

	token, err := h.authSigner.Issue(user)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start session", err)
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{"user": user, "token": token})
}

// oauthPasswordSentinel is stored as the password_hash for Google-only
// accounts. It is not a valid bcrypt hash, so auth.CheckPassword always
// returns false against it — those accounts can only ever sign in via Google.
const oauthPasswordSentinel = "!oauth:google"

// handleOAuthGoogle is called server-side by the Next.js callback route, never
// directly by a browser — it's only reachable on the loopback interface, and
// the email/name/google_id it receives have already been verified against
// Google's token endpoint upstream. Finds the account by Google ID, falls
// back to linking an existing password account by email, or creates a new
// Google-only account.
func (h *Handler) handleOAuthGoogle(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		GoogleID string `json:"google_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	googleID := strings.TrimSpace(req.GoogleID)
	if email == "" || googleID == "" {
		h.writeError(w, http.StatusBadRequest, "Email and google_id are required", nil)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	user, err := h.repo.GetUserByGoogleID(r.Context(), googleID)
	if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
		h.writeError(w, http.StatusInternalServerError, "Failed to look up account", err)
		return
	}

	if user == nil {
		if existing, err := h.repo.GetUserByEmail(r.Context(), email); err == nil {
			// A password account already owns this email — link Google to it
			// rather than creating a second, colliding account.
			if err := h.repo.LinkGoogleID(r.Context(), existing.ID, googleID); err != nil {
				h.writeError(w, http.StatusInternalServerError, "Failed to link Google account", err)
				return
			}
			existing.GoogleID = &googleID
			user = existing
		} else if !errors.Is(err, domain.ErrUserNotFound) {
			h.writeError(w, http.StatusInternalServerError, "Failed to look up account", err)
			return
		}
	}

	if user == nil {
		role := domain.RoleAttendee
		if h.isSeedAdmin(email) {
			role = domain.RoleAdmin
		}
		newUser := &domain.User{
			ID:           uuid.NewString(),
			Email:        email,
			Name:         name,
			PasswordHash: oauthPasswordSentinel,
			GoogleID:     &googleID,
			Role:         role,
			CreatedAt:    time.Now().UTC(),
		}
		if err := h.repo.CreateUser(r.Context(), newUser); err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to create account", err)
			return
		}
		user = newUser
	}

	if h.isSeedAdmin(user.Email) {
		user.Role = domain.RoleAdmin
	}

	token, err := h.authSigner.Issue(user)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start session", err)
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{"user": user, "token": token})
}

func (h *Handler) isSeedAdmin(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	for _, admin := range h.cfg.AdminEmails {
		if admin == email {
			return true
		}
	}
	return false
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromContext(r.Context())
	user, err := h.repo.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Account no longer exists", err)
		return
	}
	h.writeJSON(w, http.StatusOK, map[string]interface{}{"user": user})
}

func (h *Handler) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromContext(r.Context())

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		h.writeError(w, http.StatusBadRequest, "Name cannot be empty", nil)
		return
	}
	if len(name) > 255 {
		h.writeError(w, http.StatusBadRequest, "Name is too long", nil)
		return
	}

	if err := h.repo.UpdateUserName(r.Context(), claims.UserID, name); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update account", err)
		return
	}

	user, err := h.repo.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Account no longer exists", err)
		return
	}
	h.writeJSON(w, http.StatusOK, map[string]interface{}{"user": user})
}
