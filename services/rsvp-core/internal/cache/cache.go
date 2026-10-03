package cache

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrCacheMiss = errors.New("cache miss")
)

type ReservationResult struct {
	Status    string // "CONFIRMED", "WAITLIST", "ALREADY_RSVPD"
	Remaining int
}

type CacheService interface {
	ReserveSeat(ctx context.Context, tierID, userID, eventID string, initialCapacity int) (ReservationResult, error)
	ReleaseSeat(ctx context.Context, tierID, userID, eventID string) (int, error)
	GetCapacity(ctx context.Context, tierID string) (int, bool, error)
	SetCapacity(ctx context.Context, tierID string, capacity int) error
	CheckRateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error)
	GetIdempotency(ctx context.Context, key string) ([]byte, bool, error)
	SetIdempotency(ctx context.Context, key string, val []byte, ttl time.Duration) error
	Close() error
}

// ValkeyCache implements CacheService connecting to Valkey (or Redis) over RESP
type ValkeyCache struct {
	client           *redis.Client
	reserveScriptSHA string
	releaseScriptSHA string
	rateLimitScriptSHA string
}

const reserveSeatLua = `
local capKey = KEYS[1]
local userKey = KEYS[2]
local initCap = tonumber(ARGV[1])

if redis.call('EXISTS', capKey) == 0 then
    redis.call('SET', capKey, initCap)
end

if redis.call('EXISTS', userKey) == 1 then
    return {0, -1}
end

local rem = tonumber(redis.call('GET', capKey))
if rem > 0 then
    local newRem = redis.call('DECR', capKey)
    redis.call('SET', userKey, 'CONFIRMED', 'EX', 2592000)
    return {1, newRem}
else
    return {2, 0}
end
`

const releaseSeatLua = `
local capKey = KEYS[1]
local userKey = KEYS[2]

local userStatus = redis.call('GET', userKey)
if userStatus == 'CONFIRMED' then
    local newRem = redis.call('INCR', capKey)
    redis.call('DEL', userKey)
    return newRem
else
    redis.call('DEL', userKey)
    local rem = redis.call('GET', capKey)
    return tonumber(rem or 0)
end
`

const rateLimitLua = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end

if current > limit then
    return {0, limit - current}
else
    return {1, limit - current}
end
`

func NewValkeyCache(addr, password string, db int) (*ValkeyCache, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		PoolSize:     100,
		MinIdleConns: 20,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("valkey ping failed: %w", err)
	}

	reserveSHA, err := rdb.ScriptLoad(ctx, reserveSeatLua).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to load reserve Lua script: %w", err)
	}

	releaseSHA, err := rdb.ScriptLoad(ctx, releaseSeatLua).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to load release Lua script: %w", err)
	}

	rateSHA, err := rdb.ScriptLoad(ctx, rateLimitLua).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to load rate limit Lua script: %w", err)
	}

	return &ValkeyCache{
		client:             rdb,
		reserveScriptSHA:   reserveSHA,
		releaseScriptSHA:   releaseSHA,
		rateLimitScriptSHA: rateSHA,
	}, nil
}

func (v *ValkeyCache) ReserveSeat(ctx context.Context, tierID, userID, eventID string, initialCapacity int) (ReservationResult, error) {
	capKey := fmt.Sprintf("tier:capacity:%s", tierID)
	userKey := fmt.Sprintf("event:user:%s:%s", eventID, userID)

	res, err := v.client.EvalSha(ctx, v.reserveScriptSHA, []string{capKey, userKey}, initialCapacity).Result()
	if err != nil {
		// Fallback to Eval if script was flushed
		res, err = v.client.Eval(ctx, reserveSeatLua, []string{capKey, userKey}, initialCapacity).Result()
		if err != nil {
			return ReservationResult{}, err
		}
	}

	arr, ok := res.([]interface{})
	if !ok || len(arr) < 2 {
		return ReservationResult{}, fmt.Errorf("invalid Lua response: %v", res)
	}

	code := arr[0].(int64)
	rem := int(arr[1].(int64))

	switch code {
	case 0:
		return ReservationResult{Status: "ALREADY_RSVPD", Remaining: rem}, nil
	case 1:
		return ReservationResult{Status: "CONFIRMED", Remaining: rem}, nil
	default:
		return ReservationResult{Status: "WAITLIST", Remaining: 0}, nil
	}
}

func (v *ValkeyCache) ReleaseSeat(ctx context.Context, tierID, userID, eventID string) (int, error) {
	capKey := fmt.Sprintf("tier:capacity:%s", tierID)
	userKey := fmt.Sprintf("event:user:%s:%s", eventID, userID)

	res, err := v.client.EvalSha(ctx, v.releaseScriptSHA, []string{capKey, userKey}).Result()
	if err != nil {
		res, err = v.client.Eval(ctx, releaseSeatLua, []string{capKey, userKey}).Result()
		if err != nil {
			return 0, err
		}
	}

	rem, ok := res.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected release return type: %v", res)
	}
	return int(rem), nil
}

func (v *ValkeyCache) GetCapacity(ctx context.Context, tierID string) (int, bool, error) {
	capKey := fmt.Sprintf("tier:capacity:%s", tierID)
	val, err := v.client.Get(ctx, capKey).Int()
	if errors.Is(err, redis.Nil) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return val, true, nil
}

func (v *ValkeyCache) SetCapacity(ctx context.Context, tierID string, capacity int) error {
	capKey := fmt.Sprintf("tier:capacity:%s", tierID)
	return v.client.Set(ctx, capKey, capacity, 24*time.Hour).Err()
}

func (v *ValkeyCache) CheckRateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error) {
	rateKey := fmt.Sprintf("ratelimit:%s", key)
	windowSec := int(window.Seconds())
	if windowSec < 1 {
		windowSec = 1
	}

	res, err := v.client.EvalSha(ctx, v.rateLimitScriptSHA, []string{rateKey}, limit, windowSec).Result()
	if err != nil {
		res, err = v.client.Eval(ctx, rateLimitLua, []string{rateKey}, limit, windowSec).Result()
		if err != nil {
			return true, limit, nil // Fail open on rate limit cache error to prevent user lockout
		}
	}

	arr, ok := res.([]interface{})
	if !ok || len(arr) < 2 {
		return true, limit, nil
	}
	allowed := arr[0].(int64) == 1
	remaining := int(arr[1].(int64))
	return allowed, remaining, nil
}

func (v *ValkeyCache) GetIdempotency(ctx context.Context, key string) ([]byte, bool, error) {
	val, err := v.client.Get(ctx, fmt.Sprintf("idemp:%s", key)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return val, true, nil
}

func (v *ValkeyCache) SetIdempotency(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	return v.client.Set(ctx, fmt.Sprintf("idemp:%s", key), val, ttl).Err()
}

func (v *ValkeyCache) Close() error {
	return v.client.Close()
}

// MemoryCache provides a high-performance in-memory cache implementation
// with identical atomic Lua-style semantics for deterministic local testing
type MemoryCache struct {
	mu           sync.Mutex
	capacities   map[string]int
	userRSVPs    map[string]string
	rateLimits   map[string]int
	idempotencies map[string][]byte
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		capacities:    make(map[string]int),
		userRSVPs:     make(map[string]string),
		rateLimits:    make(map[string]int),
		idempotencies: make(map[string][]byte),
	}
}

func (m *MemoryCache) ReserveSeat(ctx context.Context, tierID, userID, eventID string, initialCapacity int) (ReservationResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	userKey := fmt.Sprintf("%s:%s", eventID, userID)
	if _, exists := m.userRSVPs[userKey]; exists {
		return ReservationResult{Status: "ALREADY_RSVPD", Remaining: m.capacities[tierID]}, nil
	}

	if _, exists := m.capacities[tierID]; !exists {
		m.capacities[tierID] = initialCapacity
	}

	rem := m.capacities[tierID]
	if rem > 0 {
		m.capacities[tierID] = rem - 1
		m.userRSVPs[userKey] = "CONFIRMED"
		return ReservationResult{Status: "CONFIRMED", Remaining: rem - 1}, nil
	}

	return ReservationResult{Status: "WAITLIST", Remaining: 0}, nil
}

func (m *MemoryCache) ReleaseSeat(ctx context.Context, tierID, userID, eventID string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	userKey := fmt.Sprintf("%s:%s", eventID, userID)
	status, exists := m.userRSVPs[userKey]
	delete(m.userRSVPs, userKey)
	if exists && status == "CONFIRMED" {
		m.capacities[tierID]++
	}
	return m.capacities[tierID], nil
}

func (m *MemoryCache) GetCapacity(ctx context.Context, tierID string) (int, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	val, ok := m.capacities[tierID]
	return val, ok, nil
}

func (m *MemoryCache) SetCapacity(ctx context.Context, tierID string, capacity int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.capacities[tierID] = capacity
	return nil
}

func (m *MemoryCache) CheckRateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rateLimits[key]++
	curr := m.rateLimits[key]
	if curr > limit {
		return false, 0, nil
	}
	return true, limit - curr, nil
}

func (m *MemoryCache) GetIdempotency(ctx context.Context, key string) ([]byte, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	val, ok := m.idempotencies[key]
	return val, ok, nil
}

func (m *MemoryCache) SetIdempotency(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.idempotencies[key] = val
	return nil
}

func (m *MemoryCache) Close() error {
	return nil
}

var _ CacheService = (*ValkeyCache)(nil)
var _ CacheService = (*MemoryCache)(nil)
