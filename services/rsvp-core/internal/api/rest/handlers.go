package rest

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/eventflow/rsvp-core/internal/auth"
	"github.com/eventflow/rsvp-core/internal/cache"
	"github.com/eventflow/rsvp-core/internal/config"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/eventflow/rsvp-core/internal/repository"
	"github.com/eventflow/rsvp-core/internal/service"
)

type Handler struct {
	cfg         *config.Config
	rsvpService *service.RSVPService
	repo        repository.Repository
	cache       cache.CacheService
	sseHub      *SSEHub
	authSigner  *auth.Signer
}

func NewHandler(
	cfg *config.Config,
	rsvpService *service.RSVPService,
	repo repository.Repository,
	cache cache.CacheService,
	sseHub *SSEHub,
	authSigner *auth.Signer,
) *Handler {
	return &Handler{
		cfg:         cfg,
		rsvpService: rsvpService,
		repo:        repo,
		cache:       cache,
		sseHub:      sseHub,
		authSigner:  authSigner,
	}
}

func (h *Handler) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	// Health Check
	mux.HandleFunc("GET /health", h.handleHealth)

	// Auth Endpoints
	mux.HandleFunc("POST /api/v1/auth/signup", h.handleSignup)
	mux.HandleFunc("POST /api/v1/auth/login", h.handleLogin)
	mux.HandleFunc("GET /api/v1/auth/me", h.requireAuth(h.handleMe))
	mux.HandleFunc("POST /api/v1/auth/oauth/google", h.handleOAuthGoogle)

	// Account Endpoints. Deliberately not under /api/v1/auth/ — that prefix is
	// reserved for Next.js's own route handlers (see nginx's auth-specific
	// location block), while this one goes straight to Go like the rest of
	// the client-facing API.
	mux.HandleFunc("PATCH /api/v1/users/me", h.requireAuth(h.handleUpdateMe))
	mux.HandleFunc("POST /api/v1/users/me/organizer", h.requireAuth(h.handleBecomeOrganizer))
	mux.HandleFunc("GET /api/v1/users", h.requireRole(domain.RoleAdmin)(h.handleListUsers))

	// Events Endpoints
	mux.HandleFunc("GET /api/v1/events", h.handleListEvents)
	mux.HandleFunc("POST /api/v1/events", h.requireAuth(h.handleCreateEvent))
	mux.HandleFunc("GET /api/v1/events/{id}", h.handleGetEvent)
	mux.HandleFunc("PUT /api/v1/events/{id}", h.requireAuth(h.handleUpdateEvent))
	mux.HandleFunc("PATCH /api/v1/events/{id}", h.requireAuth(h.handleUpdateEvent))
	mux.HandleFunc("GET /api/v1/events/{id}/capacity", h.handleGetCapacity)
	mux.HandleFunc("GET /api/v1/events/{id}/live", h.sseHub.HandleSSE)

	// RSVP Endpoints (Hot Path)
	mux.HandleFunc("POST /api/v1/events/{id}/rsvps", h.handleCreateRSVP)
	mux.HandleFunc("GET /api/v1/rsvps/{id}", h.handleGetRSVP)
	mux.HandleFunc("POST /api/v1/rsvps/{id}/cancel", h.handleCancelRSVP)

	// Global Middlewares
	return h.corsMiddleware(h.rateLimitMiddleware(h.loggingMiddleware(mux)))
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"service":   "rsvp-core",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
	})
}

func (h *Handler) handleListEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.repo.ListEvents(r.Context())
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list events", err)
		return
	}

	type EventWithTiers struct {
		*domain.Event
		Tiers []*domain.TicketTier `json:"tiers"`
	}

	resp := []EventWithTiers{}
	for _, ev := range events {
		// This listing has no session check — it's the public discovery feed,
		// not an organizer's console — so draft/cancelled events must never
		// appear in it regardless of who's asking.
		if ev.Status != domain.EventStatusPublished && ev.Status != domain.EventStatusSoldOut {
			continue
		}
		tiers, _ := h.repo.GetTiersByEvent(r.Context(), ev.ID)
		if tiers == nil {
			// A nil Go slice marshals to JSON null, not []  — a free event
			// with no tiers took the production site down over this exact
			// gap (frontend code assumed tiers is always an array).
			tiers = []*domain.TicketTier{}
		}
		resp = append(resp, EventWithTiers{
			Event: ev,
			Tiers: tiers,
		})
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{
		"events": resp,
		"count":  len(resp),
	})
}

func (h *Handler) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	event, err := h.repo.GetEvent(r.Context(), eventID)
	if err != nil {
		if errors.Is(err, domain.ErrEventNotFound) {
			h.writeError(w, http.StatusNotFound, "Event not found", err)
			return
		}
		h.writeError(w, http.StatusInternalServerError, "Failed to get event", err)
		return
	}

	tiers, err := h.repo.GetTiersByEvent(r.Context(), event.ID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to get tiers", err)
		return
	}
	if tiers == nil {
		tiers = []*domain.TicketTier{}
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{
		"event": event,
		"tiers": tiers,
	})
}

func (h *Handler) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Slug            string `json:"slug"`
		Title           string `json:"title"`
		Description     string `json:"description"`
		OrganizerID     string `json:"organizer_id"`
		TotalCapacity   int    `json:"total_capacity"`
		StartTime       string `json:"start_time"`
		EndTime         string `json:"end_time"`
		TimeDisplay     string `json:"time_display"`
		Timezone        string `json:"timezone"`
		IsVirtual       bool   `json:"is_virtual"`
		MeetingURL      string `json:"meeting_url"`
		BannerURL       string `json:"banner_url"`
		SquareBannerURL string `json:"square_banner_url"`
		Location        string `json:"location"`
		Category        string `json:"category"`
		Tiers           []struct {
			Name          string `json:"name"`
			TotalCapacity int    `json:"total_capacity"`
			PriceCents    int    `json:"price_cents"`
		} `json:"tiers"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	// Banners arrive as base64 data URIs with no upstream file-size limit.
	const maxBannerDataURILen = 300_000 // ~300KB per field, comfortably fits a compressed banner photo
	if len(req.BannerURL) > maxBannerDataURILen {
		h.writeError(w, http.StatusBadRequest, "Banner image is too large. Please use an image under 300KB.", nil)
		return
	}
	if len(req.SquareBannerURL) > maxBannerDataURILen {
		h.writeError(w, http.StatusBadRequest, "Square banner image is too large. Please use an image under 300KB.", nil)
		return
	}

	// The organizer is always the authenticated caller, never a client-supplied field
	claims, _ := claimsFromContext(r.Context())
	organizerID := req.OrganizerID
	if claims != nil {
		organizerID = claims.UserID
	}

	cleanSlug := req.Slug
	if cleanSlug == "" && req.Title != "" {
		cleanSlug = strings.ToLower(strings.TrimSpace(req.Title))
		var b strings.Builder
		for _, r := range cleanSlug {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				b.WriteRune(r)
			} else if r == ' ' || r == '-' || r == '_' {
				b.WriteRune('-')
			}
		}
		cleanSlug = strings.Trim(b.String(), "-")
	}

	dateFormats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
	}

	var startTime *time.Time
	if req.StartTime != "" {
		for _, f := range dateFormats {
			if t, err := time.Parse(f, req.StartTime); err == nil {
				startTime = &t
				break
			}
		}
	}

	var endTime *time.Time
	if req.EndTime != "" {
		for _, f := range dateFormats {
			if t, err := time.Parse(f, req.EndTime); err == nil {
				endTime = &t
				break
			}
		}
	}

	timeDisplay := req.TimeDisplay
	if timeDisplay == "" && startTime != nil {
		timeDisplay = startTime.Format("Mon, Jan 2, 3:04 PM")
	}

	event := &domain.Event{
		Slug:            cleanSlug,
		Title:           req.Title,
		Description:     req.Description,
		OrganizerID:     organizerID,
		Status:          domain.EventStatusPublished,
		StartTime:       startTime,
		EndTime:         endTime,
		TimeDisplay:     timeDisplay,
		Timezone:        req.Timezone,
		IsVirtual:       req.IsVirtual,
		MeetingURL:      req.MeetingURL,
		TotalCapacity:   req.TotalCapacity,
		BannerURL:       req.BannerURL,
		SquareBannerURL: req.SquareBannerURL,
		Location:        req.Location,
		Category:        req.Category,
	}

	var tiers []*domain.TicketTier
	for _, t := range req.Tiers {
		tiers = append(tiers, &domain.TicketTier{
			Name:          t.Name,
			TotalCapacity: t.TotalCapacity,
			PriceCents:    t.PriceCents,
		})
	}

	if err := h.repo.CreateEvent(r.Context(), event, tiers); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create event", err)
		return
	}

	// Hosting an event isn't gated by role (anyone signed in can create one —
	// see the frontend proxy), but the console that manages it is organizer/admin
	// only. Without this, a first-time host would create an event and then find
	// every console route bouncing them to the landing page with no way to
	// become an organizer.
	h.promoteToOrganizerIfNeeded(w, r, claims)

	h.writeJSON(w, http.StatusCreated, map[string]interface{}{
		"event": event,
		"tiers": tiers,
	})
}

func (h *Handler) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	if eventID == "" {
		h.writeError(w, http.StatusBadRequest, "Event ID is required", nil)
		return
	}

	existing, err := h.repo.GetEvent(r.Context(), eventID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Event not found", err)
		return
	}

	claims, _ := claimsFromContext(r.Context())
	if claims != nil && claims.Role != domain.RoleAdmin && existing.OrganizerID != claims.UserID {
		h.writeError(w, http.StatusForbidden, "You do not have permission to edit this event", nil)
		return
	}

	var req struct {
		Slug            string `json:"slug"`
		Title           string `json:"title"`
		Description     string `json:"description"`
		TotalCapacity   int    `json:"total_capacity"`
		StartTime       string `json:"start_time"`
		EndTime         string `json:"end_time"`
		TimeDisplay     string `json:"time_display"`
		Timezone        string `json:"timezone"`
		IsVirtual       bool   `json:"is_virtual"`
		MeetingURL      string `json:"meeting_url"`
		BannerURL       string `json:"banner_url"`
		SquareBannerURL string `json:"square_banner_url"`
		Location        string `json:"location"`
		Category        string `json:"category"`
		Status          string `json:"status"`
		Tiers           []struct {
			ID            string `json:"id"`
			Name          string `json:"name"`
			TotalCapacity int    `json:"total_capacity"`
			PriceCents    int    `json:"price_cents"`
		} `json:"tiers"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	const maxBannerDataURILen = 300_000
	if len(req.BannerURL) > maxBannerDataURILen {
		h.writeError(w, http.StatusBadRequest, "Banner image is too large. Please use an image under 300KB.", nil)
		return
	}
	if len(req.SquareBannerURL) > maxBannerDataURILen {
		h.writeError(w, http.StatusBadRequest, "Square banner image is too large. Please use an image under 300KB.", nil)
		return
	}

	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Slug != "" {
		existing.Slug = req.Slug
	}
	if req.Location != "" {
		existing.Location = req.Location
	}
	if req.Category != "" {
		existing.Category = req.Category
	}
	if req.BannerURL != "" {
		existing.BannerURL = req.BannerURL
	}
	if req.SquareBannerURL != "" {
		existing.SquareBannerURL = req.SquareBannerURL
	}
	if req.TimeDisplay != "" {
		existing.TimeDisplay = req.TimeDisplay
	}
	if req.Timezone != "" {
		existing.Timezone = req.Timezone
	}
	if req.MeetingURL != "" {
		existing.MeetingURL = req.MeetingURL
	}
	existing.IsVirtual = req.IsVirtual
	if req.TotalCapacity >= 0 {
		existing.TotalCapacity = req.TotalCapacity
	}
	if req.Status != "" {
		existing.Status = domain.EventStatus(req.Status)
	}

	dateFormats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
	}

	if req.StartTime != "" {
		for _, f := range dateFormats {
			if t, err := time.Parse(f, req.StartTime); err == nil {
				existing.StartTime = &t
				break
			}
		}
	}
	if req.EndTime != "" {
		for _, f := range dateFormats {
			if t, err := time.Parse(f, req.EndTime); err == nil {
				existing.EndTime = &t
				break
			}
		}
	}

	var tiers []*domain.TicketTier
	for _, t := range req.Tiers {
		tiers = append(tiers, &domain.TicketTier{
			ID:                t.ID,
			EventID:           existing.ID,
			Name:              t.Name,
			TotalCapacity:     t.TotalCapacity,
			RemainingCapacity: t.TotalCapacity,
			PriceCents:        t.PriceCents,
		})
	}

	if err := h.repo.UpdateEvent(r.Context(), existing, tiers); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update event", err)
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{
		"event": existing,
		"tiers": tiers,
	})
}

// promoteToOrganizerIfNeeded upgrades an attendee to organizer and reissues
// the session cookie immediately, so the new role is usable without a
// re-login. Called both as a side effect of hosting something (an event) and
// directly from handleBecomeOrganizer, the explicit "unlock the console"
// entry point for an attendee who hasn't hosted anything yet.
func (h *Handler) promoteToOrganizerIfNeeded(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	if claims == nil || claims.Role != domain.RoleAttendee {
		return
	}
	if err := h.repo.UpdateUserRole(r.Context(), claims.UserID, domain.RoleOrganizer); err != nil {
		log.Printf("failed to promote user %s to organizer: %v", claims.UserID, err)
		return
	}
	token, err := h.authSigner.Issue(&domain.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Name:  claims.Name,
		Role:  domain.RoleOrganizer,
	})
	if err != nil {
		log.Printf("failed to reissue session after role promotion for %s: %v", claims.UserID, err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "hackways_session",
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   r.Header.Get("X-Forwarded-Proto") == "https",
		SameSite: http.SameSiteLaxMode,
	})
}

// handleBecomeOrganizer is the explicit "unlock the console" action — the
// backend for a dedicated page (like /console/start), not just a side effect
// of creating an event or community. Idempotent: already being organizer/admin
// is success, not an error.
func (h *Handler) handleBecomeOrganizer(w http.ResponseWriter, r *http.Request) {
	claims, _ := claimsFromContext(r.Context())
	if claims == nil {
		h.writeError(w, http.StatusUnauthorized, "Sign in required", nil)
		return
	}
	h.promoteToOrganizerIfNeeded(w, r, claims)

	user, err := h.repo.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to load account", err)
		return
	}
	h.writeJSON(w, http.StatusOK, map[string]interface{}{"user": user})
}

func (h *Handler) handleListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.ListUsers(r.Context())
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list users", err)
		return
	}
	type publicUser struct {
		ID        string    `json:"id"`
		Email     string    `json:"email"`
		Name      string    `json:"name"`
		Role      string    `json:"role"`
		CreatedAt time.Time `json:"createdAt"`
	}
	res := make([]publicUser, len(users))
	for i, u := range users {
		res[i] = publicUser{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Role:      string(u.Role),
			CreatedAt: u.CreatedAt,
		}
	}
	h.writeJSON(w, http.StatusOK, map[string]interface{}{"users": res})
}

func (h *Handler) handleGetCapacity(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	tierID := r.URL.Query().Get("tier_id")

	if tierID == "" {
		tiers, err := h.repo.GetTiersByEvent(r.Context(), eventID)
		if err != nil || len(tiers) == 0 {
			h.writeError(w, http.StatusNotFound, "No tiers found for event", err)
			return
		}
		tierID = tiers[0].ID
	}

	snapshot, err := h.rsvpService.GetCapacity(r.Context(), eventID, tierID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to get capacity snapshot", err)
		return
	}

	h.writeJSON(w, http.StatusOK, snapshot)
}

func (h *Handler) handleCreateRSVP(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	if ev, err := h.repo.GetEvent(r.Context(), eventID); err == nil && ev != nil {
		eventID = ev.ID
	}

	var req domain.CreateRSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	req.EventID = eventID

	// Extract idempotency key from Header or payload
	if idempHeader := r.Header.Get("Idempotency-Key"); idempHeader != "" {
		req.IdempotencyKey = idempHeader
	}

	if req.TierID == "" || req.UserID == "" || req.UserEmail == "" {
		h.writeError(w, http.StatusBadRequest, "tier_id, user_id, and user_email are required", nil)
		return
	}

	resp, err := h.rsvpService.CreateRSVP(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrAlreadyRSVPd):
			h.writeError(w, http.StatusConflict, "User has already RSVP'd to this event", err)
		case errors.Is(err, domain.ErrEventNotFound):
			h.writeError(w, http.StatusNotFound, "Event not found", err)
		case errors.Is(err, domain.ErrTierNotFound):
			h.writeError(w, http.StatusNotFound, "Ticket tier not found", err)
		case errors.Is(err, domain.ErrDeadlinePassed):
			h.writeError(w, http.StatusGone, "RSVP deadline has expired", err)
		default:
			h.writeError(w, http.StatusInternalServerError, "Failed to process RSVP", err)
		}
		return
	}

	statusCode := http.StatusCreated
	if resp.RSVP != nil && resp.RSVP.Status == domain.RSVPStatusWaitlist {
		statusCode = http.StatusAccepted
	}

	h.writeJSON(w, statusCode, resp)
}

// authorizedForRSVP reports whether the caller may read/cancel this RSVP:
// either they can name the email it was registered under (the only proof an
// anonymous, account-less attendee has), or they're signed in as that
// attendee, an admin, or the organizer of the event it belongs to.
func (h *Handler) authorizedForRSVP(r *http.Request, rsvp *domain.RSVP, claimedEmail string) bool {
	if claimedEmail != "" && strings.EqualFold(claimedEmail, rsvp.UserEmail) {
		return true
	}
	claims := h.optionalClaims(r)
	if claims == nil {
		return false
	}
	if claims.Role == domain.RoleAdmin || claims.UserID == rsvp.UserID || strings.EqualFold(claims.Email, rsvp.UserEmail) {
		return true
	}
	if claims.Role == domain.RoleOrganizer {
		if ev, err := h.repo.GetEvent(r.Context(), rsvp.EventID); err == nil && ev != nil && ev.OrganizerID == claims.UserID {
			return true
		}
	}
	return false
}

func (h *Handler) handleGetRSVP(w http.ResponseWriter, r *http.Request) {
	rsvpID := r.PathValue("id")
	rsvp, err := h.repo.GetRSVP(r.Context(), rsvpID)
	if err != nil {
		if errors.Is(err, domain.ErrRSVPNotFound) {
			h.writeError(w, http.StatusNotFound, "RSVP not found", err)
			return
		}
		h.writeError(w, http.StatusInternalServerError, "Failed to get RSVP", err)
		return
	}

	if !h.authorizedForRSVP(r, rsvp, r.URL.Query().Get("email")) {
		h.writeError(w, http.StatusForbidden, "You don't have permission to view this RSVP", nil)
		return
	}

	h.writeJSON(w, http.StatusOK, rsvp)
}

func (h *Handler) handleCancelRSVP(w http.ResponseWriter, r *http.Request) {
	rsvpID := r.PathValue("id")

	var body struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body) // optional body; absence/malformed JSON just leaves Email == ""
	claimedEmail := body.Email
	if claimedEmail == "" {
		claimedEmail = r.URL.Query().Get("email")
	}

	existing, err := h.repo.GetRSVP(r.Context(), rsvpID)
	if err != nil {
		if errors.Is(err, domain.ErrRSVPNotFound) {
			h.writeError(w, http.StatusNotFound, "RSVP not found", err)
			return
		}
		h.writeError(w, http.StatusInternalServerError, "Failed to cancel RSVP", err)
		return
	}
	if !h.authorizedForRSVP(r, existing, claimedEmail) {
		h.writeError(w, http.StatusForbidden, "You don't have permission to cancel this RSVP", nil)
		return
	}

	rsvp, err := h.rsvpService.CancelRSVP(r.Context(), rsvpID)
	if err != nil {
		if errors.Is(err, domain.ErrRSVPNotFound) {
			h.writeError(w, http.StatusNotFound, "RSVP not found", err)
			return
		}
		h.writeError(w, http.StatusInternalServerError, "Failed to cancel RSVP", err)
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "RSVP successfully cancelled; spot released",
		"rsvp":    rsvp,
	})
}

// Middlewares
func (h *Handler) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		if r.URL.Path != "/health" && r.URL.Path != "/api/v1/events/" {
			log.Printf("[%s] %s - %v", r.Method, r.URL.Path, duration)
		}
	})
}

func (h *Handler) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		ip := r.RemoteAddr
		allowed, remaining, err := h.cache.CheckRateLimit(r.Context(), ip, h.cfg.RateLimitBurst, time.Second)
		if err == nil && !allowed {
			w.Header().Set("Retry-After", "1")
			h.writeError(w, http.StatusTooManyRequests, "Rate limit exceeded; please slow down", domain.ErrRateLimitExceeded)
			return
		}
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) writeError(w http.ResponseWriter, status int, message string, err error) {
	detail := ""
	if err != nil {
		detail = err.Error()
	}
	h.writeJSON(w, status, map[string]interface{}{
		"error":   message,
		"details": detail,
		"status":  status,
	})
}
